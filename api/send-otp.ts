import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  // CORS Headers
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
    const { email: rawEmail, fullName } = req.body;
    if (!rawEmail) return res.status(400).json({ success: false, error: 'Email is required' });
    
    const email = rawEmail.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const secret = process.env.GOOGLE_PRIVATE_KEY || 'fallback_secret';
    const hash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"First Nobel Step" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Verification Code - First Nobel Step',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Email Verification</h2>
            <p>Dear ${fullName || 'Applicant'},</p>
            <p>Your verification code for the First Nobel Step membership application is:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; letter-spacing: 5px; color: #01411C; background: #f0f4f9; padding: 15px 25px; border-radius: 8px; font-weight: bold;">${otp}</span>
            </div>
            <p>Please enter this code in the application form to proceed with your payment.</p>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, hash });
    } else {
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, error: 'Failed to send verification code' });
  }
}
