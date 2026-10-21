import { google } from 'googleapis';
import nodemailer from 'nodemailer';

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
    const { fullName, cnic, email: rawEmail, whatsapp, planId, institute, degree, businessName, industry, experience, targetCountry, paymentMethod } = formData;

    const email = rawEmail ? rawEmail.toLowerCase().trim() : '';
    const applicationLabel = 'Membership';

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

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });
      console.log('Data successfully appended to Google Sheets.');
    } catch (sheetError: any) {
      console.error('Error appending to Google Sheets:', sheetError);
    }

    let attachments: { filename: string; content: Buffer }[] = [];
    if (formData.paymentProof) {
      const base64Data = formData.paymentProof.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      attachments.push({
        filename: 'Payment_Proof.png',
        content: buffer
      });
    }

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
              <p>Dear <strong>${fullName}</strong>,</p>
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
          `
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
            text: `A new ${applicationLabel.toLowerCase()} application was submitted.\n\nName: ${fullName}\nEmail: ${email}\nCNIC: ${cnic || 'N/A'}\nWhatsApp: ${whatsapp || 'N/A'}\nPlan: ${planId}\nPayment Method: ${paymentMethod || 'N/A'}`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px; margin-top: 0;">New ${applicationLabel} Application Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td style="padding: 8px 0;">${fullName}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${email}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">CNIC:</td><td style="padding: 8px 0;">${cnic || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 8px 0;">${whatsapp || 'N/A'}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Plan Choose:</td><td style="padding: 8px 0; text-transform: capitalize;">${planId}</td></tr>
                  <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Payment Method:</td><td style="padding: 8px 0; text-transform: uppercase;">${paymentMethod || 'N/A'}</td></tr>
                </table>
                ${attachments.length > 0 ? `<p style="margin-top: 20px; color: #ef4444; font-weight: bold;">✓ Verification payment screenshot/proof has been attached to this email.</p>` : `<p style="margin-top: 20px; color: #6b7280;">No payment proof attachment was uploaded for this plan/submission.</p>`}
              </div>
            `,
            attachments: attachments
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
