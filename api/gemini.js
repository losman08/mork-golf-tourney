// /api/gemini.js  —  Morks Golf Tour AI proxy (Gemini)
// Key stays server-side. Supports:
//   GET  /api/gemini                  -> pipe test with the default model
//   GET  /api/gemini?list=1           -> list models this key can access (no generate cost)
//   GET  /api/gemini?model=NAME       -> pipe test against a specific model
//   POST /api/gemini {prompt, model?} -> generate; model optional, defaults below

const DEFAULT_MODEL = 'gemini-3.6-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable in Vercel.' }); return; }

  try {
    // GET ?list=1 -> which models can this key call generateContent on
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

    // Pick model + prompt
    let model = DEFAULT_MODEL, prompt;
    if (req.method === 'POST') {
      const body = (typeof req.body === 'string') ? safeParse(req.body) : (req.body || {});
      prompt = body && body.prompt;
      if (body && body.model) model = String(body.model);
      if (!prompt) { res.status(400).json({ error: 'Missing "prompt" in request body.' }); return; }
    } else {
      if (req.query.model) model = String(req.query.model);
      prompt = 'Reply with one short, friendly sentence confirming the Morks Golf Tour AI connection is working.';
    }

    const r = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: 'Gemini API error', model, detail: data }); return; }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ text, model });
  } catch (e) {
    res.status(500).json({ error: 'Request failed', detail: String(e) });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
