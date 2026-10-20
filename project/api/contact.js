// Vercel serverless function — sends the contact form by email through Resend.
// The API key stays server-side. Vercel env vars:
//   RESEND_API_KEY   required
//   CONTACT_TO       optional, defaults to the address below. With Resend's free shared sender
//                    (onboarding@resend.dev) this must be the email the Resend account was created with.
//   CONTACT_FROM     optional, defaults to Resend's shared sender; set it once you verify your own domain.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = { name: 120, email: 200, message: 5000 };
const DEFAULT_TO = 'akbuluterberk@gmail.com';
const DEFAULT_FROM = 'Portfolio <onboarding@resend.dev>';

// header-safe: no control characters / line breaks in anything that ends up in the subject
const oneLine = (s) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();

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

  const key = process.env.RESEND_API_KEY;
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
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'erberkakbulut-portfolio/1.0 (+https://erberkakbulut.com)',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || DEFAULT_FROM,
        to: [process.env.CONTACT_TO || DEFAULT_TO],
        reply_to: email, // hitting "reply" answers the visitor
        subject: `New message from ${oneLine(name).slice(0, 80)}`,
        text: `From: ${oneLine(name)} <${email}>\n\n${message}`,
      }),
    });
    const raw = await r.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (e) {}
    if (r.ok && data.id) {
      return res.status(200).json({ success: true });
    }
    console.error('[contact] resend failed', { status: r.status, body: raw.slice(0, 500) });
    return res.status(502).json({ success: false, message: 'Could not send right now.' });
  } catch (err) {
    console.error('[contact] fetch threw', err && err.message);
    return res.status(502).json({ success: false, message: 'Upstream unreachable' });
  }
}
