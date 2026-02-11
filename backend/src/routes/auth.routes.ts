import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Temporary storage for setup secrets (in production, use Redis)
const setupSecrets = new Map<string, string>();

// Check if setup is required
router.get('/status', async (req, res) => {
  try {
    const setupRequired = await AuthService.checkSetupStatus();
    res.json({ setupRequired });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

// Generate QR code for setup
router.get('/setup/qr', async (req, res) => {
  try {
    const setupRequired = await AuthService.checkSetupStatus();
    
    if (!setupRequired) {
      return res.status(400).json({ error: 'Setup already completed' });
    }

    const { qrCodeUrl, secret, manualEntryCode } = await AuthService.generateSetupQR();
    
    // Store secret temporarily (use session ID in production)
    const sessionId = Math.random().toString(36).substring(7);
    setupSecrets.set(sessionId, secret);
    
    // Clean up old secrets after 10 minutes
    setTimeout(() => setupSecrets.delete(sessionId), 10 * 60 * 1000);
    
    res.json({ qrCodeUrl, manualEntryCode, sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Complete setup
router.post('/setup', async (req, res) => {
  try {
    const { password, totpCode, sessionId } = req.body;

    if (!password || !totpCode || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const totpSecret = setupSecrets.get(sessionId);
    if (!totpSecret) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    const { token, backupCodes } = await AuthService.completeSetup(password, totpCode, totpSecret);
    
    // Clean up
    setupSecrets.delete(sessionId);
    
    res.json({ 
      token, 
      backupCodes,
      message: 'Setup completed successfully' 
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Setup failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { password, totpCode } = req.body;

    if (!password || !totpCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { token } = await AuthService.login(password, totpCode);
    
    res.json({ token });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Verify token (for protected routes)
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, adminId: (req as any).adminId });
});

// Logout (optional - mainly for logging)
router.post('/logout', authMiddleware, (req, res) => {
  // In JWT-only approach, logout is handled client-side
  // This endpoint is optional for logging purposes
  res.json({ message: 'Logged out successfully' });
});

export default router;
