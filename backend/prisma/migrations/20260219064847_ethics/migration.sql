-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(255) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `walletAddress` VARCHAR(255) NOT NULL,
    `nilaAmount` DECIMAL(20, 8) NOT NULL,
    `usdPrice` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userIpAddress` VARCHAR(191) NULL,
    `ethicsTransactionId` VARCHAR(191) NULL,
    `stakingTransactionHash` VARCHAR(191) NULL,
    `stakingBlockNumber` INTEGER NULL,

    UNIQUE INDEX `invoices_invoiceId_key`(`invoiceId`),
    INDEX `invoices_invoiceId_idx`(`invoiceId`),
    INDEX `invoices_userEmail_idx`(`userEmail`),
    INDEX `invoices_walletAddress_idx`(`walletAddress`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_logs` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `details` JSON NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `errorMessage` VARCHAR(191) NULL,

    INDEX `transaction_logs_invoiceId_idx`(`invoiceId`),
    INDEX `transaction_logs_eventType_idx`(`eventType`),
    INDEX `transaction_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_cache` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `price` DECIMAL(20, 8) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `price_cache_token_idx`(`token`),
    INDEX `price_cache_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `price_cache_token_currency_key`(`token`, `currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
