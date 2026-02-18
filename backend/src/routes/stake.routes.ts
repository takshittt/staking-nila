import { Router } from 'express';
import { StakeService } from '../services/stake.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public endpoint - create stake
router.post('/', async (req, res) => {
  try {
    const { walletAddress, planName, planVersion, amount, apy, lockDays, instantRewardPercent, txHash } = req.body;

    if (!walletAddress || !planName || !planVersion || !amount || !apy || !lockDays) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stake = await StakeService.createStake({
      walletAddress,
      planName,
      planVersion,
      amount,
      apy,
      lockDays,
      instantRewardPercent,
      txHash
    });

    res.json({
      success: true,
      stake: {
        stakeId: stake.stakeId,
        amount: Number(stake.amount),
        apy: Number(stake.apy),
        startDate: stake.startDate,
        endDate: stake.endDate
      }
    });
  } catch (error: any) {
    console.error('Create stake error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public endpoint - get user stakes
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;
    const stakes = await StakeService.getUserStakes(walletAddress);
    res.json({ success: true, stakes });
  } catch (error: any) {
    console.error('Get user stakes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoints
router.get('/', authMiddleware, async (req, res) => {
  try {
    const stakes = await StakeService.getAllStakes();
    res.json({ success: true, stakes });
  } catch (error: any) {
    console.error('Get stakes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/user/:walletAddress', authMiddleware, async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;
    const stakes = await StakeService.getUserStakes(walletAddress);
    res.json({ success: true, stakes });
  } catch (error: any) {
    console.error('Get user stakes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:stakeId/complete', authMiddleware, async (req, res) => {
  try {
    const stakeId = Array.isArray(req.params.stakeId)
      ? req.params.stakeId[0]
      : req.params.stakeId;
    const stake = await StakeService.completeStake(stakeId);

    res.json({
      success: true,
      stake: {
        stakeId: stake.stakeId,
        status: stake.status
      }
    });
  } catch (error: any) {
    console.error('Complete stake error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await StakeService.getStakeStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Get stake stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/risk-stats', authMiddleware, async (req, res) => {
  try {
    const stats = await StakeService.getRiskStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Get risk stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

