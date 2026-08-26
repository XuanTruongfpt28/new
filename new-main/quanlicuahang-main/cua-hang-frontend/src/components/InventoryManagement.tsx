import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tabs,
  Badge,
  Typography,
} from 'antd';
import {
  InboxOutlined,
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ShopOutlined,
  CarOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../supabase';
import type { SystemAccount } from '../App';

const { Text } = Typography;

interface InventoryItem {
  id?: number;
  branch: string;
  brand: string;
  model: string;
  color: string;
  quantity: number;
  updated_at?: string;
}

interface InventoryLogItem {
  id?: number;
  type: 'import' | 'transfer' | 'sale';
  brand: string;
  model: string;
  color: string;
  quantity: number;
  from_branch?: string;
  to_branch?: string;
  note?: string;
  created_by?: string;
  created_at?: string;
}

interface InventoryManagementProps {
  currentUser: SystemAccount;
}

export const InventoryManagement = ({ currentUser }: InventoryManagementProps) => {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [logList, setLogList] = useState<InventoryLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterBranch, setFilterBranch] = useState<string>(currentUser.role === 'admin' ? 'all' : currentUser.branch);
  const [searchText, setSearchText] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [importForm] = Form.useForm();
  const [transferForm] = Form.useForm();

  // Tải dữ liệu tồn kho & nhật ký từ Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invError } = await supabase
        .from('Inventory')
        .select('*')
        .order('branch', { ascending: true });
      if (!invError && invData) setInventoryList(invData);

      const { data: logData, error: logError } = await supabase
        .from('InventoryLog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!logError && logData) setLogList(logData);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu tồn kho!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xử lý Nhập hàng từ Nhà Cung Cấp
  const handleImportSubmit = async (values: any) => {
    setSubmitting(true);
    const { branch, brand, model, color, quantity, note } = values;

    try {
      const { data: existing } = await supabase
        .from('Inventory')
        .select('*')
        .eq('branch', branch)
        .ilike('brand', brand.trim())
        .ilike('model', model.trim())
        .ilike('color', color.trim())
        .maybeSingle();

      if (existing) {
        await supabase
          .from('Inventory')
          .update({
            quantity: Number(existing.quantity) + Number(quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('Inventory').insert([
          {
            branch,
            brand: brand.trim(),
            model: model.trim(),
            color: color.trim(),
            quantity: Number(quantity),
          },
        ]);
      }

      await supabase.from('InventoryLog').insert([
        {
          type: 'import',
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          quantity: Number(quantity),
          to_branch: branch,
          note: note || 'Nhập từ nhà cung cấp',
          created_by: currentUser.fullName,
        },
      ]);

      message.success(`Đã nhập ${quantity} xe ${brand} ${model} vào ${branch} thành công!`);
      setIsImportModalOpen(false);
      importForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi nhập hàng: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Luân chuyển xe giữa các chi nhánh
  const handleTransferSubmit = async (values: any) => {
    setSubmitting(true);
    const { fromBranch, toBranch, brand, model, color, quantity, note } = values;

    if (fromBranch === toBranch) {
      message.warning('Chi nhánh gửi và chi nhánh nhận không được trùng nhau!');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Kiểm tra tồn kho tại shop gửi
      const { data: fromItem } = await supabase
        .from('Inventory')
        .select('*')
        .eq('branch', fromBranch)
        .ilike('brand', brand.trim())
        .ilike('model', model.trim())
        .ilike('color', color.trim())
        .maybeSingle();

      if (!fromItem || Number(fromItem.quantity) < Number(quantity)) {
        message.error(`Không đủ tồn kho tại ${fromBranch}! Hiện chỉ còn: ${fromItem ? fromItem.quantity : 0} xe.`);
        setSubmitting(false);
        return;
      }

      // 2. Trừ tồn kho chi nhánh gửi
      await supabase
        .from('Inventory')
        .update({
          quantity: Number(fromItem.quantity) - Number(quantity),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fromItem.id);

      // 3. Cộng tồn kho chi nhánh nhận
      const { data: toItem } = await supabase
        .from('Inventory')
        .select('*')
        .eq('branch', toBranch)
        .ilike('brand', brand.trim())
        .ilike('model', model.trim())
        .ilike('color', color.trim())
        .maybeSingle();

      if (toItem) {
        await supabase
          .from('Inventory')
          .update({
            quantity: Number(toItem.quantity) + Number(quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', toItem.id);
      } else {
        await supabase.from('Inventory').insert([
          {
            branch: toBranch,
            brand: brand.trim(),
            model: model.trim(),
            color: color.trim(),
            quantity: Number(quantity),
          },
        ]);
      }

      // 4. Ghi lịch sử luân chuyển
      await supabase.from('InventoryLog').insert([
        {
          type: 'transfer',
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          quantity: Number(quantity),
          from_branch: fromBranch,
          to_branch: toBranch,
          note: note || `Điều chuyển xe từ ${fromBranch} sang ${toBranch}`,
          created_by: currentUser.fullName,
        },
      ]);

      message.success(`Đã chuyển ${quantity} xe từ ${fromBranch} sang ${toBranch} thành công!`);
      setIsTransferModalOpen(false);
      transferForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi luân chuyển kho: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc dữ liệu hiển thị
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const matchBranch = filterBranch === 'all' ? true : item.branch === filterBranch;
      const search = searchText.toLowerCase();
      const matchSearch =
        item.brand.toLowerCase().includes(search) ||
        item.model.toLowerCase().includes(search) ||
        item.color.toLowerCase().includes(search) ||
        item.branch.toLowerCase().includes(search);
      return matchBranch && matchSearch;
    });
  }, [inventoryList, filterBranch, searchText]);

  // Thống kê nhanh
  const totalStock = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = filteredInventory.filter((item) => item.quantity <= 1).length;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* THỐNG KÊ TỔNG QUAN */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#e6f7ff', borderColor: '#91caff' }}>
            <Statistic
              title={<span style={{ color: '#0958d9', fontWeight: 600 }}>Tổng Số Xe Tồn Kho</span>}
              value={totalStock}
              suffix="xe"
              prefix={<CarOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>
            <Statistic
              title={<span style={{ color: '#cf1322', fontWeight: 600 }}>Xe Sắp Hết Hàng (≤ 1 xe)</span>}
              value={lowStockCount}
              suffix="mẫu"
              prefix={<AlertOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title={<span style={{ color: '#389e0d', fontWeight: 600 }}>Số Chi Nhánh Đang Quản Lý</span>}
              value={3}
              suffix="shop"
              prefix={<ShopOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        type="card"
        items={[
          {
            key: 'stock',
            label: (
              <span>
                <InboxOutlined /> Bảng Tồn Kho Hiện Tại ({filteredInventory.length})
              </span>
            ),
            children: (
              <Card size="small" style={{ borderRadius: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <Space wrap>
                    {currentUser.role === 'admin' ? (
                      <Select
                        value={filterBranch}
                        onChange={setFilterBranch}
                        style={{ width: 180 }}
                        options={[
                          { label: 'Tất cả chi nhánh', value: 'all' },
                          { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                          { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                          { label: 'Chi nhánh Mỹ Luông', value: 'Mỹ Luông' },
                        ]}
                      />
                    ) : (
                      <Tag color="blue" style={{ fontSize: 13, padding: '4px 8px' }}>
                        Chi nhánh: {currentUser.branch}
                      </Tag>
                    )}

                    <Input
                      placeholder="Tìm theo hãng, model, màu xe..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 260 }}
                      allowClear
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                      Tải lại
                    </Button>
                  </Space>

                  <Space wrap>
                    <Button
                      type="primary"
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        importForm.resetFields();
                        importForm.setFieldsValue({ branch: currentUser.branch });
                        setIsImportModalOpen(true);
                      }}
                    >
                      Nhập Xe Từ NCC
                    </Button>

                    <Button
                      type="primary"
                      style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                      icon={<SwapOutlined />}
                      onClick={() => {
                        transferForm.resetFields();
                        transferForm.setFieldsValue({ fromBranch: currentUser.branch });
                        setIsTransferModalOpen(true);
                      }}
                    >
                      Luân Chuyển Giữa Các Shop
                    </Button>
                  </Space>
                </div>

                <Table<InventoryItem>
                  dataSource={filteredInventory}
                  rowKey={(r) => `${r.branch}_${r.brand}_${r.model}_${r.color}`}
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                  columns={[
                    {
                      title: 'CHI NHÁNH',
                      dataIndex: 'branch',
                      key: 'branch',
                      render: (b) => <Tag color="blue" style={{ fontWeight: 600 }}>{b}</Tag>,
                      width: 140,
                    },
                    {
                      title: 'HÃNG XE',
                      dataIndex: 'brand',
                      key: 'brand',
                      render: (b) => <Tag color="cyan">{b}</Tag>,
                      width: 120,
                    },
                    {
                      title: 'MODEL XE',
                      dataIndex: 'model',
                      key: 'model',
                      render: (m) => <strong>{m}</strong>,
                    },
                    {
                      title: 'MÀU SẮC',
                      dataIndex: 'color',
                      key: 'color',
                      render: (c) => <Tag color="geekblue">{c}</Tag>,
                      width: 130,
                    },
                    {
                      title: 'SỐ LƯỢNG TỒN',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      align: 'center',
                      width: 150,
                      render: (qty) =>
                        qty <= 1 ? (
                          <Badge count={`${qty} xe`} style={{ backgroundColor: '#ff4d4f', fontWeight: 700 }} />
                        ) : (
                          <Tag color="green" style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px' }}>
                            {qty} xe
                          </Tag>
                        ),
                    },
                    {
                      title: 'CẬP NHẬT GẦN NHẤT',
                      dataIndex: 'updated_at',
                      key: 'updated_at',
                      align: 'center',
                      width: 170,
                      render: (dt) => (dt ? dayjs(dt).format('DD/MM/YYYY HH:mm') : '---'),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'logs',
            label: (
              <span>
                <HistoryOutlined /> Lịch Sử Nhập & Luân Chuyển Hàng
              </span>
            ),
            children: (
              <Card size="small" style={{ borderRadius: 8 }}>
                <Table<InventoryLogItem>
                  dataSource={logList}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  columns={[
                    {
                      title: 'THỜI GIAN',
                      dataIndex: 'created_at',
                      key: 'created_at',
                      render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                      width: 140,
                    },
                    {
                      title: 'LOẠI GIAO DỊCH',
                      dataIndex: 'type',
                      key: 'type',
                      render: (t) => {
                        if (t === 'import') return <Tag color="green">Nhập NCC</Tag>;
                        if (t === 'transfer') return <Tag color="purple">Chuyển Shop</Tag>;
                        return <Tag color="orange">Bán Hàng</Tag>;
                      },
                      width: 120,
                    },
                    {
                      title: 'THÔNG TIN XE',
                      key: 'vehicle',
                      render: (_, r) => <strong>{r.brand} {r.model} - Màu: {r.color}</strong>,
                    },
                    {
                      title: 'SỐ LƯỢNG',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      align: 'center',
                      render: (q) => <Tag color="volcano" style={{ fontWeight: 700 }}>{q} xe</Tag>,
                      width: 100,
                    },
                    {
                      title: 'TỪ CHI NHÁNH',
                      dataIndex: 'from_branch',
                      key: 'from_branch',
                      render: (b) => (b ? <Tag color="red">{b}</Tag> : <Text type="secondary">NCC</Text>),
                      width: 130,
                    },
                    {
                      title: 'ĐẾN CHI NHÁNH',
                      dataIndex: 'to_branch',
                      key: 'to_branch',
                      render: (b) => (b ? <Tag color="blue">{b}</Tag> : <Text type="secondary">Khách mua</Text>),
                      width: 130,
                    },
                    {
                      title: 'NGƯỜI THỰC HIỆN',
                      dataIndex: 'created_by',
                      key: 'created_by',
                      width: 140,
                    },
                    {
                      title: 'GHI CHÚ',
                      dataIndex: 'note',
                      key: 'note',
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* MODAL 1: NHẬP HÀNG TỪ NHÀ CUNG CẤP */}
      <Modal
        title={
          <Space>
            <InboxOutlined style={{ color: '#52c41a' }} />
            <span>Nhập Xe Mới Từ Nhà Cung Cấp</span>
          </Space>
        }
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImportSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="branch" label="Nhập vào Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh nhận!' }]}>
            <Select
              options={[
                { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                { label: 'Chi nhánh Mỹ Luông', value: 'Mỹ Luông' },
              ]}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="brand" label="Hãng Xe" rules={[{ required: true, message: 'Nhập hãng xe!' }]}>
                <Input placeholder="Yadea, Dkbike..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Model Xe" rules={[{ required: true, message: 'Nhập model xe!' }]}>
                <Input placeholder="I8, OVA, Xzone..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="color" label="Màu Sắc" rules={[{ required: true, message: 'Nhập màu sắc!' }]}>
                <Input placeholder="Trắng sữa, Xám..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantity" label="Số Lượng Nhập" initialValue={1} rules={[{ required: true, message: 'Nhập số lượng!' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú phiếu nhập">
            <Input.TextArea placeholder="Số hoá đơn, đơn vị vận chuyển, v.v..." rows={2} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsImportModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
              Xác Nhận Nhập Kho
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: LUÂN CHUYỂN XE GIỮA CÁC SHOP */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#722ed1' }} />
            <span>Luân Chuyển Xe Giữa Các Chi Nhánh</span>
          </Space>
        }
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferSubmit} style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fromBranch" label="Từ Chi nhánh (Gửi đi)" rules={[{ required: true, message: 'Chọn chi nhánh gửi!' }]}>
                <Select
                  options={[
                    { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                    { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                    { label: 'Chi nhánh Mỹ Luông', value: 'Mỹ Luông' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toBranch" label="Đến Chi nhánh (Nhận về)" rules={[{ required: true, message: 'Chọn chi nhánh nhận!' }]}>
                <Select
                  options={[
                    { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                    { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                    { label: 'Chi nhánh Mỹ Luông', value: 'Mỹ Luông' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="brand" label="Hãng Xe" rules={[{ required: true, message: 'Nhập hãng xe!' }]}>
                <Input placeholder="Yadea, Dkbike..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Model Xe" rules={[{ required: true, message: 'Nhập model xe!' }]}>
                <Input placeholder="I8, OVA, Xzone..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="color" label="Màu Sắc" rules={[{ required: true, message: 'Nhập màu sắc!' }]}>
                <Input placeholder="Màu xe..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantity" label="Số Lượng Chuyển" initialValue={1} rules={[{ required: true, message: 'Nhập số lượng!' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Lý do luân chuyển">
            <Input.TextArea placeholder="Khách chi nhánh khác yêu cầu mẫu này, điều tiết kho..." rows={2} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsTransferModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
              Xác Nhận Chuyển Kho
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};