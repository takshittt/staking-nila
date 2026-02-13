-- CreateTable
CREATE TABLE `pending_rewards` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `walletAddress` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 8) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `sourceId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `claimedAt` DATETIME(3) NULL,
    `txHash` VARCHAR(191) NULL,

    INDEX `pending_rewards_userId_idx`(`userId`),
    INDEX `pending_rewards_walletAddress_idx`(`walletAddress`),
    INDEX `pending_rewards_status_idx`(`status`),
    INDEX `pending_rewards_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pending_rewards` ADD CONSTRAINT `pending_rewards_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
