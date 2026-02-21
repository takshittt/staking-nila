import { Router } from 'express';
import { createInvoice, verifyIntent } from '../services/payment.service';

const router = Router();

// Create payment invoice/intent
router.post('/create-invoice', createInvoice);

// Verify payment intent
router.post('/verify-intent', verifyIntent);

export default router;
