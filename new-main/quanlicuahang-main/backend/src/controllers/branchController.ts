import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

// 1. Tạo Chi Nhánh Mới (Create)
export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên chi nhánh là bắt buộc' });
    }

    const branch = await prisma.branch.create({
      data: { name, address, phone },
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// 2. Lấy Danh Sách Chi Nhánh (Read All)
export const getAllBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: branches.length, data: branches });
  } catch (error) {
    next(error);
  }
};

// 3. Lấy Chi Tiết 1 Chi Nhánh (Read One)
export const getBranchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh' });
    }

    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// 4. Cập Nhật Chi Nhánh (Update)
export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, address, phone, isActive } = req.body;

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: { name, address, phone, isActive },
    });

    res.status(200).json({ success: true, data: updatedBranch });
  } catch (error) {
    next(error);
  }
};

// 5. Xóa Chi Nhánh (Delete)
export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    await prisma.branch.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Xóa chi nhánh thành công' });
  } catch (error) {
    next(error);
  }
};