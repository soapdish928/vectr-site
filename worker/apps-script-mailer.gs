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

// Calls are added to this calendar (by name); falls back to your default calendar if it isn't found.
var CALENDAR_NAME = 'Vectr';
var TIMEZONE = 'Europe/London';
var REMINDER_MINUTES = 30;
// The form only asks for a part of the day, so each call becomes a window you can drag to a real time.
var SLOT_WINDOWS = {
  morning: ['09:00', '12:00'],
  afternoon: ['12:00', '17:00'],
  evening: ['17:00', '19:00']
};
var DEFAULT_WINDOW = ['09:00', '17:00']; // used when no time of day was chosen

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
    if (body.event) addCalendarEvent_(body.event);
    else console.log('No calendar event in this request (Worker may not be on the latest version).');
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
    console.error('Inbox tidy failed: ' + err);
  }
}

// Adds the call to Google Calendar. Never fails the request: the email has already been sent.
function addCalendarEvent_(ev) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ev.date))) return;
    var win = SLOT_WINDOWS[ev.slot] || DEFAULT_WINDOW;
    var start = Utilities.parseDate(ev.date + ' ' + win[0], TIMEZONE, 'yyyy-MM-dd HH:mm');
    var end = Utilities.parseDate(ev.date + ' ' + win[1], TIMEZONE, 'yyyy-MM-dd HH:mm');
    var cals = CalendarApp.getCalendarsByName(CALENDAR_NAME);
    var cal = cals.length ? cals[0] : CalendarApp.getDefaultCalendar();
    var event = cal.createEvent(String(ev.title).slice(0, 200), start, end, { description: String(ev.description).slice(0, 4000) });
    event.addPopupReminder(REMINDER_MINUTES);
    console.log('Calendar event created on "' + cal.getName() + '": ' + ev.title + ' ' + start);
  } catch (err) {
    // Shown under Executions → Logs in Apps Script.
    console.error('Calendar event failed: ' + err);
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
