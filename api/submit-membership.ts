import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const PLAN_LABELS: Record<string, string> = {
  entrepreneur: 'Entrepreneur (PKR 49,999)',
  'startup-launch': 'Startup Launch Pad (PKR 399,000)',
  'biz-transformation': 'Business Transformation Pro (PKR 599,000)',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSheetCell(value: unknown, forceText = false): string {
  const str = String(value ?? '').trim();
  if (!str) return '';
  if (forceText || /^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function hashesMatch(expectedHex: string, providedHex: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(providedHex)) return false;
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const providedBuf = Buffer.from(providedHex, 'hex');
  return expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function parsePaymentProof(paymentProof: unknown): { filename: string; content: Buffer } | null {
  if (typeof paymentProof !== 'string' || !paymentProof.trim()) return null;
  const match = paymentProof.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  let ext = 'png';
  let base64Data = paymentProof;
  if (match) {
    const subtype = match[1].toLowerCase();
    base64Data = match[2];
    if (subtype === 'jpeg' || subtype === 'jpg') ext = 'jpg';
    else if (subtype === 'webp') ext = 'webp';
    else if (subtype === 'gif') ext = 'gif';
    else if (subtype === 'svg+xml') ext = 'svg';
    else ext = subtype.replace(/[^a-z0-9]/g, '') || 'png';
  }
  return {
    filename: `Payment_Proof.${ext}`,
    content: Buffer.from(base64Data, 'base64'),
  };
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const formData = req.body || {};
    const {
      fullName: rawFullName,
      cnic,
      email: rawEmail,
      whatsapp,
      planId,
      institute,
      degree,
      businessName,
      industry,
      experience,
      targetCountry,
      paymentMethod,
      otp,
      otpHash,
    } = formData;

    const fullName = typeof rawFullName === 'string' ? rawFullName.trim() : '';
    const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : '';
    const applicationLabel = 'Membership';

    if (!fullName || !email || !planId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName, email, and planId are required.',
      });
    }

    // Verify OTP server-side when SMTP verification is configured or OTP parameters are supplied
    if (otp || otpHash || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
      if (typeof otp !== 'string' || typeof otpHash !== 'string' || !otp.trim() || !otpHash.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Email verification is required before submitting the application.',
        });
      }
      const secret = process.env.GOOGLE_PRIVATE_KEY || 'fallback_secret';
      const expectedHash = crypto.createHash('sha256').update(otp.trim() + email + secret).digest('hex');
      if (!hashesMatch(expectedHash, otpHash.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email verification token. Please verify your email again.',
        });
      }
    }

    // Check for required environment variables
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Google Sheets credentials in Environment Variables. Please set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in your Vercel Dashboard.',
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
      sanitizeSheetCell(fullName),
      sanitizeSheetCell(cnic, true),
      sanitizeSheetCell(email),
      sanitizeSheetCell(whatsapp, true),
      sanitizeSheetCell(planId),
      sanitizeSheetCell(paymentMethod),
      sanitizeSheetCell(institute),
      sanitizeSheetCell(degree),
      sanitizeSheetCell(businessName),
      sanitizeSheetCell(industry),
      sanitizeSheetCell(experience),
      sanitizeSheetCell(targetCountry),
    ]];

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });
      console.log('Data successfully appended to Google Sheets.');
    } catch (sheetError: any) {
      console.error('Error appending to Google Sheets:', sheetError);
    }

    const attachments: { filename: string; content: Buffer }[] = [];
    const parsedProof = parsePaymentProof(formData.paymentProof);
    if (parsedProof) {
      attachments.push(parsedProof);
    }

    const safeFullName = escapeHtml(fullName);
    const safeEmail = escapeHtml(email);
    const safeCnic = escapeHtml(cnic || 'N/A');
    const safeWhatsapp = escapeHtml(whatsapp || 'N/A');
    const planDisplay = PLAN_LABELS[String(planId)] || String(planId);
    const safePlanDisplay = escapeHtml(planDisplay);
    const safePaymentMethod = escapeHtml(paymentMethod || 'N/A');

    // Send welcome email & admin notification
    if (email && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: `"First Noble Step" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Welcome to First Noble Step - Membership Application Received',
          text: `Dear ${fullName},\n\nThank you for submitting your membership application to First Noble Step (Pvt.) Ltd.\n\nWe have successfully received your details and our team will review them shortly.\n\nBest regards,\nFirst Noble Step Team\nsupport@firstnoblestep.com`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Welcome to First Noble Step!</h2>
              <p>Dear <strong>${safeFullName}</strong>,</p>
              <p>Thank you for submitting your membership application at First Noble Step (Pvt.) Ltd.</p>
              <p>We have successfully received your details and our team will review them shortly.</p>
              <br/>
              <p>Best regards,</p>
              <p style="margin-bottom: 25px;"><strong>First Noble Step Team</strong><br/>
              <a href="mailto:support@firstnoblestep.com" style="color: #01411C; text-decoration: none;">support@firstnoblestep.com</a></p>
              
              <div style="margin-top: 35px; text-align: center; border-top: 1px solid #e3e3e3; padding-top: 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 18px auto;">
                  <tr>
                    <td style="padding: 0 15px; vertical-align: middle;">
                      <a href="https://www.linkedin.com/company/firstnoblestep" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/ios-filled/100/7d7d7d/linkedin.png" width="30" height="30" alt="LinkedIn" style="display: block; border: 0;" />
                      </a>
                    </td>
                    <td style="padding: 0 15px; vertical-align: middle;">
                      <a href="https://www.youtube.com/@firstnoblestep" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/ios-filled/100/7d7d7d/youtube-play.png" width="34" height="34" alt="YouTube" style="display: block; border: 0;" />
                      </a>
                    </td>
                  </tr>
                </table>
                
                <p style="font-size: 15px; color: #1f1f1f; line-height: 1.5; margin: 0 0 12px 0; max-width: 440px; margin-left: auto; margin-right: auto; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  We're on <a href="https://www.linkedin.com/company/firstnoblestep" target="_blank" style="color: #1a73e8; text-decoration: underline; font-weight: 500;">LinkedIn</a>. Follow us for new business-focused content, including the latest videos, blogs, podcasts, and interactive experiences from the team.
                </p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email}`);

        // Send separate notification email with details and payment proof attached to the company admin
        const adminEmail = process.env.COMPANY_WHATSAPP_EMAIL || process.env.SMTP_USER;
        if (adminEmail) {
          const adminMailOptions = {
            from: `"First Noble Step System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New ${applicationLabel} Application Received - [${fullName}]`,
            text: `A new ${applicationLabel.toLowerCase()} application was submitted.\n\nName: ${fullName}\nEmail: ${email}\nCNIC: ${cnic || 'N/A'}\nWhatsApp: ${whatsapp || 'N/A'}\nPlan: ${planDisplay}\nPayment Method: ${paymentMethod || 'N/A'}`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px; margin-top: 0;">New ${applicationLabel} Application Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td style="padding: 8px 0;">${safeFullName}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">CNIC:</td><td style="padding: 8px 0;">${safeCnic}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 8px 0;">${safeWhatsapp}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Plan Chosen:</td><td style="padding: 8px 0;">${safePlanDisplay}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; text-transform: uppercase;">${safePaymentMethod}</td></tr>
                </table>
                ${attachments.length > 0 ? `<p style="margin-top: 20px; color: #ef4444; font-weight: bold;">✓ Verification payment screenshot/proof has been attached to this email.</p>` : `<p style="margin-top: 20px; color: #6b7280;">No payment proof attachment was uploaded for this plan/submission.</p>`}
              </div>
            `,
            attachments,
          };
          await transporter.sendMail(adminMailOptions);
          console.log(`Admin notification email sent to ${adminEmail}`);
        }
      } catch (emailError: any) {
        console.error('Error sending welcome email:', emailError);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error submitting form:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to submit data' });
  }
}
