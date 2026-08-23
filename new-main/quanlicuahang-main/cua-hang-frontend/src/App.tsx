import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Table,
  Input,
  Button,
  Card,
  Tag,
  Typography,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Space,
  DatePicker,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilterOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://xedienthanhtuoi.vercel.app/api';

export interface Customer {
  id?: number;
  fullName?: string;
  phone?: string;
  address?: string;
  brand?: string;
  model?: string;
  vehicleName?: string;
  color?: string;
  price?: number | string;
  staffName?: string;
  branchName?: string;
  frameNumber?: string;
  batteryNumber?: string;
  imageUrl?: string;
  formTimestamp?: string;
  createdAt?: string;
}

// Hàm chuẩn hóa mọi định dạng ngày thành object { day, month, year, fullDate }
const parseDateDetails = (rawDateStr?: string) => {
  if (!rawDateStr) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
      fullDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    };
  }

  // Nếu dạng DD/MM/YYYY
  if (rawDateStr.includes('/')) {
    const parts = rawDateStr.split(' ')[0].split('/');
    if (parts.length >= 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}` };
    }
  }

  // Nếu dạng ISO Date: 2026-08-23T17:44:40.819Z
  const dateObj = new Date(rawDateStr);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = String(dateObj.getFullYear());
    return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}` };
  }

  return { day: '....', month: '....', year: '2026', fullDate: rawDateStr };
};

// Hàm in hợp đồng 1 trang A4 chuẩn xác theo ngày mua của khách
const printContractInNewTab = (customer: Customer) => {
  const { day, month, year } = parseDateDetails(customer.formTimestamp || customer.createdAt);

  const hoTen = customer.fullName || '';
  const dienThoai = customer.phone || '';
  const diaChi = customer.address || '';
  const modelXe = customer.vehicleName || [customer.brand, customer.model].filter(Boolean).join(' ') || '';
  const mauXe = customer.color || '';
  const soKhung = customer.frameNumber || '';
  const soPin = customer.batteryNumber || '';

  const formatMoney = (val?: any) => {
    if (!val) return '';
    const num = Number(String(val).replace(/[^0-9]/g, ''));
    return isNaN(num) || num === 0 ? String(val) : num.toLocaleString('vi-VN') + ' VNĐ';
  };

  const giaXe = formatMoney(customer.price);
  const tongThanhToan = formatMoney(customer.price);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép mở popup trên trình duyệt để in hợp đồng!');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>Hop_dong_${hoTen || 'khach_hang'}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 4mm 6mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: "Times New Roman", Times, serif;
          font-size: 11px;
          line-height: 1.25;
          color: #000;
        }
        .page {
          width: 100%;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table.main-grid {
          border: 1px solid #000;
          margin: 4px 0;
          table-layout: fixed;
        }
        table.main-grid td, table.main-grid th {
          border: 1px solid #000;
          padding: 3px 4px;
          vertical-align: top;
        }
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- HEADER -->
        <table style="margin-bottom: 2px;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top; text-align: center;">
                <strong style="font-size: 11.5px;">CÔNG TY TNHH XE ĐIỆN THANH TƯƠI</strong><br />
                <span style="font-size: 10px;">Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang</span><br />
                <span style="font-size: 10px;">ĐT: 0939.30.90.91</span>
              </td>
              <td style="width: 50%; vertical-align: top; text-align: center;">
                <strong style="font-size: 11.5px;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
                <strong style="font-size: 11px;">Độc lập - Tự do - Hạnh phúc</strong><br />
                <i style="font-size: 10px;">..., Ngày ${day} Tháng ${month} Năm ${year}</i>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- TITLE -->
        <div style="text-align: center; margin: 2px 0 4px 0;">
          <div class="bold" style="font-size: 14px;">BIÊN NHẬN</div>
          <div class="bold" style="font-size: 11.5px;">(KIÊM HỢP ĐỒNG BÁN XE)</div>
        </div>

        <!-- BÊN A -->
        <div><strong>Bên A ( Bên bán xe): Công ty TNHH XE ĐIỆN THANH TƯƠI CHỢ MỚI:</strong></div>
        <div>Tài khoản: Công ty TNHH Xe điện Thanh Tươi Chợ Mới - MBBANK- 1867676868</div>
        <div>Điện thoại liên hệ : 0939.30.90.91</div>
        <div>CN1: Bình Hiệp A, xã Lấp Vò, tỉnh Đồng Tháp</div>
        <div>CN2: Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang</div>
        <div>CN3: Châu Văn Liêm, ấp Thị 2, xã Long Điền, tỉnh An Giang</div>
        <div>CN4: 293 Châu Văn Liêm, xã Long Điền, tỉnh An Giang</div>

        <!-- BÊN B -->
        <div style="margin-top: 3px;"><strong>Bên B ( Bên mua xe):</strong></div>
        <div>
          Họ và tên: <strong>${hoTen || '...................................................'}</strong>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Điện thoại: <strong>${dienThoai || '.........................'}</strong>
        </div>
        <div>Địa chỉ: <strong>${diaChi || '.......................................................................................................................................'}</strong></div>
        <div>CCCD số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nơi cấp: Cục Cảnh sát quản lý hành chính về TTXH</div>

        <div style="margin: 3px 0 2px 0;">
          Sau khi bàn bạc và đi đến thống nhất, bên A đồng ý bán xe và bên B đồng ý mua xe với các điều khoản sau:
        </div>

        <!-- BẢNG ĐIỀU KHOẢN -->
        <table class="main-grid">
          <thead>
            <tr>
              <th style="width: 33.33%; text-align: center; font-weight: bold;">I.ĐIỀU KHOẢN VỀ BẢO HÀNH</th>
              <th style="width: 33.33%; text-align: center; font-weight: bold;">II. THÔNG TIN VỀ XE</th>
              <th style="width: 33.34%; text-align: center; font-weight: bold;">III. HƯỚNG DẪN SỬ DỤNG ẮC QUY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="bold">YADEA</div>
                <div style="margin: 2px 0;">Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 24 tháng, cụ thể lỗi 1 bình đổi cả bộ trong 18 tháng, lỗi bình nào đổi bình đó trong 6 tháng còn lại (Hoặc 20.000km)</div>
                <div style="margin: 2px 0;">Động cơ, IC, bộ sạc bảo hành 36 tháng. Pin bảo hành 36 tháng (Hoặc 30.000km)</div>
              </td>
              <td>
                <div>*Model : <strong>${modelXe}</strong></div>
                <div>*Màu: <strong>${mauXe}</strong></div>
                <div>*Số khung: <strong>${soKhung}</strong></div>
                <div>* Số ắc quy/pin: <strong>${soPin}</strong></div>
                <div>* Số động cơ:</div>
                <div>* Mua thêm phụ kiện:</div>
                <div>* Thu xe cũ:</div>
                <div>Còn lại:</div>
                <div>* Đã cọc:</div>
                <div>* Giá xe: <strong>${giaXe}</strong></div>
                <div>* <strong>Tổng thanh toán: ${tongThanhToan}</strong></div>
                <div>Hình thức thanh toán:<br /> *Trả trước: &nbsp;&nbsp;&nbsp;&nbsp;<br /> *Còn lại:</div><br />
                <div>* Phụ kiện theo xe: Bộ sạc</div>
              </td>
              <td>
                <div class="italic" style="font-size: 10px;">
                  <strong>Lần sạc đầu tiên:</strong> sau khi sạc ắc quy đầy, sạc báo đèn xanh, rút sạc ra đợi khoảng 20 phút, cắm lại cho sạc tiếp tục khoảng 1 tiếng.
                </div>
                <div class="italic" style="font-size: 10px; margin-top: 2px;">
                  <strong>Trong quá trình sử dụng:</strong><br />
                  + Bạn nên để xe khoảng 30 phút để ắc quy nguội bớt rồi hãy sạc.<br />
                  + Nên sạc đầy rồi mới sử dụng. Hạn chế tối đa tình trạng xe cạn ắc quy và sạc nhiều lần trong ngày.<br />
                  + Trường hợp có việc bận không có nhu cầu sử dụng xe, thì mỗi tuần nên sạc 1 lần.
                </div>
                <div class="bold" style="font-size: 9.5px; margin-top: 3px;">
                  ẮC QUY SẼ XUỐNG CẤP DẦN THEO THỜI GIAN NÊN HÃY SỬ DỤNG ĐÚNG CÁCH ĐỂ SỬ DỤNG ẮC QUY ĐƯỢC LÂU HƠN
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="bold">BMX, PEGA, DK, SONSU…<br />JP, UNI</div><br />
                <div style="margin: 2px 0;">Bình bảo hành 12 tháng, phù 06 tháng ( nên xem hướng dẫn sử dụng ắc quy).</div><br />
                <div style="margin: 2px 0;">Động cơ, IC, bộ sạc bảo hành 12 tháng.</div><br />
                <div style="margin: 2px 0;">Bình bảo hành 12 tháng, phù 09 tháng ( nên xem hướng dẫn sử dụng ắc quy).</div><br />
              </td>
              <td>
                <div class="bold">IV: Thoả thuận và thống nhất giữa hai bên như sau</div>
                <div>* Giá bán xe chưa bao gồm phí trước bạ, phí bấm biển số và phí dịch vụ ( đối với xe máy điện)</div>
                <div>* Dịch vụ bấm biển số (không bao bảo hiểm và phí kẹp biển số):</div>
                <div class="bold">* Quà tặng: NÓN BẢO HIỂM</div>
                <div class="bold italic" style="margin-top: 2px;">*ƯU ĐÃI ĐẶC BIỆT: Miễn công cứu hộ tận nhà 12 tháng khi xe KÉO GA KHÔNG CHẠY (15km)</div>
              </td>
              <td>
                <div class="bold">V: Điều khoản chung</div>
                <div>* Bên B đã kiểm tra xe mới 100%, không trầy xước, phụ tùng theo xe đầy đủ.</div>
                <div>* Bên B đã được bên A hướng dẫn sử dụng xe, chế độ bảo hành và kỹ năng lái xe an toàn, nhận quà khuyến mãi đầy đủ, bên B đã đọc và xác nhận những nội dung trên.</div>
                <div>* Biên nhận được lập thành 02 bản có giá trị như nhau , mỗi bên giữ 1 bản</div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- LƯU Ý -->
        <div style="margin-top: 3px;">
          <div class="bold">*LƯU Ý :</div>
          <table style="font-size: 9.5px; line-height: 1.15;">
            <tbody>
              <tr><td style="width: 14px; vertical-align: top;">✓</td><td class="bold italic">LUÔN ĐỘI NÓN BẢO HIỂM KHI THAM GIA GIAO THÔNG (Kể cả xe đạp điện).</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">NHỮNG PHẦN HAO MÒN TRONG QUÁ TRÌNH SỬ DỤNG KHÔNG BẢO HÀNH .</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">KHÔNG BẢO HÀNH ĐỐI VỚI XE ĐÃ THAY ĐỔI KẾT CẤU VỀ ĐIỆN.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">BẢO HÀNH SỬA CHỮA KHÔNG BẢO HÀNH ĐỔI MỚI.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">BẢO HÀNH PHẢI CHO THÁO XE, ĐỒNG THỜI XE PHẢI ĐƯỢC ĐEM ĐẾN CỬA HÀNG.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">MỌI VẤN ĐỀ PHÁT SINH VỚI XE TRONG QUÁ TRÌNH SỬ DỤNG PHẢI ĐEM ĐẾN CỬA HÀNG TRONG THỜI GIAN NHANH NHẤT (1-3 NGÀY) ĐỂ ĐƯỢC GIẢI QUYẾT. NẾU SAU THỜI GIAN TRÊN CỬA HÀNG HOÀN TOÀN KHÔNG CHỊU TRÁCH NHIỆM.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">PHÍ ĐỔI - TRẢ SẢN PHẨM 30% TRONG VÒNG 30 NGÀY, KỂ TỪ NGÀY MUA.</td></tr>
            </tbody>
          </table>
          <div style="text-align: right; font-style: italic; margin-top: 2px; font-size: 9.5px;">
            Tôi (bên B) hoàn toàn đồng ý với những thoả thuận trên.
          </div>
        </div>

        <!-- CHỮ KÝ -->
        <table style="margin-top: 10px; text-align: center;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <strong style="font-size: 11.5px;">Bên bán A</strong><br />
                <i style="font-size: 9.5px;">( Ký và ghi rõ họ tên)</i>
              </td>
              <td style="width: 50%; vertical-align: top;">
                <strong style="font-size: 11.5px;">Bên mua B</strong><br />
                <i style="font-size: 9.5px;">( Ký và ghi rõ họ tên)</i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportForm] = Form.useForm();
  const [form] = Form.useForm();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_API_URL}/customers`);
      if (response.data && response.data.success) {
        setCustomers(response.data.data);
      } else if (Array.isArray(response.data)) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      message.error('Không thể tải dữ liệu từ máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const staffOptions = useMemo(() => {
    const staffSet = new Set<string>();
    customers.forEach((c) => {
      if (c.staffName && c.staffName.trim()) staffSet.add(c.staffName.trim());
    });
    return Array.from(staffSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  const branchOptions = useMemo(() => {
    const branchSet = new Set<string>();
    customers.forEach((c) => {
      if (c.branchName && c.branchName.trim()) branchSet.add(c.branchName.trim());
    });
    return Array.from(branchSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: Customer) => {
    setEditingCustomer(record);
    const nameParts = (record.vehicleName || '').split(' ');
    const brand = record.brand || nameParts[0] || '';
    const model = record.model || nameParts.slice(1).join(' ') || '';

    form.setFieldsValue({
      fullName: record.fullName || '',
      phone: record.phone || '',
      address: record.address || '',
      brand,
      model,
      color: record.color || '',
      price: record.price ? Number(record.price) : 0,
      staffName: record.staffName || '',
      branchName: record.branchName || '',
      frameNumber: record.frameNumber || '',
      batteryNumber: record.batteryNumber || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingCustomer && editingCustomer.id) {
        await axios.put(`${BASE_API_URL}/customers/${editingCustomer.id}`, values);
        message.success('Cập nhật thành công!');
      } else {
        await axios.post(`${BASE_API_URL}/customers`, values);
        message.success('Thêm mới thành công!');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomers();
    } catch (error) {
      message.error('Lưu dữ liệu thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      await axios.delete(`${BASE_API_URL}/customers/${id}`);
      message.success('Đã xóa thành công!');
      fetchCustomers();
    } catch (error) {
      message.error('Xóa thất bại!');
    }
  };

  const handleExportExcel = (values: any) => {
    const { dateRange, staffName, branchName } = values;
    let filtered = [...customers];

    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');

      filtered = filtered.filter((item) => {
        const rawTime = item.formTimestamp || item.createdAt;
        if (!rawTime) return false;

        let itemDate: dayjs.Dayjs | null = null;
        if (rawTime.includes('/')) {
          const datePart = rawTime.split(' ')[0];
          itemDate = dayjs(datePart, 'DD/MM/YYYY');
        } else {
          itemDate = dayjs(rawTime);
        }

        if (!itemDate || !itemDate.isValid()) return false;
        return (
          (itemDate.isAfter(startDate) || itemDate.isSame(startDate)) &&
          (itemDate.isBefore(endDate) || itemDate.isSame(endDate))
        );
      });
    }

    if (staffName) filtered = filtered.filter((item) => item.staffName === staffName);
    if (branchName) filtered = filtered.filter((item) => item.branchName === branchName);

    if (filtered.length === 0) {
      message.warning('Không tìm thấy dữ liệu phù hợp!');
      return;
    }

    const excelData = filtered.map((item, index) => {
      const { fullDate } = parseDateDetails(item.formTimestamp || item.createdAt);
      return {
        'STT': index + 1,
        'ID Đơn': `#${item.id || index + 1}`,
        'Thời Gian Mua': fullDate,
        'Khách Hàng': item.fullName || '---',
        'Số Điện Thoại': item.phone || '---',
        'Địa Chỉ': item.address || '---',
        'Tên Xe / Hãng': item.vehicleName || [item.brand, item.model].filter(Boolean).join(' ') || '---',
        'Màu Sắc': item.color || '---',
        'Số Khung': item.frameNumber || '---',
        'Số Acquy': item.batteryNumber || '---',
        'Giá Bán (VNĐ)': item.price ? Number(item.price).toLocaleString('vi-VN') : '0',
        'Nhân Viên': item.staffName || '---',
        'Chi Nhánh': item.branchName || '---',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 25 }, { wch: 15 },
      { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 20 }, { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachKhachHang');
    XLSX.writeFile(workbook, `Danh_Sach_Khach_Hang_${dayjs().format('DDMMYYYY_HHmmss')}.xlsx`);

    message.success(`Đã xuất thành công ${filtered.length} dòng dữ liệu!`);
    setIsExportModalOpen(false);
  };

  const filteredCustomers = customers.filter((item) => {
    const searchLower = searchText.toLowerCase();
    const fullVehicleName = item.vehicleName || [item.brand, item.model].filter(Boolean).join(' ');
    const name = item.fullName || '';
    const phone = item.phone || '';
    const address = item.address || '';
    const color = item.color || '';
    const frameNumber = item.frameNumber || '';
    const batteryNumber = item.batteryNumber || '';
    const staff = item.staffName || '';
    const branch = item.branchName || '';

    return (
      name.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      address.toLowerCase().includes(searchLower) ||
      color.toLowerCase().includes(searchLower) ||
      fullVehicleName.toLowerCase().includes(searchLower) ||
      frameNumber.toLowerCase().includes(searchLower) ||
      batteryNumber.toLowerCase().includes(searchLower) ||
      staff.toLowerCase().includes(searchLower) ||
      branch.toLowerCase().includes(searchLower)
    );
  });

  const columns: ColumnsType<Customer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id?: number) => <Text type="secondary">#{id || '---'}</Text>,
      width: 60,
    },
    {
      title: 'THỜI GIAN MUA',
      dataIndex: 'formTimestamp',
      key: 'formTimestamp',
      render: (time?: string, record?: Customer) => {
        const { fullDate } = parseDateDetails(time || record?.createdAt);
        return (
          <Text style={{ fontSize: '13px', color: '#1677ff', fontWeight: 600 }}>
            {fullDate}
          </Text>
        );
      },
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text?: string) => <strong>{text || '---'}</strong>,
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => (
        <a href={`tel:${phone}`} style={{ color: '#1677ff', fontWeight: 500 }}>
          {phone || '---'}
        </a>
      ),
    },
    {
      title: 'ĐỊA CHỈ',
      dataIndex: 'address',
      key: 'address',
      render: (address?: string) => <Text style={{ fontSize: '13px' }}>{address || '---'}</Text>,
    },
    {
      title: 'TÊN XE / HÃNG',
      dataIndex: 'vehicleName',
      key: 'vehicleName',
      render: (_: any, record: Customer) => {
        const name = record.vehicleName || [record.brand, record.model].filter(Boolean).join(' ');
        return <strong>{name || '---'}</strong>;
      },
    },
    {
      title: 'MÀU XE',
      dataIndex: 'color',
      key: 'color',
      render: (color?: string) => (
        color ? <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 500 }}>{color}</Tag> : <Text type="secondary">---</Text>
      ),
    },
    {
      title: 'SỐ KHUNG',
      dataIndex: 'frameNumber',
      key: 'frameNumber',
      render: (text?: string) =>
        text ? <Text code style={{ color: '#d46b08', fontWeight: 600 }}>{text}</Text> : <Text type="secondary">---</Text>,
    },
    {
      title: 'SỐ ACQUY',
      dataIndex: 'batteryNumber',
      key: 'batteryNumber',
      render: (text?: string) =>
        text ? <Text code style={{ color: '#389e0d', fontWeight: 600 }}>{text}</Text> : <Text type="secondary">---</Text>,
    },
    {
      title: 'GIÁ BÁN',
      dataIndex: 'price',
      key: 'price',
      render: (price?: any) => {
        const numPrice = Number(price);
        if (!isNaN(numPrice) && numPrice > 0) {
          return (
            <Text type="success" style={{ fontWeight: 600 }}>
              {numPrice.toLocaleString('vi-VN')} VNĐ
            </Text>
          );
        }
        return <Text type="secondary">---</Text>;
      },
    },
    {
      title: 'NHÂN VIÊN',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (staff?: string) => (
        staff ? <Tag color="gold" style={{ borderRadius: 4, fontWeight: 500 }}>{staff}</Tag> : <Text type="secondary">---</Text>
      ),
    },
    {
      title: 'CHI NHÁNH',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (branch?: string) => (
        <Tag color="blue" style={{ borderRadius: 4 }}>
          {branch || '---'}
        </Tag>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: (_: any, record: Customer) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: 4 }}
            onClick={() => printContractInNewTab(record)}
          >
            In HD
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa khách hàng này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Quản Lý Khách Hàng
            </Title>
            <Text type="secondary">Theo dõi thông tin mua xe, địa chỉ, Màu sắc, Số Khung & Số Acquy</Text>
          </div>
          <Space>
            <Button
              type="primary"
              style={{ backgroundColor: '#217346', borderColor: '#217346', borderRadius: 6 }}
              icon={<FileExcelOutlined />}
              onClick={() => {
                exportForm.resetFields();
                setIsExportModalOpen(true);
              }}
            >
              Xuất Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ borderRadius: 6 }}>
              Thêm mới
            </Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchCustomers} style={{ borderRadius: 6 }}>
              Tải lại dữ liệu
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Input
            placeholder="Tìm theo tên khách, SĐT, địa chỉ, màu sắc, tên xe, Số Khung, Số Acquy hoặc chi nhánh..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            allowClear
            size="large"
            style={{ borderRadius: 8 }}
          />
        </div>

        <Table<Customer>
          dataSource={filteredCustomers}
          columns={columns}
          rowKey={(record) => record.id || Math.random()}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
      <Modal
        title={editingCustomer ? `Sửa thông tin #${editingCustomer.id}` : 'Thêm Mới Khách Hàng'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="fullName" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ..." />
          </Form.Item>
          <Form.Item name="brand" label="Hãng xe">
            <Input />
          </Form.Item>
          <Form.Item name="model" label="Model xe">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Màu xe">
            <Input placeholder="Nhập màu xe (vd: Xám bóng, Trắng đen...)" />
          </Form.Item>
          <Form.Item name="frameNumber" label="Số Khung">
            <Input placeholder="Nhập số khung..." />
          </Form.Item>
          <Form.Item name="batteryNumber" label="Số Acquy">
            <Input placeholder="Nhập số acquy..." />
          </Form.Item>
          <Form.Item name="price" label="Giá bán (VNĐ)">
            <InputNumber
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(val) => val?.replace(/\./g, '') as unknown as number}
            />
          </Form.Item>
          <Form.Item name="staffName" label="Nhân viên">
            <Input />
          </Form.Item>
          <Form.Item name="branchName" label="Chi nhánh">
            <Input />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingCustomer ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL BỘ LỌC XUẤT EXCEL */}
      <Modal
        title={
          <Space>
            <FilterOutlined style={{ color: '#217346' }} />
            <span>Tùy Chọn Lọc Xuất File Excel</span>
          </Space>
        }
        open={isExportModalOpen}
        onCancel={() => setIsExportModalOpen(false)}
        footer={null}
      >
        <Form form={exportForm} layout="vertical" onFinish={handleExportExcel} style={{ marginTop: 16 }}>
          <Form.Item name="dateRange" label="Khoảng thời gian mua xe (Từ ngày -> Đến ngày)">
            <RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']} />
          </Form.Item>

          <Form.Item name="staffName" label="Lọc theo Nhân viên">
            <Select allowClear placeholder="Tất cả nhân viên" options={staffOptions} showSearch />
          </Form.Item>

          <Form.Item name="branchName" label="Lọc theo Chi nhánh">
            <Select allowClear placeholder="Tất cả chi nhánh" options={branchOptions} showSearch />
          </Form.Item>

          <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: '13px' }}>
            💡 Mẹo: Bạn có thể để trống các ô nếu muốn xuất toàn bộ dữ liệu.
          </Text>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsExportModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<FileExcelOutlined />}
              style={{ backgroundColor: '#217346', borderColor: '#217346' }}
            >
              Tải File Excel
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}