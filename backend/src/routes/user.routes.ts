import { Router } from 'express';
import { UserService } from '../services/user.service';
import { StakeService } from '../services/stake.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public endpoint - connect wallet
router.post('/connect', async (req, res) => {
  try {
    const { walletAddress, referralCode } = req.body;

    console.log('📥 Wallet connect request:', { walletAddress, referralCode });

    if (!walletAddress) {
      console.log('❌ Missing wallet address');
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await UserService.connectWallet(walletAddress, referralCode);

    console.log('✅ User registered:', user.walletAddress);

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        referralCode: user.referralCode
      }
    });
  } catch (error: any) {
    console.error('❌ Connect wallet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set referral code
router.post('/referral', async (req, res) => {
  try {
    const { walletAddress, referralCode } = req.body;

    if (!walletAddress || !referralCode) {
      return res.status(400).json({ error: 'Wallet address and referral code are required' });
    }

    await UserService.setReferrer(walletAddress, referralCode);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Set referral error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Skip referral
router.post('/referral/skip', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    await UserService.skipReferral(walletAddress);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Skip referral error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Public endpoint - get user info
router.get('/info/:walletAddress', async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await UserService.getUserByWallet(walletAddress);

    res.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Get user info error:', error);
    res.status(404).json({ error: error.message });
  }
});


// Admin endpoints - require authentication
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ success: true, users });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:walletAddress', authMiddleware, async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;
    const user = await UserService.getUserByWallet(walletAddress);
    const stakes = await StakeService.getUserStakes(walletAddress);

    res.json({
      success: true,
      user,
      stakes
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(404).json({ error: error.message });
  }
});

router.patch('/:walletAddress/status', authMiddleware, async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;
    const { status } = req.body;

    if (!status || !['active', 'flagged'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await UserService.updateUserStatus(walletAddress, status);

    res.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        status: user.status
      }
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Flag user
router.post('/:walletAddress/flag', authMiddleware, async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;
    const { reason } = req.body;

    const adminId = (req as any).adminId;
    const user = await UserService.flagUser(walletAddress, reason, adminId);

    res.json({
      success: true,
      message: 'User flagged successfully',
      user: {
        walletAddress: user.walletAddress,
        isFlagged: user.isFlagged,
        flaggedAt: user.flaggedAt,
        flaggedReason: user.flaggedReason
      }
    });
  } catch (error: any) {
    console.error('Flag user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Unflag user
router.post('/:walletAddress/unflag', authMiddleware, async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;

    const user = await UserService.unflagUser(walletAddress);

    res.json({
      success: true,
      message: 'User unflagged successfully',
      user: {
        walletAddress: user.walletAddress,
        isFlagged: user.isFlagged,
        unflaggedAt: user.unflaggedAt
      }
    });
  } catch (error: any) {
    console.error('Unflag user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Validate wallet connection (public endpoint)
router.post('/validate', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const validation = await UserService.validateWalletConnection(walletAddress);

    res.json({
      success: true,
      ...validation
    });
  } catch (error: any) {
    console.error('Validate wallet error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
