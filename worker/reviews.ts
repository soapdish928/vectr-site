/**
 * GET /api/reviews — rating, review count and top reviews from Google (Places API, New).
 * The API key stays on the server; responses are cached at the edge for a day.
 *
 * Secret: GOOGLE_PLACES_API_KEY    Variable: GOOGLE_PLACE_ID (wrangler.toml)
 */
import { json, type Env } from './contact';

const TTL = 60 * 60 * 24;

interface GoogleReview {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
}

export async function handleReviews(request: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
  if (!env.GOOGLE_PLACES_API_KEY || !env.GOOGLE_PLACE_ID) return json({ ok: false }, 503);

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL('/api/reviews', request.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(env.GOOGLE_PLACE_ID)}`, {
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
    },
  });
  if (!res.ok) return json({ ok: false }, 502);

  const data = (await res.json()) as { rating?: number; userRatingCount?: number; reviews?: GoogleReview[] };
  const reviews = (data.reviews ?? [])
    .map((r) => ({
      text: (r.originalText?.text ?? r.text?.text ?? '').trim(),
      name: r.authorAttribution?.displayName ?? '',
      rating: r.rating ?? 0,
    }))
    .filter((r) => r.text && r.name && r.rating >= 4)
    .sort((a, b) => b.text.length - a.text.length);

  const out = new Response(JSON.stringify({ ok: true, rating: data.rating ?? null, count: data.userRatingCount ?? null, reviews }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${TTL}` },
  });
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
