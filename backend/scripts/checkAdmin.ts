import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.admin.findFirst();
    
    if (!admin) {
      console.log('❌ No admin found in database');
      console.log('   Setup is required');
      return;
    }

    console.log('✅ Admin found:');
    console.log('   ID:', admin.id);
    console.log('   Setup Complete:', admin.isSetupComplete);
    console.log('   Has Password:', !!admin.passwordHash);
    console.log('   Has 2FA Secret:', !!admin.twoFactorSecret);
    console.log('   Last Login:', admin.lastLoginAt || 'Never');
    console.log('   Created:', admin.createdAt);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
