import { Router } from 'express';
import { StakingService } from '../services/staking.service';
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
// AMOUNT CONFIGS
// ============================================

// Get all amount configs
router.get('/amount-configs', async (req: AuthRequest, res) => {
  try {
    const configs = await StakingService.getAllAmountConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single amount config
router.get('/amount-configs/:id', 
  param('id').isInt({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await StakingService.getAmountConfig(id);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create amount config
router.post('/amount-configs',
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

// Update amount config
router.put('/amount-configs/:id',
  param('id').isInt({ min: 0 }),
  body('instantRewardPercent').isFloat({ min: 0, max: 100 }),
  body('active').isBoolean(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
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
// LOCK CONFIGS
// ============================================

// Get all lock configs
router.get('/lock-configs', async (req: AuthRequest, res) => {
  try {
    const configs = await StakingService.getAllLockConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single lock config
router.get('/lock-configs/:id',
  param('id').isInt({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await StakingService.getLockConfig(id);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create lock config
router.post('/lock-configs',
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

// Update lock config
router.put('/lock-configs/:id',
  param('id').isInt({ min: 0 }),
  body('aprPercent').isFloat({ min: 0, max: 500 }),
  body('active').isBoolean(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
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
// STATS
// ============================================

// Get staking stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await StakingService.getStakingStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
