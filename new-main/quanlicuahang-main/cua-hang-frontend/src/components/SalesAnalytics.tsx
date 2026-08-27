import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Radio, DatePicker, Select, Progress, Typography, Space } from 'antd';
import { CarOutlined, DollarCircleOutlined, TrophyOutlined, RiseOutlined, ShopOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

const { Text } = Typography;

interface SalesAnalyticsProps {
  customers: any[];
  brandOptions: { label: string; value: string }[];
  parseDateDetails: (data: any) => { dayjsObj: Dayjs | null; [key: string]: any };
}

// Hàm chuẩn hoá tên 4 chi nhánh
const normalizeBranchName = (rawBranch?: string): string => {
  if (!rawBranch) return 'Chợ Mới';
  const str = rawBranch.trim().toLowerCase();
  if (str.includes('lấp vò') || str.includes('lap vo')) return 'Lấp Vò';
  if (str.includes('chợ mới') || str.includes('cho moi')) return 'Chợ Mới';
  if (str.includes('mỹ luông - cn 3') || str.includes('mỹ luông 3') || str.includes('cn 3') || str.includes('cn3')) return 'Mỹ Luông 3';
  if (str.includes('mỹ luông - cn 4') || str.includes('mỹ luông 4') || str.includes('cn 4') || str.includes('cn4')) return 'Mỹ Luông 4';
  if (str.includes('mỹ luông') || str.includes('my luong')) return 'Mỹ Luông 3';
  return rawBranch.trim();
};

export const SalesAnalytics = ({ customers, brandOptions, parseDateDetails }: SalesAnalyticsProps) => {
  const [reportFilterType, setReportFilterType] = useState<'day' | 'month'>('day');
  const [reportDate, setReportDate] = useState<Dayjs>(dayjs());
  const [reportBranch, setReportBranch] = useState<string>('all');
  const [reportBrand, setReportBrand] = useState<string>('all');

  const analytics = useMemo(() => {
    let filtered = [...customers];

    // Lọc theo ngày / tháng
    filtered = filtered.filter((item) => {
      const { dayjsObj } = parseDateDetails(item);
      if (!dayjsObj || !dayjsObj.isValid()) return false;
      return reportFilterType === 'day'
        ? dayjsObj.format('YYYY-MM-DD') === reportDate.format('YYYY-MM-DD')
        : dayjsObj.format('YYYY-MM') === reportDate.format('YYYY-MM');
    });

    // Lọc theo chi nhánh chuẩn
    if (reportBranch !== 'all') {
      filtered = filtered.filter((item) => normalizeBranchName(item.branchName || item.chi_nhanh) === reportBranch);
    }

    // Lọc theo hãng
    if (reportBrand !== 'all') {
      filtered = filtered.filter((item) => {
        const brand = (item.brand || (item.vehicleName || '').split(' ')[0] || '').trim();
        return brand.toLowerCase() === reportBrand.toLowerCase();
      });
    }

    const totalCount = filtered.length;
    const totalRevenue = filtered.reduce((sum, item) => {
      const val = Number(String(item.price || item.gia_xe || 0).replace(/[^0-9]/g, ''));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // Khởi tạo 4 chi nhánh
    const branchMap = new Map<string, { count: number; revenue: number }>();
    ['Chợ Mới', 'Lấp Vò', 'Mỹ Luông 3', 'Mỹ Luông 4'].forEach((b) => branchMap.set(b, { count: 0, revenue: 0 }));

    filtered.forEach((item) => {
      const branch = normalizeBranchName(item.branchName || item.chi_nhanh);
      const val = Number(String(item.price || item.gia_xe || 0).replace(/[^0-9]/g, ''));
      const safeVal = isNaN(val) ? 0 : val;
      const curr = branchMap.get(branch) || { count: 0, revenue: 0 };
      branchMap.set(branch, { count: curr.count + 1, revenue: curr.revenue + safeVal });
    });

    const branchSummary = Array.from(branchMap.entries()).map(([branch, stat]) => ({
      branch,
      count: stat.count,
      revenue: stat.revenue,
      percentage: totalCount > 0 ? Math.round((stat.count / totalCount) * 100) : 0,
    }));

    // Thống kê theo Hãng & Model
    const modelMap = new Map<string, { brand: string; model: string; branch: string; count: number; revenue: number }>();
    filtered.forEach((item) => {
      const parts = (item.vehicleName || '').split(' ');
      const brand = (item.brand || parts[0] || 'Khác').trim();
      const model = (item.model || parts.slice(1).join(' ') || item.vehicleName || 'Chưa rõ model').trim();
      const branch = normalizeBranchName(item.branchName || item.chi_nhanh);
      const val = Number(String(item.price || item.gia_xe || 0).replace(/[^0-9]/g, ''));
      const safeVal = isNaN(val) ? 0 : val;

      const key = `${brand}__${model}__${branch}`;
      const curr = modelMap.get(key) || { brand, model, branch, count: 0, revenue: 0 };
      modelMap.set(key, { brand, model, branch, count: curr.count + 1, revenue: curr.revenue + safeVal });
    });

    const modelSummary = Array.from(modelMap.values()).sort((a, b) => b.count - a.count);
    const topModel = modelSummary.length > 0 ? `${modelSummary[0].brand} ${modelSummary[0].model} (${modelSummary[0].count} xe)` : 'Chưa có';
    const sortedBranches = [...branchSummary].sort((a, b) => b.count - a.count);
    const topBranch = sortedBranches.length > 0 && sortedBranches[0].count > 0 ? `${sortedBranches[0].branch} (${sortedBranches[0].count} xe)` : 'Chưa có';

    return { totalCount, totalRevenue, branchSummary, modelSummary, topModel, topBranch };
  }, [customers, reportFilterType, reportDate, reportBranch, reportBrand, parseDateDetails]);

  return (
    <div style={{ paddingTop: 8 }}>
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8, backgroundColor: '#fafafa' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Xem theo:</Text>
            <Radio.Group value={reportFilterType} onChange={(e) => setReportFilterType(e.target.value)} buttonStyle="solid">
              <Radio.Button value="day">Theo Ngày</Radio.Button>
              <Radio.Button value="month">Theo Tháng</Radio.Button>
            </Radio.Group>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Chọn {reportFilterType === 'day' ? 'Ngày' : 'Tháng'}:</Text>
            {reportFilterType === 'day' ? (
              <DatePicker value={reportDate} onChange={(d) => d && setReportDate(d)} format="DD/MM/YYYY" allowClear={false} style={{ width: '100%' }} />
            ) : (
              <DatePicker value={reportDate} onChange={(d) => d && setReportDate(d)} picker="month" format="MM/YYYY" allowClear={false} style={{ width: '100%' }} />
            )}
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Lọc Chi Nhánh:</Text>
            <Select
              value={reportBranch}
              onChange={(val) => setReportBranch(val)}
              style={{ width: '100%' }}
              options={[
                { label: 'Tất cả chi nhánh', value: 'all' },
                { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                { label: 'Chi nhánh Mỹ Luông 3', value: 'Mỹ Luông 3' },
                { label: 'Chi nhánh Mỹ Luông 4', value: 'Mỹ Luông 4' },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Lọc Hãng Xe:</Text>
            <Select value={reportBrand} onChange={(val) => setReportBrand(val)} style={{ width: '100%' }} options={[{ label: 'Tất cả hãng xe', value: 'all' }, ...brandOptions]} />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#e6f7ff', borderColor: '#91caff' }}>
            <Statistic title={<Text strong style={{ color: '#0958d9' }}>Tổng Xe Đã Bán</Text>} value={analytics.totalCount} suffix="xe" prefix={<CarOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic title={<Text strong style={{ color: '#389e0d' }}>Tổng Doanh Thu</Text>} value={analytics.totalRevenue} formatter={(v) => `${Number(v).toLocaleString('vi-VN')} đ`} prefix={<DollarCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: 19 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#fff7e6', borderColor: '#ffd591' }}>
            <Statistic title={<Text strong style={{ color: '#d46b08' }}>Chi Nhánh Dẫn Đầu</Text>} value={analytics.topBranch} prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />} valueStyle={{ color: '#fa8c16', fontWeight: 700, fontSize: 16 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#f9f0ff', borderColor: '#d3adf7' }}>
            <Statistic title={<Text strong style={{ color: '#531dab' }}>Model Bán Chạy Nhất</Text>} value={analytics.topModel} prefix={<RiseOutlined style={{ color: '#722ed1' }} />} valueStyle={{ color: '#722ed1', fontWeight: 700, fontSize: 15 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={<Space><ShopOutlined style={{ color: '#1677ff' }} /><span>Doanh Số Theo Chi Nhánh</span></Space>} size="small" style={{ borderRadius: 8, height: '100%' }}>
            <Table
              dataSource={analytics.branchSummary}
              rowKey="branch"
              pagination={false}
              size="small"
              columns={[
                { title: 'Chi Nhánh', dataIndex: 'branch', key: 'branch', render: (b) => <Tag color="blue" style={{ fontWeight: 600 }}>{b}</Tag> },
                { title: 'Số Xe', dataIndex: 'count', key: 'count', align: 'center', render: (cnt) => <strong>{cnt} xe</strong> },
                { title: 'Tỷ Lệ', dataIndex: 'percentage', key: 'percentage', width: 130, render: (pct) => <Progress percent={pct} size="small" /> },
                { title: 'Doanh Thu', dataIndex: 'revenue', key: 'revenue', align: 'right', render: (rev) => <span style={{ color: '#389e0d', fontWeight: 600 }}>{Number(rev).toLocaleString('vi-VN')} đ</span> },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title={<Space><CarOutlined style={{ color: '#52c41a' }} /><span>Chi Tiết Số Bán Theo Hãng & Model</span></Space>} size="small" style={{ borderRadius: 8, height: '100%' }}>
            <Table
              dataSource={analytics.modelSummary}
              rowKey={(r) => `${r.brand}_${r.model}_${r.branch}`}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              size="small"
              columns={[
                { title: 'Hãng Xe', dataIndex: 'brand', key: 'brand', render: (b) => <Tag color="cyan">{b}</Tag> },
                { title: 'Model Xe', dataIndex: 'model', key: 'model', render: (m) => <strong>{m}</strong> },
                { title: 'Chi Nhánh Bán', dataIndex: 'branch', key: 'branch', render: (br) => <Tag color="geekblue">{br}</Tag> },
                { title: 'Số Lượng', dataIndex: 'count', key: 'count', align: 'center', render: (c) => <Tag color="volcano" style={{ fontWeight: 700 }}>{c} xe</Tag>, width: 90 },
                { title: 'Tổng Tiền (VNĐ)', dataIndex: 'revenue', key: 'revenue', align: 'right', render: (rev) => <span style={{ color: '#389e0d', fontWeight: 600 }}>{Number(rev).toLocaleString('vi-VN')} đ</span> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};