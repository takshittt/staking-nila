import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalizes 3thix webhook status to internal standard
 */
function normalizeWebhookStatus(event?: string, status?: string): string {
    if (!event && !status) return 'PENDING';

    const eventUpper = (event || '').toUpperCase();
    const statusUpper = (status || '').toUpperCase();

    // Check event first
    if (eventUpper === 'PAYMENT.SUCCESS') return 'SUCCESS';
    if (eventUpper === 'PAYMENT.FAILED') return 'FAILED';
    if (eventUpper === 'PAYMENT.CANCELLED') return 'CANCELLED';

    // Fallback to status
    if (['COMPLETED', 'SUCCESS', 'PAID', 'APPROVED', 'SETTLED'].includes(statusUpper)) return 'SUCCESS';
    if (['FAILED', 'ERROR', 'DECLINED'].includes(statusUpper)) return 'FAILED';
    if (['CANCELLED', 'CANCELED', 'EXPIRED'].includes(statusUpper)) return 'CANCELLED';

    return 'PENDING';
}

/**
 * Handle 3thix Webhook
 * POST /api/webhooks/3thix
 * 
 * Expected webhook payload:
 * {
 *   "event": "payment.success" | "payment.failed" | "payment.cancelled",
 *   "intent_id": "0194d210-xxxx-xxxx",
 *   "reference_id": "nila-1234567890",  // Our invoiceId
 *   "status": "completed" | "failed" | "cancelled",
 *   "amount": 100.00,
 *   "currency": "USD",
 *   "metadata": { ... },
 *   "timestamp": "2026-02-02T00:00:00Z"
 * }
 */
export const handle3thixWebhook = async (req: Request, res: Response) => {
    console.log('[WEBHOOK] 3thix webhook received');

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        console.log('[WEBHOOK] Payload received:', JSON.stringify(payload));

        // Extract key fields
        const {
            event,
            intent_id,
            reference_id,  // This is our invoiceId
            status,
            amount,
            currency,
            metadata,
            timestamp
        } = payload;

        const invoiceId = reference_id;

        if (!invoiceId) {
            console.error('[WEBHOOK] Missing reference_id (invoiceId) in payload');
            // Return 200 to prevent 3thix from retrying - we can't process without invoiceId
            return res.status(200).json({
                success: false,
                error: 'Missing reference_id',
                received: true
            });
        }

        console.log(`[WEBHOOK] Processing for invoiceId: ${invoiceId}, event: ${event}, intent_id: ${intent_id}`);

        // Find PaymentIntent in database
        const paymentIntent = await prisma.paymentIntent.findUnique({
            where: { invoiceId }
        });

        if (!paymentIntent) {
            console.error(`[WEBHOOK] PaymentIntent not found: ${invoiceId}`);
            return res.status(200).json({
                success: false,
                error: 'Payment intent not found',
                received: true
            });
        }

        // Normalize status
        const normalizedStatus = normalizeWebhookStatus(event, status);
        console.log(`[WEBHOOK] Normalized status: ${normalizedStatus}`);

        // Idempotency check - if already SUCCESS, don't reprocess
        if (paymentIntent.status === 'SUCCESS') {
            console.log(`[WEBHOOK] PaymentIntent ${invoiceId} already SUCCESS. Skipping.`);
            return res.status(200).json({
                success: true,
                message: 'Already processed',
                invoiceId,
                idempotent: true
            });
        }

        // Handle based on status
        if (normalizedStatus === 'SUCCESS') {
            console.log(`[WEBHOOK] Payment SUCCESS for ${invoiceId}. Creating stake...`);

            try {
                // Import services dynamically
                const { StakeService } = await import('./stake.service');
                const { BlockchainService } = await import('./blockchain.service');
                const { TransactionService } = await import('./transaction.service');
                const { ethers } = await import('ethers');

                // Get configs from blockchain
                const [amountConfig, lockConfig] = await Promise.all([
                    BlockchainService.getAmountConfig(paymentIntent.amountConfigId),
                    BlockchainService.getLockConfig(paymentIntent.lockConfigId)
                ]);

                if (!amountConfig || !lockConfig) {
                    throw new Error('Invalid configuration');
                }

                // Convert NILA amount to wei
                const nilaAmountWei = ethers.parseUnits(paymentIntent.nilaAmount.toString(), 18).toString();

                // Convert APR to basis points
                const aprBps = lockConfig.apr;

                // Create stake on blockchain (no instant reward for card payments)
                const blockchainResult = await BlockchainService.adminCreateStake(
                    paymentIntent.walletAddress,
                    nilaAmountWei,
                    lockConfig.lockDuration,
                    aprBps,
                    0 // No instant reward for card payments
                );

                console.log(`[WEBHOOK] Stake created on blockchain: ${blockchainResult.txHash}`);

                // Create stake record in database
                const stake = await StakeService.createStake({
                    walletAddress: paymentIntent.walletAddress,
                    planName: 'NILA Staking (Card Payment)',
                    planVersion: 1,
                    amount: Number(paymentIntent.nilaAmount),
                    apy: lockConfig.apr / 100,
                    lockDays: lockConfig.lockDuration,
                    instantRewardPercent: 0,
                    txHash: blockchainResult.txHash
                });

                console.log(`[WEBHOOK] Stake record created: ${stake.stakeId}`);

                // Update PaymentIntent to SUCCESS
                await prisma.paymentIntent.update({
                    where: { invoiceId },
                    data: {
                        status: 'SUCCESS',
                        txHash: blockchainResult.txHash,
                        stakeId: stake.stakeId,
                        intentId: intent_id || paymentIntent.intentId
                    }
                });

                // Create transaction record
                await TransactionService.createTransaction({
                    txHash: blockchainResult.txHash,
                    walletAddress: paymentIntent.walletAddress,
                    type: 'STAKE',
                    amount: Number(paymentIntent.nilaAmount),
                    status: 'confirmed'
                });

                console.log(`[WEBHOOK] Payment processed successfully for ${invoiceId}`);

                // Send email notifications (non-blocking)
                const { processSuccessfulPayment } = await import('./email.service');
                processSuccessfulPayment(invoiceId).catch(err => {
                    console.error('[WEBHOOK] Email notification failed (non-blocking):', err.message);
                });

                return res.status(200).json({
                    success: true,
                    invoiceId,
                    status: 'SUCCESS',
                    message: 'Payment processed and stake created',
                    stakeId: stake.stakeId,
                    txHash: blockchainResult.txHash
                });

            } catch (stakeError: any) {
                console.error(`[WEBHOOK] Stake creation error:`, stakeError);

                // Update PaymentIntent to FAILED
                await prisma.paymentIntent.update({
                    where: { invoiceId },
                    data: {
                        status: 'FAILED',
                        metadata: {
                            ...(paymentIntent.metadata as any || {}),
                            webhookError: stakeError.message,
                            failedAt: new Date().toISOString()
                        }
                    }
                });

                // Return 200 to prevent retries, but log the error
                return res.status(200).json({
                    success: false,
                    error: 'Stake creation failed',
                    details: stakeError.message,
                    received: true
                });
            }

        } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'CANCELLED') {
            console.log(`[WEBHOOK] Payment ${normalizedStatus} for ${invoiceId}`);

            // Update PaymentIntent to FAILED/CANCELLED
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { 
                    status: normalizedStatus,
                    intentId: intent_id || paymentIntent.intentId
                }
            });

            return res.status(200).json({
                success: true,
                invoiceId,
                status: normalizedStatus,
                message: `Payment ${normalizedStatus.toLowerCase()}`
            });

        } else {
            // Status is still PENDING - log but don't update
            console.log(`[WEBHOOK] Payment still PENDING for ${invoiceId}`);

            return res.status(200).json({
                success: true,
                invoiceId,
                status: 'PENDING',
                message: 'Payment still pending'
            });
        }

    } catch (error: any) {
        console.error('[WEBHOOK] Error processing webhook:', error);

        // Return 200 to prevent unnecessary retries, but log the error
        return res.status(200).json({
            success: false,
            error: error.message,
            received: true
        });
    }
};
