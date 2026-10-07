-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'READY_FOR_ANALYSIS', 'ANALYZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('RUIM', 'FRACO', 'MEDIO', 'BOM', 'EXCELENTE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "number" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "segment" TEXT,
    "stand" TEXT,
    "notes" TEXT,
    "fair_price_usd" DECIMAL(14,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "brazil_price_brl" DECIMAL(14,4),
    "brazil_price_notes" TEXT,
    "brazil_price_reference" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PENDING',
    "supplier_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_parameters" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(14,6),
    "import_tax_rate" DECIMAL(8,6),
    "nationalization_rate" DECIMAL(8,6),
    "freight_rate" DECIMAL(8,6),
    "sales_tax_rate" DECIMAL(8,6) NOT NULL,
    "operational_cost_rate" DECIMAL(8,6) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_parameter_snapshots" (
    "id" UUID NOT NULL,
    "parameter_version" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(14,6) NOT NULL,
    "import_tax_rate" DECIMAL(8,6) NOT NULL,
    "nationalization_rate" DECIMAL(8,6) NOT NULL,
    "freight_rate" DECIMAL(8,6) NOT NULL,
    "sales_tax_rate" DECIMAL(8,6) NOT NULL,
    "operational_cost_rate" DECIMAL(8,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_parameter_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fair_price_usd" DECIMAL(14,4) NOT NULL,
    "market_price_brl" DECIMAL(14,4) NOT NULL,
    "fob_brl" DECIMAL(14,4) NOT NULL,
    "import_tax_brl" DECIMAL(14,4) NOT NULL,
    "nationalization_brl" DECIMAL(14,4) NOT NULL,
    "freight_other_brl" DECIMAL(14,4) NOT NULL,
    "final_cost_brl" DECIMAL(14,4) NOT NULL,
    "gross_result_brl" DECIMAL(14,4) NOT NULL,
    "sales_tax_brl" DECIMAL(14,4) NOT NULL,
    "operational_cost_brl" DECIMAL(14,4) NOT NULL,
    "net_result_brl" DECIMAL(14,4) NOT NULL,
    "net_margin" DECIMAL(12,6) NOT NULL,
    "classification" "Classification" NOT NULL,
    "parameter_version" INTEGER NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "suppliers_created_by_idx" ON "suppliers"("created_by");

-- CreateIndex
CREATE INDEX "products_created_by_idx" ON "products"("created_by");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_parameters_version_key" ON "financial_parameters"("version");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_snapshot_id_key" ON "analyses"("snapshot_id");

-- CreateIndex
CREATE INDEX "analyses_product_id_created_at_idx" ON "analyses"("product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_product_id_sequence_key" ON "analyses"("product_id", "sequence");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "analysis_parameter_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

