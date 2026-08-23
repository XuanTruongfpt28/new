import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

// Chỉ lắng nghe port khi chạy môi trường local/dev
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 [SERVER] Dang chay tai http://localhost:${PORT}`);
  });
}

export default app;