/*
  Warnings:

  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `price_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transaction_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `invoices`;

-- DropTable
DROP TABLE `price_cache`;

-- DropTable
DROP TABLE `transaction_logs`;

-- CreateTable
CREATE TABLE `payment_intents` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `intentId` VARCHAR(191) NULL,
    `walletAddress` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `nilaAmount` DECIMAL(20, 8) NOT NULL,
    `amountConfigId` INTEGER NOT NULL,
    `lockConfigId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'CARD',
    `txHash` VARCHAR(191) NULL,
    `stakeId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_intents_invoiceId_key`(`invoiceId`),
    UNIQUE INDEX `payment_intents_intentId_key`(`intentId`),
    INDEX `payment_intents_invoiceId_idx`(`invoiceId`),
    INDEX `payment_intents_intentId_idx`(`intentId`),
    INDEX `payment_intents_walletAddress_idx`(`walletAddress`),
    INDEX `payment_intents_status_idx`(`status`),
    INDEX `payment_intents_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
