// /api/gemini.js  —  Morks Golf Tour AI proxy (Gemini)
// Purpose: keep the API key server-side (never in the browser).
//   GET  /api/gemini           -> runs a built-in test prompt (pipe check)
//   POST /api/gemini {prompt}  -> returns { text } for the given prompt (used by the app later)
//
// Zero-config Vercel serverless function. No dependencies, no package.json needed:
// Vercel runs any file under /api as a function, and Node 18+ has global fetch built in.

const MODEL = 'gemini-2.5-flash'; // one-line swap if the model id ever changes
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export default async function handler(req, res) {
  // Harmless preflight handling
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable in Vercel.' });
    return;
  }

  // Choose the prompt: POST body {prompt}, or a built-in test prompt on GET
  let prompt;
  if (req.method === 'POST') {
    const body = (typeof req.body === 'string') ? safeParse(req.body) : (req.body || {});
    prompt = body && body.prompt;
    if (!prompt) { res.status(400).json({ error: 'Missing "prompt" in request body.' }); return; }
  } else {
    prompt = 'Reply with one short, friendly sentence confirming the Morks Golf Tour AI connection is working.';
  }

  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: 'Gemini API error', detail: data }); return; }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: 'Request to Gemini failed', detail: String(e) });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
