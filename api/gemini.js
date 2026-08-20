// /api/gemini.js  —  Morks Golf Tour AI proxy (Gemini) with model-pool failover
// Key stays server-side. Endpoints:
//   GET  /api/gemini                  -> pool failover pipe test
//   GET  /api/gemini?list=1           -> list models this key can access (no generate cost)
//   GET  /api/gemini?model=NAME       -> test one specific model
//   POST /api/gemini {prompt}         -> generate via the pool (random start + failover)
//   POST /api/gemini {prompt, model}  -> generate via one specific model (testing)
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Ordered by preference: high daily-cap stables first, previews as bonus buckets.
// Failover steps past any model that rejects (rate-limited, paid-only, or bad id).
const MODEL_POOL = ['gemini-2.5-flash-lite','gemini-2.5-flash','gemini-3.5-flash','gemini-3.7-flash','gemini-3.6-flash'];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable in Vercel.' }); return; }

  try {
    // GET ?list=1 -> which models this key can call generateContent on
    if (req.method !== 'POST' && (req.query.list === '1' || req.query.list === 'true')) {
      const r = await fetch(`${BASE}/models`, { headers: { 'x-goog-api-key': key } });
      const data = await r.json();
      if (!r.ok) { res.status(r.status).json({ error: 'List failed', detail: data }); return; }
      const models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => (m.name || '').replace('models/', ''));
      res.status(200).json({ count: models.length, models });
      return;
    }

    // Resolve prompt + optional forced model
    let prompt, forced = null;
    if (req.method === 'POST') {
      const body = (typeof req.body === 'string') ? safeParse(req.body) : (req.body || {});
      prompt = body && body.prompt;
      if (body && body.model) forced = String(body.model);
      if (!prompt) { res.status(400).json({ error: 'Missing "prompt" in request body.' }); return; }
    } else {
      if (req.query.model) forced = String(req.query.model);
      prompt = 'Reply with one short, friendly sentence confirming the Morks Golf Tour AI connection is working.';
    }

    // Try order: one forced model, or the pool starting at a random index (spreads load).
    const order = forced ? [forced] : rotate(MODEL_POOL, Math.floor(Math.random() * MODEL_POOL.length));
    let lastDetail = null, anyRateLimited = false;
    for (const model of order) {
      const r = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await r.json();
      if (r.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.status(200).json({ text, model });
        return;
      }
      lastDetail = data;
      if (r.status === 429) anyRateLimited = true;
      // any rejection -> step to the next model in the pool
    }
    // Every model failed. Classify the wall so the app can show honest copy.
    const q = JSON.stringify(lastDetail || {});
    const scope = /PerDay/i.test(q) ? 'day' : (anyRateLimited ? 'minute' : 'other');
    res.status(anyRateLimited ? 429 : 502).json({ error: 'All models unavailable', exhausted: anyRateLimited, scope, detail: lastDetail });
  } catch (e) {
    res.status(500).json({ error: 'Request failed', detail: String(e) });
  }
}

function rotate(a, s) { return a.slice(s).concat(a.slice(0, s)); }
function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
