-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `walletAddress` VARCHAR(191) NOT NULL,
    `referralCode` VARCHAR(191) NULL,
    `referredBy` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `firstConnectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_walletAddress_key`(`walletAddress`),
    UNIQUE INDEX `users_referralCode_key`(`referralCode`),
    INDEX `users_walletAddress_idx`(`walletAddress`),
    INDEX `users_referralCode_idx`(`referralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stakes` (
    `id` VARCHAR(191) NOT NULL,
    `stakeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `walletAddress` VARCHAR(191) NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `planVersion` INTEGER NOT NULL,
    `amount` DECIMAL(20, 8) NOT NULL,
    `apy` DECIMAL(5, 2) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `txHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stakes_stakeId_key`(`stakeId`),
    INDEX `stakes_userId_idx`(`userId`),
    INDEX `stakes_walletAddress_idx`(`walletAddress`),
    INDEX `stakes_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referrals` (
    `id` VARCHAR(191) NOT NULL,
    `referrerWallet` VARCHAR(191) NOT NULL,
    `referredWallet` VARCHAR(191) NOT NULL,
    `earnings` DECIMAL(20, 8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `referrals_referrerWallet_idx`(`referrerWallet`),
    INDEX `referrals_referredWallet_idx`(`referredWallet`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_config` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `referralPercentage` DECIMAL(5, 2) NOT NULL,
    `referrerPercentage` DECIMAL(5, 2) NOT NULL,
    `isPaused` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stakes` ADD CONSTRAINT `stakes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
