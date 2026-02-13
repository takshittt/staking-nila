import { Router } from 'express';
import { TransactionService } from '../services/transaction.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public endpoints (no auth required)

// Get transactions by wallet address (PUBLIC - users can see their own transactions)
router.get('/wallet/:walletAddress', async (req, res) => {
  try {
    const walletAddress = Array.isArray(req.params.walletAddress)
      ? req.params.walletAddress[0]
      : req.params.walletAddress;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await TransactionService.getWalletTransactions(walletAddress, page, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction by hash (PUBLIC - for verification)
router.get('/hash/:txHash', async (req, res) => {
  try {
    const txHash = Array.isArray(req.params.txHash)
      ? req.params.txHash[0]
      : req.params.txHash;

    const transaction = await TransactionService.getTransactionByHash(txHash);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create transaction (PUBLIC - called after blockchain tx)
router.post('/', async (req, res) => {
  try {
    const { txHash, walletAddress, type, amount, status } = req.body;

    if (!txHash || !type) {
      return res.status(400).json({ error: 'txHash and type are required' });
    }

    const transaction = await TransactionService.createTransaction({
      txHash,
      walletAddress,
      type,
      amount,
      status
    });

    res.json({
      success: true,
      transaction
    });
  } catch (error: any) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin-only endpoints (require authentication)
router.use(authMiddleware);

// Get all transactions with filters (ADMIN ONLY)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.walletAddress) filters.walletAddress = req.query.walletAddress;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    const result = await TransactionService.getTransactions(filters, page, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction statistics (ADMIN ONLY)
router.get('/stats', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await TransactionService.getTransactionStats(startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent transactions (ADMIN ONLY)
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const transactions = await TransactionService.getRecentTransactions(limit);

    res.json({
      success: true,
      transactions
    });
  } catch (error: any) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transaction status (ADMIN ONLY)
router.patch('/:txHash', async (req, res) => {
  try {
    const txHash = Array.isArray(req.params.txHash)
      ? req.params.txHash[0]
      : req.params.txHash;

    const { status } = req.body;

    const transaction = await TransactionService.updateTransaction(txHash, {
      status
    });

    res.json({
      success: true,
      transaction
    });
  } catch (error: any) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
