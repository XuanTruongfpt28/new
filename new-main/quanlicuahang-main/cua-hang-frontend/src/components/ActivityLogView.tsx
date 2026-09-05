import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Input, Space, Button } from 'antd';
import { ReloadOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../supabase';

export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ActivityLog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Lỗi lấy lịch sử:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionTag = (type: string) => {
    switch (type) {
      case 'LOGIN':
        return <Tag color="blue">🔑 Đăng nhập</Tag>;
      case 'LOGOUT':
        return <Tag color="default">🚪 Đăng xuất</Tag>;
      case 'TRANSFER':
        return <Tag color="purple">🔄 Chuyển kho</Tag>;
      case 'STATUS_CHANGE':
        return <Tag color="orange">⚙️ Đổi trạng thái</Tag>;
      case 'DELETE':
        return <Tag color="red">🗑️ Xóa dữ liệu</Tag>;
      case 'IMPORT':
        return <Tag color="green">📥 Nạp Excel</Tag>;
      case 'SALE':
        return <Tag color="gold">💵 Bán xe</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const filteredLogs = logs.filter(
    (item) =>
      item.username?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.branch?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <span>Nhật Ký Thao Tác &amp; Lịch Sử Đăng Nhập</span>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
          Tải lại
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tài khoản, tên, chi nhánh hoặc số khung..."
          style={{ width: 350 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <Table
        dataSource={filteredLogs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        columns={[
          {
            title: 'THỜI GIAN',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 170,
            render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm:ss'),
          },
          {
            title: 'TÀI KHOẢN',
            key: 'user',
            width: 200,
            render: (_, r) => (
              <div>
                <strong>{r.full_name}</strong>
                <div style={{ fontSize: 12, color: '#888' }}>@{r.username}</div>
              </div>
            ),
          },
          {
            title: 'CHI NHÁNH',
            dataIndex: 'branch',
            key: 'branch',
            width: 150,
            render: (b) => <Tag color="cyan">{b}</Tag>,
          },
          {
            title: 'HÀNH ĐỘNG',
            dataIndex: 'action_type',
            key: 'action_type',
            width: 150,
            render: (t) => getActionTag(t),
          },
          {
            title: 'NỘI DUNG CHI TIẾT',
            dataIndex: 'description',
            key: 'description',
            render: (text) => <span>{text}</span>,
          },
        ]}
      />
    </Card>
  );
};