import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import customerRoutes from './routes/customerRoutes';

dotenv.config();

const app = express();

// Cho phép Frontend truy cập API
app.use(cors());

// Parse JSON payload từ webhook/request
app.use(express.json());

// Đăng ký route cho khách hàng
app.use('/api/customers', customerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;