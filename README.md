# vectr.uk

Single-page website for Vectr, built with [Astro](https://astro.build) and hosted on **Cloudflare Workers** (static assets).
Pages are static HTML. The only server code is the contact form handler in `worker/` — it runs only for `/api/contact`.

## Project layout

```
src/data/site.ts        ← all editable copy: phone, hours, services, reviews, brands
src/components/         ← one file per section (Hero, Services, Who, Approach, Aftercare, Reviews, Contact…)
src/styles/global.css   ← colours, fonts and layout (tokens at the top)
src/assets/             ← images (Astro resizes and converts them at build time)
src/pages/              ← index (home), privacy, 404
worker/index.ts         ← routes /api/contact to the form handler; serves the 404 page
worker/contact.ts       ← form handler: Turnstile check → validate → email via Resend
public/                 ← copied as-is: _redirects, _headers, favicons, og-image, robots.txt, sitemap.xml
```

## Working on it locally

```bash
nvm install        # installs the Node version in .nvmrc (22.23.4)
npm install
npm run dev        # http://localhost:4321 — pages only (the form needs `npm run preview`)
npm run preview    # builds, then runs the site + Worker locally via Wrangler
```

For `npm run preview`, copy `.dev.vars.example` to `.dev.vars` and add a real Resend key if you want emails to send.

## Deploying

Every push to `main` deploys to production automatically. Every other branch gets its own preview URL.

```bash
git add -A
git commit -m "Describe the change"
git push
```

---

## One-time setup

### 1. GitHub
1. On github.com, create a **private** repository called `vectr-site`, with **no** README, licence or .gitignore.
2. In Terminal:
   ```bash
   cd ~/Development/vectr-site
   git remote add origin https://github.com/<your-username>/vectr-site.git
   git push -u origin main
   ```

### 2. Cloudflare Turnstile (spam check)
Cloudflare dashboard → **Turnstile** → Add widget → hostnames `vectr.uk`, `www.vectr.uk`, `vectr-site.pages.dev` → Managed.
Keep the **site key** (public) and the **secret key**.

### 3. Resend (form email)
1. Sign up at resend.com and add the domain **vectr.uk**.
2. Add the DNS records Resend gives you. They use a sending subdomain and do **not** touch your Google Workspace MX records.
3. Create an API key with send-only permission.

### 4. Cloudflare Workers (connected to GitHub)
Dashboard → **Workers & Pages** → Create → **Import a repository** → choose `vectr-site`.

| Setting | Value |
|---|---|
| Project / Worker name | `vectr-site` (must match `name` in `wrangler.toml`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

**Build variables** (Settings → Build → Variables and secrets — used while building):

| Name | Value |
|---|---|
| `NODE_VERSION` | `22.23.4` (Astro 7 needs ≥ 22.23.4) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |

**Runtime secrets** (Settings → Variables and Secrets — used by the contact form), type **Secret**:

| Name | Value |
|---|---|
| `TURNSTILE_SECRET_KEY` | Turnstile secret key |
| `RESEND_API_KEY` | Resend API key |

`CONTACT_TO`, `CONTACT_FROM` and `SEND_CONFIRMATION` come from `wrangler.toml` (redeploying resets them to those values).
After the first deploy, test at `https://vectr-site.<your-subdomain>.workers.dev` — add that hostname to the Turnstile widget first.

### 5. Move vectr.uk to Cloudflare (do this last)
Email is on **Google Workspace**. These records must survive the move:

| Type | Name | Value |
|---|---|---|
| MX | `@` | `smtp.google.com` (priority 1) — or the older five `aspmx.l.google.com` records |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` (plus anything else already in it) |
| TXT | `google._domainkey` | Google DKIM key (copy from the current DNS) |
| TXT | `_dmarc` | Your DMARC policy, if you have one |
| TXT | `@` | `google-site-verification=…` (keep it) |

1. Before changing anything, screenshot or export the current DNS records from Wix.
2. Cloudflare → **Add a site** → `vectr.uk` → Free plan. Cloudflare scans and imports records. **Compare them against the export**, especially the MX, SPF, DKIM and DMARC records above.
3. Change the domain's nameservers to the two Cloudflare gives you. If the domain was bought through Wix, do this in Wix's domain settings, or transfer the domain out.
4. Once the zone is active: Workers & Pages → `vectr-site` → Settings → **Domains & Routes** → add custom domains `www.vectr.uk` and `vectr.uk`.
5. Add a redirect rule (Rules → Redirect Rules) from `vectr.uk/*` to `https://www.vectr.uk/$1` with a 301.
6. Cloudflare → **Web Analytics** → add `www.vectr.uk`. It's cookieless, so no consent banner is needed.
7. Send a test email to info@vectr.uk from an outside address, and submit the website form.
8. Google Search Console: resubmit `https://www.vectr.uk/sitemap.xml`.

### 6. Before cancelling Wix
- Export Wix Bookings clients and upcoming appointments.
- Export any form submissions and contacts.
- Confirm email has worked for at least a few days.

---

## Launch checklist (content)
- [ ] `src/data/site.ts`: opening hours, support plan price, Google reviews (verbatim), rating and count, Google reviews link
- [ ] Confirm the founder line in the Aftercare section
- [ ] `src/pages/privacy.astro`: fill in the `[bracketed]` items and carry over the Remote Access and CCTV sections from the Wix policy
- [ ] Hero image: confirm you have the rights to use it, or replace `src/assets/hero-rack.jpg` with your own rack photo
- [ ] Coverage heatmap: confirm it isn't a client's floor plan
- [ ] Brand names (UniFi, Dahua, Ajax, Sonos): check each manufacturer's trademark rules
