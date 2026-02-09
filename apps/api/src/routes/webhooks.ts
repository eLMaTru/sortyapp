import { Router } from 'express';
import { TransakWebhookSchema } from '@sortyapp/shared';

const router = Router();

/**
 * Transak webhook endpoint (placeholder for v0.1).
 *
 * When Transak is integrated:
 * 1. Validate webhook signature using TRANSAK_WEBHOOK_SECRET
 * 2. Parse the event (ORDER_COMPLETED, ORDER_FAILED, etc.)
 * 3. For ORDER_COMPLETED: enqueue SQS message for on-chain verification
 * 4. Worker verifies tx on Polygon and credits user's REAL wallet
 */
router.post('/transak', async (req, res, next) => {
  try {
    // Placeholder: validate signature
    // const signature = req.headers['x-transak-signature'];
    // if (!validateTransakSignature(signature, req.body)) {
    //   return res.status(401).json({ success: false, error: 'Invalid signature' });
    // }

    const body = TransakWebhookSchema.parse(req.body);
    console.log('[WEBHOOK] Transak event received:', JSON.stringify(body, null, 2));

    // Placeholder: enqueue for verification
    // await sqs.sendMessage({
    //   QueueUrl: process.env.TX_VERIFICATION_QUEUE_URL,
    //   MessageBody: JSON.stringify(body),
    // });

    res.json({ success: true, message: 'Webhook received (placeholder)' });
  } catch (err) { next(err); }
});

/**
 * Placeholder: Polygon tx verification worker.
 * In production, this would be a Lambda triggered by SQS.
 *
 * Steps:
 * 1. Read tx hash from message
 * 2. Query Polygon RPC for tx receipt
 * 3. Verify: to address = app wallet, token = USDC, amount matches order
 * 4. Credit user's REAL wallet
 * 5. Update order record with verification status
 */
// export async function verifyPolygonTransaction(txHash: string): Promise<boolean> {
//   // const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
//   // const receipt = await provider.getTransactionReceipt(txHash);
//   // ... verify details ...
//   return false;
// }

export default router;
