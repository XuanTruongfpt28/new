import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Radio,
  DatePicker,
  Select,
  Progress,
  Typography,
  Space,
  Button,
  Modal,
  InputNumber,
  message,
} from 'antd';
import {
  CarOutlined,
  DollarCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  ShopOutlined,
  AimOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { supabase } from '../supabase';

const { Text } = Typography;

interface SalesAnalyticsProps {
  customers: any[];
  brandOptions: { label: string; value: string }[];
  parseDateDetails: (data: any) => { dayjsObj: Dayjs | null; [key: string]: any };
}

const BRANCH_LIST = ['Chợ Mới', 'Lấp Vò', 'Lấp Vò 5', 'Mỹ Luông 3', 'Mỹ Luông 4'];

const normalizeBranchName = (rawBranch?: string): string => {
if (!rawBranch) return 'Chợ Mới';
  const str = rawBranch.trim().toLowerCase();

  // 1. Bắt chuẩn Lấp Vò 5 trước (bao gồm cả "Lấp Vò - CN 5", "Lấp Vò 5", "CN 5", "CN5")
  if (
    str.includes('lấp vò - cn 5') ||
    str.includes('lấp vò 5') ||
    str.includes('lap vo 5') ||
    str.includes('cn 5') ||
    str.includes('cn5')
  ) {
    return 'Lấp Vò 5';
  }

  // 2. Sau đó mới bắt Lấp Vò / Lấp Vò - CN 1
  if (str.includes('lấp vò') || str.includes('lap vo')) {
    return 'Lấp Vò';
  }

  if (str.includes('chợ mới') || str.includes('cho moi')) return 'Chợ Mới';
  if (str.includes('mỹ luông - cn 3') || str.includes('mỹ luông 3') || str.includes('cn 3') || str.includes('cn3')) return 'Mỹ Luông 3';
  if (str.includes('mỹ luông - cn 4') || str.includes('mỹ luông 4') || str.includes('cn 4') || str.includes('cn4')) return 'Mỹ Luông 4';
  if (str.includes('mỹ luông') || str.includes('my luong')) return 'Mỹ Luông 3';

  return rawBranch.trim();
};

const checkIsAcquyOrder = (item: any): boolean => {
  const fullVName = (item.vehicleName || '').trim().toLowerCase();
  const brand = (item.brand || '').trim().toLowerCase();
  const model = (item.model || '').trim().toLowerCase();
  const combinedName = `${brand} ${model}`.trim();

  return (
    fullVName === 'khách mua acquy' ||
    brand === 'khách mua acquy' ||
    combinedName === 'khách mua acquy'
  );
};

export const SalesAnalytics = ({ customers, brandOptions, parseDateDetails }: SalesAnalyticsProps) => {
  const [reportFilterType, setReportFilterType] = useState<'day' | 'month'>('month');
  const [reportDate, setReportDate] = useState<Dayjs>(dayjs());
  const [reportBranch, setReportBranch] = useState<string>('all');
  const [reportBrand, setReportBrand] = useState<string>('all');

  // State lưu chỉ tiêu của tháng đang chọn
  const [targetsMap, setTargetsMap] = useState<Record<string, number>>({});
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>({});
  const [savingTargets, setSavingTargets] = useState(false);

  const selectedMonthStr = reportDate.format('YYYY-MM');

  // Tải chỉ tiêu từ Supabase theo tháng
  const fetchTargets = async (monthStr: string) => {
    try {
      const { data, error } = await supabase
        .from('BranchTarget')
        .select('*')
        .eq('month_year', monthStr);

      if (!error && data) {
        const map: Record<string, number> = {};
        data.forEach((row: any) => {
          map[row.branch] = Number(row.target_vehicles) || 0;
        });
        setTargetsMap(map);
      } else {
        setTargetsMap({});
      }
    } catch (err) {
      console.error('Lỗi tải chỉ tiêu:', err);
    }
  };

  useEffect(() => {
    fetchTargets(selectedMonthStr);
  }, [selectedMonthStr]);

  // Mở Modal nhập KPI
  const handleOpenTargetModal = () => {
    const initialValues: Record<string, number> = {};
    BRANCH_LIST.forEach((b) => {
      initialValues[b] = targetsMap[b] || 0;
    });
    setEditingTargets(initialValues);
    setIsTargetModalOpen(true);
  };

  // Lưu KPI lên Supabase
  const handleSaveTargets = async () => {
    setSavingTargets(true);
    try {
      const payload = BRANCH_LIST.map((branch) => ({
        month_year: selectedMonthStr,
        branch,
        target_vehicles: Number(editingTargets[branch]) || 0,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('BranchTarget')
        .upsert(payload, { onConflict: 'month_year,branch' });

      if (error) throw error;

      message.success(`Đã cập nhật chỉ tiêu tháng ${reportDate.format('MM/YYYY')} thành công!`);
      setTargetsMap({ ...editingTargets });
      setIsTargetModalOpen(false);
    } catch (err: any) {
      message.error('Lỗi lưu chỉ tiêu: ' + err.message);
    } finally {
      setSavingTargets(false);
    }
  };

  const analytics = useMemo(() => {
    let filtered = [...customers];

    filtered = filtered.filter((item) => {
      const { dayjsObj } = parseDateDetails(item);
      if (!dayjsObj || !dayjsObj.isValid()) return false;
      return reportFilterType === 'day'
        ? dayjsObj.format('YYYY-MM-DD') === reportDate.format('YYYY-MM-DD')
        : dayjsObj.format('YYYY-MM') === reportDate.format('YYYY-MM');
    });

    if (reportBranch !== 'all') {
      filtered = filtered.filter((item) => normalizeBranchName(item.branchName || item.chi_nhanh) === reportBranch);
    }

    if (reportBrand !== 'all') {
      filtered = filtered.filter((item) => {
        const isAcquy = checkIsAcquyOrder(item);
        const fullVName = (item.vehicleName || '').trim().toLowerCase();
        const brand = (item.brand || fullVName.split(' ')[0] || '').trim().toLowerCase();

        if (reportBrand === 'Khách mua Acquy') return isAcquy;
        return !isAcquy && brand === reportBrand.toLowerCase();
      });
    }

    let totalVehicleCount = 0;
    let totalVehicleRevenue = 0;
    let totalAcquyRevenue = 0;
    let totalAcquyCount = 0;

    const branchMap = new Map<string, { vehicleCount: number; vehicleRevenue: number; acquyCount: number; acquyRevenue: number }>();
    BRANCH_LIST.forEach((b) =>
      branchMap.set(b, { vehicleCount: 0, vehicleRevenue: 0, acquyCount: 0, acquyRevenue: 0 })
    );

    filtered.forEach((item) => {
      const branch = normalizeBranchName(item.branchName || item.chi_nhanh);
      const val = Number(String(item.price || item.gia_xe || 0).replace(/[^0-9]/g, ''));
      const safeVal = isNaN(val) ? 0 : val;

      const isAcquy = checkIsAcquyOrder(item);
      const curr = branchMap.get(branch) || { vehicleCount: 0, vehicleRevenue: 0, acquyCount: 0, acquyRevenue: 0 };

      if (isAcquy) {
        totalAcquyCount += 1;
        totalAcquyRevenue += safeVal;
        branchMap.set(branch, {
          ...curr,
          acquyCount: curr.acquyCount + 1,
          acquyRevenue: curr.acquyRevenue + safeVal,
        });
      } else {
        totalVehicleCount += 1;
        totalVehicleRevenue += safeVal;
        branchMap.set(branch, {
          ...curr,
          vehicleCount: curr.vehicleCount + 1,
          vehicleRevenue: curr.vehicleRevenue + safeVal,
        });
      }
    });

    const totalRevenue = totalVehicleRevenue + totalAcquyRevenue;

    const branchSummary = Array.from(branchMap.entries()).map(([branch, stat]) => {
      const target = targetsMap[branch] || 0;
      const completionRate = target > 0 ? Math.round((stat.vehicleCount / target) * 100) : 0;

      return {
        branch,
        vehicleCount: stat.vehicleCount,
        acquyCount: stat.acquyCount,
        target,
        completionRate,
        revenue: stat.vehicleRevenue + stat.acquyRevenue,
        vehicleRevenue: stat.vehicleRevenue,
        acquyRevenue: stat.acquyRevenue,
      };
    });

    const modelMap = new Map<string, { brand: string; model: string; branch: string; count: number; revenue: number; isAcquy: boolean }>();
    filtered.forEach((item) => {
      const isAcquy = checkIsAcquyOrder(item);
      const parts = (item.vehicleName || '').split(' ');
      const brand = isAcquy ? 'Khách' : (item.brand || parts[0] || 'Khác').trim();
      const model = isAcquy ? 'mua Acquy' : (item.model || parts.slice(1).join(' ') || item.vehicleName || 'Chưa rõ model').trim();
      const branch = normalizeBranchName(item.branchName || item.chi_nhanh);
      const val = Number(String(item.price || item.gia_xe || 0).replace(/[^0-9]/g, ''));
      const safeVal = isNaN(val) ? 0 : val;

      const key = `${brand}__${model}__${branch}`;
      const curr = modelMap.get(key) || { brand, model, branch, count: 0, revenue: 0, isAcquy };
      modelMap.set(key, { brand, model, branch, count: curr.count + 1, revenue: curr.revenue + safeVal, isAcquy });
    });

    const modelSummary = Array.from(modelMap.values()).sort((a, b) => b.count - a.count);
    const vehicleModels = modelSummary.filter((m) => !m.isAcquy);

    const topModel = vehicleModels.length > 0 ? `${vehicleModels[0].brand} ${vehicleModels[0].model} (${vehicleModels[0].count} xe)` : 'Chưa có';
    const sortedBranches = [...branchSummary].sort((a, b) => b.vehicleCount - a.vehicleCount);
    const topBranch = sortedBranches.length > 0 && sortedBranches[0].vehicleCount > 0 ? `${sortedBranches[0].branch} (${sortedBranches[0].vehicleCount} xe)` : 'Chưa có';

    return {
      totalCount: totalVehicleCount,
      totalAcquyCount,
      totalRevenue,
      branchSummary,
      modelSummary,
      topModel,
      topBranch,
    };
  }, [customers, reportFilterType, reportDate, reportBranch, reportBrand, targetsMap, parseDateDetails]);

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
                ...BRANCH_LIST.map((b) => ({ label: `Chi nhánh ${b}`, value: b })),
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Lọc Hãng Xe:</Text>
            <Select
              value={reportBrand}
              onChange={(val) => setReportBrand(val)}
              style={{ width: '100%' }}
              options={[
                { label: 'Tất cả hãng xe', value: 'all' },
                { label: 'Khách mua Acquy', value: 'Khách mua Acquy' },
                ...brandOptions.filter((b) => b.value.toLowerCase() !== 'khách' && b.value.toLowerCase() !== 'khách mua acquy'),
              ]}
            />
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
        <Col xs={24} lg={11}>
          <Card
            title={
              <Space>
                <ShopOutlined style={{ color: '#1677ff' }} />
                <span>Doanh Số Theo Chi Nhánh</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                size="small"
                icon={<AimOutlined />}
                style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', fontWeight: 500 }}
                onClick={handleOpenTargetModal}
              >
                Cập Nhật Chỉ Tiêu ({reportDate.format('MM/YYYY')})
              </Button>
            }
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
          >
            <Table
              dataSource={analytics.branchSummary}
              rowKey="branch"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Chi Nhánh',
                  dataIndex: 'branch',
                  key: 'branch',
                  render: (b) => <Tag color="blue" style={{ fontWeight: 600 }}>{b}</Tag>,
                },
                {
                  title: 'Số Xe',
                  dataIndex: 'vehicleCount',
                  key: 'vehicleCount',
                  align: 'center',
                  render: (cnt) => <strong>{cnt} xe</strong>,
                },
                {
                  title: 'Số Acquy',
                  dataIndex: 'acquyCount',
                  key: 'acquyCount',
                  align: 'center',
                  render: (cnt) => (cnt > 0 ? <Tag color="orange">{cnt} bộ</Tag> : <Text type="secondary">0</Text>),
                },
                {
                  title: 'Tỉ Lệ Hoàn Thành',
                  key: 'completion',
                  width: 145,
                  render: (_, record: any) => {
                    if (!record.target || record.target === 0) {
                      return <Text type="secondary" style={{ fontSize: 12 }}>Chưa giao KPI</Text>;
                    }
                    const isDone = record.completionRate >= 100;
                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: isDone ? '#389e0d' : '#1677ff' }}>
                            {record.vehicleCount}/{record.target} xe
                          </span>
                          <span style={{ fontWeight: 700, color: isDone ? '#389e0d' : '#595959' }}>
                            {record.completionRate}%
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(record.completionRate, 100)}
                          size="small"
                          showInfo={false}
                          strokeColor={isDone ? '#52c41a' : '#1677ff'}
                        />
                      </div>
                    );
                  },
                },
                {
                  title: 'Doanh Thu',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  align: 'right',
                  render: (rev, record: any) => (
                    <div>
                      <span style={{ color: '#389e0d', fontWeight: 600 }}>{Number(rev).toLocaleString('vi-VN')} đ</span>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                        (Xe: {Number(record.vehicleRevenue).toLocaleString('vi-VN')} | Acq: {Number(record.acquyRevenue).toLocaleString('vi-VN')})
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={13}>
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
                {
                  title: 'Số Lượng',
                  dataIndex: 'count',
                  key: 'count',
                  align: 'center',
                  render: (c, r: any) => (
                    <Tag color={r.isAcquy ? 'orange' : 'volcano'} style={{ fontWeight: 700 }}>
                      {c} {r.isAcquy ? 'bộ' : 'xe'}
                    </Tag>
                  ),
                  width: 90,
                },
                { title: 'Tổng Tiền (VNĐ)', dataIndex: 'revenue', key: 'revenue', align: 'right', render: (rev) => <span style={{ color: '#389e0d', fontWeight: 600 }}>{Number(rev).toLocaleString('vi-VN')} đ</span> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* MODAL CẬP NHẬT CHỈ TIÊU THÁNG */}
      <Modal
        title={
          <Space>
            <AimOutlined style={{ color: '#fa8c16' }} />
            <span>Giao Chỉ Tiêu Doanh Số Tháng {reportDate.format('MM/YYYY')}</span>
          </Space>
        }
        open={isTargetModalOpen}
        onCancel={() => setIsTargetModalOpen(false)}
        onOk={handleSaveTargets}
        confirmLoading={savingTargets}
        okText="Lưu Chỉ Tiêu"
        cancelText="Hủy"
        width={420}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Nhập số lượng xe mục tiêu cho từng cửa hàng trong tháng {reportDate.format('MM/YYYY')}:</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BRANCH_LIST.map((branch) => (
            <div key={branch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}>
                {branch}
              </Tag>
              <InputNumber
                min={0}
                max={9999}
                addonAfter="xe"
                style={{ width: 160 }}
                value={editingTargets[branch] ?? 0}
                onChange={(val) =>
                  setEditingTargets((prev) => ({
                    ...prev,
                    [branch]: Number(val) || 0,
                  }))
                }
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};