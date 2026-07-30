import crypto from 'crypto';

function getSecret(): string {
  return process.env.OTP_SECRET || 'fallback-dev-secret-change-in-production-min-32-chars';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email: rawEmail, otp, otpHash } = req.body;
    if (!rawEmail || !otp || !otpHash) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const email = rawEmail.toLowerCase().trim();
    
    // Basic validation
    if (typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, error: 'Invalid OTP format' });
    }

    const secret = getSecret();
    const expectedHash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

    if (expectedHash === otpHash) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
