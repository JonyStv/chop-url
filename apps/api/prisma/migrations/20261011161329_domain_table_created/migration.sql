-- CreateTable
CREATE TABLE "dominio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "hostname" VARCHAR(255) NOT NULL,
    "verification_token" VARCHAR(255) NOT NULL,
    "verification_method" VARCHAR(10) NOT NULL DEFAULT 'txt',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sslStatus" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMPTZ(6),
    "verifiedAt" TIMESTAMPTZ(6),
    "activatedAt" TIMESTAMPTZ(6),
    "errorMessage" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dominio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dominio_hostname_key" ON "dominio"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "dominio_verification_token_key" ON "dominio"("verification_token");

-- CreateIndex
CREATE INDEX "dominio_usuario_id_idx" ON "dominio"("usuario_id");

-- CreateIndex
CREATE INDEX "dominio_hostname_status_idx" ON "dominio"("hostname", "status");

-- AddForeignKey
ALTER TABLE "dominio" ADD CONSTRAINT "dominio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
