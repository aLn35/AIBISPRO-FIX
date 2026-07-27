-- CreateTable
CREATE TABLE "credential_change_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "new_email" TEXT,
    "new_password_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_change_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "credential_change_requests" ADD CONSTRAINT "credential_change_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_change_requests" ADD CONSTRAINT "credential_change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_change_requests" ADD CONSTRAINT "credential_change_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
