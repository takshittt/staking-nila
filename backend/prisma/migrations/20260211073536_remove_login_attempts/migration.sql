/*
  Warnings:

  - You are about to drop the `login_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `login_attempts` DROP FOREIGN KEY `login_attempts_adminId_fkey`;

-- DropTable
DROP TABLE `login_attempts`;
