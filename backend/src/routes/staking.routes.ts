import { Router } from 'express';
import { StakingService } from '../services/staking.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { body, param, validationResult } from 'express-validator';

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
// AMOUNT CONFIGS (Public GET, Protected POST/PUT)
// ============================================

// Get all amount configs (PUBLIC - users need to see available options)
router.get('/amount-configs', async (req, res) => {
  try {
    const configs = await StakingService.getAllAmountConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single amount config (PUBLIC)
router.get('/amount-configs/:id', 
  param('id').isInt({ min: 0 }),
  validate,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const config = await StakingService.getAmountConfig(id);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create amount config (PROTECTED)
router.post('/amount-configs',
  authMiddleware,
  body('amount').isFloat({ min: 0.01 }),
  body('instantRewardPercent').isFloat({ min: 0, max: 100 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const { amount, instantRewardPercent } = req.body;
      const result = await StakingService.createAmountConfig(
        req.adminId!,
        amount,
        instantRewardPercent
      );
      
      // Invalidate cache
      await StakingService.invalidateCache('amount_configs');
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update amount config (PROTECTED)
router.put('/amount-configs/:id',
  authMiddleware,
  param('id').isInt({ min: 0 }),
  body('instantRewardPercent').isFloat({ min: 0, max: 100 }),
  body('active').isBoolean(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { instantRewardPercent, active } = req.body;
      
      const result = await StakingService.updateAmountConfig(
        req.adminId!,
        id,
        instantRewardPercent,
        active
      );
      
      // Invalidate cache
      await StakingService.invalidateCache('amount_configs');
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================
// LOCK CONFIGS (Public GET, Protected POST/PUT)
// ============================================

// Get all lock configs (PUBLIC)
router.get('/lock-configs', async (req, res) => {
  try {
    const configs = await StakingService.getAllLockConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single lock config (PUBLIC)
router.get('/lock-configs/:id',
  param('id').isInt({ min: 0 }),
  validate,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const config = await StakingService.getLockConfig(id);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create lock config (PROTECTED)
router.post('/lock-configs',
  authMiddleware,
  body('lockDays').isInt({ min: 1 }),
  body('aprPercent').isFloat({ min: 0, max: 500 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const { lockDays, aprPercent } = req.body;
      const result = await StakingService.createLockConfig(
        req.adminId!,
        lockDays,
        aprPercent
      );
      
      // Invalidate cache
      await StakingService.invalidateCache('lock_configs');
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update lock config (PROTECTED)
router.put('/lock-configs/:id',
  authMiddleware,
  param('id').isInt({ min: 0 }),
  body('aprPercent').isFloat({ min: 0, max: 500 }),
  body('active').isBoolean(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { aprPercent, active } = req.body;
      
      const result = await StakingService.updateLockConfig(
        req.adminId!,
        id,
        aprPercent,
        active
      );
      
      // Invalidate cache
      await StakingService.invalidateCache('lock_configs');
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================
// REWARD TIERS (Public GET, Protected POST/PUT)
// ============================================

// Get all reward tiers (PUBLIC)
router.get('/reward-tiers', async (req, res) => {
  try {
    const tiers = await StakingService.getAllRewardTiers();
    res.json(tiers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get active reward tiers only (PUBLIC)
router.get('/reward-tiers/active', async (req, res) => {
  try {
    const tiers = await StakingService.getActiveRewardTiers();
    res.json(tiers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single reward tier (PUBLIC)
router.get('/reward-tiers/:id',
  param('id').isInt({ min: 0 }),
  validate,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const tier = await StakingService.getRewardTier(id);
      res.json(tier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create reward tier (PROTECTED)
router.post('/reward-tiers',
  authMiddleware,
  body('minNilaAmount').isFloat({ min: 0 }),
  body('maxNilaAmount').isFloat({ min: 0 }),
  body('instantRewardPercent').isFloat({ min: 0, max: 100 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const { minNilaAmount, maxNilaAmount, instantRewardPercent } = req.body;
      
      // Validate range
      if (maxNilaAmount > 0 && maxNilaAmount <= minNilaAmount) {
        return res.status(400).json({ 
          error: 'Maximum amount must be greater than minimum (or 0 for unlimited)' 
        });
      }
      
      const result = await StakingService.createRewardTier(
        req.adminId!,
        minNilaAmount,
        maxNilaAmount,
        instantRewardPercent
      );
      
      // Invalidate cache
      await StakingService.invalidateCache('reward_tiers');
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update reward tier (PROTECTED)
router.put('/reward-tiers/:id',
  authMiddleware,
  param('id').isInt({ min: 0 }),
  body('minNilaAmount').isFloat({ min: 0 }),
  body('maxNilaAmount').isFloat({ min: 0 }),
  body('instantRewardPercent').isFloat({ min: 0, max: 100 }),
  body('active').isBoolean(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { minNilaAmount, maxNilaAmount, instantRewardPercent, active } = req.body;
      
      // Validate range
      if (maxNilaAmount > 0 && maxNilaAmount <= minNilaAmount) {
        return res.status(400).json({ 
          error: 'Maximum amount must be greater than minimum (or 0 for unlimited)' 
        });
      }
      
      const result = await StakingService.updateRewardTier(
        req.adminId!,
        id,
        minNilaAmount,
        maxNilaAmount,
        instantRewardPercent,
        active
      );
      
      // Invalidate cache
      await StakingService.invalidateCache('reward_tiers');
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================
// ACTIVE CONFIGS (Public - for frontend display)
// ============================================

// Get active amount configs only (PUBLIC)
router.get('/amount-configs/active', async (req, res) => {
  try {
    const configs = await StakingService.getActiveAmountConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get active lock configs only (PUBLIC)
router.get('/lock-configs/active', async (req, res) => {
  try {
    const configs = await StakingService.getActiveLockConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATS (Protected - Admin only)
// ============================================

// Get staking stats (PROTECTED)
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stats = await StakingService.getStakingStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
