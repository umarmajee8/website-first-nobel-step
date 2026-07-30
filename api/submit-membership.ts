import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

function getSecret(): string {
  return process.env.OTP_SECRET || 'fallback-dev-secret-change-in-production-min-32-chars';
}

function hashOtp(otp: string, email: string): string {
  const secret = getSecret();
  return crypto.createHash('sha256').update(otp + email + secret).digest('hex');
}

function sanitize(str: string, maxLen = 200): string {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '').slice(0, maxLen).trim();
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
    const formData = req.body;
    const { fullName, email: rawEmail, whatsapp, planId, address, university, paymentMethod, paymentProof, otp, otpHash } = formData;

    const email = rawEmail ? rawEmail.toLowerCase().trim() : '';

    // Validation
    if (!fullName || String(fullName).trim().length < 3) {
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

    if (planId !== 'e_internship') {
      const cleanWhatsapp = (whatsapp || '').replace(/\D/g, '');
      if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 13) {
        return res.status(400).json({ success: false, error: 'WhatsApp must be 10-13 digits' });
      }
    }

    if (planId === 'e_internship' && (!address || String(address).trim().length < 5)) {
      return res.status(400).json({ success: false, error: 'Postal address required for internship' });
    }

    if (planId !== 'e_internship' && !paymentProof) {
      return res.status(400).json({ success: false, error: 'Payment proof required' });
    }

    if (paymentProof && paymentProof.length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Proof file too large (max 1MB)' });
    }

    // OTP verification - verify hash
    if (!otp || !otpHash) {
      return res.status(400).json({ success: false, error: 'OTP verification required' });
    }
    const expectedHash = hashOtp(otp, email);
    if (otpHash !== expectedHash) {
      return res.status(400).json({ success: false, error: 'Invalid OTP. Please verify again.' });
    }

    // Google Sheets
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('Sheets env missing - skipping sheet write');
    } else {
      try {
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
        const formattedDate = new Date().toLocaleString('en-PK', {
          timeZone: 'Asia/Karachi',
          dateStyle: 'short',
          timeStyle: 'medium'
        });

        const values = [[
          formattedDate,
          sanitize(fullName, 100),
          email,
          sanitize(whatsapp, 20),
          sanitize(planId, 30),
          sanitize(paymentMethod || 'faysalbank', 30),
          sanitize(address, 300),
          sanitize(university, 100),
        ]];

        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Sheet1!A:H',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        });
        console.log('Sheets append success');
      } catch (sheetErr) {
        console.error('Sheets error:', sheetErr);
      }
    }

    // Email
    if (email && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const safeName = sanitize(fullName, 100);
        let attachments: { filename: string; content: Buffer }[] = [];
        
        if (paymentProof) {
          try {
            const base64Data = paymentProof.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            if (buffer.length <= 2 * 1024 * 1024) {
              attachments.push({ filename: 'Payment_Proof.png', content: buffer });
            }
          } catch (e) {
            console.error('Proof parse error', e);
          }
        }

        // User welcome email
        const userMail = {
          from: `"First Noble Step" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Welcome to First Noble Step - Membership Application Received',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Welcome to First Noble Step!</h2>
              <p>Dear <strong>${safeName}</strong>,</p>
              <p>Thank you for submitting your membership application.</p>
              <p>Our team will verify your payment within 72 working hours.</p>
              <p>Best regards,<br><strong>First Noble Step Team</strong><br>support@firstnoblestep.com</p>
            </div>
          `
        };
        await transporter.sendMail(userMail);

        // Admin email
        const adminEmail = process.env.COMPANY_WHATSAPP_EMAIL || process.env.SMTP_USER;
        if (adminEmail) {
          const adminMail = {
            from: `"First Noble Step System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Application - ${safeName} - ${planId}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">New Application</h3>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>WhatsApp:</strong> ${sanitize(whatsapp, 20)}</p>
                <p><strong>Plan:</strong> ${sanitize(planId, 30)}</p>
                <p><strong>Address:</strong> ${sanitize(address, 300)}</p>
                <p>${attachments.length > 0 ? '✓ Payment proof attached' : 'Free plan - no proof'}</p>
              </div>
            `,
            attachments
          };
          await transporter.sendMail(adminMail);
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error submitting form:', error);
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
}
