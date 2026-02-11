import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { CryptoService } from './crypto.service';
import { TotpService } from './totp.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '4h';

export class AuthService {
  static async checkSetupStatus(): Promise<boolean> {
    const admin = await prisma.admin.findUnique({ where: { id: 1 } });
    return !admin || !admin.isSetupComplete;
  }

  static async generateSetupQR() {
    const secret = TotpService.generateSecret();
    const qrCodeUrl = await TotpService.generateQRCode(secret.otpauth_url!);
    
    return {
      qrCodeUrl,
      secret: secret.base32,
      manualEntryCode: TotpService.formatSecret(secret.base32)
    };
  }

  static async completeSetup(password: string, totpCode: string, totpSecret: string) {
    // Check if admin already exists
    const existing = await prisma.admin.findUnique({ where: { id: 1 } });
    if (existing && existing.isSetupComplete) {
      throw new Error('Setup already completed');
    }

    // Verify TOTP code
    const isValidTotp = TotpService.verifyToken(totpSecret, totpCode);
    if (!isValidTotp) {
      throw new Error('Invalid 2FA code');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Encrypt 2FA secret
    const encryptedSecret = CryptoService.encrypt(totpSecret);

    // Generate backup codes
    const backupCodes = CryptoService.generateBackupCodes();
    const encryptedBackupCodes = JSON.stringify(
      backupCodes.map(code => CryptoService.encrypt(code))
    );

    // Create or update admin
    const admin = await prisma.admin.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        passwordHash,
        twoFactorSecret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        isSetupComplete: true
      },
      update: {
        passwordHash,
        twoFactorSecret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        isSetupComplete: true
      }
    });

    // Generate JWT token
    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return { token, backupCodes };
  }

  static async login(password: string, totpCode: string) {
    // Get admin
    const admin = await prisma.admin.findUnique({ where: { id: 1 } });
    
    if (!admin || !admin.isSetupComplete) {
      throw new Error('Setup required');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Decrypt 2FA secret
    const decryptedSecret = CryptoService.decrypt(admin.twoFactorSecret);

    // Verify TOTP code
    const isValidTotp = TotpService.verifyToken(decryptedSecret, totpCode);
    if (!isValidTotp) {
      throw new Error('Invalid 2FA code');
    }

    // Update last login
    await prisma.admin.update({
      where: { id: 1 },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return { token };
  }

  static verifyToken(token: string): { adminId: number } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }


}
