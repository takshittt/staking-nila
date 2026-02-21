import { Router } from 'express';
import { CryptoStakeService } from '../services/crypto-stake.service';
import { StakingService } from '../services/staking.service';

const router = Router();

/**
 * POST /api/crypto-stakes/create-pending
 * Create a pending crypto stake (before NILA transaction)
 * Note: User will pay with NILA tokens. USD amount is just for display.
 */
router.post('/create-pending', async (req, res) => {
  try {
    const { walletAddress, amountConfigId, lockConfigId } = req.body;

    if (!walletAddress || !amountConfigId || !lockConfigId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get amount config from blockchain
    const amountConfig = await StakingService.getAmountConfig(amountConfigId);
    if (!amountConfig || !amountConfig.active) {
      return res.status(400).json({ error: 'Invalid or inactive amount configuration' });
    }

    // Get lock config from blockchain
    const lockConfig = await StakingService.getLockConfig(lockConfigId);
    if (!lockConfig || !lockConfig.active) {
      return res.status(400).json({ error: 'Invalid or inactive lock configuration' });
    }

    // Convert amount from wei to USD (display value)
    const usdAmount = Number(BigInt(amountConfig.amount) / BigInt(10 ** 18));

    // Create pending stake
    const pendingStake = await CryptoStakeService.createPendingStake({
      walletAddress,
      usdAmount,
      amountConfigId,
      lockConfigId
    });

    res.json({
      success: true,
      data: {
        stakeId: pendingStake.stakeId,
        usdAmount: pendingStake.usdAmount,
        nilaAmount: pendingStake.nilaAmount,
        instantRewardBps: amountConfig.instantRewardBps,
        lockDays: lockConfig.lockDuration,
        apr: lockConfig.apr,
        note: 'User will pay with NILA tokens. USD amount is for display only.'
      }
    });
  } catch (error: any) {
    console.error('Create pending crypto stake error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crypto-stakes/confirm
 * Confirm crypto stake after NILA transaction is successful
 * Note: User pays with NILA tokens. USD amount is just for display/rewards calculation.
 */
router.post('/confirm', async (req, res) => {
  try {
    const { 
      walletAddress, 
      amountConfigId, 
      lockConfigId, 
      txHash 
    } = req.body;

    if (!walletAddress || !amountConfigId || !lockConfigId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get configs from blockchain
    const amountConfig = await StakingService.getAmountConfig(amountConfigId);
    const lockConfig = await StakingService.getLockConfig(lockConfigId);

    if (!amountConfig || !lockConfig) {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    // Convert amount from wei to USD (display value)
    const usdAmount = Number(BigInt(amountConfig.amount) / BigInt(10 ** 18));
    
    // Calculate NILA amount (what user actually pays)
    const nilaAmount = CryptoStakeService.calculateNilaAmount(usdAmount);

    // Validate NILA transaction (optional - implement blockchain validation)
    const isValid = await CryptoStakeService.validateNilaTransaction(
      txHash,
      nilaAmount,
      walletAddress
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid NILA transaction' });
    }

    // Confirm stake
    const result = await CryptoStakeService.confirmCryptoStake({
      walletAddress,
      usdAmount,
      nilaAmount,
      lockDays: lockConfig.lockDuration,
      apr: lockConfig.apr,
      instantRewardBps: amountConfig.instantRewardBps,
      txHash
    });

    res.json({
      success: true,
      data: {
        stakeId: result.stake.stakeId,
        nilaAmount: result.nilaAmount,
        usdAmount: result.usdAmount,
        startDate: result.stake.startDate,
        endDate: result.stake.endDate,
        txHash: result.stake.txHash,
        note: 'User paid with NILA tokens. USD amount is for display only.'
      }
    });
  } catch (error: any) {
    console.error('Confirm crypto stake error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crypto-stakes/:stakeId
 * Get crypto stake details
 */
router.get('/:stakeId', async (req, res) => {
  try {
    const stakeId = Array.isArray(req.params.stakeId)
      ? req.params.stakeId[0]
      : req.params.stakeId;

    const stake = await CryptoStakeService.getStakeDetails(stakeId);

    res.json({
      success: true,
      data: stake
    });
  } catch (error: any) {
    console.error('Get crypto stake error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crypto-stakes/calculate
 * Calculate NILA amount from USD display amount
 * Note: User pays with NILA. USD is just for display.
 */
router.post('/calculate', async (req, res) => {
  try {
    const { usdAmount } = req.body;

    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({ error: 'Invalid USD amount' });
    }

    const nilaAmount = CryptoStakeService.calculateNilaAmount(usdAmount);

    res.json({
      success: true,
      data: {
        usdAmount,
        nilaAmount,
        nilaPrice: 0.08,
        note: 'User will pay with NILA tokens. USD amount is for display only.'
      }
    });
  } catch (error: any) {
    console.error('Calculate NILA amount error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
