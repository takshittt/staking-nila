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

export default router;
