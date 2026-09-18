const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../gmail_sync.gs'), 'utf8');
const NOW = 1800000000;

function harness(initial = {}) {
  const state = {
    now: NOW, props: { GMAIL_WEBHOOK_SECRET: 'test-secret', ...initial },
    searches: [], posts: [], logs: [], dispatches: 0, released: 0,
    threads: [], status: 200, locked: false, interval: null,
  };
  const context = vm.createContext({
    Date: class extends Date { static now() { return state.now * 1000; } },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => state.props[key] ?? null,
      setProperty: (key, value) => { state.props[key] = value; },
      deleteProperty: key => { delete state.props[key]; },
      getProperties: () => ({ ...state.props }),
    }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => !state.locked,
      releaseLock: () => { state.released++; },
    }) },
    Logger: { log: message => state.logs.push(message) },
    Utilities: { formatDate: date => date.toISOString() },
    GmailApp: {
      search: (query, start, max) => {
        state.searches.push({ query, start, max });
        if (state.searchError || state.failPage === start) throw new Error('Gmail quota exceeded');
        return state.threads.slice(start, start + max);
      },
      sendEmail: () => { throw new Error('Unexpected notification'); },
    },
    UrlFetchApp: { fetch: (url, options) => {
      state.posts.push({ url, options, payload: JSON.parse(options.payload) });
      return {
        getResponseCode: () => state.status,
        getContentText: () => JSON.stringify({ ignored: true }),
      };
    } },
    ScriptApp: {
      getProjectTriggers: () => [],
      newTrigger: name => {
        assert.equal(name, 'syncConsentEmails');
        const builder = {
          timeBased: () => builder,
          everyMinutes: n => { state.interval = n; return builder; },
          create: () => {},
        };
        return builder;
      },
    },
  });
  vm.runInContext(source, context);
  context.dispatchPendingConsentReplies = () => { state.dispatches++; };
  state.run = () => context.syncConsentEmails();
  state.context = context;
  return state;
}

function message(id, seconds = NOW - 60, body = 'Please consent to process medical records.') {
  const msg = {
    reads: 0,
    getId: () => id,
    getDate: () => new Date(seconds * 1000),
    getFrom: () => 'Hospital <hospital@example.com>',
    getTo: () => 'patient@example.com',
    getCc: () => '',
    getSubject: () => 'Consent for medical records',
    getPlainBody: () => { msg.reads++; return body; },
  };
  return msg;
}

function thread(...messages) {
  return { getId: () => 'thread-id', getMessages: () => messages };
}

test('bootstrap searches bounded history once, then uses the success checkpoint', () => {
  const h = harness();
  h.run();
  assert.match(h.searches[0].query, new RegExp(`after:${NOW - 7 * 86400} before:${NOW}$`));
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW));
  h.now += 300;
  h.run();
  assert.match(h.searches[1].query, new RegExp(`after:${NOW - 120} before:${NOW + 300}$`));
  assert.equal(h.searches.length, 2);
  assert.equal(h.dispatches, 2);
});

test('search failure counts as an error and leaves the checkpoint unchanged', () => {
  const h = harness({ LAST_SUCCESSFUL_SYNC_TIME: String(NOW - 300) });
  h.searchError = true;
  h.run();
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW - 300));
  assert.ok(h.logs.includes('  Errors:  1'));
  assert.equal(h.dispatches, 1);
  assert.equal(h.released, 1);
});

test('old and during-run thread members are skipped before body reads', () => {
  const h = harness({ LAST_SUCCESSFUL_SYNC_TIME: String(NOW - 300) });
  const old = message('old', NOW - 86400);
  const recent = message('recent');
  const boundary = message('boundary', NOW);
  h.threads = [thread(old, recent, boundary)];
  h.run();
  assert.equal(old.reads, 0);
  assert.equal(boundary.reads, 0);
  assert.equal(h.posts.length, 1);
  assert.equal(h.posts[0].payload.message_id, 'recent');
  assert.equal(h.posts[0].payload.thread_id, 'thread-id');
  assert.equal(h.posts[0].options.headers['X-Webhook-Secret'], 'test-secret');
  assert.ok(h.posts[0].url.endsWith('/api/gmail-webhook'));
  h.now += 300;
  h.run();
  assert.deepEqual(h.posts.map(p => p.payload.message_id), ['recent', 'boundary']);
  assert.equal(recent.reads, 1);
});

test('all result pages are processed before advancing the checkpoint', () => {
  const h = harness();
  h.threads = Array.from({ length: 51 }, (_, i) => thread(message(`id-${i}`)));
  h.run();
  assert.deepEqual(h.searches.map(s => s.start), [0, 50]);
  assert.equal(h.posts.length, 51);
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW));
});

test('later page failure retries without reposting successful message IDs', () => {
  const h = harness({ LAST_SUCCESSFUL_SYNC_TIME: String(NOW - 300) });
  h.threads = Array.from({ length: 51 }, (_, i) => thread(message(`id-${i}`)));
  h.failPage = 50;
  h.run();
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW - 300));
  assert.equal(h.posts.length, 50);
  delete h.failPage;
  h.run();
  assert.equal(h.posts.length, 51);
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW));
});

test('backend failure leaves message retryable and does not advance the checkpoint', () => {
  const h = harness({ LAST_SUCCESSFUL_SYNC_TIME: String(NOW - 300) });
  h.threads = [thread(message('retry'))];
  h.status = 503;
  h.run();
  assert.equal(h.props.synced_retry, undefined);
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW - 300));
  h.status = 200;
  h.run();
  assert.ok(h.props.synced_retry);
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW));
});

test('thread read failure counts as an error and still checks pending receipts', () => {
  const h = harness();
  h.threads = [{ getMessages: () => { throw new Error('read quota'); } }];
  h.run();
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, undefined);
  assert.ok(h.logs.includes('  Errors:  1'));
  assert.equal(h.dispatches, 1);
});

test('overlapping triggers make no Gmail calls', () => {
  const h = harness();
  h.locked = true;
  h.run();
  assert.equal(h.searches.length, 0);
  assert.equal(h.posts.length, 0);
  assert.equal(h.released, 0);
});

test('missing secret blocks ingestion and releases the sync lock', () => {
  const h = harness({ GMAIL_WEBHOOK_SECRET: '' });
  h.run();
  assert.equal(h.searches.length, 0);
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, undefined);
  assert.equal(h.released, 1);
});

test('system-generated receipt messages remain excluded', () => {
  const h = harness();
  h.threads = [thread(message('receipt', NOW - 30, 'DIGITAL CONSENT STATUS UPDATE'))];
  h.run();
  assert.equal(h.posts.length, 0);
  assert.equal(h.dispatches, 1);
});

test('trigger remains five minutes and clearing dedup history preserves security and checkpoint', () => {
  const h = harness({ LAST_SUCCESSFUL_SYNC_TIME: String(NOW - 300), synced_old: 'yes' });
  h.context.setupTrigger();
  assert.equal(h.interval, 5);
  h.context.clearSyncHistory();
  assert.equal(h.props.synced_old, undefined);
  assert.equal(h.props.GMAIL_WEBHOOK_SECRET, 'test-secret');
  assert.equal(h.props.LAST_SUCCESSFUL_SYNC_TIME, String(NOW - 300));
});
