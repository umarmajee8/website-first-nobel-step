import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const secret = process.env.GOOGLE_PRIVATE_KEY || 'fallback_secret';
    const expectedHash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

    if (expectedHash === otpHash) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
