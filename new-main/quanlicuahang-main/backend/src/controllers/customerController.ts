import { Request, Response } from 'express';
import prisma from '../config/database';

// 1. Webhook nhận tự động từ Google Form / Sheet
export const createCustomerFromGoogleForm = async (req: Request, res: Response) => {
  try {
    const data = req.body as any;

    const fullName = String(data?.fullName || '').trim() || 'Khách hàng';
    const phone = data?.phone ? String(data.phone).trim() : null;
    const formTimestamp = data?.timestamp ? String(data.timestamp).trim() : null;
    const imageUrl = String(data?.imageUrl || '').trim();

    const rawPrice = data?.price || data?.giaBan || data?.salePrice || '0';
    const parsedPrice = parseInt(String(rawPrice).replace(/\D/g, ''), 10);
    const validPrice = isNaN(parsedPrice) ? 0 : parsedPrice;

    const brand = String(data?.brand || '').trim();
    const model = String(data?.model || '').trim();
    const vehicleName = [brand, model].filter(Boolean).join(' ').trim() || String(data?.vehicleName || '').trim() || null;

    // Lấy trực tiếp Số Khung (Cột L) & Số Acquy (Cột M) nhập tay
    const frameNumber = data?.frameNumber ? String(data.frameNumber).trim() : null;
    const batteryNumber = data?.batteryNumber ? String(data.batteryNumber).trim() : null;

    const customer = await prisma.customer.create({
      data: {
        fullName,
        phone,
        address: data?.address ? String(data.address).trim() : null,
        vehicleName,
        price: validPrice,
        staffName: data?.staffName ? String(data.staffName).trim() : null,
        branchName: data?.branchName ? String(data.branchName).trim() : null,
        imageUrl,
        frameNumber,   // Lưu Số Khung nhập tay
        batteryNumber, // Lưu Số Acquy nhập tay
        formTimestamp,
      },
    });

    console.log(`>>> [DATABASE SUCCESS] Lưu đơn ID #${customer.id}: ${customer.fullName}`);
    return res.status(200).json({ success: true, data: customer });

  } catch (error: any) {
    console.error('❌ Lỗi Webhook:', error?.message || error);
    return res.status(500).json({ success: false, message: error?.message || 'Lỗi DB' });
  }
};

// 2. Thêm mới thủ công từ Web React
export const createCustomerManual = async (req: Request, res: Response) => {
  try {
    const { fullName, phone, address, brand, model, price, staffName, branchName, frameNumber, batteryNumber } = req.body;

    const vehicleName = [brand, model].filter(Boolean).join(' ').trim() || null;
    const validPrice = price ? parseInt(String(price), 10) : 0;

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formTimestamp = `${day}/${month}/${year}`;

    const customer = await prisma.customer.create({
      data: {
        fullName: String(fullName).trim(),
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        vehicleName,
        price: validPrice,
        staffName: staffName ? String(staffName).trim() : null,
        branchName: branchName ? String(branchName).trim() : null,
        frameNumber: frameNumber ? String(frameNumber).trim() : null,
        batteryNumber: batteryNumber ? String(batteryNumber).trim() : null,
        formTimestamp,
      },
    });

    return res.status(200).json({ success: true, data: customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Không thể thêm khách hàng' });
  }
};

// 3. Sửa thông tin
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address, brand, model, price, staffName, branchName, frameNumber, batteryNumber } = req.body;

    const vehicleName = [brand, model].filter(Boolean).join(' ').trim() || null;
    const validPrice = price ? parseInt(String(price), 10) : 0;

    const updatedCustomer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        fullName: String(fullName).trim(),
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        vehicleName,
        price: validPrice,
        staffName: staffName ? String(staffName).trim() : null,
        branchName: branchName ? String(branchName).trim() : null,
        frameNumber: frameNumber ? String(frameNumber).trim() : null,
        batteryNumber: batteryNumber ? String(batteryNumber).trim() : null,
      },
    });

    return res.status(200).json({ success: true, data: updatedCustomer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Không thể cập nhật' });
  }
};

// 4. Xóa
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({ where: { id: Number(id) } });
    return res.status(200).json({ success: true, message: 'Đã xóa thành công' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Không thể xóa' });
  }
};

// 5. Lấy danh sách khách hàng
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { id: 'desc' } });
    const formattedCustomers = customers.map((c) => ({
      ...c,
      price: c.price ? Number(c.price) : 0,
    }));
    return res.status(200).json({ success: true, data: formattedCustomers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi truy vấn DB' });
  }
};

// 6. Reset ID
export const resetAllCustomers = async (req: Request, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Customer" RESTART IDENTITY;`);
    return res.status(200).json({ success: true, message: 'Đã reset ID về #1' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};