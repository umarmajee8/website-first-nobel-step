/**
 * FastPay payment callback (GET).
 *
 * Real integration TODO: verify the FastPay signature on the callback query
 * params using `process.env.FASTPAY_SECRET` before redirecting the user.
 */
export default async function handler(req: any, res: any) {
  const { status, txn_id } = req.query || {};
  const safeStatus = status === 'success' ? 'success' : 'failed';
  const safeTxn = String(txn_id || '').replace(/[^a-zA-Z0-9-]/g, '');

  const location =
    safeStatus === 'success'
      ? `/?payment_status=success&txn_id=${encodeURIComponent(safeTxn)}`
      : `/?payment_status=failed`;

  res.setHeader('Location', location);
  return res.status(302).end();
}
