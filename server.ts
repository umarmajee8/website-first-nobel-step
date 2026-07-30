import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

interface OtpRecord {
  hash: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET || process.env.GOOGLE_PRIVATE_KEY || '';
  if (!secret || secret.length < 16) {
    // fallback to random but warn - in production should be set
    console.warn('Warning: OTP_SECRET not set or too short, using insecure fallback. Set OTP_SECRET env variable.');
    return 'fallback-dev-secret-change-in-production-min-32-chars';
  }
  return secret;
}

function hashOtp(otp: string, email: string): string {
  const secret = getOtpSecret();
  return crypto.createHash('sha256').update(otp + email.toLowerCase() + secret).digest('hex');
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }
  record.count++;
  return false;
}

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '2mb' }));

  // Request logging without sensitive data
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Google Sheets setup
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  let sheets: any = null;
  if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && privateKey) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      sheets = google.sheets({ version: 'v4', auth });
      console.log('Google Sheets client initialized');
    } catch (e) {
      console.error('Failed to init Google Sheets:', e);
    }
  } else {
    console.warn('Google Sheets env not fully configured - sheet writes will be skipped');
  }

  // Cleanup expired OTPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [email, record] of otpStore.entries()) {
      if (record.expiresAt < now) {
        otpStore.delete(email);
      }
    }
    for (const [key, rec] of rateLimitStore.entries()) {
      if (rec.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // --- API: Send OTP ---
  app.post('/api/send-otp', async (req, res) => {
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

      // Rate limiting by IP + email
      const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const rateKey = `${ip}:${email}`;
      if (isRateLimited(rateKey)) {
        return res.status(429).json({ success: false, error: 'Too many OTP requests. Please try again after an hour.' });
      }

      // Also rate limit by email globally
      if (isRateLimited(`email:${email}`)) {
        return res.status(429).json({ success: false, error: 'Too many OTP requests for this email. Please try later.' });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const secret = getOtpSecret();
      const hash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

      otpStore.set(email, {
        hash,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts: 0,
      });

      console.log(`OTP generated for ${email}`);

      const transporter = createTransporter();
      if (transporter) {
        const mailOptions = {
          from: `"First Noble Step" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your Verification Code - First Noble Step',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Email Verification</h2>
              <p>Dear ${fullName ? String(fullName).replace(/</g, '&lt;') : 'Applicant'},</p>
              <p>Your verification code for the First Noble Step membership application is:</p>
              <div style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; letter-spacing: 5px; color: #01411C; background: #f0f4f9; padding: 15px 25px; border-radius: 8px; font-weight: bold;">${otp}</span>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>Please enter this code in the application form to proceed.</p>
              <p style="font-size: 12px; color: #666; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
            </div>
          `
        };
        try {
          await transporter.sendMail(mailOptions);
        } catch (mailErr) {
          console.error('Failed to send email:', mailErr);
          return res.status(500).json({ success: false, error: 'Failed to send email. Please check SMTP configuration.' });
        }
      } else {
        console.warn(`SMTP not configured. OTP for ${email}: ${otp} - would be sent in production`);
      }

      return res.status(200).json({ success: true, hash, expiresIn: OTP_EXPIRY_MS / 1000 });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return res.status(500).json({ success: false, error: 'Failed to send verification code' });
    }
  });

  // --- API: Verify OTP ---
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { email: rawEmail, otp, otpHash } = req.body;
      if (!rawEmail || !otp || !otpHash) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
      }

      const email = rawEmail.toLowerCase().trim();

      // Check stored OTP first (server-side storage is primary)
      const stored = otpStore.get(email);
      if (!stored) {
        return res.status(400).json({ success: false, error: 'OTP expired or not found. Please request a new code.' });
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, error: 'OTP expired. Please request a new code.' });
      }

      if (stored.attempts >= 5) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, error: 'Too many failed attempts. Please request a new code.' });
      }

      const expectedHash = hashOtp(otp, email);
      // Also support client-provided hash for stateless verification fallback (if needed)
      const clientExpectedHash = (() => {
        try {
          const secret = getOtpSecret();
          return crypto.createHash('sha256').update(otp + email + secret).digest('hex');
        } catch {
          return '';
        }
      })();

      const isValid = (stored.hash === expectedHash) || (otpHash && otpHash === clientExpectedHash && clientExpectedHash === expectedHash);

      if (!isValid) {
        stored.attempts++;
        return res.status(400).json({ success: false, error: 'Invalid verification code' });
      }

      // OTP valid - keep it for final submission check but mark as verified
      // We will allow it to be used in submit endpoint, then delete
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  });

  // --- API: Submit membership ---
  app.post('/api/submit-membership', async (req, res) => {
    try {
      const formData = req.body;
      const { fullName, email: rawEmail, whatsapp, planId, address, university, paymentMethod, paymentProof, otp, otpHash } = formData;

      const email = rawEmail ? rawEmail.toLowerCase().trim() : '';

      // Basic validation
      if (!fullName || fullName.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'Full name must be at least 3 characters' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Valid email is required' });
      }
      const allowedPlans = ['basic', 'standard', 'professional_pkg', 'entrepreneur', 'e_internship'];
      if (!planId || !allowedPlans.includes(planId)) {
        return res.status(400).json({ success: false, error: 'Invalid plan selected' });
      }

      // WhatsApp validation (optional for e_internship)
      if (planId !== 'e_internship') {
        const cleanWhatsapp = (whatsapp || '').replace(/\D/g, '');
        if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 13) {
          return res.status(400).json({ success: false, error: 'WhatsApp number must be 10-13 digits' });
        }
      }

      // Address validation for e_internship
      if (planId === 'e_internship' && (!address || address.trim().length < 5)) {
        return res.status(400).json({ success: false, error: 'Postal address is required for e-internship' });
      }

      // Payment proof required for paid plans
      if (planId !== 'e_internship' && !paymentProof) {
        return res.status(400).json({ success: false, error: 'Payment proof is required' });
      }

      // Validate payment proof size (max ~1MB base64)
      if (paymentProof && paymentProof.length > 2 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Payment proof file too large (max 1MB)' });
      }

      // OTP verification - must be verified before submission
      const storedOtp = otpStore.get(email);
      if (!storedOtp) {
        return res.status(400).json({ success: false, error: 'Please verify your email with OTP first' });
      }
      if (Date.now() > storedOtp.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, error: 'OTP expired. Please verify again' });
      }

      // Verify OTP hash matches what was issued
      if (otp && otpHash) {
        const expectedHash = hashOtp(otp, email);
        if (storedOtp.hash !== expectedHash || otpHash !== expectedHash) {
          return res.status(400).json({ success: false, error: 'OTP verification failed' });
        }
      } else {
        return res.status(400).json({ success: false, error: 'OTP is required' });
      }

      // Sheets write
      if (sheets && process.env.GOOGLE_SHEET_ID) {
        try {
          const formattedDate = new Date().toLocaleString('en-PK', {
            timeZone: 'Asia/Karachi',
            dateStyle: 'short',
            timeStyle: 'medium'
          });

          const values = [[
            formattedDate,
            fullName?.trim() || '',
            email,
            whatsapp?.trim() || '',
            planId,
            paymentMethod || 'faysalbank',
            address?.trim() || '',
            university?.trim() || '',
          ]];

          await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:H',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
          });
          console.log('Data appended to Google Sheets for', email);
        } catch (sheetError) {
          console.error('Error appending to Google Sheets:', sheetError);
          // Continue - don't fail the whole request if sheet fails
        }
      }

      // Process payment proof
      let attachments: { filename: string; content: Buffer }[] = [];
      if (paymentProof) {
        try {
          const base64Data = paymentProof.replace(/^data:image\/\w+;base64,/, "");
          // Validate base64
          if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.slice(0, 1000))) {
            throw new Error('Invalid base64');
          }
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 2 * 1024 * 1024) {
            throw new Error('File too large');
          }
          attachments.push({
            filename: 'Payment_Proof.png',
            content: buffer
          });
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid payment proof format' });
        }
      }

      // Send emails
      const transporter = createTransporter();
      if (email && transporter) {
        try {
          // 1. Welcome email to applicant
          const safeName = String(fullName).replace(/</g, '&lt;').slice(0, 100);
          const mailOptions = {
            from: `"First Noble Step" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to First Noble Step - Membership Application Received',
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Welcome to First Noble Step!</h2>
                <p>Dear <strong>${safeName}</strong>,</p>
                <p>Thank you for submitting your membership application to First Noble Step (Pvt.) Ltd.</p>
                <p>We have successfully received your details and our team will review them shortly.</p>
                <p>Our team will verify your payment within 72 working hours and contact you.</p>
                <br/>
                <p>Best regards,</p>
                <p><strong>First Noble Step Team</strong><br/>
                <a href="mailto:support@firstnoblestep.com" style="color: #01411C;">support@firstnoblestep.com</a></p>
              </div>
            `
          };
          await transporter.sendMail(mailOptions);
          console.log(`Welcome email sent to ${email}`);

          // 2. Admin notification with proof
          const adminEmail = process.env.COMPANY_WHATSAPP_EMAIL || process.env.SMTP_USER;
          if (adminEmail) {
            const adminMailOptions = {
              from: `"First Noble Step System" <${process.env.SMTP_USER}>`,
              to: adminEmail,
              subject: `New Membership Application - [${safeName}] - ${planId}`,
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <h3 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px; margin-top: 0;">New Application Submission</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td style="padding: 8px 0;">${safeName}</td></tr>
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${email}</td></tr>
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 8px 0;">${whatsapp || 'N/A'}</td></tr>
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Plan:</td><td style="padding: 8px 0; text-transform: capitalize;">${planId}</td></tr>
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Address:</td><td style="padding: 8px 0;">${address || 'N/A'}</td></tr>
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">University:</td><td style="padding: 8px 0;">${university || 'N/A'}</td></tr>
                    <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0;">${paymentMethod || 'faysalbank'}</td></tr>
                  </table>
                  ${attachments.length > 0 ? `<p style="margin-top: 20px; color: #16a34a; font-weight: bold;">✓ Payment proof attached.</p>` : `<p style="margin-top: 20px; color: #6b7280;">No payment proof (free plan).</p>`}
                </div>
              `,
              attachments: attachments
            };
            await transporter.sendMail(adminMailOptions);
            console.log(`Admin notification sent to ${adminEmail}`);
          }
        } catch (emailError) {
          console.error('Error sending emails:', emailError);
        }
      }

      // OTP used - delete it
      otpStore.delete(email);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
      }
    }
  });

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // Express 5 compatible catch-all - use regex
      app.get(/.*/, (req, res) => {
        // Don't intercept API routes
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ success: false, error: 'API endpoint not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('dist folder not found, serving API only');
      app.get('/', (req, res) => {
        res.json({ status: 'API running', message: 'Frontend dist not built' });
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer().catch(console.error);
