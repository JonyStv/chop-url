/*
  Warnings:

  - You are about to drop the column `email_verification_token` on the `usuario` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified` on the `usuario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email_verification_token_hash]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "usuario_email_verification_token_key";

-- AlterTable
ALTER TABLE "usuario" DROP COLUMN "email_verification_token",
DROP COLUMN "email_verified",
ADD COLUMN     "email_verification_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "email_verification_token_hash" CHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_verification_token_hash_key" ON "usuario"("email_verification_token_hash");
