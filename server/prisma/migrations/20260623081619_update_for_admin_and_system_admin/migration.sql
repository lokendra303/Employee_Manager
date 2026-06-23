/*
  Warnings:

  - Added the required column `organization_id` to the `distributors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `workers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `distributors` ADD COLUMN `organization_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `organization_id` INTEGER NULL,
    MODIFY `role` ENUM('SYSTEM_ADMIN', 'ADMIN', 'SUPERVISOR', 'DISTRIBUTOR', 'WORKER') NOT NULL;

-- AlterTable
ALTER TABLE `workers` ADD COLUMN `organization_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact_email` VARCHAR(191) NULL,
    `contact_phone` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `approved_at` DATETIME(3) NULL,
    `approved_by_id` INTEGER NULL,
    `rejected_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributors` ADD CONSTRAINT `distributors_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workers` ADD CONSTRAINT `workers_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
