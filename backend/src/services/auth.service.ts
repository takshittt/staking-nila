import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { CryptoService } from './crypto.service';
import { TotpService } from './totp.service';
import { ADMIN_ID } from '../utils/mongodb-constants';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '4h';

export class AuthService {
  static async checkSetupStatus(): Promise<boolean> {
    const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
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
    // Use transaction to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // Check if admin already exists with setup complete
      const existing = await tx.admin.findUnique({ where: { id: ADMIN_ID } });
      
      if (existing && existing.isSetupComplete) {
        throw new Error('Setup already completed');
      }

      // Verify TOTP code before making any changes
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

      // Create or update admin (only if setup not complete)
      const admin = existing 
        ? await tx.admin.update({
            where: { id: ADMIN_ID },
            data: {
              passwordHash,
              twoFactorSecret: encryptedSecret,
              backupCodes: encryptedBackupCodes,
              isSetupComplete: true
            }
          })
        : await tx.admin.create({
            data: {
              id: ADMIN_ID,
              passwordHash,
              twoFactorSecret: encryptedSecret,
              backupCodes: encryptedBackupCodes,
              isSetupComplete: true
            }
          });

      // Generate JWT token
      const token = jwt.sign(
        { adminId: admin.id }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      return { token, backupCodes };
    });
  }

  static async login(password: string, totpCode: string) {
    console.log('AuthService.login called');
    
    // Get admin
    const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
    
    console.log('Admin lookup:', {
      found: !!admin,
      isSetupComplete: admin?.isSetupComplete
    });
    
    // Strict check: admin must exist AND setup must be complete
    if (!admin) {
      throw new Error('Admin account not found. Setup required.');
    }
    
    if (!admin.isSetupComplete) {
      throw new Error('Setup not completed. Please complete setup first.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    console.log('Password validation:', isValidPassword);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Decrypt 2FA secret
    const decryptedSecret = CryptoService.decrypt(admin.twoFactorSecret);
    console.log('2FA secret decrypted:', !!decryptedSecret);

    // Verify TOTP code
    const isValidTotp = TotpService.verifyToken(decryptedSecret, totpCode);
    console.log('TOTP validation:', isValidTotp, 'for code:', totpCode);
    
    if (!isValidTotp) {
      throw new Error('Invalid 2FA code');
    }

    // Update last login
    await prisma.admin.update({
      where: { id: ADMIN_ID },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.id }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    return { token };
  }

  static verifyToken(token: string): { adminId: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }


}
