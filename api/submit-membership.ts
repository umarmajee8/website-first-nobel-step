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

    if (!rawEmail) return res.status(400).json({ success: false, error: 'Email is required' });
    const email = rawEmail.toLowerCase().trim();

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
          from: `"First Nobel Step" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Welcome to First Nobel Step - Membership Application Received',
          text: `Dear ${fullName},\n\nThank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.\n\nWe have successfully received your details and our team will review them shortly.\n\nPlease find the disclaimer document attached.\n\nBest regards,\nFirst Nobel Step Team\nsupport@firstnoblestep.com`,
          html: `
            <div style="background-color: #f0f4f9; padding: 40px 20px; font-family: 'Google Sans', Roboto, Arial, sans-serif; margin: 0;">
              <div style="background-color: #ffffff; max-width: 500px; margin: 0 auto; border: 1px solid #dadce0; border-radius: 8px; padding: 40px 20px; text-align: center;">
                
                <div style="margin-bottom: 16px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #01411C; letter-spacing: -0.5px;">First Nobel Step</h1>
                </div>
                
                <h2 style="font-size: 24px; font-weight: 400; color: #1f1f1f; margin: 0 0 16px 0;">Welcome to First Nobel Step!</h2>
                
                <div style="display: inline-block; margin-bottom: 24px; color: #444746; font-size: 14px;">
                  <span style="background-color: #e8f0fe; border-radius: 50%; width: 20px; height: 20px; display: inline-block; text-align: center; line-height: 20px; margin-right: 8px; font-size: 12px; vertical-align: middle;">👤</span>
                  <span style="vertical-align: middle;">${email}</span>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e3e3e3; margin: 0 20px 24px 20px;"/>
                
                <p style="font-size: 16px; color: #444746; line-height: 1.5; margin: 0 0 32px 0; padding: 0 20px;">
                  Dear <strong>${fullName}</strong>,<br><br>
                  Thank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.<br><br>
                  We have successfully received your details and our team will review them shortly.<br><br>
                  Please find the disclaimer document attached to this email.
                </p>
                
                <a href="https://firstnoblestep.com" style="display: inline-block; background-color: #0a57d0; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 20px; font-weight: 500; font-size: 14px; margin-bottom: 32px;">Visit Website</a>
                
                <p style="font-size: 14px; color: #444746; margin: 0;">
                  You can also contact support at<br>
                  <a href="mailto:support@firstnoblestep.com" style="color: #0a57d0; text-decoration: none;">support@firstnoblestep.com</a>
                </p>
                
              </div>
              
              <div style="max-width: 500px; margin: 24px auto 0; text-align: center; font-size: 12px; color: #5f6368; line-height: 1.5; padding: 0 20px;">
                <p style="margin: 0 0 8px 0;">You received this email to let you know about important updates to your First Nobel Step application.</p>
                <p style="margin: 0 0 16px 0;">&copy; ${new Date().getFullYear()} First Nobel Step (Pvt.) Ltd.<br>129 CCA-3, Block-X, DHA Phase 7, Lahore</p>
              </div>
            </div>
          `,
          attachments: [
            {
              filename: 'Disclaimer.pdf',
              path: 'https://firstnoblestep.com/disclaimer.pdf' // Assuming the file is hosted here
            }
          ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email}`);
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
