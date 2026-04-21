import { verifyOtp, rateLimit, getClientIp, applyCors } from './_lib/otp';

export default async function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email: rawEmail, otp, otpHash, otpBucket } = req.body || {};
    if (!rawEmail || !otp || !otpHash || otpBucket === undefined) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const email = String(rawEmail).toLowerCase().trim();

    // Rate limit: max 5 verify attempts per 15 minutes per email+IP.
    const ip = getClientIp(req);
    const rl = rateLimit(`verify:${email}:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please request a new code and try again later.',
      });
    }

    const result = verifyOtp(String(otp), email, String(otpHash), Number(otpBucket));
    if (result.ok) {
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({
      success: false,
      error:
        result.reason === 'expired'
          ? 'Verification code has expired. Please request a new one.'
          : 'Invalid verification code.',
    });
  } catch (error: any) {
    console.error('[verify-otp] error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
