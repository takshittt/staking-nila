import { Router } from 'express';
import { ReferralService } from '../services/referral.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public endpoint - get config
router.get('/config', async (req, res) => {
  try {
    const config = await ReferralService.getConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('Get referral config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoints
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await ReferralService.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get blockchain config
router.get('/config/blockchain', authMiddleware, async (req, res) => {
  try {
    const config = await ReferralService.getBlockchainConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('Get blockchain config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync database with blockchain
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const config = await ReferralService.syncWithBlockchain();
    res.json({ success: true, config, message: 'Synced with blockchain' });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/config', authMiddleware, async (req, res) => {
  try {
    const { referralPercentage, referrerPercentage, isPaused } = req.body;

    const config = await ReferralService.updateConfig({
      referralPercentage,
      referrerPercentage,
      isPaused
    });

    res.json({ success: true, config });
  } catch (error: any) {
    console.error('Update referral config error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/wallet/:walletAddress', authMiddleware, async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress) 
      ? req.params.walletAddress[0] 
      : req.params.walletAddress;
    const referrals = await ReferralService.getReferralsByWallet(walletAddress);
    res.json({ success: true, referrals });
  } catch (error: any) {
    console.error('Get wallet referrals error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
