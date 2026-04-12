import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheets API setup
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

  // API endpoint to create a payment intent
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      const { amount, currency } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // amount in cents
        currency: currency || 'pkr',
      });
      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
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

  // API endpoint to send OTP
  app.post('/api/send-otp', async (req, res) => {
    try {
      const { email: rawEmail, fullName } = req.body;
      if (!rawEmail) return res.status(400).json({ success: false, error: 'Email is required' });
      
      const email = rawEmail.toLowerCase().trim();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const crypto = await import('crypto');
      const secret = process.env.GOOGLE_PRIVATE_KEY || 'fallback_secret';
      const hash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
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
          subject: 'Your Verification Code - First Nobel Step',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Email Verification</h2>
              <p>Dear ${fullName || 'Applicant'},</p>
              <p>Your verification code for the First Nobel Step membership application is:</p>
              <div style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; letter-spacing: 5px; color: #01411C; background: #f0f4f9; padding: 15px 25px; border-radius: 8px; font-weight: bold;">${otp}</span>
              </div>
              <p>Please enter this code in the application form to proceed with your payment.</p>
              <p style="font-size: 12px; color: #666; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, hash });
      } else {
        return res.status(500).json({ success: false, error: 'Email service not configured. Please check SMTP settings.' });
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to send verification code' });
    }
  });

  // API endpoint to submit form data
  app.post('/api/submit-membership', async (req, res) => {
    console.log('Received request to submit membership:', req.body);
    try {
      const formData = req.body;
      const { fullName, cnic, email: rawEmail, whatsapp, planId, institute, degree, businessName, industry, experience, targetCountry, paymentMethod } = formData;

      if (!rawEmail) return res.status(400).json({ success: false, error: 'Email is required' });
      const email = rawEmail.toLowerCase().trim();

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
        
        console.log('Values to append:', values);

        const result = await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Sheet1!A:M',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: values,
          },
        });
        console.log('Data successfully appended to Google Sheets. Result:', JSON.stringify(result.data));
        sheetSuccess = true;
      } catch (sheetError: any) {
        console.error('Error appending to Google Sheets:', sheetError);
        // We continue even if sheet fails, or we can choose to fail here. 
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
        }
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to submit data';
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: `Error: ${errorMessage}` });
      }
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
