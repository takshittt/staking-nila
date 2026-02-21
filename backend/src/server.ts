import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import stakingRoutes from './routes/staking.routes';
import userRoutes from './routes/user.routes';
import stakeRoutes from './routes/stake.routes';
import referralRoutes from './routes/referral.routes';
import treasuryRoutes from './routes/treasury.routes';
import rewardRoutes from './routes/reward.routes';
import transactionRoutes from './routes/transaction.routes';
import paymentRoutes from './routes/payment.routes';
import cryptoStakeRoutes from './routes/crypto-stake.routes';
import webhookRoutes from './routes/webhook.routes';
import { BlockchainService } from './services/blockchain.service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize blockchain service
try {
  BlockchainService.initialize();
  console.log('✅ Blockchain service initialized');
} catch (error: any) {
  console.error('❌ Failed to initialize blockchain service:', error.message);
  console.error('⚠️  Staking endpoints will not work until blockchain is configured');
}

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stakes', stakeRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/crypto-stakes', cryptoStakeRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Admin Auth API is running' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Admin Auth API running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
