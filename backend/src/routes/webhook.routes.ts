import { Router } from 'express';
import { handle3thixWebhook } from '../services/webhook.service';

const router = Router();

/**
 * POST /api/webhooks/3thix
 * Handle 3thix payment webhooks
 */
router.post('/3thix', handle3thixWebhook);

export default router;
