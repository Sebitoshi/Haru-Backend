-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'superadmin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';
