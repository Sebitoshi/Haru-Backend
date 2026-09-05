-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifyCode" TEXT,
ADD COLUMN     "emailVerifyCodeExpires" TIMESTAMP(3);
