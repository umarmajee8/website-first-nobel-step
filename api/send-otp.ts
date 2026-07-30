import nodemailer from 'nodemailer';
import crypto from 'crypto';

// In-memory stores for serverless (note: will reset on cold start, but better than nothing)
// For production, use Redis or database
const otpStore = new Map<string, { hash: string; expiresAt: number }>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getSecret(): string {
  const secret = process.env.OTP_SECRET || 'fallback-dev-secret-change-in-production-min-32-chars';
  return secret;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  if (now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  if (record.count >= 5) {
    return true;
  }
  record.count++;
  return false;
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
    const { email: rawEmail, fullName } = req.body;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const email = rawEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(`${ip}:${email}`) || isRateLimited(`email:${email}`)) {
      return res.status(429).json({ success: false, error: 'Too many requests. Try again after an hour.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const secret = getSecret();
    const hash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

    otpStore.set(email, { hash, expiresAt: Date.now() + 10 * 60 * 1000 });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const safeName = fullName ? String(fullName).replace(/</g, '&lt;').slice(0, 100) : 'Applicant';

      const mailOptions = {
        from: `"First Noble Step" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Verification Code - First Noble Step',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Email Verification</h2>
            <p>Dear ${safeName},</p>
            <p>Your verification code for the First Noble Step membership application is:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; letter-spacing: 5px; color: #01411C; background: #f0f4f9; padding: 15px 25px; border-radius: 8px; font-weight: bold;">${otp}</span>
            </div>
            <p>This code expires in 10 minutes.</p>
            <p>Please enter this code in the application form to proceed.</p>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, hash, expiresIn: 600 });
    } else {
      return res.status(500).json({ success: false, error: 'Email service not configured. Set SMTP_USER and SMTP_PASS' });
    }
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, error: 'Failed to send verification code' });
  }
}
