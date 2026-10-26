// @ts-check
import { defineConfig } from 'astro/config';

// Static build: every page is plain HTML in /dist, served by Cloudflare Pages.
// The contact form posts to the Pages Function in /functions/api/contact.ts.
export default defineConfig({
  site: 'https://www.vectr.uk',
  output: 'static',
});
