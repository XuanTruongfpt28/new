import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

// 1. Cấu hình CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Health check route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Xe Dien Thanh Tuoi Backend is running!' });
});

// 3. Lấy danh sách khách hàng
app.get('/api/customers', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: 'desc' },
    });
    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 4. Thêm khách hàng thủ công từ Dashboard
app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      address,
      brand,
      model,
      vehicleName,
      color,
      price,
      staffName,
      branchName,
      frameNumber,
      batteryNumber,
      imageUrl,
      formTimestamp,
    } = req.body;

    const fullVehicle = vehicleName || [brand, model].filter(Boolean).join(' ');

    const newCustomer = await prisma.customer.create({
      data: {
        fullName,
        phone: phone ? String(phone) : null,
        address: address || null,
        vehicleName: fullVehicle || null,
        color: color || null,
        price: price ? parseInt(String(price), 10) : null,
        staffName: staffName || null,
        branchName: branchName || null,
        frameNumber: frameNumber || null,
        batteryNumber: batteryNumber || null,
        imageUrl: imageUrl || null,
        formTimestamp: formTimestamp || new Date().toLocaleDateString('vi-VN'),
      },
    });

    return res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 5. Cập nhật thông tin khách hàng
app.put('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customerId = parseInt(rawId, 10);

    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const {
      fullName,
      phone,
      address,
      brand,
      model,
      vehicleName,
      color,
      price,
      staffName,
      branchName,
      frameNumber,
      batteryNumber,
    } = req.body;

    const fullVehicle = vehicleName || [brand, model].filter(Boolean).join(' ');

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        fullName,
        phone: phone ? String(phone) : null,
        address: address || null,
        vehicleName: fullVehicle || null,
        color: color || null,
        price: price ? parseInt(String(price), 10) : null,
        staffName: staffName || null,
        branchName: branchName || null,
        frameNumber: frameNumber || null,
        batteryNumber: batteryNumber || null,
      },
    });

    return res.status(200).json({ success: true, data: updatedCustomer });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 6. Xóa khách hàng
app.delete('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customerId = parseInt(rawId, 10);

    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 7. Webhook nhận dữ liệu từ Google Apps Script
app.post('/api/customers/webhook', async (req: Request, res: Response) => {
  try {
    const {
      timestamp,
      fullName,
      phone,
      address,
      brand,
      model,
      price,
      staffName,
      branchName,
      imageUrl,
      color,
      frameNumber,
      batteryNumber,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ success: false, message: 'FullName is required' });
    }

    const fullVehicle = [brand, model].filter(Boolean).join(' ');
    const parsedPrice = price ? parseInt(String(price).replace(/[^0-9]/g, ''), 10) : null;

    const newCustomer = await prisma.customer.create({
      data: {
        fullName,
        phone: phone ? String(phone) : null,
        address: address || null,
        vehicleName: fullVehicle || null,
        color: color || null,
        price: isNaN(parsedPrice as number) ? null : parsedPrice,
        staffName: staffName || null,
        branchName: branchName || null,
        imageUrl: imageUrl || null,
        frameNumber: frameNumber || null,
        batteryNumber: batteryNumber || null,
        formTimestamp: timestamp || '',
      },
    });

    return res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default app;