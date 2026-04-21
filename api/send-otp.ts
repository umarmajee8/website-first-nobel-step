import nodemailer from 'nodemailer';
import {
  generateOtp,
  signOtp,
  rateLimit,
  getClientIp,
  applyCors,
} from './_lib/otp';

export default async function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email: rawEmail, fullName } = req.body || {};
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const email = rawEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    // Rate limit: max 3 sends per 15 minutes, per email + IP.
    const ip = getClientIp(req);
    const rl = rateLimit(`send:${email}:${ip}`, 3, 15 * 60 * 1000);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({
        success: false,
        error: `Too many verification requests. Try again in ${Math.ceil(
          rl.retryAfterSec / 60,
        )} minute(s).`,
      });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res
        .status(500)
        .json({ success: false, error: 'Email service is not configured.' });
    }

    const otp = generateOtp();
    const { hash, bucket } = signOtp(otp, email);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const safeName = String(fullName || 'Applicant').replace(/[<>]/g, '');

    await transporter.sendMail({
      from: `"First Nobel Step" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Verification Code - First Nobel Step',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; padding: 32px 20px; color: #1f2937; background: #f6faf7; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
            <h2 style="color: #01411C; margin: 0 0 4px 0; font-size: 20px; letter-spacing: -0.01em;">First Nobel Step</h2>
            <p style="margin: 0 0 24px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.18em;">Email Verification</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">Dear ${safeName},</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Use the verification code below to continue your membership application.</p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="display: inline-block; font-size: 30px; letter-spacing: 8px; color: #01411C; background: #ecf6ef; padding: 16px 28px; border-radius: 12px; font-weight: 700; font-family: 'Courier New', monospace;">${otp}</span>
            </div>
            <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">This code expires in about 5 minutes. If you didn't request it, you can safely ignore this email.</p>
          </div>
          <p style="max-width: 480px; margin: 16px auto 0; text-align: center; font-size: 11px; color: #9ca3af;">&copy; ${new Date().getFullYear()} First Nobel Step (Pvt.) Ltd.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, hash, bucket });
  } catch (error: any) {
    console.error('[send-otp] error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to send verification code.' });
  }
}
