# First Noble Step - Official Membership Portal

Official membership portal of First Noble Step (Pvt.) Ltd.

## Features
- Membership application with bank transfer proof upload
- Email OTP verification
- Faysal Bank integration
- Google Sheets integration for data storage
- Responsive design with Tailwind CSS

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables (create `.env` file):
   ```
   GOOGLE_SHEET_ID=
   GOOGLE_SERVICE_ACCOUNT_EMAIL=
   GOOGLE_PRIVATE_KEY=

   SMTP_USER=
   SMTP_PASS=

   COMPANY_WHATSAPP_EMAIL=

   OTP_SECRET=your-random-secret-string-min-32-chars
   ```

3. Run the app:
   ```
   npm run dev
   ```

## Build
```
npm run build
npm start
```

## Deployment
Configured for Vercel deployment. See `vercel.json`.

## Security Features
- OTP verification with hashed storage and 10-minute expiry
- Rate limiting on OTP endpoints
- No hard-coded bypass codes
- File upload validation (type + size)
- CORS configured
- Secure headers

© 2026 First Noble Step (Pvt.) Ltd.
