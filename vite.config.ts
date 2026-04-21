import path from 'path';
import { defineConfig } from 'vite';

// Static-only configuration. The site is served from `index.html` as a
// standalone page; no React, no client-side environment variables.
// All secrets (SMTP creds, Google service-account key, OTP secret, etc.)
// live exclusively in Vercel serverless functions under /api.
export default defineConfig({
    server: {
        port: 3000,
        host: '0.0.0.0',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
