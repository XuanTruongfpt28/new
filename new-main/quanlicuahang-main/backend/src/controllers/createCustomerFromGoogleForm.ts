import { Request, Response } from 'express';
import prisma from '../config/database';

// 1. Webhook nhận dữ liệu từ Google Form/Sheet (Cho phép mua nhiều lần)
export const createCustomerFromGoogleForm = async (req: Request, res: Response) => {
  try {
    const data = req.body as any;

    const fullName = String(data?.fullName || '').trim() || 'Khách hàng';
    const phone = data?.phone ? String(data.phone).trim() : '';
    const timestamp = String(data?.timestamp || '').trim();

    // Làm sạch Giá bán
    const rawPrice = data?.price || data?.giaBan || data?.salePrice || '0';
    const parsedPrice = parseInt(String(rawPrice).replace(/\D/g, ''), 10);
    const validPrice = isNaN(parsedPrice) ? 0 : parsedPrice;

    // Ghép Tên xe
    const brand = String(data?.brand || '').trim();
    const model = String(data?.model || '').trim();
    const vehicleName = [brand, model].filter(Boolean).join(' ').trim() || String(data?.vehicleName || '').trim() || null;

    // 🛡️ CHỐNG TRÙNG LẶP DÒNG (Chỉ bỏ qua nếu trùng cả Tên + SĐT + Tên Xe + Giá Bán)
    // Giúp khách hàng cũ mua xe mới/mua lần 2 vẫn lưu đơn hàng bình thường!
    if (phone && fullName) {
      const duplicateRecord = await prisma.customer.findFirst({
        where: {
          fullName: fullName,
          phone: phone,
          vehicleName: vehicleName,
          price: validPrice,
        },
      });

      // Nếu đã có đúng đơn hàng trùng khớp 100% tất cả thông tin này thì mới bỏ qua
      if (duplicateRecord) {
        console.log(`⚠️ [TRÙNG DÒNG] Bỏ qua dòng trùng khớp hoàn toàn: ${fullName} - ${vehicleName}`);
        return res.status(200).json({ 
          success: true, 
          message: 'Dữ liệu đơn hàng này đã tồn tại, bỏ qua trùng lặp.' 
        });
      }
    }

    // Lưu đơn hàng mới vào Database (Dù là khách hàng cũ hay mới)
    const customer = await prisma.customer.create({
      data: {
        fullName,
        phone: phone || null,
        address: data?.address ? String(data.address).trim() : null,
        vehicleName,
        price: validPrice,
        staffName: data?.staffName ? String(data.staffName).trim() : null,
        branchName: data?.branchName ? String(data.branchName).trim() : null,
        imageUrl: data?.imageUrl ? String(data.imageUrl).trim() : null,
      },
    });

    console.log(`>>> [DATABASE SUCCESS] Đã lưu đơn hàng mới ID #${customer.id}: ${customer.fullName} - ${vehicleName}`);
    return res.status(200).json({ success: true, data: customer });

  } catch (error: any) {
    console.error('❌ Lỗi Prisma khi lưu dữ liệu:', error?.message || error);
    return res.status(500).json({ 
      success: false, 
      message: error?.message || 'Lỗi lưu cơ sở dữ liệu' 
    });
  }
};

// 2. Lấy danh sách khách hàng truyền về cho Frontend React
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        id: 'desc', // Đơn mới nhất lên đầu
      },
    });

    const formattedCustomers = customers.map((c) => ({
      ...c,
      price: c.price ? Number(c.price) : 0,
    }));

    return res.status(200).json({
      success: true,
      data: formattedCustomers,
    });
  } catch (error: any) {
    console.error('❌ Lỗi truy vấn danh sách khách hàng:', error);
    return res.status(500).json({ success: false, message: 'Lỗi truy vấn cơ sở dữ liệu' });
  }
};

// 3. Hàm Xóa sạch dữ liệu & Reset ID về #1
export const resetAllCustomers = async (req: Request, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Customer" RESTART IDENTITY;`);
    console.log('🔥 [DATABASE RESET] Đã xóa toàn bộ dữ liệu và reset ID về #1!');
    return res.status(200).json({ 
      success: true, 
      message: 'Đã xóa toàn bộ dữ liệu cũ và reset ID về lại #1' 
    });
  } catch (error: any) {
    console.error('❌ Lỗi khi reset database:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};