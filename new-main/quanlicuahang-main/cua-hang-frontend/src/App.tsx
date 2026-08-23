import React, { useState, useEffect } from 'react';
import { customerService } from './services/api';

interface Customer {
  id: number;
  fullName: string;
  phone?: string;
  address?: string;
  vehicleName?: string;
  price?: number;
  staffName?: string;
  branchName?: string;
  frameNumber?: string;
  batteryNumber?: string;
  formTimestamp?: string;
}

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    vehicleName: '',
    price: '',
    staffName: '',
    branchName: '',
    frameNumber: '',
    batteryNumber: '',
    formTimestamp: new Date().toLocaleDateString('vi-VN'),
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getAll();
      setCustomers(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerService.create({
        ...formData,
        price: formData.price ? parseInt(formData.price, 10) : null,
      });
      alert('Thêm khách hàng & hồ sơ xe thành công!');
      setFormData({
        fullName: '',
        phone: '',
        address: '',
        vehicleName: '',
        price: '',
        staffName: '',
        branchName: '',
        frameNumber: '',
        batteryNumber: '',
        formTimestamp: new Date().toLocaleDateString('vi-VN'),
      });
      fetchCustomers();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu dữ liệu!');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px', borderBottom: '1px solid #ddd', paddingBottom: '12px' }}>
        <h1 style={{ color: '#2563eb', margin: 0 }}>Xe Điện Thanh Tươi</h1>
        <p style={{ color: '#666', margin: '4px 0 0' }}>Hệ thống quản lý thông tin xe & khách hàng</p>
      </header>

      {/* Form thêm mới */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Thêm Khách Hàng / Hồ Sơ Xe Mới</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <input required name="fullName" placeholder="Tên khách hàng *" value={formData.fullName} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="phone" placeholder="Số điện thoại" value={formData.phone} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="address" placeholder="Địa chỉ" value={formData.address} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="vehicleName" placeholder="Tên loại xe" value={formData.vehicleName} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="frameNumber" placeholder="Số khung" value={formData.frameNumber} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="batteryNumber" placeholder="Số Ắc quy / Pin" value={formData.batteryNumber} onChange={handleChange} style={{ padding: '8px' }} />
          <input type="number" name="price" placeholder="Giá bán (VNĐ)" value={formData.price} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="staffName" placeholder="Nhân viên" value={formData.staffName} onChange={handleChange} style={{ padding: '8px' }} />
          <input name="branchName" placeholder="Chi nhánh" value={formData.branchName} onChange={handleChange} style={{ padding: '8px' }} />
          <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
              Lưu Thông Tin
            </button>
          </div>
        </form>
      </div>

      {/* Danh sách */}
      <div>
        <h3>Danh Sách Xe Đã Lưu</h3>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Tên khách</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>SĐT</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Xe</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Số Khung</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Số Pin/Acquy</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Giá</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Ngày Mua</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '15px', textAlign: 'center', color: '#888' }}>Chưa có bản ghi nào</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.fullName}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.phone || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.vehicleName || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.frameNumber || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.batteryNumber || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.price ? c.price.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{c.formTimestamp || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}