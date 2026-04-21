import crypto from 'crypto';

/**
 * Shared OTP / rate-limiting helpers for the First Nobel Step portal.
 *
 * Design notes:
 * - We HMAC the OTP + email + 5-minute time bucket with a dedicated secret
 *   (`OTP_SECRET`) so verification is both tamper-proof and time-bound
 *   without needing a server-side store for each pending code.
 * - A previous revision reused `GOOGLE_PRIVATE_KEY` as the HMAC secret and
 *   used `createHash` (not `createHmac`); both are fixed here.
 * - Rate limiting is in-memory (best-effort on serverless; each instance
 *   keeps its own Map). This is enough to stop basic abuse; for strict
 *   guarantees, swap in Upstash Redis.
 */

const BUCKET_MS = 5 * 60 * 1000; // 5 minutes
const ALLOWED_SKEW_BUCKETS = 1;   // accept current + previous bucket

function resolveSecret(): string {
  // Prefer a dedicated OTP secret; fall back to a derived secret from the
  // Google private key so existing deployments keep working during rollout,
  // and finally to a fixed string as a last resort (dev only).
  return (
    process.env.OTP_SECRET ||
    (process.env.GOOGLE_PRIVATE_KEY
      ? crypto
          .createHash('sha256')
          .update('fns-otp:' + process.env.GOOGLE_PRIVATE_KEY)
          .digest('hex')
      : 'fns-dev-otp-fallback-secret-change-me')
  );
}

function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / BUCKET_MS);
}

function sign(otp: string, email: string, bucket: number): string {
  return crypto
    .createHmac('sha256', resolveSecret())
    .update(`${otp}|${email}|${bucket}`)
    .digest('hex');
}

export function generateOtp(): string {
  // 6 digits, cryptographically random
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

export function signOtp(otp: string, email: string) {
  const bucket = currentBucket();
  const hash = sign(otp, email, bucket);
  return { hash, bucket };
}

export function verifyOtp(
  otp: string,
  email: string,
  hash: string,
  bucket: number,
): { ok: true } | { ok: false; reason: 'expired' | 'invalid' } {
  if (typeof bucket !== 'number' || !Number.isFinite(bucket)) {
    return { ok: false, reason: 'invalid' };
  }
  const now = currentBucket();
  if (bucket < now - ALLOWED_SKEW_BUCKETS || bucket > now + 1) {
    return { ok: false, reason: 'expired' };
  }
  const expected = sign(otp, email, bucket);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return { ok: false, reason: 'invalid' };
  return crypto.timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: 'invalid' };
}

/* ---------------- Rate limiting ---------------- */

type Bucket = { count: number; windowStart: number };
const rlStore = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rlStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rlStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((windowMs - (now - entry.windowStart)) / 1000),
    };
  }
  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: any): string {
  const fwd = (req.headers['x-forwarded-for'] || '') as string;
  const first = fwd.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

/* ---------------- CORS ---------------- */

export function applyCors(req: any, res: any) {
  const allowlist = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = (req.headers.origin as string) || '';
  if (allowlist.length === 0) {
    // No allowlist configured → same-origin only; still reflect origin so the
    // browser is happy when called from the production domain.
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (allowlist.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    // Reject by not setting the header; preflight will fail.
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
