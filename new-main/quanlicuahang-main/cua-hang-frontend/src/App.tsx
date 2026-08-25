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
  Radio,
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
  ShopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://xedienthanhtuoi.vercel.app/api';

// 1. Interface dữ liệu Khách hàng
export interface Customer {
  id?: number;
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  brand?: string;
  model?: string;
  vehicleName?: string;
  color?: string;
  mau?: string;
  price?: number | string;
  gia_xe?: number | string;
  staffName?: string;
  nhan_vien?: string;
  branchName?: string;
  chi_nhanh?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  imageUrl?: string;
  formTimestamp?: string;
  timestamp?: string;
  ngay_mua?: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: any;
}

// 2. Cấu hình thông tin riêng biệt cho từng chi nhánh
interface BranchInfo {
  companyName: string;
  headerAddress: string;
  hotline: string;
  sellerTitle: string;
  bankAccount: string;
  branchesList: string[];
}

const BRANCH_CONFIGS: Record<string, BranchInfo> = {
  'Chợ Mới': {
    companyName: 'CÔNG TY TNHH XE ĐIỆN THANH TƯƠI',
    headerAddress: 'Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang',
    hotline: '0939.30.90.91',
    sellerTitle: 'Bên A ( Bên bán xe): Công ty TNHH XE ĐIỆN THANH TƯƠI CHỢ MỚI:',
    bankAccount: 'Tài khoản: Công ty TNHH Xe điện Thanh Tươi Chợ Mới - MBBANK - 1867676868',
    branchesList: [
      'CN1: Bình Hiệp A, xã Lấp Vò, tỉnh Đồng Tháp',
      'CN2: Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang',
      'CN3: Châu Văn Liêm, ấp Thị 2, xã Long Điền, tỉnh An Giang',
      'CN4: 293 Châu Văn Liêm, xã Long Điền, tỉnh An Giang',
    ],
  },
  'Lấp Vò': {
    companyName: 'CÔNG TY TNHH XE ĐIỆN THANH TƯƠI LẤP VÒ',
    headerAddress: 'Ấp Bình Hiệp A, xã Lấp Vò, tỉnh Đồng Tháp',
    hotline: '0939.30.90.91',
    sellerTitle: 'Bên A ( Bên bán xe): CỬA HÀNG XE ĐIỆN THANH TƯƠI - CN LẤP VÒ:',
    bankAccount: 'Tài khoản: Xe Điện Thanh Tươi Lấp Vò - MBBANK - 1867676868',
    branchesList: [
      'CN1: Ấp Bình Hiệp A, xã Lấp Vò, tỉnh Đồng Tháp (Trụ sở chính)',
      'CN2: Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang',
      'CN3: Châu Văn Liêm, ấp Thị 2, xã Long Điền, tỉnh An Giang',
    ],
  },
  'Mỹ Luông': {
    companyName: 'CÔNG TY TNHH XE ĐIỆN THANH TƯƠI MỸ LUÔNG',
    headerAddress: 'Thị trấn Mỹ Luông, huyện Chợ Mới, tỉnh An Giang',
    hotline: '0939.30.90.91',
    sellerTitle: 'Bên A ( Bên bán xe): CỬA HÀNG XE ĐIỆN THANH TƯƠI - CN MỸ LUÔNG:',
    bankAccount: 'Tài khoản: Xe Điện Thanh Tươi Mỹ Luông - MBBANK - 1867676868',
    branchesList: [
      'CN1: Thị trấn Mỹ Luông, Chợ Mới, An Giang',
      'CN2: Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang',
      'CN3: Bình Hiệp A, xã Lấp Vò, tỉnh Đồng Tháp',
    ],
  },
};

// 3. Hàm phân tích ngày mua gốc của khách hàng (DD/MM/YYYY)
const parseDateDetails = (customerData: any) => {
  if (!customerData) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
      fullDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    };
  }

  const rawDateStr =
    (typeof customerData === 'string' ? customerData : null) ||
    customerData.formTimestamp ||
    customerData.timestamp ||
    customerData.ngay_mua ||
    customerData.created_at ||
    customerData.createdAt ||
    '';

  if (rawDateStr.includes('/')) {
    const cleanDate = rawDateStr.split(' ')[0].trim();
    const parts = cleanDate.split('/');
    if (parts.length >= 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}` };
    }
  }

  if (rawDateStr.includes('-')) {
    const cleanDate = rawDateStr.split('T')[0].split(' ')[0].trim();
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return {
          day: parts[2].padStart(2, '0'),
          month: parts[1].padStart(2, '0'),
          year: parts[0],
          fullDate: `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`,
        };
      }
      return {
        day: parts[0].padStart(2, '0'),
        month: parts[1].padStart(2, '0'),
        year: parts[2],
        fullDate: `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`,
      };
    }
  }

  const dateObj = new Date(rawDateStr);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = String(dateObj.getFullYear());
    return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}` };
  }

  return { day: '....', month: '....', year: '2026', fullDate: '---' };
};

// 4. Hàm in hợp đồng chuẩn 1 trang A4 theo đúng chi nhánh đã chọn
const executePrintContract = (customer: Customer, selectedBranch: string) => {
  const branchInfo = BRANCH_CONFIGS[selectedBranch] || BRANCH_CONFIGS['Chợ Mới'];
  const { day, month, year } = parseDateDetails(customer);

  const hoTen = customer.fullName || customer.ho_ten || '';
  const dienThoai = customer.phone || customer.dien_thoai || '';
  const diaChi = customer.address || customer.dia_chi || '';
  const modelXe = customer.vehicleName || [customer.brand, customer.model].filter(Boolean).join(' ') || '';
  const mauXe = customer.color || customer.mau || '';
  const soKhung = customer.frameNumber || customer.so_khung || '';
  const soPin = customer.batteryNumber || customer.so_pin || '';

  const formatMoney = (val?: any) => {
    if (!val) return '';
    const num = Number(String(val).replace(/[^0-9]/g, ''));
    return isNaN(num) || num === 0 ? String(val) : num.toLocaleString('vi-VN') + ' VNĐ';
  };

  const giaXe = formatMoney(customer.price || customer.gia_xe);
  const tongThanhToan = formatMoney(customer.price || customer.gia_xe);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép mở popup trên trình duyệt để in hợp đồng!');
    return;
  }

  const branchListHtml = branchInfo.branchesList
    .map((b) => `<div>${b}</div>`)
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>Hop_dong_${hoTen || 'khach_hang'}</title>
      <style>
        @page { size: A4 portrait; margin: 4mm 6mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { margin: 0; padding: 0; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 11px; line-height: 1.25; color: #000; }
        .page { width: 100%; }
        table { width: 100%; border-collapse: collapse; }
        table.main-grid { border: 1px solid #000; margin: 4px 0; table-layout: fixed; }
        table.main-grid td, table.main-grid th { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
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
                <strong style="font-size: 11.5px;">${branchInfo.companyName}</strong><br />
                <span style="font-size: 10px;">${branchInfo.headerAddress}</span><br />
                <span style="font-size: 10px;">ĐT: ${branchInfo.hotline}</span>
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

        <!-- BÊN A (TỰ ĐỘNG THAY ĐỔI THEO CHI NHÁNH ĐÃ CHỌN) -->
        <div><strong>${branchInfo.sellerTitle}</strong></div>
        <div>${branchInfo.bankAccount}</div>
        <div>Điện thoại liên hệ : ${branchInfo.hotline}</div>
        ${branchListHtml}

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

        <!-- BẢNG ĐIỀU KHOẢN VÀ THÔNG TIN XE -->
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
        window.onload = function() { window.print(); }
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

  // 👉 State quản lý Popup chọn Chi Nhánh In Hợp Đồng
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedPrintCustomer, setSelectedPrintCustomer] = useState<Customer | null>(null);
  const [selectedBranchToPrint, setSelectedBranchToPrint] = useState<string>('Chợ Mới');

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
      const name = c.staffName || c.nhan_vien;
      if (name && name.trim()) staffSet.add(name.trim());
    });
    return Array.from(staffSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  const branchOptions = useMemo(() => {
    const branchSet = new Set<string>();
    customers.forEach((c) => {
      const name = c.branchName || c.chi_nhanh;
      if (name && name.trim()) branchSet.add(name.trim());
    });
    return Array.from(branchSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  // Mở popup chọn chi nhánh trước khi in
  const handleOpenPrintModal = (record: Customer) => {
    setSelectedPrintCustomer(record);
    const currentBranch = (record.branchName || record.chi_nhanh || '').trim();
    if (currentBranch.includes('Lấp Vò')) {
      setSelectedBranchToPrint('Lấp Vò');
    } else if (currentBranch.includes('Mỹ Luông')) {
      setSelectedBranchToPrint('Mỹ Luông');
    } else {
      setSelectedBranchToPrint('Chợ Mới');
    }
    setIsPrintModalOpen(true);
  };

  const handleConfirmPrint = () => {
    if (selectedPrintCustomer) {
      executePrintContract(selectedPrintCustomer, selectedBranchToPrint);
      setIsPrintModalOpen(false);
    }
  };

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
      fullName: record.fullName || record.ho_ten || '',
      phone: record.phone || record.dien_thoai || '',
      address: record.address || record.dia_chi || '',
      brand,
      model,
      color: record.color || record.mau || '',
      price: record.price ? Number(record.price) : (record.gia_xe ? Number(record.gia_xe) : 0),
      staffName: record.staffName || record.nhan_vien || '',
      branchName: record.branchName || record.chi_nhanh || '',
      frameNumber: record.frameNumber || record.so_khung || '',
      batteryNumber: record.batteryNumber || record.so_pin || '',
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
        const { fullDate } = parseDateDetails(item);
        if (!fullDate || fullDate === '---') return false;

        const itemDate = dayjs(fullDate, 'DD/MM/YYYY');
        if (!itemDate.isValid()) return false;

        return (
          (itemDate.isAfter(startDate) || itemDate.isSame(startDate)) &&
          (itemDate.isBefore(endDate) || itemDate.isSame(endDate))
        );
      });
    }

    if (staffName) filtered = filtered.filter((item) => (item.staffName || item.nhan_vien) === staffName);
    if (branchName) filtered = filtered.filter((item) => (item.branchName || item.chi_nhanh) === branchName);

    if (filtered.length === 0) {
      message.warning('Không tìm thấy dữ liệu phù hợp!');
      return;
    }

    const excelData = filtered.map((item, index) => {
      const { fullDate } = parseDateDetails(item);
      return {
        'STT': index + 1,
        'ID Đơn': `#${item.id || index + 1}`,
        'Thời Gian Mua': fullDate,
        'Khách Hàng': item.fullName || item.ho_ten || '---',
        'Số Điện Thoại': item.phone || item.dien_thoai || '---',
        'Địa Chỉ': item.address || item.dia_chi || '---',
        'Tên Xe / Hãng': item.vehicleName || [item.brand, item.model].filter(Boolean).join(' ') || '---',
        'Màu Sắc': item.color || item.mau || '---',
        'Số Khung': item.frameNumber || item.so_khung || '---',
        'Số Acquy': item.batteryNumber || item.so_pin || '---',
        'Giá Bán (VNĐ)': item.price ? Number(item.price).toLocaleString('vi-VN') : (item.gia_xe ? Number(item.gia_xe).toLocaleString('vi-VN') : '0'),
        'Nhân Viên': item.staffName || item.nhan_vien || '---',
        'Chi Nhánh': item.branchName || item.chi_nhanh || '---',
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
    const name = item.fullName || item.ho_ten || '';
    const phone = item.phone || item.dien_thoai || '';
    const address = item.address || item.dia_chi || '';
    const color = item.color || item.mau || '';
    const frameNumber = item.frameNumber || item.so_khung || '';
    const batteryNumber = item.batteryNumber || item.so_pin || '';
    const staff = item.staffName || item.nhan_vien || '';
    const branch = item.branchName || item.chi_nhanh || '';

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
      render: (id?: number) => <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>#{id || '---'}</Text>,
      width: 65,
      align: 'center',
    },
    {
      title: 'THỜI GIAN MUA',
      dataIndex: 'formTimestamp',
      key: 'formTimestamp',
      render: (_: any, record: Customer) => {
        const { fullDate } = parseDateDetails(record);
        return (
          <Text style={{ fontSize: '13px', color: '#1677ff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {fullDate}
          </Text>
        );
      },
      width: 125,
      align: 'center',
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (_: any, record: Customer) => (
        <span style={{ fontWeight: 600, color: '#1f1f1f' }}>
          {record.fullName || record.ho_ten || '---'}
        </span>
      ),
      width: 170,
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (_: any, record: Customer) => {
        const phoneVal = record.phone || record.dien_thoai || '';
        return (
          <a href={`tel:${phoneVal}`} style={{ color: '#1677ff', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {phoneVal || '---'}
          </a>
        );
      },
      width: 120,
    },
    {
      title: 'ĐỊA CHỈ',
      dataIndex: 'address',
      key: 'address',
      render: (_: any, record: Customer) => <span style={{ fontSize: '13px', color: '#595959' }}>{record.address || record.dia_chi || '---'}</span>,
      width: 250,
    },
    {
      title: 'TÊN XE / HÃNG',
      dataIndex: 'vehicleName',
      key: 'vehicleName',
      render: (_: any, record: Customer) => {
        const name = record.vehicleName || [record.brand, record.model].filter(Boolean).join(' ');
        return <strong style={{ color: '#262626', whiteSpace: 'nowrap' }}>{name || '---'}</strong>;
      },
      width: 160,
    },
    {
      title: 'MÀU XE',
      dataIndex: 'color',
      key: 'color',
      render: (_: any, record: Customer) => {
        const colorVal = record.color || record.mau;
        return colorVal ? (
          <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
            {colorVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'SỐ KHUNG',
      dataIndex: 'frameNumber',
      key: 'frameNumber',
      render: (_: any, record: Customer) => {
        const frameVal = record.frameNumber || record.so_khung;
        return frameVal ? <Text code style={{ color: '#d46b08', fontWeight: 600, whiteSpace: 'nowrap' }}>{frameVal}</Text> : <Text type="secondary">---</Text>;
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'SỐ ACQUY',
      dataIndex: 'batteryNumber',
      key: 'batteryNumber',
      render: (_: any, record: Customer) => {
        const batVal = record.batteryNumber || record.so_pin;
        return batVal ? <Text code style={{ color: '#389e0d', fontWeight: 600, whiteSpace: 'nowrap' }}>{batVal}</Text> : <Text type="secondary">---</Text>;
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'GIÁ BÁN',
      dataIndex: 'price',
      key: 'price',
      render: (_: any, record: Customer) => {
        const numPrice = Number(record.price || record.gia_xe);
        if (!isNaN(numPrice) && numPrice > 0) {
          return (
            <span style={{ fontWeight: 600, color: '#389e0d', whiteSpace: 'nowrap' }}>
              {numPrice.toLocaleString('vi-VN')} VNĐ
            </span>
          );
        }
        return <Text type="secondary">---</Text>;
      },
      width: 140,
      align: 'right',
    },
    {
      title: 'NHÂN VIÊN',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (_: any, record: Customer) => {
        const staffVal = record.staffName || record.nhan_vien;
        return staffVal ? (
          <Tag color="gold" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {staffVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 120,
      align: 'center',
    },
    {
      title: 'CHI NHÁNH',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (_: any, record: Customer) => {
        const branchVal = record.branchName || record.chi_nhanh;
        return branchVal ? (
          <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {branchVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 110,
      align: 'center',
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
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: 4, fontWeight: 500 }}
            onClick={() => handleOpenPrintModal(record)}
          >
            In HD
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
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
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: 180,
      align: 'center',
    },
  ];

  return (
    <div style={{ padding: '16px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          maxWidth: 1600,
          margin: '0 auto',
        }}
      >
        {/* THANH HEADER */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: 16,
          }}
        >
          <div style={{ minWidth: '240px', flex: '1 1 auto' }}>
            <Title level={3} style={{ margin: 0, fontSize: '22px', color: '#1f1f1f' }}>
              Quản Lý Khách Hàng
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Theo dõi thông tin mua xe, địa chỉ, Màu sắc, Số Khung & Số Acquy
            </Text>
          </div>

          <Space wrap style={{ flexShrink: 0 }}>
            <Button
              type="primary"
              style={{ backgroundColor: '#217346', borderColor: '#217346', borderRadius: 6, fontWeight: 500 }}
              icon={<FileExcelOutlined />}
              onClick={() => {
                exportForm.resetFields();
                setIsExportModalOpen(true);
              }}
            >
              Xuất Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ borderRadius: 6, fontWeight: 500 }}>
              Thêm mới
            </Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchCustomers} style={{ borderRadius: 6 }}>
              Tải lại
            </Button>
          </Space>
        </div>

        {/* Ô TÌM KIẾM */}
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Tìm theo tên khách, SĐT, địa chỉ, màu sắc, tên xe, Số Khung, Số Acquy hoặc chi nhánh..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            allowClear
            size="middle"
            style={{ borderRadius: 8, maxWidth: 600 }}
          />
        </div>

        {/* BẢNG DỮ LIỆU */}
        <Table<Customer>
          dataSource={filteredCustomers}
          columns={columns}
          rowKey={(record) => record.id || Math.random()}
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng cộng ${total} khách hàng`,
            showSizeChanger: false,
          }}
          scroll={{ x: 1750 }}
          size="middle"
        />
      </Card>

      {/* 👉 MODAL CHỌN CHI NHÁNH ĐỂ IN HỢP ĐỒNG */}
      <Modal
        title={
          <Space>
            <ShopOutlined style={{ color: '#722ed1' }} />
            <span>Chọn Chi Nhánh In Hợp Đồng</span>
          </Space>
        }
        open={isPrintModalOpen}
        onCancel={() => setIsPrintModalOpen(false)}
        onOk={handleConfirmPrint}
        okText="In Hợp Đồng Ngay"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1' } }}
        destroyOnClose
        width={450}
      >
        <div style={{ padding: '16px 0' }}>
          <Text style={{ display: 'block', marginBottom: 12 }}>
            Khách hàng: <strong>{selectedPrintCustomer?.fullName || selectedPrintCustomer?.ho_ten}</strong>
          </Text>
          <Text style={{ display: 'block', marginBottom: 8 }}>Vui lòng chọn chi nhánh xuất hợp đồng:</Text>
          <Radio.Group
            value={selectedBranchToPrint}
            onChange={(e) => setSelectedBranchToPrint(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <Radio value="Chợ Mới">
              <strong>Chi nhánh Chợ Mới</strong> (Tỉnh lộ 942, xã Chợ Mới, An Giang)
            </Radio>
            <Radio value="Lấp Vò">
              <strong>Chi nhánh Lấp Vò</strong> (Ấp Bình Hiệp A, xã Lấp Vò, Đồng Tháp)
            </Radio>
            <Radio value="Mỹ Luông">
              <strong>Chi nhánh Mỹ Luông</strong> (Thị trấn Mỹ Luông, Chợ Mới, An Giang)
            </Radio>
          </Radio.Group>
        </div>
      </Modal>

      {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
      <Modal
        title={editingCustomer ? `Sửa thông tin #${editingCustomer.id}` : 'Thêm Mới Khách Hàng'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width="95%"
        style={{ maxWidth: '600px' }}
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
        width="95%"
        style={{ maxWidth: '500px' }}
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