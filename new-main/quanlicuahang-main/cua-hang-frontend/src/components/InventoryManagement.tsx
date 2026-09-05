import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
} from 'antd';
import {
  ReloadOutlined,
  SwapOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { supabase } from '../supabase';
import { logActivity } from '../utils/logger';

const { Option } = Select;

interface InventoryItem {
  id: string | number;
  frame_number: string;
  battery_number?: string;
  brand: string;
  model: string;
  color: string;
  branch: string;
  status: 'in_stock' | 'sold';
  import_date?: string;
}

export const InventoryManagement: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('in_stock');
  const [searchText, setSearchText] = useState<string>('');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferTargetBranch, setTransferTargetBranch] = useState<string>('Chợ Mới');
  const [transferingItems, setTransferingItems] = useState<InventoryItem[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('Inventory').select('*').order('id', { ascending: false });

      if (filterBranch !== 'all') {
        query = query.eq('branch', filterBranch);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (err: any) {
      message.error('Lỗi tải dữ liệu kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterBranch, filterStatus]);

  // Đổi trạng thái xe
  const handleToggleStatus = async (record: InventoryItem) => {
    const newStatus: 'in_stock' | 'sold' = record.status === 'in_stock' ? 'sold' : 'in_stock';
    try {
      const { error } = await supabase
        .from('Inventory')
        .update({ status: newStatus })
        .eq('id', record.id);

      if (error) throw error;

      message.success(`Đã cập nhật xe ${record.frame_number}`);

      // Ghi log kèm currentUser
      await logActivity({
        actionType: 'STATUS_CHANGE',
        description: `Đổi trạng thái xe [${record.frame_number}] (${record.brand} ${record.model}) sang: ${
          newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'
        }`,
        user: currentUser,
      });

      fetchData();
    } catch (err: any) {
      message.error('Cập nhật thất bại: ' + err.message);
    }
  };

  // Xóa 1 xe
  const handleDeleteSingle = async (record: InventoryItem) => {
    try {
      const { error } = await supabase.from('Inventory').delete().eq('id', record.id);
      if (error) throw error;

      message.success('Đã xóa xe thành công');

      // Ghi log kèm currentUser
      await logActivity({
        actionType: 'DELETE',
        description: `Xóa xe [${record.frame_number}] (${record.brand} ${record.model}) tại chi nhánh [${record.branch}]`,
        user: currentUser,
      });

      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi xóa: ' + err.message);
    }
  };

  // Xác nhận luân chuyển kho
  const handleConfirmTransfer = async () => {
    try {
      const ids = transferingItems.map((item) => item.id);
      const frameNumbers = transferingItems.map((item) => item.frame_number).join(', ');

      const { error } = await supabase
        .from('Inventory')
        .update({ branch: transferTargetBranch })
        .in('id', ids);

      if (error) throw error;

      message.success(`Đã chuyển ${transferingItems.length} xe sang ${transferTargetBranch}`);

      // Ghi log kèm currentUser
      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển ${transferingItems.length} xe [${frameNumbers}] sang chi nhánh [${transferTargetBranch}]`,
        user: currentUser,
      });

      setIsTransferModalOpen(false);
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi chuyển kho: ' + err.message);
    }
  };

  // Xóa hàng loạt
  const handleDeleteBatch = async () => {
    const selectedItems = data.filter((item) => selectedRowKeys.includes(item.id));
    const frameNumbers = selectedItems.map((item) => item.frame_number).join(', ');

    try {
      const { error } = await supabase.from('Inventory').delete().in('id', selectedRowKeys);
      if (error) throw error;

      message.success(`Đã xóa ${selectedRowKeys.length} xe`);

      // Ghi log kèm currentUser
      await logActivity({
        actionType: 'DELETE',
        description: `Xóa hàng loạt ${selectedRowKeys.length} xe [${frameNumbers}]`,
        user: currentUser,
      });

      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi xóa hàng loạt: ' + err.message);
    }
  };

  const filteredData = data.filter((item) => {
    const text = searchText.toLowerCase();
    return (
      item.frame_number?.toLowerCase().includes(text) ||
      item.battery_number?.toLowerCase().includes(text) ||
      item.brand?.toLowerCase().includes(text) ||
      item.model?.toLowerCase().includes(text) ||
      item.color?.toLowerCase().includes(text)
    );
  });

  const columns = [
    {
      title: 'SỐ KHUNG (VIN)',
      dataIndex: 'frame_number',
      key: 'frame_number',
      render: (text: string) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: 'SỐ PIN / ACQUY',
      dataIndex: 'battery_number',
      key: 'battery_number',
      render: (text: string) => text || '---',
    },
    {
      title: 'HÃNG & MODEL',
      key: 'model',
      render: (_: any, r: InventoryItem) => (
        <span>
          <strong>{r.brand}</strong> {r.model}
        </span>
      ),
    },
    {
      title: 'MÀU SẮC',
      dataIndex: 'color',
      key: 'color',
      render: (text: string) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: 'CHI NHÁNH',
      dataIndex: 'branch',
      key: 'branch',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: InventoryItem) => (
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => handleToggleStatus(record)}
          title="Bấm để chuyển trạng thái"
        >
          {status === 'in_stock' ? (
            <Tag color="green">Trong kho (Bấm để đổi)</Tag>
          ) : (
            <Tag color="default">Đã bán (Bấm để đổi)</Tag>
          )}
        </span>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: (_: any, record: InventoryItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setTransferingItems([record]);
              setIsTransferModalOpen(true);
            }}
          >
            Chuyển kho
          </Button>
          <Popconfirm
            title="Xác nhận xóa xe này?"
            onConfirm={() => handleDeleteSingle(record)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" danger size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Quản Lý Tồn Kho &amp; Luân Chuyển Xe">
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Select
            value={filterBranch}
            onChange={(val) => setFilterBranch(val)}
            style={{ width: '100%' }}
          >
            <Option value="all">🏪 Tất cả chi nhánh</Option>
            <Option value="Chợ Mới">Chi nhánh Chợ Mới</Option>
            <Option value="Lấp Vò">Chi nhánh Lấp Vò</Option>
            <Option value="Mỹ Luông 3">Chi nhánh Mỹ Luông 3</Option>
            <Option value="Mỹ Luông 4">Chi nhánh Mỹ Luông 4</Option>
          </Select>
        </Col>
        <Col xs={24} sm={6}>
          <Select
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            style={{ width: '100%' }}
          >
            <Option value="all">Tất cả trạng thái</Option>
            <Option value="in_stock">📦 Đang tồn kho</Option>
            <Option value="sold">✅ Đã bán</Option>
          </Select>
        </Col>
        <Col xs={24} sm={8}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm theo số khung, pin, model..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Tải lại
          </Button>
        </Col>
      </Row>

      {selectedRowKeys.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '8px 16px',
            backgroundColor: '#e6f7ff',
            border: '1px solid #91caff',
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Đã chọn <b>{selectedRowKeys.length}</b> xe
          </span>
          <Space>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => {
                const selected = data.filter((item) => selectedRowKeys.includes(item.id));
                setTransferingItems(selected);
                setIsTransferModalOpen(true);
              }}
            >
              Luân chuyển {selectedRowKeys.length} xe
            </Button>
            <Popconfirm
              title={`Xóa ${selectedRowKeys.length} xe đã chọn?`}
              onConfirm={handleDeleteBatch}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger icon={<DeleteOutlined />}>
                Xóa các xe đã chọn
              </Button>
            </Popconfirm>
          </Space>
        </div>
      )}

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
      />

      <Modal
        title={`Chuyển ${transferingItems.length} xe sang chi nhánh khác`}
        open={isTransferModalOpen}
        onOk={handleConfirmTransfer}
        onCancel={() => setIsTransferModalOpen(false)}
        okText="Xác nhận chuyển"
        cancelText="Hủy"
      >
        <div style={{ marginTop: 16 }}>
          <p>Chọn chi nhánh nhận xe:</p>
          <Select
            value={transferTargetBranch}
            onChange={(val) => setTransferTargetBranch(val)}
            style={{ width: '100%' }}
          >
            <Option value="Chợ Mới">Chi nhánh Chợ Mới</Option>
            <Option value="Lấp Vò">Chi nhánh Lấp Vò</Option>
            <Option value="Mỹ Luông 3">Chi nhánh Mỹ Luông 3</Option>
            <Option value="Mỹ Luông 4">Chi nhánh Mỹ Luông 4</Option>
          </Select>
        </div>
      </Modal>
    </Card>
  );
};