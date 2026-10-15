-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM(
  'PENDING',
  'SUCCESS',
  'FAILED'
);

-- AlterTable: cast in place to preserve existing rows
ALTER TABLE "Payments"
  ALTER COLUMN "status" TYPE "PaymentStatus"
  USING ("status"::"PaymentStatus"),
  ALTER COLUMN "currency" TYPE CHAR(3);

