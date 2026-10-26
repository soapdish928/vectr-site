/**
 * POST /api/contact — handled by the Worker in worker/index.ts
 *
 * 1. Rejects bots (honeypot + Cloudflare Turnstile).
 * 2. Validates the enquiry on the server (never trust the browser).
 * 3. Emails it to CONTACT_TO via Resend, with Reply-To set to the customer.
 * 4. Optionally sends the customer a short confirmation.
 *
 * Secrets (Cloudflare dashboard → Workers & Pages → vectr-site → Settings → Variables and Secrets):
 *   TURNSTILE_SECRET_KEY, RESEND_API_KEY
 * Plain variables (wrangler.toml [vars] or dashboard):
 *   CONTACT_TO, CONTACT_FROM, SEND_CONFIRMATION
 */

export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_PLACE_ID?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  SEND_CONFIRMATION?: string;
}

const SERVICES: Record<string, string> = {
  wifi: 'Wi-Fi & networking',
  cctv: 'CCTV & alarms',
  av: 'Audio & video',
  community: 'Community / guest Wi-Fi',
  support: 'Support for an existing system',
  other: 'Something else',
};
const SLOTS: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Early evening' };

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Today's date in the UK as YYYY-MM-DD. */
const ukToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const ukLongDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

async function verifyTurnstile(token: string, secret: string, ip: string | null) {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const out = (await res.json()) as { success?: boolean };
  return out.success === true;
}

async function sendEmail(env: Env, payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    throw new Error('email_failed');
  }
}

export async function handleContact(request: Request, env: Env): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Invalid submission.' }, 400);
  }

  // Honeypot: pretend success so bots learn nothing.
  if (clean(form.get('company'), 100)) return json({ ok: true });

  // Spam check
  const token = clean(form.get('cf-turnstile-response'), 2048);
  if (!token || !env.TURNSTILE_SECRET_KEY) return json({ ok: false, error: 'Spam check failed.' }, 400);
  const human = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
  if (!human) return json({ ok: false, error: 'Spam check failed.' }, 400);

  // Validate
  const d = {
    firstName: clean(form.get('first_name'), 80),
    lastName: clean(form.get('last_name'), 80),
    email: clean(form.get('email'), 160),
    phone: clean(form.get('phone'), 40),
    postcode: clean(form.get('postcode'), 12).toUpperCase(),
    service: clean(form.get('service'), 20),
    date: clean(form.get('preferred_date'), 10),
    slot: clean(form.get('preferred_time'), 20),
    message: clean(form.get('message'), 3000),
    consent: clean(form.get('consent'), 10),
  };

  const missing = !d.firstName || !d.lastName || !d.email || !d.phone || !d.date || !d.consent;
  const badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email);
  const badDate = !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || d.date <= ukToday();
  if (missing) return json({ ok: false, error: 'Please complete all the required fields.' }, 400);
  if (badEmail) return json({ ok: false, error: 'Please check your email address.' }, 400);
  if (badDate) return json({ ok: false, error: 'Please choose a date from tomorrow onwards.' }, 400);

  const service = SERVICES[d.service] ?? 'Not specified';
  const slot = SLOTS[d.slot] ?? 'Any time';
  const when = `${ukLongDate(d.date)} — ${slot}`;
  const name = `${d.firstName} ${d.lastName}`;

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return json({ ok: false, error: 'Our form is temporarily unavailable.' }, 500);
  }

  const to = env.CONTACT_TO || 'info@vectr.uk';
  const from = env.CONTACT_FROM || 'Vectr website <website@vectr.uk>';

  const rows: [string, string][] = [
    ['Name', name],
    ['Email', d.email],
    ['Phone', d.phone],
    ['Postcode', d.postcode || '—'],
    ['Interested in', service],
    ['Preferred call', when],
    ['Message', d.message || '—'],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `<h2 style="font-family:Georgia,serif;font-weight:400">New enquiry from vectr.uk</h2><table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="color:#4E586A;vertical-align:top"><strong>${esc(k)}</strong></td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join('')}</table>`;

  try {
    await sendEmail(env, {
      from,
      to: [to],
      reply_to: d.email,
      subject: `Call request: ${name} — ${ukLongDate(d.date)}, ${slot.toLowerCase()}`,
      text,
      html,
    });

    if (env.SEND_CONFIRMATION === 'true') {
      const msg = `Hi ${d.firstName},\n\nThanks for getting in touch. We'll call you on ${ukLongDate(d.date)} (${slot.toLowerCase()}) on ${d.phone}.\n\nIf anything changes, just reply to this email or call 07766 822280.\n\nNick\nVectr — making technology simple\nhttps://www.vectr.uk`;
      await sendEmail(env, {
        from,
        to: [d.email],
        reply_to: to,
        subject: 'We’ve received your request — Vectr',
        text: msg,
      }).catch((e) => console.error('Confirmation email failed', e)); // don't fail the request if only this fails
    }
  } catch {
    return json({ ok: false, error: "Sorry — we couldn't send your request." }, 502);
  }

  return json({ ok: true });
}
