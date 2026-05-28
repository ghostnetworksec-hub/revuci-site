const { Resend } = require('resend');

// ─── In-memory rate limiter (per IP, resets every 15 min) ───────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX       = 5;               // max 5 requests per window
const ipHitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipHitMap.get(ip);

  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    ipHitMap.set(ip, { ts: now, count: 1 });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count += 1;
  return false;
}
// ────────────────────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  // 1. Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Rate limiting
  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // 3. Validate & sanitise the email
  const rawEmail = (req.body || {}).email;
  if (
    !rawEmail ||
    typeof rawEmail !== 'string' ||
    rawEmail.length > 254 ||                              // RFC 5321 max
    !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail) // stricter pattern
  ) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const email = rawEmail.toLowerCase().trim();

  // 4. Load Supabase credentials from environment (never hardcode these)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Log server-side only — never expose config details to the client
    console.error('[subscribe] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 5. Persist to Supabase
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email }),
    });

    if (!dbResponse.ok) {
      const errorData = await dbResponse.json().catch(() => ({}));

      // Unique constraint violation — duplicate email
      if (errorData.code === '23505') {
        return res.status(409).json({ error: 'Already subscribed' });
      }

      // Log details server-side only
      console.error('[subscribe] Supabase error:', errorData);
      return res.status(500).json({ error: 'Could not process subscription' });
    }

    // 6. Send welcome email
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'REVUCI <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to REVUCI',
      html: `
        <div style="background:black;color:white;padding:40px;font-family:Arial,sans-serif;">
          <h1 style="margin-bottom:16px;">WELCOME TO REVUCI</h1>
          <p>You are now part of the club.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    // Never send raw error messages to the client
    console.error('[subscribe] Unhandled error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
