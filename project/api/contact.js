// Vercel serverless function — proxies contact form to Web3Forms
// Keeps the access key server-side. Set WEB3FORMS_ACCESS_KEY in Vercel env vars.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = { name: 120, email: 200, message: 5000 };

// Best-effort limiter: lives per warm instance, enough to blunt a spam burst.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) {
    return res.status(429).json({ success: false, message: 'Too many messages, try again later.' });
  }

  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) return res.status(500).json({ success: false, message: 'Server not configured' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (body.botcheck) return res.status(200).json({ success: true });

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) {
    return res.status(400).json({ success: false, message: 'Input too long' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email' });
  }

  try {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'erberkakbulut-portfolio/1.0 (+https://erberkakbulut.com)',
      },
      body: JSON.stringify({
        access_key: key,
        from_name: 'Portfolio contact',
        subject: 'New message from portfolio',
        name,
        email,
        message,
      }),
    });
    const raw = await r.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (e) {}
    if (r.ok && data.success) {
      return res.status(200).json({ success: true });
    }
    console.error('[contact] web3forms failed', { status: r.status, body: raw.slice(0, 500) });
    return res.status(502).json({ success: false, message: 'Could not send right now.' });
  } catch (err) {
    console.error('[contact] fetch threw', err && err.message);
    return res.status(502).json({ success: false, message: 'Upstream unreachable' });
  }
}
