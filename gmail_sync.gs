/**
 * ============================================================
 *  Data Principal Consent Manager — Google Apps Script
 *  Gmail Auto-Sync to FastAPI Backend via Cloudflare Tunnel
 * ============================================================
 *
 * HOW TO USE:
 *  1. Open https://script.google.com
 *  2. Paste this entire script
 *  3. In Project Settings > Script Properties, add:
 *       GMAIL_WEBHOOK_SECRET = same value as FastAPI .env
 *
 *     Optional:
 *       BACKEND_BASE_URL = current https://*.trycloudflare.com URL
 *
 *  4. Run syncConsentEmails() manually once and verify it succeeds
 *  5. Run setupTrigger() ONCE to install the 5-minute auto-sync trigger
 *
 * FUNCTIONS:
 *  syncConsentEmails() — main sync
 *  setupTrigger()      — install 5-min recurring trigger
 *  removeTrigger()     — disable auto-sync
 *  testSyncNow()       — manual test
 *  clearSyncHistory()  — reset email deduplication only
 *  checkSyncStatus()   — view sync status
 * ============================================================
 */


// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

// Current Cloudflare Quick Tunnel.
//
// You can override this without editing this code by adding
// BACKEND_BASE_URL inside:
// Project Settings → Script Properties
//
var DEFAULT_BACKEND_BASE_URL =
  "https://lanka-midlands-parties-first.trycloudflare.com";


// Number of days of Gmail history to inspect.
var LOOKBACK_DAYS = 7;


// ─────────────────────────────────────────────────────────────
// BACKEND CONFIG HELPERS
// ─────────────────────────────────────────────────────────────

function getBackendBaseUrl() {

  var configured =
    PropertiesService
      .getScriptProperties()
      .getProperty('BACKEND_BASE_URL');

  var baseUrl =
    (configured || DEFAULT_BACKEND_BASE_URL || '').trim();

  if (!baseUrl) {
    throw new Error(
      'Backend URL is not configured. ' +
      'Add BACKEND_BASE_URL in Project Settings > Script Properties.'
    );
  }

  // Remove trailing slash
  return baseUrl.replace(/\/+$/, '');
}


function getBackendWebhookUrl() {

  return getBackendBaseUrl() + '/api/gmail-webhook';

}


// ─────────────────────────────────────────────────────────────
// WEBHOOK SECRET
// ─────────────────────────────────────────────────────────────

function getWebhookSecret() {

  var secret =
    PropertiesService
      .getScriptProperties()
      .getProperty('GMAIL_WEBHOOK_SECRET');

  if (!secret || !secret.trim()) {

    throw new Error(
      'GMAIL_WEBHOOK_SECRET is missing. ' +
      'Add it in Project Settings > Script Properties.'
    );

  }

  return secret.trim();

}


// ─────────────────────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────────────────────

function extractEmailAddress(raw) {

  raw = String(raw || '').trim();

  // Example:
  // ABC Bank <privacy@example.com>
  var angleMatch =
    raw.match(/<([^<>@\s]+@[^<>@\s]+)>/);

  if (angleMatch) {

    return angleMatch[1]
      .trim()
      .toLowerCase();

  }


  // Plain email fallback
  var plainMatch =
    raw.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  return plainMatch
    ? plainMatch[0].toLowerCase()
    : '';

}


function isValidEmail(value) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(String(value || '').trim());

}


// ─────────────────────────────────────────────────────────────
// GMAIL SEARCH QUERY
// ─────────────────────────────────────────────────────────────

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
// MAIN EMAIL SYNC
// ─────────────────────────────────────────────────────────────

function syncConsentEmails() {

  var props =
    PropertiesService.getScriptProperties();

  var backendWebhookUrl;
  var webhookSecret;


  // ── LOAD CONFIGURATION ────────────────────────────────────

  try {

    backendWebhookUrl =
      getBackendWebhookUrl();

    webhookSecret =
      getWebhookSecret();

  } catch (configError) {

    Logger.log(
      '[CONFIG-ERROR] ' +
      configError.toString()
    );

    return;

  }


  // ── CACHE VERSION ─────────────────────────────────────────

  if (
    props.getProperty(
      'SYNC_ENGINE_CACHE_VERSION'
    ) !== '3.0'
  ) {

    props.deleteProperty(
      'SYNCED_MESSAGE_IDS'
    );

    props.setProperty(
      'SYNC_ENGINE_CACHE_VERSION',
      '3.0'
    );

    Logger.log(
      '[UPGRADE] Refreshed sync deduplication index.'
    );

  }


  // ── BUILD DATE FILTER ─────────────────────────────────────

  var cutoff = new Date();

  cutoff.setDate(
    cutoff.getDate() - LOOKBACK_DAYS
  );


  var dateFilter =
    ' after:' +
    Utilities.formatDate(
      cutoff,
      'UTC',
      'yyyy/MM/dd'
    );


  // Search consent related inbox threads.
  var searchQueries = [

    'in:inbox (' +
      GMAIL_SEARCH_QUERY +
      ')' +
      dateFilter

  ];


  var syncedCount = 0;
  var skippedCount = 0;
  var errorCount = 0;


  // ── SEARCH GMAIL ──────────────────────────────────────────

  searchQueries.forEach(
    function(query) {

      var threads = [];


      try {

        threads =
          GmailApp.search(
            query,
            0,
            50
          );

      } catch (e) {

        Logger.log(
          '[ERROR] Gmail search failed: ' +
          e
        );

        return;

      }


      // ── PROCESS THREADS ───────────────────────────────────

      threads.forEach(
        function(thread) {

          thread
            .getMessages()
            .forEach(
              function(msg) {


                var msgId =
                  msg.getId();


                // ── DEDUPLICATION ──────────────────────────

                if (
                  props.getProperty(
                    'synced_' + msgId
                  )
                ) {

                  skippedCount++;

                  return;

                }


                // ── EXTRACT MESSAGE FIELDS ─────────────────

                var fromRaw =
                  msg.getFrom() || '';

                var toRaw =
                  msg.getTo() || '';

                var ccRaw =
                  msg.getCc() || '';

                var subject =
                  msg.getSubject() || '';

                var bodyText =
                  msg.getPlainBody() || '';

                var date =
                  msg.getDate();


                // Ignore completely empty emails.
                if (
                  !bodyText &&
                  !subject
                ) {

                  skippedCount++;

                  return;

                }


                // ── EXTRACT CONSENT TOKEN ──────────────────
                //
                // Supports:
                //
                // http://localhost:5173/request/tok_xxx
                //
                // https://example.com/request/tok_xxx
                //
                // /request/tok_xxx
                //

                var tokenMatch =
                  bodyText.match(
                    /\/request\/([a-zA-Z0-9_\-]+)/
                  );


                var extractedToken =
                  tokenMatch
                    ? tokenMatch[1]
                    : null;


                // ── RESOLVE FIDUCIARY NAME ─────────────────

                var fiduciaryName = '';


                if (
                  fromRaw.indexOf('<') > -1
                ) {

                  fiduciaryName =
                    fromRaw
                      .split('<')[0]
                      .replace(/"/g, '')
                      .trim();

                } else if (
                  fromRaw.indexOf('@') > -1
                ) {

                  fiduciaryName =
                    fromRaw
                      .split('@')[0]
                      .replace(
                        /[\._]/g,
                        ' '
                      );


                  fiduciaryName =
                    fiduciaryName.replace(
                      /\b\w/g,
                      function(c) {

                        return c.toUpperCase();

                      }
                    );

                } else {

                  fiduciaryName =
                    fromRaw ||
                    'Unknown Fiduciary';

                }


                // ── DATA PRINCIPAL RECIPIENT ───────────────

                var effectiveTo =
                  toRaw ||
                  ccRaw ||
                  fromRaw;


                // ── BUILD FASTAPI PAYLOAD ─────────────────

                var payload = {

                  from_address:
                    fromRaw,

                  to_address:
                    effectiveTo,

                  subject:
                    subject,

                  body_text:
                    bodyText,

                  fiduciary_name:
                    fiduciaryName,

                  purpose:
                    subject,

                  sent_date:
                    date
                      ? Utilities.formatDate(
                          date,
                          'UTC',
                          "EEEE, MMMM dd, yyyy"
                        )
                      : '',

                  extracted_token:
                    extractedToken,

                  thread_id:
                    thread.getId(),

                  message_id:
                    msgId

                };


                // ── HTTP OPTIONS ───────────────────────────

                var options = {

                  method:
                    'post',

                  contentType:
                    'application/json',

                  headers: {

                    'X-Webhook-Secret':
                      webhookSecret

                  },

                  payload:
                    JSON.stringify(
                      payload
                    ),

                  muteHttpExceptions:
                    true

                };


                // ── POST TO FASTAPI ───────────────────────

                try {

                  Logger.log(
                    '[DEBUG] Webhook URL: ' +
                    backendWebhookUrl
                  );


                  var response =
                    UrlFetchApp.fetch(
                      backendWebhookUrl,
                      options
                    );


                  var statusCode =
                    response
                      .getResponseCode();


                  var responseBody =
                    response
                      .getContentText();


                  // ── SUCCESS ──────────────────────────────

                  if (
                    statusCode === 200 ||
                    statusCode === 201
                  ) {

                    props.setProperty(
                      'synced_' + msgId,
                      new Date().toISOString()
                    );


                    syncedCount++;


                    try {

                      var parsed =
                        JSON.parse(
                          responseBody
                        );


                      var token =
                        parsed.token ||
                        extractedToken ||
                        'unknown';


                      var consentLink =
                        parsed.link ||
                        (
                          'http://localhost:5173/request/' +
                          token
                        );


                      Logger.log(
                        '[SYNCED] "' +
                        subject +
                        '"'
                      );


                      Logger.log(
                        '         → Consent Link: ' +
                        consentLink
                      );


                      Logger.log(
                        '         → Token: ' +
                        token
                      );


                      Logger.log(
                        '         → Principal: ' +
                        (
                          parsed.dataPrincipal
                            ? parsed
                                .dataPrincipal
                                .email
                            : effectiveTo
                        )
                      );


                    } catch (parseError) {

                      Logger.log(
                        '[SYNCED] "' +
                        subject +
                        '" (HTTP ' +
                        statusCode +
                        ')'
                      );

                    }


                  } else {

                    // ── HTTP ERROR ─────────────────────────

                    errorCount++;


                    Logger.log(
                      '[WARN] HTTP ' +
                      statusCode +
                      ' for "' +
                      subject +
                      '": ' +
                      responseBody.substring(
                        0,
                        300
                      )
                    );

                  }


                } catch (e) {

                  errorCount++;


                  Logger.log(
                    '[ERROR] Failed to sync "' +
                    subject +
                    '": ' +
                    e.toString()
                  );

                }


              }
            );

        }
      );

    }
  );


  // ── SYNC SUMMARY ──────────────────────────────────────────

  Logger.log('');

  Logger.log(
    '=== Sync Run Complete ==='
  );

  Logger.log(
    '  Synced:  ' +
    syncedCount
  );

  Logger.log(
    '  Skipped: ' +
    skippedCount +
    ' (already synced)'
  );

  Logger.log(
    '  Errors:  ' +
    errorCount
  );

  Logger.log(
    '========================'
  );

  Logger.log('');


  // After email ingestion,
  // check for pending consent receipts.

  dispatchPendingConsentReplies();

}


// ─────────────────────────────────────────────────────────────
// SETUP AUTOMATIC TRIGGER
// ─────────────────────────────────────────────────────────────

function setupTrigger() {

  // Remove duplicate triggers first.
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(t) {

        if (
          t.getHandlerFunction() ===
          'syncConsentEmails'
        ) {

          ScriptApp.deleteTrigger(t);

        }

      }
    );


  // Install recurring trigger.
  ScriptApp
    .newTrigger(
      'syncConsentEmails'
    )
    .timeBased()
    .everyMinutes(5)
    .create();


  Logger.log(
    'Trigger installed!'
  );

  Logger.log(
    'syncConsentEmails() will run every 5 minutes.'
  );

}


// ─────────────────────────────────────────────────────────────
// REMOVE AUTOMATIC TRIGGER
// ─────────────────────────────────────────────────────────────

function removeTrigger() {

  var removed = 0;


  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(t) {

        if (
          t.getHandlerFunction() ===
          'syncConsentEmails'
        ) {

          ScriptApp.deleteTrigger(t);

          removed++;

        }

      }
    );


  Logger.log(
    'Removed ' +
    removed +
    ' trigger(s).'
  );

}


// ─────────────────────────────────────────────────────────────
// CLEAR SYNC HISTORY
// ─────────────────────────────────────────────────────────────
//
// IMPORTANT:
// This does NOT delete GMAIL_WEBHOOK_SECRET.
// This does NOT delete BACKEND_BASE_URL.
//

function clearSyncHistory() {

  var props =
    PropertiesService
      .getScriptProperties();


  var allProps =
    props.getProperties();


  var removed = 0;


  Object
    .keys(allProps)
    .forEach(
      function(key) {

        if (
          key.indexOf(
            'synced_'
          ) === 0 ||

          key ===
            'SYNCED_MESSAGE_IDS' ||

          key ===
            'SYNC_ENGINE_CACHE_VERSION'
        ) {

          props.deleteProperty(
            key
          );

          removed++;

        }

      }
    );


  Logger.log(
    'Sync history cleared (' +
    removed +
    ' key(s) removed).'
  );


  Logger.log(
    'GMAIL_WEBHOOK_SECRET and BACKEND_BASE_URL were preserved.'
  );

}


// ─────────────────────────────────────────────────────────────
// MANUAL TEST
// ─────────────────────────────────────────────────────────────

function testSyncNow() {

  Logger.log(
    '=== MANUAL TEST SYNC ==='
  );


  Logger.log(
    'Webhook URL: ' +
    getBackendWebhookUrl()
  );


  Logger.log(
    'Scanning last ' +
    LOOKBACK_DAYS +
    ' days of Gmail...'
  );


  syncConsentEmails();

}


// ─────────────────────────────────────────────────────────────
// STATUS CHECK
// ─────────────────────────────────────────────────────────────

function checkSyncStatus() {

  var props =
    PropertiesService
      .getScriptProperties()
      .getProperties();


  var count =
    Object
      .keys(props)
      .filter(
        function(k) {

          return (
            k.indexOf(
              'synced_'
            ) === 0
          );

        }
      )
      .length;


  var triggers =
    ScriptApp
      .getProjectTriggers();


  var hasAutoSync =
    triggers.some(
      function(t) {

        return (
          t.getHandlerFunction() ===
          'syncConsentEmails'
        );

      }
    );


  Logger.log(
    '=== Consent Manager Sync Status ==='
  );


  Logger.log(
    'Emails synced to backend: ' +
    count
  );


  Logger.log(
    'Auto-trigger active: ' +
    (
      hasAutoSync
        ? 'YES (every 5 min)'
        : 'NO — run setupTrigger()'
    )
  );


  Logger.log(
    'Backend URL: ' +
    getBackendBaseUrl()
  );


  Logger.log(
    'Lookback window: Last ' +
    LOOKBACK_DAYS +
    ' days'
  );


  Logger.log(
    '==================================='
  );

}


// ─────────────────────────────────────────────────────────────
// DISPATCH PENDING CONSENT RECEIPTS
// ─────────────────────────────────────────────────────────────

function dispatchPendingConsentReplies() {

  var baseUrl;
  var pendingUrl;
  var webhookSecret;


  // ── LOAD CONFIG ───────────────────────────────────────────

  try {

    baseUrl =
      getBackendBaseUrl();


    pendingUrl =
      baseUrl +
      '/api/notifications/pending';


    webhookSecret =
      getWebhookSecret();


    Logger.log(
      '[DEBUG] Pending URL: ' +
      pendingUrl
    );


    // ── FETCH PENDING NOTIFICATIONS ─────────────────────────

    var response =
      UrlFetchApp.fetch(
        pendingUrl,
        {

          method:
            'get',

          headers: {

            'X-Webhook-Secret':
              webhookSecret

          },

          muteHttpExceptions:
            true

        }
      );


    var pendingStatus =
      response
        .getResponseCode();


    if (
      pendingStatus !== 200
    ) {

      Logger.log(
        '[NOTIF] Status ' +
        pendingStatus +
        ' fetching pending notifications'
      );


      Logger.log(
        '[NOTIF] Response: ' +
        response
          .getContentText()
          .substring(
            0,
            300
          )
      );


      return;

    }


    var pendingList =
      JSON.parse(
        response.getContentText()
      );


    if (
      !pendingList ||
      pendingList.length === 0
    ) {

      Logger.log(
        '[NOTIF] No pending notifications.'
      );

      return;

    }


    Logger.log(
      '=== Dispatching Consent Auto-Replies ==='
    );


    Logger.log(
      'Found ' +
      pendingList.length +
      ' pending notification(s).'
    );


    // ── PROCESS EACH NOTIFICATION ───────────────────────────

    pendingList.forEach(
      function(item) {


        var details =
          item.details || {};


        var action =
          item.action ||
          'PROCESSED';


        var isGrievance =
          (
            action ===
            'GRIEVANCE_FILED'
          );


        var isGranted =
          (
            action ===
            'GRANTED'
          );


        var artifactId =
          item.artifact_id ||

          (
            details.artifact
              ? details
                  .artifact
                  .consentId
              : null
          ) ||

          details.ticketId ||

          'N/A';


        var principalName =
          details.principalName ||
          'Data Principal';


        var fiduciaryName =
          item.fiduciary_name ||
          details.fiduciaryName ||
          'Data Fiduciary';


        var noticeId =
          item.notice_id ||
          details.noticeId ||
          'N/A';


        var purpose =
          details.purpose ||
          'Data Processing';


        var token =
          item.token ||
          details.token ||
          '';


        var originalSubject =
          item.original_subject ||
          details.originalSubject ||
          item.subject ||
          '';


        // Never use a hardcoded fallback email.
        var recipientEmail =
          extractEmailAddress(

            item.recipient_email ||

            details.recipientEmail ||

            ''

          );


        var selectedAttrs =
          details.selectedAttributes ||

          (
            details.artifact
              ? details
                  .artifact
                  .grantedAttributes
              : []
          ) ||

          [];


        var deniedAttrs =
          details.deniedAttributes ||

          (
            details.artifact
              ? details
                  .artifact
                  .deniedAttributes
              : []
          ) ||

          [];


        var receiptHash =
          (
            details.artifact &&
            (
              details
                .artifact
                .sha256IntegrityHash ||

              details
                .artifact
                .receiptHash
            )
          )
            ? (
                details
                  .artifact
                  .sha256IntegrityHash ||

                details
                  .artifact
                  .receiptHash
              )

            : (
                details
                  .sha256IntegrityHash ||

                'N/A'
              );


        var remark =
          details.remark ||

          (
            details.artifact
              ? details
                  .artifact
                  .customNote
              : ''
          ) ||

          '';


        var htmlBody = '';

        var plainText = '';

        var replySubject = '';


        // ───────────────────────────────────────────────────
        // GRIEVANCE EMAIL
        // ───────────────────────────────────────────────────

        if (isGrievance) {


          var ticketId =
            artifactId !== 'N/A'
              ? artifactId
              : (
                  'GRV-2026-' +
                  Math.floor(
                    1000 +
                    Math.random() *
                    9000
                  )
                );


          var gType =
            details.grievanceType ||
            'Unauthorized / Excess Processing';


          var gDesc =
            details.description ||
            remark ||
            'Privacy grievance lodged by the Data Principal.';


          var assocConsent =
            item.consent_id ||
            details.consentId ||
            'N/A';


          replySubject =
            item.subject ||

            (
              '[PRIVACY GRIEVANCE - ' +
              ticketId +
              '] ' +
              fiduciaryName
            );


          htmlBody = [

            '<div style="font-family:Arial,sans-serif;max-width:620px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;color:#1e293b;background:#ffffff;">',

            '<div style="background:#991b1b;color:#ffffff;padding:18px 24px;">',

            '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#fecaca;font-weight:600;">DPDP Privacy Grievance</div>',

            '<div style="font-size:16px;font-weight:700;margin-top:4px;">Formal Privacy Grievance</div>',

            '</div>',

            '<div style="padding:24px;">',

            '<p style="font-size:14px;line-height:1.6;">Attention: <strong>' +
              fiduciaryName +
              '</strong>,</p>',

            '<p style="font-size:14px;line-height:1.6;color:#334155;">A privacy grievance has been submitted by Data Principal <strong>' +
              principalName +
              '</strong>.</p>',

            '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">',

            '<p><strong>Ticket:</strong> ' +
              ticketId +
              '</p>',

            '<p><strong>Category:</strong> ' +
              gType +
              '</p>',

            '<p><strong>Associated Consent:</strong> ' +
              assocConsent +
              '</p>',

            '<p><strong>Statement:</strong> ' +
              gDesc +
              '</p>',

            '</div>',

            '<p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:20px;">Dispatched via Data Principal Consent Manager</p>',

            '</div>',

            '</div>'

          ].join('\n');


          plainText = [

            '=== PRIVACY GRIEVANCE NOTICE ===',

            'Ticket Number: ' +
              ticketId,

            'Data Fiduciary: ' +
              fiduciaryName,

            'Data Principal: ' +
              principalName,

            'Grievance Category: ' +
              gType,

            'Associated Consent ID: ' +
              assocConsent,

            'Principal Statement: ' +
              gDesc,

            '================================'

          ].join('\n');


        } else {


          // ─────────────────────────────────────────────────
          // CONSENT GRANTED / DENIED RECEIPT
          // ─────────────────────────────────────────────────

          var statusColor =
            isGranted
              ? '#10b981'
              : '#ef4444';


          var statusBadge =
            isGranted
              ? 'CONSENT GRANTED'
              : 'CONSENT DENIED';


          replySubject =
            item.subject ||

            (
              'Re: ' +
              (
                originalSubject ||

                (
                  'Consent Notice ' +
                  noticeId
                )
              )
            );


          htmlBody = [

            '<div style="font-family:Arial,sans-serif;max-width:620px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;color:#1e293b;background:#ffffff;">',

            '<div style="background:#0f172a;color:#ffffff;padding:18px 24px;">',

            '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8;font-weight:600;">DPDP Consent Response</div>',

            '<div style="font-size:16px;font-weight:700;margin-top:4px;">Digital Consent Status Confirmation</div>',

            '</div>',

            '<div style="padding:24px;">',

            '<p style="font-size:14px;line-height:1.6;">Dear <strong>' +
              fiduciaryName +
              '</strong>,</p>',

            '<p style="font-size:14px;line-height:1.6;color:#334155;">The Data Principal <strong>' +
              principalName +
              '</strong> has recorded a decision regarding your consent request.</p>',

            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">',

            '<div style="display:inline-block;background:' +
              statusColor +
              ';color:#ffffff;padding:4px 12px;border-radius:16px;font-size:11px;font-weight:700;margin-bottom:12px;">' +
              statusBadge +
              '</div>',

            '<p><strong>Notice Reference:</strong> ' +
              noticeId +
              '</p>',

            (
              artifactId &&
              artifactId !== 'N/A'

                ? '<p><strong>Consent Artifact ID:</strong> <span style="font-family:monospace;">' +
                  artifactId +
                  '</span></p>'

                : ''
            ),

            '<p><strong>Specified Purpose:</strong> ' +
              purpose +
              '</p>',

            (
              selectedAttrs.length > 0

                ? '<p><strong>Granted Attributes:</strong> ' +
                  selectedAttrs.join(', ') +
                  '</p>'

                : ''
            ),

            (
              deniedAttrs.length > 0

                ? '<p><strong>Denied Attributes:</strong> ' +
                  deniedAttrs.join(', ') +
                  '</p>'

                : ''
            ),

            (
              remark

                ? '<p><strong>Principal Remark:</strong> ' +
                  remark +
                  '</p>'

                : ''
            ),

            '</div>',

            (
              receiptHash &&
              receiptHash !== 'N/A'

                ? '<div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:12px;margin-bottom:18px;">' +

                  '<div style="font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:4px;">SHA-256 Integrity Hash</div>' +

                  '<div style="font-family:monospace;font-size:11px;color:#0f766e;word-break:break-all;">' +

                  receiptHash +

                  '</div>' +

                  '</div>'

                : ''
            ),

            '<div style="border-top:1px solid #e2e8f0;padding-top:14px;font-size:11px;color:#94a3b8;text-align:center;">',

            'Generated by Data Principal Consent Manager',

            '</div>',

            '</div>',

            '</div>'

          ].join('\n');


          plainText = [

            '=== DIGITAL CONSENT STATUS UPDATE ===',

            'Decision: ' +
              statusBadge,

            'Notice ID: ' +
              noticeId,

            (
              artifactId !== 'N/A'
                ? 'Artifact ID: ' +
                  artifactId
                : ''
            ),

            'Data Principal: ' +
              principalName,

            'Purpose: ' +
              purpose,

            (
              selectedAttrs.length > 0
                ? 'Granted Attributes: ' +
                  selectedAttrs.join(', ')
                : ''
            ),

            (
              deniedAttrs.length > 0
                ? 'Denied Attributes: ' +
                  deniedAttrs.join(', ')
                : ''
            ),

            (
              receiptHash !== 'N/A'
                ? 'SHA-256 Integrity Hash: ' +
                  receiptHash
                : ''
            ),

            '====================================='

          ]
          .filter(Boolean)
          .join('\n');

        }


        // ───────────────────────────────────────────────────
        // FIND ORIGINAL GMAIL THREAD
        // ───────────────────────────────────────────────────

        try {


          var thread = null;


          // First preference:
          // use exact Gmail thread ID returned by backend.

          if (item.thread_id) {

            try {

              thread =
                GmailApp.getThreadById(
                  item.thread_id
                );

            } catch (
              threadError
            ) {

              Logger.log(
                '[WARN] getThreadById failed: ' +
                threadError
              );

            }

          }


          // ── FALLBACK THREAD SEARCH ───────────────────────

          if (!thread) {

            var searchParts = [];


            if (token) {

              searchParts.push(
                '"' +
                token +
                '"'
              );

            }


            if (
              noticeId &&
              noticeId !== 'N/A'
            ) {

              searchParts.push(
                '"' +
                noticeId +
                '"'
              );

            }


            var cleanSubj =
              originalSubject
                .replace(
                  /^Re:\s*/i,
                  ''
                )
                .trim();


            if (
              cleanSubj.length > 5
            ) {

              searchParts.push(
                'subject:"' +
                cleanSubj +
                '"'
              );

            }


            if (
              searchParts.length > 0
            ) {

              var found =
                GmailApp.search(
                  searchParts.join(
                    ' OR '
                  ),
                  0,
                  3
                );


              if (
                found &&
                found.length > 0
              ) {

                thread =
                  found[0];


                Logger.log(
                  '[FALLBACK-MATCH] Found Gmail thread for notice ' +
                  noticeId
                );

              }

            }

          }


          // ─────────────────────────────────────────────────
          // DISPATCH CONSENT RECEIPT
          // ─────────────────────────────────────────────────

          var delivered = false;


          // BEST METHOD:
          // Reply directly to the exact original Gmail message.
          //
          // This makes sure the receipt goes to the Data
          // Fiduciary who originally sent the consent request.

          if (
            item.message_id
          ) {

            try {

              var originalMessage =
                GmailApp.getMessageById(
                  item.message_id
                );


              if (originalMessage) {

                originalMessage.reply(
                  plainText,
                  {

                    htmlBody:
                      htmlBody,

                    name:
                      'DPDP Privacy Portal'

                  }
                );


                Logger.log(
                  '[NOTIF-REPLIED] Replied to original message ' +
                  item.message_id +
                  ' for notice ' +
                  noticeId +
                  ' (' +
                  action +
                  ')'
                );


                delivered = true;

              }


            } catch (
              messageReplyError
            ) {

              Logger.log(
                '[WARN] Original-message reply failed: ' +
                messageReplyError.toString()
              );

            }

          }


          // ── THREAD FALLBACK ──────────────────────────────

          if (
            !delivered &&
            thread
          ) {

            thread.reply(
              plainText,
              {

                htmlBody:
                  htmlBody,

                name:
                  'DPDP Privacy Portal'

              }
            );


            Logger.log(
              '[NOTIF-REPLIED] Replied on Gmail thread ' +
              thread.getId() +
              ' for notice ' +
              noticeId +
              ' (' +
              action +
              ')'
            );


            delivered = true;

          }


          // ── DIRECT EMAIL FALLBACK ────────────────────────

          if (!delivered) {


            if (
              !isValidEmail(
                recipientEmail
              )
            ) {

              Logger.log(
                '[NOTIF-ERROR] No valid original recipient email for notification ' +
                item.id +
                '. Notification was NOT acknowledged.'
              );


              return;

            }


            GmailApp.sendEmail(
              recipientEmail,
              replySubject,
              plainText,
              {

                htmlBody:
                  htmlBody,

                name:
                  'DPDP Privacy Portal'

              }
            );


            Logger.log(
              '[NOTIF-SENT] Direct email sent to ' +
              recipientEmail +
              ' for notice ' +
              noticeId
            );


            delivered = true;

          }


          // ─────────────────────────────────────────────────
          // ACKNOWLEDGE DELIVERY TO BACKEND
          // ─────────────────────────────────────────────────
          //
          // Only acknowledge AFTER Gmail successfully sends
          // the receipt.
          //

          if (delivered) {


            var ackUrl =
              baseUrl +
              '/api/notifications/' +
              item.id +
              '/ack';


            var ackResponse =
              UrlFetchApp.fetch(
                ackUrl,
                {

                  method:
                    'post',

                  headers: {

                    'X-Webhook-Secret':
                      webhookSecret

                  },

                  muteHttpExceptions:
                    true

                }
              );


            var ackStatus =
              ackResponse
                .getResponseCode();


            if (
              ackStatus >= 200 &&
              ackStatus < 300
            ) {

              Logger.log(
                '[NOTIF-ACK] Notification ' +
                item.id +
                ' marked SENT.'
              );

            } else {

              Logger.log(
                '[NOTIF-WARN] Gmail delivery succeeded but ACK failed for ' +
                item.id +
                ' (HTTP ' +
                ackStatus +
                ').'
              );

            }

          }


        } catch (err) {

          Logger.log(
            '[NOTIF-ERROR] Failed to dispatch notification ' +
            item.id +
            ': ' +
            err.toString()
          );

        }


      }
    );


    Logger.log(
      '=== Dispatch Complete ==='
    );


  } catch (e) {

    Logger.log(
      '[NOTIF-ERROR] Error checking pending notifications: ' +
      e.toString()
    );

  }

}