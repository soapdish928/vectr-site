/**
 * Cloudflare Worker for vectr.uk
 *
 * Static files in ./dist (built by Astro) are served automatically, before this
 * script runs. Only requests that don't match a file reach this code:
 *   POST /api/contact  → contact form handler
 *   GET  /api/reviews  → Google rating + reviews (cached)
 *   anything else      → the site's 404 page
 */
import { handleReviews } from './reviews';
import { handleContact, json, type Env } from './contact';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return handleContact(request, env);
    }

    if (url.pathname === '/api/reviews' && request.method === 'GET') return handleReviews(request, env, ctx);

    const notFound = await env.ASSETS.fetch(new Request(new URL('/404.html', url)));
    return new Response(notFound.body, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
