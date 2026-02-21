import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailEnv {
    BREVO_API_KEY?: string;
    EMAIL_FROM?: string;
    EMAIL_FROM_NAME?: string;
    ADMIN_EMAIL?: string;
}

function getEnv(): EmailEnv {
    return {
        BREVO_API_KEY: process.env.BREVO_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
        EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL
    };
}

interface PaymentSuccessParams {
    to: string;
    name: string;
    invoiceId: string;
    tokens: number;
    tokenPrice: number;
    amount: number;
    walletAddress?: string;
}

/**
 * Send payment success email to customer via Brevo API
 */
export async function sendPaymentSuccessEmail(params: PaymentSuccessParams): Promise<boolean> {
    const { to, name, invoiceId, tokens, tokenPrice, amount, walletAddress = "" } = params;
    const { BREVO_API_KEY, EMAIL_FROM } = getEnv();

    if (!to || !BREVO_API_KEY) {
        console.warn('[EMAIL] Missing email recipient or BREVO_API_KEY');
        return false;
    }

    const senderEmail = EMAIL_FROM || "payments@nila.com";
    const senderName = "NILA Payments";

    try {
        console.log(`📧 [EMAIL] Sending customer email to: ${to}`);

        const payload = {
            sender: { email: senderEmail, name: senderName },
            to: [{ email: to, name: name || "" }],
            subject: "Payment Confirmation – NILA Token Purchase",
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8" /></head>
                <body style="font-family: Arial, sans-serif; background:#f6f8fb; padding:20px;">
                    <div style="background:#ffffff; border-radius:8px; padding:24px; color: #333; line-height: 1.6;">
                        <p>Hi <strong>${name || "Customer"}</strong>,</p>
                        <p>We have successfully received your payment for NILA tokens.</p>
                        
                        <p style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
                            <strong>Invoice ID:</strong> ${invoiceId}<br/>
                            <strong>Amount Paid:</strong> $${amount.toFixed(2)} USD<br/>
                            <strong>NILA Tokens:</strong> ${tokens.toFixed(2)} NILA<br/>
                            <strong>Token Price:</strong> $${tokenPrice.toFixed(4)} USD
                        </p>

                        <p>Your payment has been processed and your tokens have been staked to your wallet address${walletAddress ? `: <strong>${walletAddress}</strong>` : ''}.</p>

                        <p>Your staking rewards will begin accruing based on the plan you selected. You can view your stake details in your dashboard.</p>

                        <p>If you have any questions, please contact us at <a href="mailto:support@nila.com" style="color: #0066cc;">support@nila.com</a>.</p>

                        <p>Regards,<br/><strong>NILA Team</strong></p>
                    </div>
                </body>
                </html>
            `
        };

        const response = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": BREVO_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json() as { messageId?: string };
        console.log('[EMAIL] Brevo user response:', { status: response.status, messageId: result.messageId });

        if (!response.ok || !result.messageId) {
            throw new Error('BREVO_EMAIL_FAILED');
        }

        return true;
    } catch (error: any) {
        console.error("[EMAIL] Customer email error:", error.message);
        throw error;
    }
}

interface AdminNotificationParams {
    invoiceId: string;
    amount: number;
    currency?: string;
    tokenPrice: number;
    tokens: number;
    email: string;
    name: string;
    walletAddress?: string;
    txHash?: string;
    stakeId?: string;
}

/**
 * Send admin payment notification
 */
export async function sendAdminPaymentNotification(params: AdminNotificationParams): Promise<boolean> {
    const {
        invoiceId,
        amount,
        currency = 'USD',
        tokenPrice,
        tokens,
        email,
        name,
        walletAddress = '',
        txHash = '',
        stakeId = ''
    } = params;

    const { ADMIN_EMAIL, BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME } = getEnv();

    const adminEmail = ADMIN_EMAIL || "admin@nila.com";

    if (!BREVO_API_KEY) {
        console.warn('[EMAIL] Missing BREVO_API_KEY for admin notification');
        return false;
    }

    try {
        console.log(`📧 [EMAIL] Sending admin notification to: ${adminEmail}`);

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>New NILA Payment Successful – Invoice ${invoiceId}</h2>
                <p>New NILA payment processed successfully.</p>
                
                <p>
                    <strong>Invoice ID:</strong> ${invoiceId}<br/>
                    <strong>Customer Name:</strong> ${name || "Unknown"}<br/>
                    <strong>Customer Email:</strong> ${email || "Unknown"}<br/>
                    <strong>Amount Paid:</strong> $${amount.toFixed(2)} ${currency}<br/>
                    <strong>Tokens Purchased:</strong> ${tokens.toFixed(2)} NILA<br/>
                    <strong>Price per Token:</strong> $${tokenPrice.toFixed(4)} USD<br/>
                    <strong>Wallet Address:</strong> ${walletAddress || "Not Provided"}
                </p>

                <p>
                    <strong>Payment Gateway:</strong> 3THIX<br/>
                    <strong>Status:</strong> SUCCESS<br/>
                    <strong>Stake ID:</strong> ${stakeId || "N/A"}<br/>
                    <strong>Transaction Hash:</strong> ${txHash || "N/A"}<br/>
                    <strong>Timestamp:</strong> ${new Date().toISOString()}
                </p>

                <p>— NILA Staking System</p>
            </body>
            </html>
        `;

        const payload = {
            sender: { 
                email: EMAIL_FROM || "payments@nila.com", 
                name: EMAIL_FROM_NAME || "NILA Staking" 
            },
            to: [{ email: adminEmail, name: "Admin" }],
            subject: `New NILA Payment Successful – Invoice ${invoiceId}`,
            htmlContent: htmlContent
        };

        const response = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": BREVO_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json() as { messageId?: string };

        if (!response.ok) {
            console.error("[EMAIL] Brevo admin error:", response.status, result);
            return false;
        }

        console.log(`[EMAIL] Admin notification sent, messageId=${result.messageId}`);
        return true;
    } catch (error: any) {
        console.error("[EMAIL] Admin email error:", error.message);
        // Don't throw - admin email failure shouldn't block the flow
        return false;
    }
}

/**
 * Process successful payment - sends emails with idempotency check
 */
export async function processSuccessfulPayment(invoiceId: string): Promise<{ success: boolean; emailSent: boolean }> {
    console.log(`🎯 [EMAIL] Processing successful payment for invoice: ${invoiceId}`);

    try {
        // Get payment intent from database
        const paymentIntent = await prisma.paymentIntent.findUnique({
            where: { invoiceId }
        });

        if (!paymentIntent) {
            console.error(`[EMAIL] PaymentIntent not found: ${invoiceId}`);
            return { success: false, emailSent: false };
        }

        // Check if already sent (idempotency)
        const metadata = paymentIntent.metadata as any;
        if (metadata?.emailSentToUser === true) {
            console.log(`[EMAIL] Email already sent for invoice ${invoiceId}`);
            return { success: true, emailSent: true };
        }

        const { email, name, amount, nilaAmount, walletAddress, txHash, stakeId } = paymentIntent;

        if (!email) {
            console.error(`[EMAIL] No email found for invoice ${invoiceId}`);
            return { success: false, emailSent: false };
        }

        const tokenPrice = 0.08; // Fixed NILA price

        // Send user email
        await sendPaymentSuccessEmail({
            to: email,
            name,
            invoiceId,
            tokens: Number(nilaAmount),
            tokenPrice,
            amount: Number(amount),
            walletAddress: walletAddress || ''
        });

        // Mark email as sent in database
        await prisma.paymentIntent.update({
            where: { invoiceId },
            data: {
                metadata: {
                    ...(metadata || {}),
                    emailSentToUser: true,
                    emailSentAt: new Date().toISOString()
                }
            }
        });

        console.log(`[EMAIL] User email sent and marked for invoice ${invoiceId}`);

        // Send admin notification (non-blocking)
        sendAdminPaymentNotification({
            invoiceId,
            amount: Number(amount),
            tokenPrice,
            tokens: Number(nilaAmount),
            email,
            name,
            walletAddress: walletAddress || '',
            txHash: txHash || '',
            stakeId: stakeId || ''
        }).catch(err => {
            console.error('[EMAIL] Admin notification failed (non-blocking):', err.message);
        });

        return { success: true, emailSent: true };

    } catch (error: any) {
        console.error(`[EMAIL] Error processing payment for ${invoiceId}:`, error.message);
        return { success: false, emailSent: false };
    }
}
