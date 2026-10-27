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
// Mail sent to these addresses goes to this same mailbox (aliases of the sending account). Gmail files
// mail you send to yourself under Sent only, so these are moved to the Inbox, unread and starred.
var INBOX_FOR = ['info@vectr.uk'];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');
    if (!secret || body.secret !== secret) return out_({ ok: false, error: 'unauthorized' });

    if (!body.to || !body.subject || !body.text) return out_({ ok: false, error: 'bad_request' });
    var options = { name: SENDER_NAME, htmlBody: body.html || undefined, replyTo: body.replyTo || undefined };
    if (FROM_ALIAS) options.from = FROM_ALIAS;
    GmailApp.sendEmail(String(body.to), String(body.subject), String(body.text), options);
    if (INBOX_FOR.indexOf(String(body.to).toLowerCase()) !== -1) surfaceInInbox_(String(body.to), String(body.subject));
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

// Finds the message we just sent and puts it in the Inbox as an unread, starred conversation.
function surfaceInInbox_(to, subject) {
  try {
    var query = 'in:sent to:' + to + ' newer_than:1d subject:"' + subject.replace(/["\\]/g, ' ') + '"';
    for (var attempt = 0; attempt < 4; attempt++) {
      var threads = GmailApp.search(query, 0, 1);
      if (threads.length) {
        var thread = threads[0];
        thread.moveToInbox();
        thread.markUnread();
        var msgs = thread.getMessages();
        msgs[msgs.length - 1].star();
        return;
      }
      Utilities.sleep(1500); // the sent message can take a moment to be searchable
    }
  } catch (err) {
    // Never fail the request just because tidying the inbox didn't work.
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
