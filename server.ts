import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Local dev server that mirrors the Vercel serverless functions under /api.
 * Production uses `/api/*.ts` directly via Vercel; this file exists so
 * `npm run dev` can run the whole site on port 3000.
 */

/* ---------------- OTP helpers (mirrored from api/_lib/otp.ts) ---------------- */

const BUCKET_MS = 5 * 60 * 1000;
const ALLOWED_SKEW_BUCKETS = 1;

function resolveOtpSecret(): string {
  return (
    process.env.OTP_SECRET ||
    (process.env.GOOGLE_PRIVATE_KEY
      ? crypto
          .createHash('sha256')
          .update('fns-otp:' + process.env.GOOGLE_PRIVATE_KEY)
          .digest('hex')
      : 'fns-dev-otp-fallback-secret-change-me')
  );
}

function currentBucket(now = Date.now()) {
  return Math.floor(now / BUCKET_MS);
}

function signOtp(otp: string, email: string, bucket: number) {
  return crypto
    .createHmac('sha256', resolveOtpSecret())
    .update(`${otp}|${email}|${bucket}`)
    .digest('hex');
}

function verifyOtp(otp: string, email: string, hash: string, bucket: number) {
  if (typeof bucket !== 'number' || !Number.isFinite(bucket)) {
    return { ok: false as const, reason: 'invalid' as const };
  }
  const now = currentBucket();
  if (bucket < now - ALLOWED_SKEW_BUCKETS || bucket > now + 1) {
    return { ok: false as const, reason: 'expired' as const };
  }
  const expected = signOtp(otp, email, bucket);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return { ok: false as const, reason: 'invalid' as const };
  return crypto.timingSafeEqual(a, b)
    ? { ok: true as const }
    : { ok: false as const, reason: 'invalid' as const };
}

/* Rate limiting (best effort, in-memory) */
type RL = { count: number; windowStart: number };
const rlStore = new Map<string, RL>();
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = rlStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rlStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((windowMs - (now - entry.windowStart)) / 1000),
    };
  }
  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

function clientIp(req: express.Request) {
  const fwd = (req.headers['x-forwarded-for'] || '') as string;
  return fwd.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

/* ---------------- Server ---------------- */

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  /* ---------- send-otp ---------- */
  app.post('/api/send-otp', async (req, res) => {
    try {
      const { email: rawEmail, fullName } = req.body || {};
      if (!rawEmail) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }
      const email = String(rawEmail).toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid email address' });
      }

      const rl = rateLimit(`send:${email}:${clientIp(req)}`, 3, 15 * 60 * 1000);
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

      const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
      const bucket = currentBucket();
      const hash = signOtp(otp, email, bucket);

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
          <div style="font-family: 'Inter', Arial, sans-serif; padding: 32px 20px; color: #1f2937; background: #f6faf7;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
              <h2 style="color: #01411C; margin: 0 0 4px 0; font-size: 20px;">First Nobel Step</h2>
              <p style="margin: 0 0 24px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.18em;">Email Verification</p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">Dear ${safeName},</p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Use the verification code below to continue your membership application.</p>
              <div style="text-align: center; margin: 28px 0;">
                <span style="display: inline-block; font-size: 30px; letter-spacing: 8px; color: #01411C; background: #ecf6ef; padding: 16px 28px; border-radius: 12px; font-weight: 700;">${otp}</span>
              </div>
              <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">This code expires in about 5 minutes.</p>
            </div>
          </div>
        `,
      });

      return res.status(200).json({ success: true, hash, bucket });
    } catch (err: any) {
      console.error('send-otp error:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to send verification code' });
    }
  });

  /* ---------- verify-otp ---------- */
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { email: rawEmail, otp, otpHash, otpBucket } = req.body || {};
      if (!rawEmail || !otp || !otpHash || otpBucket === undefined) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing parameters' });
      }
      const email = String(rawEmail).toLowerCase().trim();
      const rl = rateLimit(`verify:${email}:${clientIp(req)}`, 5, 15 * 60 * 1000);
      if (!rl.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Please request a new code and try again later.',
        });
      }
      const result = verifyOtp(
        String(otp),
        email,
        String(otpHash),
        Number(otpBucket),
      );
      if (result.ok) return res.status(200).json({ success: true });
      return res.status(400).json({
        success: false,
        error:
          result.reason === 'expired'
            ? 'Verification code has expired. Please request a new one.'
            : 'Invalid verification code.',
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  });

  /* ---------- create-fastpay-checkout (simulated) ---------- */
  app.post('/api/create-fastpay-checkout', async (req, res) => {
    try {
      const { amount, paymentMethod, email } = req.body || {};
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }
      if (!paymentMethod || !email) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing payment details' });
      }
      const txnId = 'FP-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const checkoutUrl = `/api/payment-callback?status=success&txn_id=${encodeURIComponent(
        txnId,
      )}`;
      return res.status(200).json({ success: true, checkoutUrl, txnId });
    } catch {
      return res
        .status(500)
        .json({ success: false, error: 'Failed to initialize payment gateway.' });
    }
  });

  /* ---------- payment-callback ---------- */
  app.get('/api/payment-callback', (req, res) => {
    const status = req.query.status === 'success' ? 'success' : 'failed';
    const txn = String(req.query.txn_id || '').replace(/[^a-zA-Z0-9-]/g, '');
    if (status === 'success') {
      return res.redirect(`/?payment_status=success&txn_id=${encodeURIComponent(txn)}`);
    }
    return res.redirect(`/?payment_status=failed`);
  });

  /* ---------- submit-membership ---------- */
  app.post('/api/submit-membership', async (req, res) => {
    try {
      const formData = req.body || {};
      const {
        fullName,
        cnic,
        email: rawEmail,
        whatsapp,
        planId,
        status,
        institute,
        degree,
        businessName,
        industry,
        experience,
        targetCountry,
        paymentMethod,
        otp,
        otpHash,
        otpBucket,
      } = formData;

      if (!rawEmail) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }
      const email = String(rawEmail).toLowerCase().trim();

      if (planId !== 'basic') {
        if (!otp || !otpHash || otpBucket === undefined) {
          return res
            .status(400)
            .json({ success: false, error: 'Email verification is required.' });
        }
        const result = verifyOtp(
          String(otp),
          email,
          String(otpHash),
          Number(otpBucket),
        );
        if (!result.ok) {
          return res.status(400).json({
            success: false,
            error:
              result.reason === 'expired'
                ? 'Your verification code has expired. Please restart the application.'
                : 'Invalid verification code.',
          });
        }
      }

      if (
        !process.env.GOOGLE_SHEET_ID ||
        !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
        !process.env.GOOGLE_PRIVATE_KEY
      ) {
        return res.status(500).json({
          success: false,
          error:
            'Server configuration error: missing Google Sheets credentials.',
        });
      }

      const formattedDate = new Date().toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'short',
        timeStyle: 'medium',
      });

      const values = [[
        formattedDate || '',
        fullName || '',
        cnic || '',
        email || '',
        whatsapp || '',
        planId || '',
        paymentMethod || '',
        status || institute || '',
        degree || '',
        businessName || '',
        industry || '',
        experience || '',
        targetCountry || '',
      ]];

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      if (email && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
          await transporter.sendMail({
            from: `"First Nobel Step" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to First Nobel Step - Application Received',
            text: `Dear ${fullName || 'Applicant'},\n\nThank you for applying to First Nobel Step.`,
          });
        } catch (e) {
          console.error('welcome email failed', e);
        }
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('submit-membership error:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to submit data',
      });
    }
  });

  /* ---------- Vite middleware for dev / static in prod ---------- */
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
