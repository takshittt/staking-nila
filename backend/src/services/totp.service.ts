import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class TotpService {
  static generateSecret() {
    return speakeasy.generateSecret({
      name: 'MindwaveDAO Admin',
      length: 32
    });
  }

  static async generateQRCode(secret: string): Promise<string> {
    try {
      const qrCodeUrl = await QRCode.toDataURL(secret);
      return qrCodeUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 1 minute time drift
    });
  }

  static formatSecret(secret: string): string {
    // Format as XXXX XXXX XXXX XXXX for manual entry
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }
}
