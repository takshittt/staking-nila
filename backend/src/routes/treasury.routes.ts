import { Router } from 'express';
import { TreasuryService } from '../services/treasury.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { body, param, validationResult } from 'express-validator';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================
// TREASURY STATS
// ============================================

// Get comprehensive treasury statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await TreasuryService.getTreasuryStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract pause status
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const status = await TreasuryService.getContractStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USER REWARDS
// ============================================

// Get pending rewards for specific user
router.get('/user-rewards/:walletAddress',
  param('walletAddress').isEthereumAddress(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const walletAddress = req.params.walletAddress as string;
      const rewards = await TreasuryService.getUserPendingRewards(walletAddress);
      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// TREASURY MANAGEMENT
// ============================================

// Deposit rewards to contract
router.post('/deposit',
  body('amount').isFloat({ min: 0.01 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const { amount } = req.body;
      const result = await TreasuryService.depositRewards(
        req.adminId!,
        amount
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Withdraw excess rewards from contract
router.post('/withdraw',
  body('amount').isFloat({ min: 0.01 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const { amount } = req.body;
      const result = await TreasuryService.withdrawRewards(
        req.adminId!,
        amount
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================
// CONTRACT CONTROL
// ============================================

// Pause contract (required for withdrawals)
router.post('/pause', async (req: AuthRequest, res) => {
  try {
    const result = await TreasuryService.pauseContract(req.adminId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Unpause contract
router.post('/unpause', async (req: AuthRequest, res) => {
  try {
    const result = await TreasuryService.unpauseContract(req.adminId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// LIABILITY TRACKING
// ============================================

// Get liability statistics
router.get('/liabilities', async (req: AuthRequest, res) => {
  try {
    const stats = await TreasuryService.getLiabilityStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed liability breakdown
router.get('/liabilities/breakdown', async (req: AuthRequest, res) => {
  try {
    const breakdown = await TreasuryService.getLiabilityBreakdown();
    res.json(breakdown);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
