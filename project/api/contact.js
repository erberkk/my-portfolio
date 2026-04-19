// Vercel serverless function — proxies contact form to Web3Forms
// Keeps the access key server-side. Set WEB3FORMS_ACCESS_KEY in Vercel env vars.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = { name: 120, email: 200, message: 5000 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
    console.error('[contact] web3forms failed', {
      status: r.status,
      keyLength: key.length,
      keyPreview: key.slice(0, 4) + '...' + key.slice(-4),
      body: raw.slice(0, 500),
    });
    return res.status(502).json({ success: false, message: data.message || `Upstream ${r.status}` });
  } catch (err) {
    console.error('[contact] fetch threw', err && err.message);
    return res.status(502).json({ success: false, message: 'Upstream unreachable' });
  }
}
