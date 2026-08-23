-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT 'Khách hàng mới',
    "phone" TEXT,
    "address" TEXT,
    "vehicleName" TEXT,
    "price" DOUBLE PRECISION DEFAULT 0,
    "staffName" TEXT,
    "branchName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
