import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAdmin() {
  try {
    console.log('🗑️  Deleting admin from database...');
    
    // Delete all audit logs first (foreign key constraint)
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: { adminId: 1 }
    });
    console.log(`✅ Deleted ${deletedLogs.count} audit log(s)`);
    
    // Delete the admin
    const deletedAdmin = await prisma.admin.delete({
      where: { id: 1 }
    });
    
    console.log('✅ Admin deleted successfully!');
    console.log('ℹ️  You can now run the setup process again.');
    
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.log('ℹ️  No admin found in database (already deleted or never created)');
    } else {
      console.error('❌ Error deleting admin:', error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

deleteAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
