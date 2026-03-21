import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheets API setup
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

  // In-memory store for verification codes (expires in 10 minutes)
  const verificationCodes = new Map<string, { code: string, expires: number }>();

  // API endpoint to send verification code
  app.post('/api/send-verification', async (req, res) => {
    const { email: rawEmail, fullName } = req.body;
    if (!rawEmail) return res.status(400).json({ success: false, error: 'Email is required' });

    const email = rawEmail.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });
    console.log(`[AUTH] Generated code ${code} for ${email}`);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      try {
        await transporter.sendMail({
          from: `"First Nobel Step" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your Verification Code - First Nobel Step',
          text: `Dear ${fullName || 'Applicant'},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nFirst Nobel Step Team`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
              <h2 style="color: #01411C;">Verification Code</h2>
              <p>Dear <strong>${fullName || 'Applicant'}</strong>,</p>
              <p>Thank you for starting your application. Please use the following code to verify your email address:</p>
              <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #01411C; border-radius: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p>If you did not request this code, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888;">First Nobel Step (Pvt.) Ltd.</p>
            </div>
          `
        });
        res.status(200).json({ success: true });
      } catch (error: any) {
        console.error('Error sending verification email:', error);
        let errorMessage = 'Failed to send verification email';
        if (error.message && error.message.includes('Username and Password not accepted')) {
          errorMessage = 'SMTP Authentication failed. Please ensure you are using a Gmail App Password, not your regular password.';
        }
        res.status(500).json({ success: false, error: errorMessage });
      }
    } else {
      console.log(`[DEV] Verification code for ${email}: ${code}`);
      res.status(200).json({ success: true, devMode: true }); // In dev, we might not have SMTP
    }
  });

  // API endpoint to verify code before proceeding to payment
  app.post('/api/verify-code', async (req, res) => {
    const { email: rawEmail, code: rawCode } = req.body;
    if (!rawEmail || !rawCode) return res.status(400).json({ success: false, error: 'Email and code are required' });

    const email = rawEmail.toLowerCase().trim();
    const verificationCode = rawCode.toString().trim();

    const stored = verificationCodes.get(email);
    if (!stored) {
      console.log(`[AUTH] No code found for ${email}`);
      return res.status(400).json({ success: false, error: 'No verification code found for this email. Please request a new code.' });
    }
    
    console.log(`[AUTH] Verifying code for ${email}. Stored: "${stored.code}", Provided: "${verificationCode}"`);

    if (stored.code !== verificationCode) {
      console.log(`[AUTH] Code mismatch for ${email}. Stored: "${stored.code}", Provided: "${verificationCode}"`);
      return res.status(400).json({ success: false, error: `The verification code is incorrect for ${email}. Please check your email and enter the latest code sent to you.` });
    }

    if (Date.now() > stored.expires) {
      console.log(`[AUTH] Code expired for ${email}`);
      return res.status(400).json({ success: false, error: 'The verification code has expired. Please request a new one.' });
    }

    res.status(200).json({ success: true });
  });

  // API endpoint to submit form data
  app.post('/api/submit-membership', async (req, res) => {
    console.log('Received request to submit membership:', req.body);
    try {
      const { verificationCode: rawCode, ...formData } = req.body;
      const { fullName, cnic, email: rawEmail, whatsapp, planId, institute, degree, businessName, industry, experience, targetCountry, paymentMethod } = formData;

      if (!rawCode) return res.status(400).json({ success: false, error: 'Verification code is required' });
      const verificationCode = rawCode.toString().trim();

      if (!rawEmail) return res.status(400).json({ success: false, error: 'Email is required' });
      const email = rawEmail.toLowerCase().trim();

      // Verify code
      const stored = verificationCodes.get(email);
      console.log(`[AUTH] Final submission verification for ${email}. Stored: "${stored?.code}", Provided: "${verificationCode}"`);

      if (!stored) {
        return res.status(400).json({ success: false, error: 'No verification code found for this email. Please request a new code.' });
      }
      
      if (stored.code !== verificationCode) {
        console.log(`[AUTH] Code mismatch for ${email}. Stored: "${stored.code}", Provided: "${verificationCode}"`);
        return res.status(400).json({ success: false, error: `The verification code is incorrect for ${email}. Please check your email and enter the latest code sent to you.` });
      }

      if (Date.now() > stored.expires) {
        return res.status(400).json({ success: false, error: 'The verification code has expired. Please request a new one.' });
      }

      // Clear code after use
      verificationCodes.delete(email);

      if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        return res.status(500).json({ success: false, error: 'Server configuration error: Missing Google Sheets credentials in Environment Variables. Please set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.' });
      }

      let sheetSuccess = false;
      try {
        console.log('Submitting to Sheet ID:', process.env.GOOGLE_SHEET_ID);
        
        // Format date to a readable format (e.g., DD/MM/YYYY, HH:MM:SS AM/PM in Pakistan Time)
        const formattedDate = new Date().toLocaleString('en-PK', { 
          timeZone: 'Asia/Karachi',
          dateStyle: 'short',
          timeStyle: 'medium'
        });

        // Ensure the order matches the expected columns in the Google Sheet
        const values = [[
          formattedDate,           // Column A: Date & Time
          fullName,                // Column B: Full Name
          cnic,                    // Column C: CNIC Number
          email,                   // Column D: Email Address
          whatsapp,                // Column E: WhatsApp Number
          planId,                  // Column F: Selected Pathway
          paymentMethod || '',     // Column G: Payment Method
          institute || '',         // Column H: Academic Institution (Student)
          degree || '',            // Column I: Current Degree (Student)
          businessName || '',      // Column J: Business Name (Entrepreneur)
          industry || '',          // Column K: Industry (Entrepreneur)
          experience || '',        // Column L: Years of Experience (Professional)
          targetCountry || ''      // Column M: Target Country (Professional)
        ]];
        
        console.log('Values to append:', values);

        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Sheet1!A:M',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: values,
          },
        });
        console.log('Data successfully appended to Google Sheets.');
        sheetSuccess = true;
      } catch (sheetError: any) {
        console.error('Error appending to Google Sheets:', sheetError);
        return res.status(500).json({ success: false, error: `Failed to save data to Google Sheets: ${sheetError.message || 'Unknown error'}` });
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
            from: `"First Nobel Step" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to First Nobel Step - Membership Application Received',
            text: `Dear ${fullName},\n\nThank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.\n\nWe have successfully received your details and our team will review them shortly. Please find the attached Disclaimer document for your reference.\n\nBest regards,\nFirst Nobel Step Team\nsupport@firstnoblestep.com`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Welcome to First Nobel Step!</h2>
                <p>Dear <strong>${fullName}</strong>,</p>
                <p>Thank you for submitting your membership application to First Nobel Step (Pvt.) Ltd.</p>
                <p>We have successfully received your details and our team will review them shortly.</p>
                <p>Please find the attached <strong>Disclaimer</strong> document for your reference.</p>
                <br/>
                <p>Best regards,</p>
                <p><strong>First Nobel Step Team</strong><br/>
                <a href="mailto:support@firstnoblestep.com" style="color: #01411C;">support@firstnoblestep.com</a></p>
              </div>
            `,
            attachments: [
              {
                filename: 'Disclaimer_First_Noble_Step.pdf',
                path: path.join(__dirname, 'Disclaimer.pdf')
              }
            ]
          };

          await transporter.sendMail(mailOptions);
          console.log(`Welcome email sent to ${email}`);
        } catch (emailError: any) {
          console.error('Error sending welcome email:', emailError);
          if (emailError.message && emailError.message.includes('Username and Password not accepted')) {
            console.error('SMTP Authentication failed. Please ensure you are using a Gmail App Password, not your regular password.');
          }
        }
      } else {
        console.log('Skipping email send: SMTP credentials not configured or email missing.');
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error submitting to Google Sheets:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to submit data to Google Sheets';
      res.status(500).json({ success: false, error: `Google Sheets Error: ${errorMessage}` });
    }
  });

  // Vite middleware for development

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
