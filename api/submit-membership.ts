import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { verifyOtp, applyCors } from './_lib/otp';

export default async function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

    // Verify OTP unless this is the free "basic" plan.
    if (planId !== 'basic') {
      if (!otp || !otpHash || otpBucket === undefined) {
        return res
          .status(400)
          .json({ success: false, error: 'Email verification is required.' });
      }
      const result = verifyOtp(String(otp), email, String(otpHash), Number(otpBucket));
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          error:
            result.reason === 'expired'
              ? 'Your verification code has expired. Please restart the application.'
              : 'Invalid verification code. Please request a new one.',
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
          'Server configuration error: missing Google Sheets credentials. Please set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.',
      });
    }

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

    // Best-effort welcome email. Don't fail the request if SMTP is down.
    if (email && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
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
          subject:
            'Welcome to First Nobel Step - Membership Application Received',
          text: `Dear ${safeName},\n\nThank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.\n\nWe have successfully received your details and our team will review them shortly.\n\nBest regards,\nFirst Nobel Step Team\nsupport@firstnoblestep.com`,
          html: `
            <div style="background-color: #f6faf7; padding: 40px 20px; font-family: 'Inter', Arial, sans-serif; margin: 0;">
              <div style="background-color: #ffffff; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px 32px; text-align: left;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #01411C; letter-spacing: -0.02em;">First Nobel Step</h1>
                  <p style="margin: 6px 0 0 0; font-size: 11px; color: #01411C; letter-spacing: 0.2em; text-transform: uppercase;">Application Received</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;"/>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6; margin: 0 0 16px 0;">
                  Dear <strong style="color: #01411C;">${safeName}</strong>,
                </p>
                <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
                  Thank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.
                </p>
                <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 28px 0;">
                  We have successfully received your details and our team will review them shortly.
                </p>
                <div style="text-align: center;">
                  <a href="https://firstnoblestep.com" style="display: inline-block; background-color: #01411C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Visit Website</a>
                </div>
                <p style="font-size: 13px; color: #6b7280; margin: 28px 0 0 0; text-align: center;">
                  Questions? Contact <a href="mailto:support@firstnoblestep.com" style="color: #01411C; text-decoration: none;">support@firstnoblestep.com</a>
                </p>
              </div>
              <p style="max-width: 520px; margin: 16px auto 0; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} First Nobel Step (Pvt.) Ltd.<br>
                129 CCA-3, Block-X, DHA Phase 7, Lahore
              </p>
            </div>
          `,
        });
      } catch (emailError: any) {
        console.error('[submit-membership] welcome email failed:', emailError);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[submit-membership] error:', error);
    return res
      .status(500)
      .json({ success: false, error: error?.message || 'Failed to submit data' });
  }
}
