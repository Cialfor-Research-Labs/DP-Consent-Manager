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
var BACKEND_WEBHOOK_URL = "https://organizational-microwave-wool-reflection.trycloudflare.com/api/gmail-webhook";

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
          extracted_token: extractedToken,  // hint to backend — use this token if no token in body
          thread_id:       thread.getId(),  // required for same-thread reply back to fiduciary
          message_id:      msgId
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
  Logger.log('========================');
  Logger.log('');

  // ── AUTO-DISPATCH CONSENT REPLIES TO ORIGINAL THREADS ──────
  // Checks backend for any consent decisions (GRANTED / DENIED) and sends
  // an official Digital Consent Receipt reply directly on the original thread.
  dispatchPendingConsentReplies();
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


/**
 * ════════════════════════════════════════════════════════════
 *  DISPATCH PENDING CONSENT REPLIES (SAME-THREAD NOTIFICATIONS)
 * ════════════════════════════════════════════════════════════
 *  1. Checks backend for consent decisions (GRANTED / DENIED)
 *  2. Finds the exact original email thread via threadId
 *  3. Replies on that thread with an official DPDP Act Digital Receipt
 *  4. Acknowledges to backend so notifications are never duplicated
 */
function dispatchPendingConsentReplies() {
  var baseUrl = BACKEND_WEBHOOK_URL.replace(/\/api\/gmail-webhook\/?$/, '');
  var pendingUrl = baseUrl + '/api/notifications/pending';

  try {
    var response = UrlFetchApp.fetch(pendingUrl, {
      method: 'get',
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('[NOTIF] Status ' + response.getResponseCode() + ' fetching pending notifications');
      return;
    }

    var pendingList = JSON.parse(response.getContentText());
    if (!pendingList || pendingList.length === 0) {
      return;
    }

    Logger.log('=== Dispatching Consent Auto-Replies ===');
    Logger.log('Found ' + pendingList.length + ' pending decision notification(s).');

    pendingList.forEach(function(item) {
      if (!item.thread_id) {
        Logger.log('[NOTIF-SKIP] Item ' + item.id + ' lacks thread_id.');
        return;
      }

      try {
        var thread = GmailApp.getThreadById(item.thread_id);
        if (!thread) {
          Logger.log('[NOTIF-WARN] Thread not found for ID: ' + item.thread_id);
          return;
        }

        var details = item.details || {};
        var action = item.action || 'PROCESSED';
        var isGranted = (action === 'GRANTED');
        var artifactId = item.artifact_id || (details.artifact ? details.artifact.consentId : 'N/A') || 'N/A';
        var principalName = details.principalName || 'Data Principal';
        var fiduciaryName = item.fiduciary_name || details.fiduciaryName || 'Data Fiduciary';
        var noticeId = details.noticeId || 'N/A';
        var purpose = details.purpose || 'Data Processing';
        var selectedAttrs = details.selectedAttributes || (details.artifact ? details.artifact.grantedAttributes : []) || [];
        var deniedAttrs = details.deniedAttributes || (details.artifact ? details.artifact.deniedAttributes : []) || [];
        var receiptHash = (details.artifact && details.artifact.receiptHash) ? details.artifact.receiptHash : 'N/A';
        var remark = details.remark || (details.artifact ? details.artifact.customNote : '') || '';

        var statusColor = isGranted ? '#10b981' : '#ef4444';
        var statusBadge = isGranted ? 'CONSENT GRANTED' : 'CONSENT DENIED';

        // ── RICH HTML EMAIL TEMPLATE ───────────────────────────
        var htmlBody = [
          '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; max-width: 620px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; color: #1e293b; background: #ffffff;">',
          '  <div style="background: #0f172a; color: #ffffff; padding: 18px 24px;">',
          '    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 600;">DPDP Act 2023 Statutory Notice Response</div>',
          '    <div style="font-size: 16px; font-weight: 700; margin-top: 4px; color: #f8fafc;">Digital Consent Status Confirmation</div>',
          '  </div>',
          '  <div style="padding: 24px;">',
          '    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">',
          '      Dear <strong>' + fiduciaryName + '</strong>,',
          '    </p>',
          '    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 18px 0; color: #334155;">',
          '      The Data Principal <strong>' + principalName + '</strong> has recorded a formal decision regarding your consent notice under <strong>Section 6 of the Digital Personal Data Protection (DPDP) Act, 2023</strong>.',
          '    </p>',
          '    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">',
          '      <div style="display: inline-block; background: ' + statusColor + '; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">' + statusBadge + '</div>',
          '      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">',
          '        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; width: 40%;">Notice Reference:</td><td style="padding: 6px 0; font-weight: 600;">' + noticeId + '</td></tr>',
          (artifactId && artifactId !== 'N/A' ? '        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Consent Artifact ID:</td><td style="padding: 6px 0; font-family: monospace; color: #2563eb; font-weight: 600;">' + artifactId + '</td></tr>' : ''),
          '        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Specified Purpose:</td><td style="padding: 6px 0;">' + purpose + '</td></tr>',
          (selectedAttrs.length > 0 ? '        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Granted Attributes (' + selectedAttrs.length + '):</td><td style="padding: 6px 0; color: #16a34a; font-weight: 600;">' + selectedAttrs.join(', ') + '</td></tr>' : ''),
          (deniedAttrs.length > 0 ? '        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Denied Attributes:</td><td style="padding: 6px 0; color: #dc2626;">' + deniedAttrs.join(', ') + '</td></tr>' : ''),
          (remark ? '        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Principal Remark:</td><td style="padding: 6px 0; font-style: italic;">' + remark + '</td></tr>' : ''),
          '      </table>',
          '    </div>',
          (receiptHash && receiptHash !== 'N/A' ? [
            '    <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 18px;">',
            '      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px;">SHA-256 Digital Cryptographic Signature:</div>',
            '      <div style="font-family: monospace; font-size: 11px; color: #0f766e; word-break: break-all;">' + receiptHash + '</div>',
            '    </div>'
          ].join('\n') : ''),
          '    <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">',
          '      Secured by Data Principal Consent Manager • DPDP Act 2023 Standards Compliant',
          '    </div>',
          '  </div>',
          '</div>'
        ].join('\n');

        // ── PLAIN TEXT FALLBACK ────────────────────────────────
        var plainText = [
          '=== DPDP ACT 2023 DIGITAL CONSENT STATUS UPDATE ===',
          'Decision: ' + statusBadge,
          'Notice ID: ' + noticeId,
          (artifactId !== 'N/A' ? 'Artifact ID: ' + artifactId : ''),
          'Data Principal: ' + principalName,
          'Purpose: ' + purpose,
          (selectedAttrs.length > 0 ? 'Granted Attributes: ' + selectedAttrs.join(', ') : ''),
          (deniedAttrs.length > 0 ? 'Denied Attributes: ' + deniedAttrs.join(', ') : ''),
          (receiptHash !== 'N/A' ? 'Digital Signature: ' + receiptHash : ''),
          '==================================================='
        ].filter(Boolean).join('\n');

        // Reply directly on the existing thread in Gmail
        thread.reply(plainText, {
          htmlBody: htmlBody,
          name: 'DPDP Privacy Portal'
        });

        Logger.log('[NOTIF-REPLIED] Replied on thread ' + item.thread_id + ' for notice ' + noticeId + ' (' + action + ')');

        // Acknowledge notification to backend
        UrlFetchApp.fetch(baseUrl + '/api/notifications/' + item.id + '/ack', {
          method: 'post',
          muteHttpExceptions: true
        });

      } catch (err) {
        Logger.log('[NOTIF-ERROR] Failed to reply on thread ' + item.thread_id + ': ' + err.toString());
      }
    });

    Logger.log('=== Dispatch Complete ===');
  } catch (e) {
    Logger.log('[NOTIF-ERROR] Error checking pending notifications: ' + e.toString());
  }
}
