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
import { EventListenerService } from './services/eventListener.service';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize blockchain service
try {
  BlockchainService.initialize();
  
  EventListenerService.startListening().catch((error) => {
    console.error('Failed to start event listeners:', error.message);
  });
} catch (error: any) {
  console.error('Blockchain initialization failed:', error.message);
}

// Middleware
app.use(express.json());

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
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

// Debug endpoint - remove in production
app.get('/debug/env', (req, res) => {
  res.json({
    encryptionKeySet: !!process.env.ENCRYPTION_KEY,
    encryptionKeyLength: process.env.ENCRYPTION_KEY?.length || 0,
    encryptionKeyFirst10: process.env.ENCRYPTION_KEY?.substring(0, 10) || 'not set',
    jwtSecretSet: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || '3001'
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  EventListenerService.stopListening();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  EventListenerService.stopListening();
  process.exit(0);
});

export default app;
