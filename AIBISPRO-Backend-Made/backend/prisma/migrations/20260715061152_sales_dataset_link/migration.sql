-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "dataset_id" INTEGER;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
