/*
  Warnings:

  - You are about to drop the column `walletAddress` on the `stakes` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `stakes_walletAddress_idx` ON `stakes`;

-- AlterTable
ALTER TABLE `stakes` DROP COLUMN `walletAddress`;
