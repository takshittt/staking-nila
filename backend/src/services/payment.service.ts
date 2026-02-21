import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StakingService } from './staking.service';

const prisma = new PrismaClient();

// Fixed NILA price in USD
const NILA_PRICE_USD = 0.08;

// Validation helper
const validateEmail = (email: string): boolean => {
    const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return EMAIL_REGEX.test(email);
};

/**
 * Create Payment Invoice/Intent
 * POST /api/create-invoice
 */
export const createInvoice = async (req: Request, res: Response) => {
    try {
        const {
            amount,
            currency = 'USD',
            quantity = 1,
            name,
            email,
            walletAddress = '',
            amountConfigId,
            lockConfigId,
            billing_data,
            integration_type = 'iframe'
        } = req.body;

        console.log(`[CREATE_INVOICE] Request for ${email}, Amount: ${amount} ${currency}`);

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate configs exist (0 is a valid ID)
        if (amountConfigId === undefined || amountConfigId === null || lockConfigId === undefined || lockConfigId === null) {
            return res.status(400).json({ error: 'Missing amountConfigId or lockConfigId' });
        }

        // Validate configs exist
        try {
            const [amountConfig, lockConfig] = await Promise.all([
                StakingService.getAmountConfig(amountConfigId),
                StakingService.getLockConfig(lockConfigId)
            ]);

            if (!amountConfig || !amountConfig.active) {
                return res.status(400).json({ error: 'Invalid or inactive amount configuration' });
            }

            if (!lockConfig || !lockConfig.active) {
                return res.status(400).json({ error: 'Invalid or inactive lock configuration' });
            }
        } catch (error) {
            console.error('[CREATE_INVOICE] Config validation error:', error);
            return res.status(400).json({ error: 'Invalid configuration' });
        }

        // Load 3thix credentials
        const THIX_API_URL = (process.env.THIX_API_URL || 'https://webadmin.3thix.com').replace(/\/$/, '');
        const THIX_PUBLIC_KEY = process.env.THIX_PUBLIC_KEY;
        const THIX_SECRET_KEY = process.env.THIX_SECRET_KEY;

        if (!THIX_PUBLIC_KEY || !THIX_SECRET_KEY) {
            console.error('Missing 3thix credentials');
            return res.status(500).json({ error: 'Payment service not configured' });
        }

        // Generate invoice ID
        const invoiceId = `nila-${Date.now()}`;
        const totalAmount = Number(amount) * (Number(quantity) || 1);

        // Calculate NILA amount (USD ÷ 0.08)
        const nilaAmount = totalAmount / NILA_PRICE_USD;

        // Save PaymentIntent to database FIRST
        try {
            await prisma.paymentIntent.create({
                data: {
                    invoiceId,
                    walletAddress: walletAddress || '',
                    email,
                    name,
                    amount: totalAmount,
                    nilaAmount,
                    amountConfigId,
                    lockConfigId,
                    status: 'PENDING',
                    paymentMethod: 'CARD',
                    metadata: {
                        billing_data,
                        integration_type,
                        currency
                    }
                }
            });
            console.log(`[CREATE_INVOICE] Saved PENDING PaymentIntent to DB: ${invoiceId}`);
        } catch (dbError) {
            console.error('[CREATE_INVOICE] Failed to save PaymentIntent:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }

        // Build billing info
        const billingInfo = billing_data ? {
            first_name: billing_data.first_name || name.split(' ')[0] || name,
            last_name: billing_data.last_name || name.split(' ').slice(1).join(' ') || '',
            address_1: billing_data.address_1 || '',
            city: billing_data.city || '',
            postcode: billing_data.postcode || '',
            country: billing_data.country || 'US',
            email: email
        } : {
            first_name: name.split(' ')[0] || name,
            last_name: name.split(' ').slice(1).join(' ') || '',
            email: email
        };

        // Create 3thix payment intent
        const payload = {
            public_key: THIX_PUBLIC_KEY,
            secret_key: THIX_SECRET_KEY,
            reference_id: invoiceId,
            amount: totalAmount,
            currency: currency.toUpperCase(),
            integration_type: integration_type,
            email: email,
            name: name,
            order_items: [
                {
                    name: 'NILA Token Purchase',
                    description: 'NILA Token Purchase',
                    price: Number(amount),
                    quantity: Number(quantity) || 1,
                    amount: totalAmount
                }
            ],
            billing: billingInfo,
            metadata: {
                wallet_address: walletAddress,
                source: 'NILA_STAKING',
                invoice_id: invoiceId,
                amount_config_id: amountConfigId,
                lock_config_id: lockConfigId
            }
        };

        console.log(`[CREATE_INVOICE] Calling 3thix API: ${THIX_API_URL}/api/card/create-intent`);

        let response;
        try {
            response = await fetch(`${THIX_API_URL}/api/card/create-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
        } catch (fetchError: any) {
            console.error(`[3THIX ERROR] Network error:`, fetchError.message);
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { 
                    status: 'FAILED',
                    metadata: {
                        ...(billing_data || {}),
                        error: fetchError.message,
                        errorType: 'NETWORK_ERROR'
                    }
                }
            });
            return res.status(503).json({
                success: false,
                error: 'Payment gateway is currently unavailable. Please try again later.',
                errorType: 'GATEWAY_TIMEOUT',
                details: 'The payment service is not responding. This is a temporary issue.'
            });
        }

        const text = await response.text();
        console.log(`[CREATE_INVOICE] 3thix Response Status: ${response.status}`);

        if (!response.ok) {
            console.error(`[3THIX ERROR] ${response.status}`, text);
            // Update PaymentIntent to FAILED
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { 
                    status: 'FAILED',
                    metadata: {
                        ...(billing_data || {}),
                        error: text.substring(0, 500),
                        statusCode: response.status
                    }
                }
            });
            
            // Provide user-friendly error messages
            const errorMessage = response.status >= 500 
                ? 'Payment gateway is experiencing technical difficulties. Please try again later.'
                : 'Payment gateway error. Please check your details and try again.';
            
            return res.status(502).json({
                success: false,
                error: errorMessage,
                errorType: response.status >= 500 ? 'GATEWAY_ERROR' : 'REQUEST_ERROR',
                details: text.substring(0, 500)
            });
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[3THIX ERROR] Invalid JSON:', text);
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { status: 'FAILED' }
            });
            return res.status(502).json({
                success: false,
                error: 'Invalid response from payment gateway'
            });
        }

        if (!data.success) {
            console.error('[3THIX ERROR] Intent creation failed:', data.message || data.error);
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { status: 'FAILED' }
            });
            return res.status(400).json({
                success: false,
                error: data.message || data.error || 'Failed to create payment intent'
            });
        }

        const intentId = data.data?.intent_id;
        const paymentUrl = data.data?.payment_url;
        const intentStatus = data.data?.status;

        if (!paymentUrl) {
            console.error('[3THIX ERROR] No payment_url in response');
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { status: 'FAILED' }
            });
            return res.status(502).json({
                success: false,
                error: 'Payment gateway did not return payment URL'
            });
        }

        // Update PaymentIntent with intentId
        await prisma.paymentIntent.update({
            where: { invoiceId },
            data: { intentId }
        });

        console.log(`[CREATE_INVOICE] Intent created successfully: ${intentId}`);

        return res.json({
            success: true,
            invoiceId,
            intentId,
            status: intentStatus || 'requires_payment',
            paymentUrl,
            amount: data.data?.amount || totalAmount,
            integration_type: integration_type
        });

    } catch (error: any) {
        console.error('[CREATE_INVOICE] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create payment intent'
        });
    }
};

/**
 * Verify Payment Intent
 * POST /api/verify-intent
 */
export const verifyIntent = async (req: Request, res: Response) => {
    try {
        const { intent_id, invoice_id, intentId: intentIdParam, invoiceId: invoiceIdParam } = req.body;

        const intentId = intent_id || intentIdParam;
        const invoiceId = invoice_id || invoiceIdParam;

        console.log(`[VERIFY_INTENT] Request for invoiceId: ${invoiceId}, intentId: ${intentId}`);

        if (!intentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing intent_id'
            });
        }

        if (!invoiceId) {
            return res.status(400).json({
                success: false,
                error: 'Missing invoice_id'
            });
        }

        // Find PaymentIntent in database
        const paymentIntent = await prisma.paymentIntent.findUnique({
            where: { invoiceId }
        });

        if (!paymentIntent) {
            console.error(`[VERIFY_INTENT] PaymentIntent not found: ${invoiceId}`);
            return res.status(404).json({
                success: false,
                error: 'Payment intent not found'
            });
        }

        console.log(`[VERIFY_INTENT] Found PaymentIntent: ${invoiceId}, status: ${paymentIntent.status}`);

        // Idempotency: If already SUCCESS, return cached result
        if (paymentIntent.status === 'SUCCESS') {
            console.log(`[VERIFY_INTENT] Payment already verified: ${invoiceId}`);
            return res.status(200).json({
                success: true,
                invoiceId,
                intentId,
                status: 'SUCCESS',
                message: 'Payment already verified',
                stakeId: paymentIntent.stakeId,
                txHash: paymentIntent.txHash,
                nilaAmount: Number(paymentIntent.nilaAmount)
            });
        }

        // Verify with 3thix API
        console.log(`[VERIFY_INTENT] Verifying with 3thix: ${intentId}`);
        
        const THIX_API_URL = (process.env.THIX_API_URL || 'https://webadmin.3thix.com').replace(/\/$/, '');
        const THIX_PUBLIC_KEY = process.env.THIX_PUBLIC_KEY;
        const THIX_SECRET_KEY = process.env.THIX_SECRET_KEY;

        if (!THIX_PUBLIC_KEY || !THIX_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Payment service not configured'
            });
        }

        const response = await fetch(`${THIX_API_URL}/api/card/${intentId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                public_key: THIX_PUBLIC_KEY,
                secret_key: THIX_SECRET_KEY
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[VERIFY_INTENT] 3thix API Error: ${response.status}`, text);
            return res.status(502).json({
                success: false,
                error: 'Unable to verify payment status with gateway'
            });
        }

        const data = await response.json();
        console.log(`[VERIFY_INTENT] 3thix Response:`, JSON.stringify(data));

        const isSuccess = (data as any).success || (data as any).status === 'success' || (data as any).remark === 'success';

        if (!isSuccess || !(data as any).data) {
            return res.status(400).json({
                success: false,
                error: (data as any).message?.error || (data as any).remark || 'Payment verification failed'
            });
        }

        const paymentStatus = (data as any).data.status;

        if (paymentStatus !== 'succeeded') {
            console.warn(`[VERIFY_INTENT] Payment not succeeded: ${paymentStatus}`);
            return res.status(200).json({
                success: false,
                invoiceId,
                intentId,
                status: paymentStatus,
                message: `Payment status is ${paymentStatus}`
            });
        }

        // Payment succeeded - Create stake on blockchain
        console.log(`[VERIFY_INTENT] Payment verified! Creating stake for ${invoiceId}...`);

        try {
            // Import stake service dynamically to avoid circular dependency
            const { StakeService } = await import('./stake.service');
            const { BlockchainService } = await import('./blockchain.service');

            // Get configs from blockchain
            const [amountConfig, lockConfig] = await Promise.all([
                BlockchainService.getAmountConfig(paymentIntent.amountConfigId),
                BlockchainService.getLockConfig(paymentIntent.lockConfigId)
            ]);

            if (!amountConfig || !lockConfig) {
                throw new Error('Invalid configuration');
            }

            // Convert NILA amount to wei
            const { ethers } = await import('ethers');
            const nilaAmountWei = ethers.parseUnits(paymentIntent.nilaAmount.toString(), 18).toString();

            // Convert APR to basis points
            const aprBps = lockConfig.apr; // Already in basis points from contract

            // Create stake on blockchain (no instant reward for card payments)
            const blockchainResult = await BlockchainService.adminCreateStake(
                paymentIntent.walletAddress,
                nilaAmountWei,
                lockConfig.lockDuration,
                aprBps,
                0 // No instant reward for card payments
            );

            console.log(`[VERIFY_INTENT] Stake created on blockchain: ${blockchainResult.txHash}`);

            // Create stake record in database
            const stake = await StakeService.createStake({
                walletAddress: paymentIntent.walletAddress,
                planName: 'NILA Staking (Card Payment)',
                planVersion: 1,
                amount: Number(paymentIntent.nilaAmount),
                apy: lockConfig.apr / 100, // Convert basis points to percentage
                lockDays: lockConfig.lockDuration,
                instantRewardPercent: 0, // No instant reward for card payments
                txHash: blockchainResult.txHash
            });

            console.log(`[VERIFY_INTENT] Stake record created: ${stake.stakeId}`);

            // Update PaymentIntent to SUCCESS
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: {
                    status: 'SUCCESS',
                    txHash: blockchainResult.txHash,
                    stakeId: stake.stakeId
                }
            });

            // Create transaction record
            const { TransactionService } = await import('./transaction.service');
            await TransactionService.createTransaction({
                txHash: blockchainResult.txHash,
                walletAddress: paymentIntent.walletAddress,
                type: 'STAKE',
                amount: Number(paymentIntent.nilaAmount),
                status: 'confirmed'
            });

            console.log(`[VERIFY_INTENT] Payment verified and stake created successfully for ${invoiceId}`);

            // Send email notifications (non-blocking)
            const { processSuccessfulPayment } = await import('./email.service');
            processSuccessfulPayment(invoiceId).catch(err => {
                console.error('[VERIFY_INTENT] Email notification failed (non-blocking):', err.message);
            });

            return res.status(200).json({
                success: true,
                invoiceId,
                intentId,
                status: 'SUCCESS',
                message: 'Payment verified and stake created',
                stakeId: stake.stakeId,
                txHash: blockchainResult.txHash,
                nilaAmount: Number(paymentIntent.nilaAmount)
            });

        } catch (stakeError: any) {
            console.error(`[VERIFY_INTENT] Stake creation error:`, stakeError);
            
            // Update PaymentIntent to FAILED
            await prisma.paymentIntent.update({
                where: { invoiceId },
                data: { 
                    status: 'FAILED',
                    metadata: {
                        ...(paymentIntent.metadata as any || {}),
                        error: stakeError.message,
                        failedAt: new Date().toISOString()
                    }
                }
            });

            return res.status(500).json({
                success: false,
                error: 'Payment verified but stake creation failed. Please contact support.',
                details: stakeError.message
            });
        }

    } catch (error: any) {
        console.error('[VERIFY_INTENT] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
