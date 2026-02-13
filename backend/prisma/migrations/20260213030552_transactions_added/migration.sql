-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `txHash` VARCHAR(191) NOT NULL,
    `walletAddress` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 8) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `blockNumber` INTEGER NULL,
    `gasUsed` VARCHAR(191) NULL,
    `gasPrice` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `transactions_txHash_key`(`txHash`),
    INDEX `transactions_txHash_idx`(`txHash`),
    INDEX `transactions_walletAddress_idx`(`walletAddress`),
    INDEX `transactions_type_idx`(`type`),
    INDEX `transactions_status_idx`(`status`),
    INDEX `transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
