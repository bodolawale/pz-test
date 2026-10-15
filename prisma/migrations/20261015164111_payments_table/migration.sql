-- CreateTable
CREATE TABLE "Payments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);
