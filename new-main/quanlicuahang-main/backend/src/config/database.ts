import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Khởi tạo PrismaClient v6 tiêu chuẩn (không dùng adapter phức tạp)
export const prisma = new PrismaClient();

export default prisma;