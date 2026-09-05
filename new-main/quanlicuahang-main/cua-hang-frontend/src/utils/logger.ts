import { supabase } from '../supabase';

interface LogParams {
  actionType: 'LOGIN' | 'LOGOUT' | 'TRANSFER' | 'DELETE' | 'STATUS_CHANGE' | 'IMPORT' | 'SALE';
  description: string;
  user?: {
    username?: string;
    fullName?: string;
    branch?: string;
  };
}

export const logActivity = async ({ actionType, description, user }: LogParams) => {
  try {
    let currentUser = user;
    if (!currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    }

    await supabase.from('ActivityLog').insert([
      {
        username: currentUser?.username || 'Chưa xác định',
        full_name: currentUser?.fullName || 'Khách/Ẩn danh',
        branch: currentUser?.branch || 'N/A',
        action_type: actionType,
        description: description,
        ip_address: navigator.userAgent.substring(0, 100),
      },
    ]);
  } catch (error) {
    console.error('Lỗi lưu lịch sử thao tác:', error);
  }
};