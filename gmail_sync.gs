/**
 * 1-Click Google Apps Script for Gmail Auto-Sync
 * Paste this script in https://script.google.com to auto-sync emails sent from your Gmail account!
 */

function syncSentConsentEmails() {
  // Search for recent emails sent containing consent notices or localhost links
  var threads = GmailApp.search('subject:"Consent" OR subject:"Action Required" OR "localhost:5173"');
  
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      
      var fromRaw = msg.getFrom() || "";
      var fiduciaryName = fromRaw.indexOf('<') > -1 ? fromRaw.split('<')[0].replace(/"/g, '').trim() : fromRaw.split('@')[0];

      var payload = {
        "from_address": msg.getFrom(),
        "to_address": msg.getTo(),
        "subject": msg.getSubject(),
        "body_text": msg.getPlainBody(),
        "fiduciary_name": fiduciaryName
      };
      
      var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
      };
      
      try {
        // Send to Consent Manager FastAPI Backend Webhook via Cloudflare Tunnel
        var response = UrlFetchApp.fetch("https://submitted-img-sort-gis.trycloudflare.com/api/gmail-webhook", options);
        Logger.log("Synced message: " + msg.getSubject() + " -> " + response.getContentText());
      } catch (e) {
        Logger.log("Sync Exception: " + e);
      }
    }
  }
}
