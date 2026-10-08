-- AlterTable
ALTER TABLE "usuario" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuario" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "usuario" ADD COLUMN "email_verification_token" VARCHAR(255);
ALTER TABLE "usuario" ADD COLUMN "email_verification_sent_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_verification_token_key" ON "usuario"("email_verification_token");

-- Update existing verified emails
UPDATE "usuario" SET "email_verified" = true, "email_verified_at" = NOW() WHERE "email_verified_at" IS NOT NULL;
