-- DropForeignKey
ALTER TABLE "login_otp_codes" DROP CONSTRAINT "login_otp_codes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "phone_number_requests" DROP CONSTRAINT "phone_number_requests_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "phone_number_requests" DROP CONSTRAINT "phone_number_requests_user_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone_number";

-- DropTable
DROP TABLE "login_otp_codes";

-- DropTable
DROP TABLE "phone_number_requests";

