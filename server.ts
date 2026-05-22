import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import fs from 'fs';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

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
          from: `"First Noble Step" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your Verification Code - First Noble Step',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Email Verification</h2>
              <p>Dear ${fullName || 'Applicant'},</p>
              <p>Your verification code for the First Noble Step membership application is:</p>
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

  // API endpoint to verify OTP
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { email: rawEmail, otp, otpHash } = req.body;
      if (!rawEmail || !otp || !otpHash) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
      }
      
      const email = rawEmail.toLowerCase().trim();
      const crypto = await import('crypto');
      const secret = process.env.GOOGLE_PRIVATE_KEY || 'fallback_secret';
      const expectedHash = crypto.createHash('sha256').update(otp + email + secret).digest('hex');

      if (expectedHash === otpHash) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: 'Invalid verification code' });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Server error' });
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

      let proofAttached = false;
      let attachments: { filename: string; path?: string; content?: Buffer | string }[] = [];

      if (formData.paymentProof) {
          const base64Data = formData.paymentProof.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          attachments.push({
              filename: 'Payment_Proof.png',
              content: buffer
          });
          proofAttached = true;
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
            // Send bcc to the company so they see the proof
            bcc: process.env.COMPANY_WHATSAPP_EMAIL || process.env.SMTP_USER, 
            subject: 'Welcome to First Noble Step - Membership Application Received',
            text: `Dear ${fullName},\n\nThank you for submitting your membership application to First Noble Step (Pvt.) Ltd.\n\nWe have successfully received your details and our team will review them shortly.\n\nBest regards,\nFirst Noble Step Team\nsupport@firstnoblestep.com`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 10px;">Welcome to First Noble Step!</h2>
                <p>Dear <strong>${fullName}</strong>,</p>
                <p>Thank you for submitting your membership application to First Noble Step (Pvt.) Ltd.</p>
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
            `,
            attachments: attachments
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
    const distPath = path.join(process.cwd(), 'dist');
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
