import { Router } from 'express';
import { RewardService } from '../services/reward.service';
import { param, body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================
// USER ENDPOINTS (Public - no auth required)
// ============================================

// Get pending rewards for a user
router.get('/pending/:walletAddress',
  param('walletAddress').isEthereumAddress(),
  validate,
  async (req, res) => {
    try {
      const walletAddress = req.params.walletAddress;
      const rewards = await RewardService.getUserPendingRewards(walletAddress);
      res.json({ success: true, rewards });
    } catch (error: any) {
      console.error('Get pending rewards error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get reward history for a user
router.get('/history/:walletAddress',
  param('walletAddress').isEthereumAddress(),
  validate,
  async (req, res) => {
    try {
      const walletAddress = req.params.walletAddress;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await RewardService.getUserRewardHistory(walletAddress, limit);
      res.json({ success: true, history });
    } catch (error: any) {
      console.error('Get reward history error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get lifetime earnings for a user
router.get('/lifetime/:walletAddress',
  param('walletAddress').isEthereumAddress(),
  validate,
  async (req, res) => {
    try {
      const walletAddress = req.params.walletAddress;
      const earnings = await RewardService.getUserLifetimeEarnings(walletAddress);
      res.json({ success: true, earnings });
    } catch (error: any) {
      console.error('Get lifetime earnings error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Claim rewards
router.post('/claim',
  body('walletAddress').isEthereumAddress(),
  body('type').optional().isIn(['ALL', 'INSTANT_CASHBACK', 'APY_REWARD', 'REFERRAL_REWARD']),
  body('rewardIds').optional().isArray(),
  validate,
  async (req, res) => {
    try {
      const { walletAddress, type, rewardIds } = req.body;
      const result = await RewardService.claimRewards({
        walletAddress,
        type,
        rewardIds
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Claim rewards error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Sync APY rewards from blockchain
router.post('/sync-apy/:walletAddress',
  param('walletAddress').isEthereumAddress(),
  validate,
  async (req, res) => {
    try {
      const walletAddress = req.params.walletAddress;
      const result = await RewardService.syncAPYRewards(walletAddress);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Sync APY rewards error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Record a claim that happened on-chain
router.post('/record-claim',
  body('walletAddress').isEthereumAddress(),
  body('type').isIn(['INSTANT_CASHBACK', 'REFERRAL_REWARD', 'ALL']),
  body('instantAmount').optional().isFloat({ min: 0 }),
  body('referralAmount').optional().isFloat({ min: 0 }),
  body('txHash').isString(),
  validate,
  async (req, res) => {
    try {
      const { walletAddress, type, instantAmount, referralAmount, txHash } = req.body;
      const result = await RewardService.recordClaim({
        walletAddress,
        type,
        instantAmount,
        referralAmount,
        txHash
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Record claim error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// ADMIN ENDPOINTS (Protected)
// ============================================

// Get all pending rewards (admin only)
router.get('/admin/all-pending',
  authMiddleware,
  async (req, res) => {
    try {
      const rewards = await RewardService.getAllPendingRewards();
      res.json({ success: true, rewards });
    } catch (error: any) {
      console.error('Get all pending rewards error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
