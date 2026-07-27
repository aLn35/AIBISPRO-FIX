-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_number" TEXT;

-- CreateTable
CREATE TABLE "login_otp_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_number_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "new_phone_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_number_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "login_otp_codes" ADD CONSTRAINT "login_otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_number_requests" ADD CONSTRAINT "phone_number_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_number_requests" ADD CONSTRAINT "phone_number_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
