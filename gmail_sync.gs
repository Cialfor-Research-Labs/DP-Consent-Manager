/**
 * ============================================================
 *  Data Principal Consent Manager — Google Apps Script
 *  Gmail Auto-Sync to FastAPI Backend via Cloudflare Tunnel
 * ============================================================
 *
 * HOW TO USE:
 *  1. Open https://script.google.com
 *  2. Paste this entire script
 *  3. Update BACKEND_WEBHOOK_URL below to your current Cloudflare tunnel URL
 *  4. Run setupTrigger() ONCE to install the 5-minute auto-sync trigger
 *  5. Done — every new consent email will auto-sync to the Consent Manager
 *
 * FUNCTIONS:
 *  syncConsentEmails() — main sync (runs automatically via trigger)
 *  setupTrigger()      — install 5-min recurring trigger (run ONCE)
 *  removeTrigger()     — disable auto-sync
 *  testSyncNow()       — manual one-shot test run
 *  clearSyncHistory()  — reset deduplication (use after DB reset)
 *  checkSyncStatus()   — view how many emails have been synced
 * ============================================================
 */

// ─── CONFIGURATION ──────────────────────────────────────────

// Your current Cloudflare tunnel URL pointing to the FastAPI backend
var BACKEND_WEBHOOK_URL = "https://second-refuse-defend-plate.trycloudflare.com/api/gmail-webhook";

// How many days back to scan for emails (prevents syncing your entire inbox)
var LOOKBACK_DAYS = 7;

// Gmail search query — matches any email that contains a portal link or consent notice
var GMAIL_SEARCH_QUERY = [
  'subject:Consent',
  'subject:"Action Required"',
  'subject:Privacy',
  'subject:Notice',
  'subject:"Data Processing"',
  'subject:DPDP',
  '"localhost:5173"',
  '"trycloudflare.com"',
  '"/request/"',
  '"tok_"'
].join(' OR ');

// ─────────────────────────────────────────────────────────────


/**
 * MAIN SYNC FUNCTION
 * Scans Gmail (INBOX + SENT) for consent-related emails within
 * the last LOOKBACK_DAYS days, deduplicates via PropertiesService
 * (never re-POSTs the same message), and sends each new email
 * to the backend webhook to clone it into the Consent Manager.
 */
function syncConsentEmails() {
  var props = PropertiesService.getScriptProperties();

  // Build date filter — only process emails newer than LOOKBACK_DAYS
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  var dateFilter = ' after:' + Utilities.formatDate(cutoff, 'UTC', 'yyyy/MM/dd');

  // Scan both received (inbox) and sent emails
  var searchQueries = [
    '(' + GMAIL_SEARCH_QUERY + ')' + dateFilter,
    'in:sent (' + GMAIL_SEARCH_QUERY + ')' + dateFilter
  ];

  var syncedCount = 0;
  var skippedCount = 0;
  var errorCount = 0;

  searchQueries.forEach(function(query) {
    var threads = [];
    try {
      threads = GmailApp.search(query, 0, 50); // max 50 threads per search
    } catch (e) {
      Logger.log('[ERROR] Gmail search failed: ' + e);
      return;
    }

    threads.forEach(function(thread) {
      thread.getMessages().forEach(function(msg) {
        var msgId = msg.getId();

        // ── DEDUPLICATION ──────────────────────────────────
        // If this exact Gmail message ID was already synced, skip it entirely.
        // This means no matter how many times the trigger fires, each email
        // is only ever POSTed to the backend ONCE.
        if (props.getProperty('synced_' + msgId)) {
          skippedCount++;
          return;
        }

        // ── EXTRACT EMAIL FIELDS ───────────────────────────
        var fromRaw  = msg.getFrom()      || '';
        var toRaw    = msg.getTo()        || '';
        var ccRaw    = msg.getCc()        || '';
        var subject  = msg.getSubject()   || '';
        var bodyText = msg.getPlainBody() || '';
        var date     = msg.getDate();

        // Skip completely empty messages
        if (!bodyText && !subject) {
          skippedCount++;
          return;
        }

        // ── EXTRACT TOKEN FROM EMAIL BODY ──────────────────
        // Captures /request/<token> from any URL format:
        //   http://localhost:5173/request/tok_pf_account
        //   https://xyz.trycloudflare.com/request/tok_abc123
        //   Plain text: /request/tok_something
        var tokenMatch = bodyText.match(/\/request\/([a-zA-Z0-9_\-]+)/);
        var extractedToken = tokenMatch ? tokenMatch[1] : null;

        // ── RESOLVE FIDUCIARY NAME FROM FROM: HEADER ───────
        // "Prerna Pandey <prerna.p@cialfor.com>" → "Prerna Pandey"
        // "prerna.p@cialfor.com"                 → "Prerna P"
        var fiduciaryName = '';
        if (fromRaw.indexOf('<') > -1) {
          fiduciaryName = fromRaw.split('<')[0].replace(/"/g, '').trim();
        } else if (fromRaw.indexOf('@') > -1) {
          fiduciaryName = fromRaw.split('@')[0].replace(/[\._]/g, ' ');
          fiduciaryName = fiduciaryName.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        } else {
          fiduciaryName = fromRaw || 'Unknown Fiduciary';
        }

        // ── HANDLE MULTI-RECIPIENT EMAILS ──────────────────
        // Use To: field. Fall back to Cc: if To: is empty (e.g. BCC-only sends)
        var effectiveTo = toRaw || ccRaw || fromRaw;

        // ── BUILD WEBHOOK PAYLOAD ──────────────────────────
        var payload = {
          from_address:    fromRaw,
          to_address:      effectiveTo,
          subject:         subject,
          body_text:       bodyText,
          fiduciary_name:  fiduciaryName,
          purpose:         subject,
          sent_date:       date ? Utilities.formatDate(date, 'UTC', "EEEE, MMMM dd, yyyy") : '',
          extracted_token: extractedToken  // hint to backend — use this token if no token in body
        };

        var options = {
          method:             'post',
          contentType:        'application/json',
          payload:            JSON.stringify(payload),
          muteHttpExceptions: true
        };

        // ── POST TO BACKEND WEBHOOK ────────────────────────
        try {
          var response     = UrlFetchApp.fetch(BACKEND_WEBHOOK_URL, options);
          var statusCode   = response.getResponseCode();
          var responseBody = response.getContentText();

          if (statusCode === 200 || statusCode === 201) {
            // Mark this Gmail message ID as permanently synced
            props.setProperty('synced_' + msgId, new Date().toISOString());
            syncedCount++;

            // Log the generated consent portal link for easy access
            try {
              var parsed      = JSON.parse(responseBody);
              var token       = parsed.token || extractedToken || 'unknown';
              var consentLink = parsed.link  || ('http://localhost:5173/request/' + token);
              Logger.log('[SYNCED] "' + subject + '"');
              Logger.log('         → Consent Link: ' + consentLink);
              Logger.log('         → Token: ' + token);
              Logger.log('         → Principal: ' + (parsed.dataPrincipal ? parsed.dataPrincipal.email : effectiveTo));
            } catch (pe) {
              Logger.log('[SYNCED] "' + subject + '" (HTTP ' + statusCode + ')');
            }

          } else {
            errorCount++;
            Logger.log('[WARN] HTTP ' + statusCode + ' for "' + subject + '": ' + responseBody.substring(0, 300));
          }

        } catch (e) {
          errorCount++;
          Logger.log('[ERROR] Failed to sync "' + subject + '": ' + e.toString());
        }

      }); // end messages loop
    }); // end threads loop
  }); // end queries loop

  Logger.log('');
  Logger.log('=== Sync Run Complete ===');
  Logger.log('  Synced:  ' + syncedCount);
  Logger.log('  Skipped: ' + skippedCount + ' (already synced)');
  Logger.log('  Errors:  ' + errorCount);
  Logger.log('========================');
}


/**
 * SETUP TRIGGER
 * Run this function ONCE manually from the Apps Script editor.
 * Installs a recurring 5-minute trigger so syncConsentEmails()
 * runs automatically in the background.
 */
function setupTrigger() {
  // Remove any existing triggers first to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncConsentEmails') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncConsentEmails')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger installed! syncConsentEmails() will now run every 5 minutes automatically.');
  Logger.log('Run removeTrigger() to disable.');
}


/**
 * REMOVE TRIGGER
 * Disables the auto-sync background trigger.
 */
function removeTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncConsentEmails') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log('Removed ' + removed + ' trigger(s). Auto-sync is now disabled.');
}


/**
 * CLEAR SYNC HISTORY
 * Wipes the deduplication record so all matching emails
 * will be re-synced on the next run.
 * Use this after resetting/wiping your backend SQLite database.
 */
function clearSyncHistory() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('Sync history cleared. All matching emails will re-sync on the next run.');
}


/**
 * MANUAL TEST
 * Immediately runs one sync and prints results to the Logger.
 * Use this to test a new Cloudflare tunnel URL or verify connectivity.
 */
function testSyncNow() {
  Logger.log('=== MANUAL TEST SYNC ===');
  Logger.log('Webhook URL: ' + BACKEND_WEBHOOK_URL);
  Logger.log('Scanning last ' + LOOKBACK_DAYS + ' days of Gmail...');
  syncConsentEmails();
}


/**
 * STATUS CHECK
 * Shows how many emails have been synced and whether the trigger is active.
 */
function checkSyncStatus() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var count = Object.keys(props).filter(function(k) { return k.indexOf('synced_') === 0; }).length;

  var triggers    = ScriptApp.getProjectTriggers();
  var hasAutoSync = triggers.some(function(t) { return t.getHandlerFunction() === 'syncConsentEmails'; });

  Logger.log('=== Consent Manager Sync Status ===');
  Logger.log('Emails synced to backend: ' + count);
  Logger.log('Auto-trigger active:      ' + (hasAutoSync ? 'YES (every 5 min)' : 'NO — run setupTrigger() to enable'));
  Logger.log('Backend URL:              ' + BACKEND_WEBHOOK_URL);
  Logger.log('Lookback window:          Last ' + LOOKBACK_DAYS + ' days');
  Logger.log('===================================');
}
