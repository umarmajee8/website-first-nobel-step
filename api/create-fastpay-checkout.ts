import crypto from 'crypto';
import { applyCors } from './_lib/otp';

/**
 * Simulated FastPay checkout bootstrap.
 *
 * Real integration TODO:
 * - Replace this stub with a server-to-server call to the FastPay checkout
 *   API once merchant credentials are provisioned. Sign the payload with
 *   `process.env.FASTPAY_SECRET` and return the hosted checkout URL from
 *   the response.
 * - Persist `txnId` somewhere durable (e.g., Google Sheet row or a DB) so
 *   the payment callback can be reconciled.
 */
export default async function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { amount, paymentMethod, email } = req.body || {};

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    if (!paymentMethod) {
      return res
        .status(400)
        .json({ success: false, error: 'Payment method is required' });
    }
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const txnId = 'FP-' + crypto.randomBytes(6).toString('hex').toUpperCase();

    // TODO: replace with real FastPay hosted checkout URL.
    const checkoutUrl = `/api/payment-callback?status=success&txn_id=${encodeURIComponent(
      txnId,
    )}`;

    return res.status(200).json({ success: true, checkoutUrl, txnId });
  } catch (error: any) {
    console.error('[create-fastpay-checkout] error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to initialize payment gateway.' });
  }
}
