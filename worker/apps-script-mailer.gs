/**
 * Vectr mail relay — Google Apps Script (paste into script.google.com, see README).
 * The Cloudflare Worker POSTs { secret, to, replyTo, subject, text, html } here and this
 * sends it from your Google Workspace mailbox.
 *
 * Script property required (Project Settings → Script properties):
 *   MAIL_SECRET   a long random string; the same value goes in Cloudflare as MAIL_WEBHOOK_SECRET
 */
var SENDER_NAME = 'Vectr website';
var FROM_ALIAS = ''; // optional: a "Send mail as" alias set up in Gmail, e.g. 'info@vectr.uk'

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');
    if (!secret || body.secret !== secret) return out_({ ok: false, error: 'unauthorized' });

    if (!body.to || !body.subject || !body.text) return out_({ ok: false, error: 'bad_request' });
    var options = { name: SENDER_NAME, htmlBody: body.html || undefined, replyTo: body.replyTo || undefined };
    if (FROM_ALIAS) options.from = FROM_ALIAS;
    GmailApp.sendEmail(String(body.to), String(body.subject), String(body.text), options);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
