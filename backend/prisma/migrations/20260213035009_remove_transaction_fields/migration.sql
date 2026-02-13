/*
  Warnings:

  - You are about to drop the column `blockNumber` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `gasPrice` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `gasUsed` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `sourceId` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `blockNumber`,
    DROP COLUMN `gasPrice`,
    DROP COLUMN `gasUsed`,
    DROP COLUMN `metadata`,
    DROP COLUMN `sourceId`;
