import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    console.log('🔄 Resetting admin account...');
    
    const admin = await prisma.admin.findFirst();
    
    if (!admin) {
      console.log('❌ No admin found to reset');
      return;
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        isSetupComplete: false,
        passwordHash: '',
        twoFactorSecret: '',
        backupCodes: '[]'
      }
    });

    console.log('✅ Admin account reset successfully');
    console.log('   You can now go through the setup process again');
    console.log('   Visit: http://localhost:5174/setup');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
