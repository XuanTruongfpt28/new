import React from 'react';

// Interface nhận thông tin khách hàng linh hoạt
export interface Customer {
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  model?: string;
  mau?: string;
  color?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  price?: string | number;
  gia_xe?: string | number;
  tong_thanh_toan?: string | number;
  vehicleName?: string;
  brand?: string;
  [key: string]: any;
}

interface ContractPrintProps {
  customer: Customer | null;
}

export const ContractPrint: React.FC<ContractPrintProps> = ({ customer }) => {
  if (!customer) return null;

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  // Mapping dữ liệu linh hoạt
  const hoTen = customer.fullName || customer.ho_ten || '...................................................';
  const dienThoai = customer.phone || customer.dien_thoai || '.........................';
  const diaChi = customer.address || customer.dia_chi || '.......................................................................................................................................';
  const modelXe = customer.model || customer.vehicleName || [customer.brand, customer.model].filter(Boolean).join(' ') || '....................';
  const mauXe = customer.mau || customer.color || '....................';
  const soKhung = customer.frameNumber || customer.so_khung || '....................';
  const soPin = customer.batteryNumber || customer.so_pin || '....................';

  // Format giá bán
  const formatMoney = (val?: any) => {
    if (!val) return '....................';
    const num = Number(String(val).replace(/[^0-9]/g, ''));
    return isNaN(num) || num === 0 ? String(val) : num.toLocaleString('vi-VN') + ' VNĐ';
  };

  const giaXe = formatMoney(customer.price || customer.gia_xe);
  const tongThanhToan = formatMoney(customer.tong_thanh_toan || customer.price || customer.gia_xe);

  return (
    <div id="contract-to-print" className="contract-container">
      <style>{`
        /* Ẩn hoàn toàn trên giao diện web */
        .contract-container {
          display: none !important;
        }

        /* Chế độ in ấn chuyên dụng */
        @media print {
          body * {
            visibility: hidden !important;
          }
          #contract-to-print, #contract-to-print * {
            visibility: visible !important;
          }
          #contract-to-print {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 3mm 6mm !important;
            font-family: "Times New Roman", Times, serif !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
            color: #000 !important;
            background: #fff !important;
            box-sizing: border-box !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm;
          }

          /* Bảng khung chính chuẩn Word */
          table.main-grid {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin: 6px 0;
            table-layout: fixed;
          }
          table.main-grid td, table.main-grid th {
            border: 1px solid #000;
            padding: 4px 5px;
            vertical-align: top;
            box-sizing: border-box;
          }
        }
      `}</style>

      {/* ==================== TRANG DUY NHẤT: HỢP ĐỒNG BÁN XE ==================== */}
      <div className="contract-page">
        {/* HEADER */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center' }}>
                <strong style={{ fontSize: '11.5px' }}>CÔNG TY TNHH XE ĐIỆN THANH TƯƠI</strong><br />
                <span style={{ fontSize: '10px' }}>Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang</span><br />
                <span style={{ fontSize: '10px' }}>ĐT: 0939.30.90.91</span>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center' }}>
                <strong style={{ fontSize: '11.5px' }}>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
                <strong style={{ fontSize: '11px' }}>Độc lập - Tự do - Hạnh phúc</strong><br />
                <i style={{ fontSize: '10px' }}>..., Ngày {day} Tháng {month} Năm 202{year.toString().slice(-1)}</i>
              </td>
            </tr>
          </tbody>
        </table>

        {/* TITLE */}
        <div style={{ textAlign: 'center', margin: '4px 0 6px 0' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>BIÊN NHẬN</h2>
          <h3 style={{ margin: '1px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>(KIÊM HỢP ĐỒNG BÁN XE)</h3>
        </div>

        {/* BÊN A */}
        <div style={{ margin: '1px 0' }}>
          <strong>I. Bên A ( Bên bán xe): Công ty TNHH XE ĐIỆN THANH TƯƠI CHỢ MỚI:</strong>
        </div>
        <div style={{ margin: '1px 0' }}>
          Tài khoản: Công ty TNHH Xe điện Thanh Tươi Chợ Mới - MBBANK- 1867676868
        </div>
        <div style={{ margin: '1px 0' }}>
          Điện thoại liên hệ : 0939.30.90.91
        </div>
        <div style={{ margin: '1px 0' }}>
          CN1: Bình Hiệp A, xã Lấp Vò, tỉnh Đồng Tháp<br />
          CN2: Tỉnh lộ 942, xã Chợ Mới, tỉnh An Giang<br />
          CN3: Châu Văn Liêm, ấp Thị 2, xã Long Điền, tỉnh An Giang<br />
          CN4: 293 Châu Văn Liêm, xã Long Điền, tỉnh An Giang
        </div>

        {/* BÊN B */}
        <div style={{ margin: '4px 0 1px 0' }}>
          <strong>II. Bên B ( Bên mua xe):</strong>
        </div>
        <div style={{ margin: '1px 0' }}>
          Họ và tên: <strong>{hoTen}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Điện thoại: <strong>{dienThoai}</strong>
        </div>
        <div style={{ margin: '1px 0' }}>
          Địa chỉ: <strong>{diaChi}</strong>
        </div>
        <div style={{ margin: '1px 0' }}>
          CCCD số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nơi cấp: Cục Cảnh sát quản lý hành chính về TTXH
        </div>

        <p style={{ margin: '4px 0' }}>
          Sau khi bàn bạc và đi đến thống nhất, bên A đồng ý bán xe và bên B đồng ý mua xe với các điều khoản sau:
        </p>

        {/* BẢNG KHUNG 3 CỘT CÓ ĐƯỜNG KẺ KHUNG TIÊU ĐỀ CHUẨN */}
        <table className="main-grid">
          <thead>
            <tr>
              <th style={{ width: '33.33%', border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>
                I.ĐIỀU KHOẢN VỀ BẢO HÀNH
              </th>
              <th style={{ width: '33.33%', border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>
                II. THÔNG TIN VỀ XE
              </th>
              <th style={{ width: '33.34%', border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>
                III. HƯỚNG DẪN SỬ DỤNG ẮC QUY
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* NỘI DUNG CỘT I */}
              <td>
                <div style={{ fontWeight: 'bold', marginTop: '2px' }}>YADEA</div>
                <p style={{ margin: '3px 0' }}>1. Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 24 tháng, cụ thể lỗi 1 bình đổi cả bộ trong 18 tháng, lỗi bình nào đổi bình đó trong 6 tháng còn lại (Hoặc 20.000km)</p>
                <p style={{ margin: '3px 0' }}>2. Động cơ, IC, bộ sạc bảo hành 36 tháng. Pin bảo hành 36 tháng (Hoặc 30.000km)</p>
              </td>

              {/* NỘI DUNG CỘT II */}
              <td>
                <div style={{ marginTop: '2px' }}>
                  *Model: <strong>{modelXe}</strong><br />
                  *Màu: <strong>{mauXe}</strong><br />
                  *Số khung: <strong>{soKhung}</strong><br />
                  * Số ắc quy/pin:<br />
                  <strong>{soPin}</strong><br />
                  * Số động cơ:<br />
                  * Mua thêm phụ kiện:<br />
                  * <span style={{ textDecoration: 'underline' }}>Thu xe cũ</span>:<br />
                  Còn lại:<br />
                  * Đã cọc:<br />
                  * Giá xe: <strong>{giaXe}</strong><br />
                  * <strong>Tổng thanh toán:</strong><br />
                  <strong>{tongThanhToan}</strong><br />
                  Hình thức thanh toán:<br />
                  *<strong>Trả trước:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br /> *<strong>Còn lại:</strong><br />
                  * <span style={{ textDecoration: 'underline' }}>Phụ kiện theo xe: Bộ sạc</span>
                </div>
              </td>

              {/* NỘI DUNG CỘT III */}
              <td>
                <p style={{ margin: '3px 0', fontStyle: 'italic', fontSize: '10px' }}>
                  <strong>Lần sạc đầu tiên:</strong> sau khi sạc ắc quy đầy, sạc báo đèn xanh, rút sạc ra đợi khoảng 20 phút, cắm lại cho sạc tiếp tục khoảng 1 tiếng.
                </p>
                <p style={{ margin: '3px 0', fontStyle: 'italic', fontSize: '10px' }}>
                  <strong>Trong quá trình sử dụng:</strong><br />
                  + Bạn nên để xe khoảng 30 phút để ắc quy nguội bớt rồi hãy sạc.<br />
                  + Nên sạc đầy rồi mới sử dụng. Hạn chế tối đa tình trạng xe cạn ắc quy và sạc nhiều lần trong ngày.<br />
                  + Trường hợp có việc bận không có nhu cầu sử dụng xe, thì mỗi tuần nên sạc 1 lần.
                </p>
                <div style={{ fontWeight: 'bold', fontSize: '10px', marginTop: '6px' }}>
                  ẮC QUY SẼ XUỐNG CẤP DẦN THEO THỜI GIAN NÊN HÃY SỬ DỤNG ĐÚNG CÁCH ĐỂ SỬ DỤNG ẮC QUY ĐƯỢC LÂU HƠN
                </div>
              </td>
            </tr>

            {/* HÀNG BẢNG DƯỚI */}
            <tr>
              <td>
                <div style={{ fontWeight: 'bold' }}>BMX, PEGA, DK, SONSU … JP, UNI</div>
                <p style={{ margin: '3px 0' }}>1. Bình bảo hành 12 tháng, phù 06 tháng ( nên xem hướng dẫn sử dụng ắc quy).</p><br />
                <p style={{ margin: '3px 0' }}>2. Động cơ, IC, bộ sạc bảo hành 12 tháng.</p><br />
                <p style={{ margin: '3px 0' }}>3. Bình bảo hành 12 tháng, phù 09 tháng ( nên xem hướng dẫn sử dụng ắc quy).</p><br />
              </td>

              <td>
                <div style={{ fontWeight: 'bold' }}>IV: Thoả thuận và thống nhất giữa hai bên như sau</div>
                <p style={{ margin: '2px 0' }}>* Giá bán xe chưa bao gồm phí trước bạ, phí bấm biển số và phí dịch vụ ( đối với xe máy điện)</p>
                <p style={{ margin: '2px 0' }}>* <strong>Dịch vụ bấm biển số (không bao bảo hiểm và phí kẹp biển số):</strong></p>
                <p style={{ margin: '2px 0', fontWeight: 'bold', fontSize: '11.5px' }}>* Quà tặng: NÓN BẢO HIỂM</p>
                <p style={{ margin: '2px 0', fontStyle: 'italic', fontWeight: 'bold' }}>*ƯU ĐÃI ĐẶC BIỆT: Miễn công cứu hộ tận nhà 12 tháng khi xe KÉO GA KHÔNG CHẠY (15km)</p>
              </td>

              <td>
                <div style={{ fontWeight: 'bold' }}>V: Điều khoản chung</div>
                <p style={{ margin: '2px 0' }}>* Bên B đã kiểm tra xe mới 100%, không trầy xước, phụ tùng theo xe đầy đủ.</p>
                <p style={{ margin: '2px 0' }}>* Bên B đã được bên A hướng dẫn sử dụng xe, chế độ bảo hành và kỹ năng lái xe an toàn, nhận quà khuyến mãi đầy đủ, bên B đã đọc và xác nhận những nội dung trên.</p>
                <p style={{ margin: '2px 0' }}>* Biên nhận được lập thành 02 bản có giá trị như nhau , mỗi bên giữ 1 bản</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* LƯU Ý CHECKLIST */}
        <div style={{ marginTop: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>*LƯU Ý :</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', lineHeight: '1.2' }}>
            <tbody>
              <tr><td style={{ width: '16px', verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold', fontStyle: 'italic' }}>LUÔN ĐỘI NÓN BẢO HIỂM KHI THAM GIA GIAO THÔNG (Kể cả xe đạp điện).</td></tr>
              <tr><td style={{ verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold' }}>NHỮNG PHẦN HAO MÒN TRONG QUÁ TRÌNH SỬ DỤNG KHÔNG BẢO HÀNH .</td></tr>
              <tr><td style={{ verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold' }}>KHÔNG BẢO HÀNH ĐỐI VỚI XE ĐÃ THAY ĐỔI KẾT CẤU VỀ ĐIỆN.</td></tr>
              <tr><td style={{ verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold' }}>BẢO HÀNH SỬA CHỮA KHÔNG BẢO HÀNH ĐỔI MỚI.</td></tr>
              <tr><td style={{ verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold' }}>BẢO HÀNH PHẢI CHO THÁO XE, ĐỒNG THỜI XE PHẢI ĐƯỢC ĐEM ĐẾN CỬA HÀNG.</td></tr>
              <tr><td style={{ verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold' }}>MỌI VẤN ĐỀ PHÁT SINH VỚI XE TRONG QUÁ TRÌNH SỬ DỤNG PHẢI ĐEM ĐẾN CỬA HÀNG TRONG THỜI GIAN NHANH NHẤT (1-3 NGÀY) ĐỂ ĐƯỢC GIẢI QUYẾT. NẾU SAU THỜI GIAN TRÊN CỬA HÀNG HOÀN TOÀN KHÔNG CHỊU TRÁCH NHIỆM.</td></tr>
              <tr><td style={{ verticalAlign: 'top' }}>✓</td><td style={{ fontWeight: 'bold' }}>PHÍ ĐỔI - TRẢ SẢN PHẨM 30% TRONG VÒNG 30 NGÀY, KỂ TỪ NGÀY MUA.</td></tr>
            </tbody>
          </table>
          <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: '4px', fontSize: '10px' }}>
            Tôi (bên B) hoàn toàn đồng ý với những thoả thuận trên.
          </div>
        </div>

        {/* CHỮ KÝ CÓ KHOẢNG TRỐNG KÝ TÊN RỘNG RÃI RẤT ĐẸP MẮT (margin-top: 15px) */}
        <table style={{ width: '100%', marginTop: '15px', textAlign: 'center' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <strong style={{ fontSize: '12px' }}>Bên bán A</strong><br />
                <i style={{ fontSize: '10px' }}>( Ký và ghi rõ họ tên)</i>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <strong style={{ fontSize: '12px' }}>Bên mua B</strong><br />
                <i style={{ fontSize: '10px' }}>( Ký và ghi rõ họ tên)</i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractPrint;