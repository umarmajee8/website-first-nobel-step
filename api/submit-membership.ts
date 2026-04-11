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
          text: `Dear ${fullName},\n\nThank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.\n\nWe have successfully received your details and our team will review them shortly.\n\nBest regards,\nFirst Nobel Step Team\nsupport@firstnoblestep.com\n\n---\nDISCLAIMER:\nFirst Noble Step (Private) Limited provides consultancy and informational services. We do not provide regulated financial, investment, legal, tax, or brokerage advice. Any reliance on our information is at your own risk. Please consult qualified professionals before making business or financial decisions.`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #202124; line-height: 1.5; max-width: 500px; margin: 40px auto; padding: 30px; border: 1px solid #dadce0; border-radius: 8px; text-align: center;">
              <div style="margin-bottom: 24px;">
                <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Logo" style="width: 100px;"/>
              </div>
              <h2 style="font-size: 22px; font-weight: 500; margin-bottom: 16px;">Welcome to First Nobel Step</h2>
              <p style="margin-bottom: 24px; color: #3c4043;">Dear <strong>${fullName}</strong>,<br/>Thank you for submitting your membership application. We have successfully received your details and our team will review them shortly.</p>
              
              <a href="https://firstnoblestep.com" style="display: inline-block; background-color: #01411C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; margin-bottom: 24px;">Visit Website</a>
              
              <p style="font-size: 14px; color: #70757a; margin-bottom: 24px;">If you have any questions, please contact us at <a href="mailto:support@firstnoblestep.com" style="color: #01411C;">support@firstnoblestep.com</a></p>
              
              <hr style="border: 0; border-top: 1px solid #dadce0; margin: 24px 0;"/>
              <p style="font-size: 12px; color: #70757a;"><strong>DISCLAIMER:</strong> First Noble Step (Private) Limited provides consultancy and informational services. We do not provide regulated financial, investment, legal, tax, or brokerage advice. Any reliance on our information is at your own risk. Please consult qualified professionals before making business or financial decisions.</p>
            </div>
          `
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
