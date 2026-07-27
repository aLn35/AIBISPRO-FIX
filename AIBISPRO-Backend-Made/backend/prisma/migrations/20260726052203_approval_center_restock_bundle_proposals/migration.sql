-- CreateTable
CREATE TABLE "restock_requests" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "product_size_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "supplier_name" TEXT,
    "estimated_cost" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiated_by" INTEGER NOT NULL,
    "initiated_by_role" TEXT NOT NULL,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_proposals" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "product_ids" JSONB NOT NULL,
    "product_names" JSONB,
    "regular_price" DOUBLE PRECISION NOT NULL,
    "bundle_price" DOUBLE PRECISION NOT NULL,
    "strategy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_by" INTEGER NOT NULL,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_proposals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "product_sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_proposals" ADD CONSTRAINT "bundle_proposals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_proposals" ADD CONSTRAINT "bundle_proposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_proposals" ADD CONSTRAINT "bundle_proposals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
