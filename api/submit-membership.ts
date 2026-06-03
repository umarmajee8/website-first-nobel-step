import { google } from 'googleapis';
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  console.log('Received request to submit membership:', req.body);
  try {
    const formData = req.body;
    const { fullName, cnic, email: rawEmail, whatsapp, planId, institute, degree, businessName, industry, experience, targetCountry, paymentMethod, otp, otpHash } = formData;

    const email = rawEmail ? rawEmail.toLowerCase().trim() : '';

    // Verify OTP if it's not a basic plan and otpHash is provided (e.g. for custom/legacy paths)
    if (planId !== 'basic' && otpHash) {
      const secret = process.env.GOOGLE_PRIVATE_KEY || 'fallback_secret';
      const expectedHash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');
      if (expectedHash !== otpHash) {
        return res.status(400).json({ success: false, error: 'Invalid verification code. Please try again.' });
      }
    }

    // Check for required environment variables
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing Google Sheets credentials in Environment Variables. Please set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in your Vercel Dashboard.' 
      });
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    // Remove surrounding quotes if user accidentally pasted them
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    // Handle literal \n strings
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Format date to a readable format (e.g., DD/MM/YYYY, HH:MM:SS AM/PM in Pakistan Time)
    const formattedDate = new Date().toLocaleString('en-PK', { 
      timeZone: 'Asia/Karachi',
      dateStyle: 'short',
      timeStyle: 'medium'
    });

    // Ensure the order matches the expected columns in the Google Sheet
    const values = [[
      formattedDate || '',
      fullName || '',
      cnic || '',
      email || '',
      whatsapp || '',
      planId || '',
      paymentMethod || '',
      institute || '',
      degree || '',
      businessName || '',
      industry || '',
      experience || '',
      targetCountry || ''
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });
    console.log('Data successfully appended to Google Sheets.');

    const attachments: { filename: string; content: Buffer | string }[] = [];
    if (formData.paymentProof) {
      const base64Data = String(formData.paymentProof).replace(/^data:image\/\w+;base64,/, '');
      attachments.push({
        filename: 'Payment_Proof.png',
        content: Buffer.from(base64Data, 'base64'),
      });
    }

    // Send welcome email
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
            <div style="background-color: #f0f4f9; padding: 40px 20px; font-family: 'Google Sans', Roboto, Arial, sans-serif; margin: 0;">
              <div style="background-color: #ffffff; max-width: 500px; margin: 0 auto; border: 1px solid #dadce0; border-radius: 8px; padding: 40px 20px; text-align: center;">
                
                <div style="margin-bottom: 16px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #01411C; letter-spacing: -0.5px;">First Noble Step</h1>
                </div>
                
                <h2 style="font-size: 24px; font-weight: 400; color: #1f1f1f; margin: 0 0 16px 0;">Welcome to First Noble Step!</h2>
                
                <div style="display: inline-block; margin-bottom: 24px; color: #01411C; font-size: 14px;">
                  <span style="background-color: #e6f0eb; border-radius: 12px; padding: 3px 8px; margin-right: 8px; font-size: 12px; vertical-align: middle;">Applicant</span>
                  <span style="vertical-align: middle;">${email}</span>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e3e3e3; margin: 0 20px 24px 20px;"/>
                
                <p style="font-size: 16px; color: #444746; line-height: 1.5; margin: 0 0 32px 0; padding: 0 20px;">
                  Dear <strong style="color: #01411C;">${fullName}</strong>,<br><br>
                  Thank you for submitting your membership application to First Noble Step (Pvt.) Ltd.<br><br>
                  We have successfully received your details and our team will review them shortly.
                </p>
                
                <a href="https://firstnoblestep.com" style="display: inline-block; background-color: #01411C; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 20px; font-weight: 500; font-size: 14px; margin-bottom: 32px;">Visit Website</a>
                
                <p style="font-size: 14px; color: #444746; margin: 0 0 25px 0;">
                  You can also contact support at<br>
                  <a href="mailto:support@firstnoblestep.com" style="color: #01411C; text-decoration: none;">support@firstnoblestep.com</a>
                </p>
                
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
                      <td style="padding: 0 15px; vertical-align: middle;">
                        <a href="https://x.com/FirstNobleStep" target="_blank" style="text-decoration: none;">
                          <img src="https://img.icons8.com/ios-filled/100/7d7d7d/twitterx.png" width="28" height="28" alt="X" style="display: block; border: 0;" />
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 15px; color: #1f1f1f; line-height: 1.5; margin: 0 0 12px 0; max-width: 440px; margin-left: auto; margin-right: auto; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    We're on <a href="https://www.linkedin.com/company/firstnoblestep" target="_blank" style="color: #1a73e8; text-decoration: underline; font-weight: 500;">LinkedIn</a>. Follow us for new business-focused content, including the latest videos, blogs, podcasts, and interactive experiences from the team.
                  </p>
                  <p style="font-size: 15px; margin: 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <a href="https://x.com/FirstNobleStep" target="_blank" style="color: #1a73e8; text-decoration: underline; font-weight: 500;">Follow us on X for updates</a>.
                  </p>
                </div>
                
              </div>
              
              <div style="max-width: 500px; margin: 24px auto 0; text-align: center; font-size: 12px; color: #5f6368; line-height: 1.5; padding: 0 20px;">
                <p style="margin: 0 0 8px 0;">You received this email to let you know about important updates to your First Noble Step application.</p>
                <p style="margin: 0 0 16px 0;">&copy; ${new Date().getFullYear()} First Noble Step (Pvt.) Ltd.<br>129 CCA-3, Block-X, DHA Phase 7, Lahore</p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email}`);

        const adminEmail = process.env.COMPANY_WHATSAPP_EMAIL || process.env.SMTP_USER;
        if (adminEmail) {
          const adminMailOptions = {
            from: `"First Noble Step System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Membership Application Received - [${fullName}]`,
            text: `A new membership application was submitted.\n\nName: ${fullName}\nEmail: ${email}\nCNIC: ${cnic || 'N/A'}\nWhatsApp: ${whatsapp || 'N/A'}\nPlan: ${planId}\nPayment Method: ${paymentMethod || 'N/A'}`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px; margin-top: 0;">New Application Submission Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td style="padding: 8px 0;">${fullName}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${email}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">CNIC:</td><td style="padding: 8px 0;">${cnic || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 8px 0;">${whatsapp || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Plan Chosen:</td><td style="padding: 8px 0; text-transform: capitalize;">${planId}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; text-transform: uppercase;">${paymentMethod || 'N/A'}</td></tr>
                </table>
                ${attachments.length > 0 ? `<p style="margin-top: 20px; color: #01411C; font-weight: bold;">Payment screenshot/proof is attached to this email.</p>` : `<p style="margin-top: 20px; color: #6b7280;">No payment proof attachment was uploaded for this submission.</p>`}
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
