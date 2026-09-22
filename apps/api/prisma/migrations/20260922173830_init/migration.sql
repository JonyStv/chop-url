-- CreateTable
CREATE TABLE "analitica" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enlace_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "visitor_id" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(50),
    "country" VARCHAR(50),
    "city" VARCHAR(50),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "device_type" VARCHAR(50),
    "referrer" VARCHAR(50),
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analitica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enlace" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "url_original" TEXT NOT NULL,
    "titulo" VARCHAR(100),
    "fecha_creacion" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "estado" VARCHAR(100) NOT NULL DEFAULT 'Activo',
    "total_clicks" INTEGER DEFAULT 0,

    CONSTRAINT "enlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMPTZ(6) NOT NULL,
    "ip" VARCHAR(50),
    "dispositivo" TEXT,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "fecha_registro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" VARCHAR(30) NOT NULL DEFAULT 'gratuito',
    "limite_enlaces" INTEGER NOT NULL DEFAULT 10,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "plan_id" VARCHAR(50) NOT NULL DEFAULT 'free',

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "billing_interval" VARCHAR(10) NOT NULL DEFAULT 'month',
    "max_links" INTEGER,
    "max_clicks_per_month" BIGINT,
    "analytics_retention_days" INTEGER,
    "custom_slug" BOOLEAN NOT NULL DEFAULT false,
    "custom_domain" BOOLEAN NOT NULL DEFAULT false,
    "api_access" BOOLEAN NOT NULL DEFAULT false,
    "remove_branding" BOOLEAN NOT NULL DEFAULT false,
    "export_data" BOOLEAN NOT NULL DEFAULT false,
    "support_level" VARCHAR(20) NOT NULL DEFAULT 'email',
    "stripe_price_id" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "plan_id" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "stripe_price_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_event" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "stripe_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counter" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_analitica_enlace_id" ON "analitica"("enlace_id");

-- CreateIndex
CREATE INDEX "idx_analitica_timestamp" ON "analitica"("timestamp");

-- CreateIndex
CREATE INDEX "idx_analitica_usuario_id" ON "analitica"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "enlace_slug_key" ON "enlace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_token_key" ON "sesion"("token");

-- CreateIndex
CREATE INDEX "idx_sesion_token" ON "sesion"("token");

-- CreateIndex
CREATE INDEX "idx_sesion_usuario_id" ON "sesion"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripe_price_id_key" ON "plan"("stripe_price_id");

-- CreateIndex
CREATE INDEX "plan_is_active_sort_order_idx" ON "plan"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripe_customer_id_key" ON "subscription"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripe_subscription_id_key" ON "subscription"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usuario_id_key" ON "subscription"("usuario_id");

-- CreateIndex
CREATE INDEX "usage_counter_usuario_id_period_metric_idx" ON "usage_counter"("usuario_id", "period", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counter_usuario_id_period_metric_key" ON "usage_counter"("usuario_id", "period", "metric");

-- AddForeignKey
ALTER TABLE "analitica" ADD CONSTRAINT "fk_analitica_enlace" FOREIGN KEY ("enlace_id") REFERENCES "enlace"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "analitica" ADD CONSTRAINT "fk_analitica_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enlace" ADD CONSTRAINT "fk_enlace_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "fk_sesion_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
