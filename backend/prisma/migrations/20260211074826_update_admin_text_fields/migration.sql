-- AlterTable
ALTER TABLE `admin` MODIFY `twoFactorSecret` TEXT NOT NULL,
    MODIFY `backupCodes` TEXT NOT NULL;
