import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tabs,
  Typography,
  Upload,
  Popconfirm,
  Alert,
} from 'antd';
import {
  InboxOutlined,
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ShopOutlined,
  CarOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  BarcodeOutlined,
  CheckSquareOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import { logActivity } from '../utils/logger';
import type { SystemAccount, Customer } from '../App';

const { Text } = Typography;
const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://xedienthanhtuoi.vercel.app/api';

export interface VehicleStockItem {
  id?: number;
  frame_number: string;
  battery_number?: string;
  branch: string;
  brand: string;
  model: string;
  color: string;
  status: 'in_stock' | 'sold' | 'transferring';
  imported_at?: string;
  updated_at?: string;
}

interface InventoryLogItem {
  id?: number;
  type: 'import' | 'transfer' | 'sale' | 'delete';
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

interface ExcelVehicleRow {
  branch: string;
  brand: string;
  model: string;
  color: string;
  frame_number: string;
  battery_number?: string;
  note?: string;
}

interface InventoryManagementProps {
  currentUser: SystemAccount;
  customers?: Customer[];
}

const cleanFrameStr = (str?: string): string => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
};

export const InventoryManagement = ({ currentUser, customers = [] }: InventoryManagementProps) => {
  const [vehicleList, setVehicleList] = useState<VehicleStockItem[]>([]);
  const [logList, setLogList] = useState<InventoryLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Mặc định chọn 'all' (Tất cả chi nhánh) để mọi tài khoản đều tra cứu được toàn hệ thống
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('in_stock');
  const [searchText, setSearchText] = useState('');

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBatchTransferModalOpen, setIsBatchTransferModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<ExcelVehicleRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [importForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [batchTransferForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invError } = await supabase
        .from('Inventory')
        .select('*')
        .order('id', { ascending: false });
      if (!invError && invData) setVehicleList(invData);

      const { data: logData, error: logError } = await supabase
        .from('InventoryLog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!logError && logData) setLogList(logData);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách xe tồn kho!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncSoldStatus = async (showSuccessMsg = true) => {
    setSyncing(true);
    const hide = showSuccessMsg ? message.loading('Đang quét chính xác số khung các đơn bán...', 0) : () => {};

    try {
      let allSales: Customer[] = customers;
      if (!allSales || allSales.length === 0) {
        const res = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          allSales = res.data.data;
        } else if (Array.isArray(res.data)) {
          allSales = res.data;
        }
      }

      if (!allSales || allSales.length === 0) {
        hide();
        setSyncing(false);
        if (showSuccessMsg) message.warning('Chưa có dữ liệu đơn hàng nào!');
        return;
      }

      const soldFrameMap = new Map<string, Customer>();
      allSales.forEach((c) => {
        const raw = (c.frameNumber || c.so_khung || '').trim();
        const clean = cleanFrameStr(raw);
        if (clean && clean !== '---' && clean.length >= 5) {
          soldFrameMap.set(clean, c);
        }
      });

      const { data: stockItems, error: stockErr } = await supabase
        .from('Inventory')
        .select('*')
        .eq('status', 'in_stock');

      if (stockErr || !stockItems) {
        hide();
        setSyncing(false);
        if (showSuccessMsg) message.error('Lỗi truy vấn kho xe!');
        return;
      }

      const matchedToSold: { item: VehicleStockItem; customer: Customer }[] = [];

      stockItems.forEach((inv) => {
        const invClean = cleanFrameStr(inv.frame_number);
        if (!invClean) return;

        if (soldFrameMap.has(invClean)) {
          matchedToSold.push({ item: inv, customer: soldFrameMap.get(invClean)! });
        }
      });

      if (matchedToSold.length > 0) {
        for (const m of matchedToSold) {
          await supabase
            .from('Inventory')
            .update({
              status: 'sold',
              updated_at: new Date().toISOString(),
            })
            .eq('id', m.item.id);

          await supabase.from('InventoryLog').insert([
            {
              type: 'sale',
              brand: m.item.brand,
              model: m.item.model,
              color: m.item.color,
              quantity: 1,
              from_branch: m.item.branch,
              note: `Đồng bộ chính xác bán xe SK: ${m.item.frame_number} cho khách ${m.customer.fullName || m.customer.ho_ten || 'Khách mua'}`,
              created_by: 'Hệ thống tự động',
            },
          ]);
        }

        // Ghi log hoạt động hệ thống
        const matchedFrames = matchedToSold.map(m => m.item.frame_number).join(', ');
        await logActivity({
          actionType: 'SALE',
          description: `Đồng bộ đơn bán: Cập nhật ${matchedToSold.length} xe sang ĐÃ BÁN [${matchedFrames}]`,
          user: currentUser,
        });

        hide();
        if (showSuccessMsg) {
          message.success(`Đã cập nhật chính xác ${matchedToSold.length} xe sang ĐÃ BÁN!`);
        }
        await fetchData();
      } else {
        hide();
        if (showSuccessMsg) {
          message.info('Không có xe mới nào khớp với danh sách đơn bán.');
        }
      }
    } catch (err: any) {
      hide();
      console.error(err);
      if (showSuccessMsg) message.error('Lỗi khi đồng bộ: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const selectedVehicles = useMemo(() => {
    return vehicleList.filter((v) => v.id && selectedRowKeys.includes(v.id));
  }, [vehicleList, selectedRowKeys]);

  const handleToggleStatus = async (record: VehicleStockItem) => {
    const newStatus = record.status === 'in_stock' ? 'sold' : 'in_stock';
    try {
      const { error } = await supabase
        .from('Inventory')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (error) throw error;

      // Ghi log thao tác
      await logActivity({
        actionType: 'STATUS_CHANGE',
        description: `Đổi trạng thái xe [${record.frame_number}] (${record.brand} ${record.model}) sang: ${newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'}`,
        user: currentUser,
      });

      message.success(`Đã đổi xe [${record.frame_number}] thành: ${newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'}`);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi đổi trạng thái: ' + err.message);
    }
  };

  const handleDeleteVehicle = async (item: VehicleStockItem) => {
    try {
      const { error } = await supabase.from('Inventory').delete().eq('id', item.id);
      if (error) throw error;

      await supabase.from('InventoryLog').insert([
        {
          type: 'delete',
          brand: item.brand,
          model: item.model,
          color: item.color,
          quantity: 1,
          from_branch: item.branch,
          note: `Xóa xe số khung: ${item.frame_number}`,
          created_by: currentUser.fullName,
        },
      ]);

      // Ghi log xóa xe
      await logActivity({
        actionType: 'DELETE',
        description: `Xóa xe số khung [${item.frame_number}] (${item.brand} ${item.model}) tại chi nhánh [${item.branch}]`,
        user: currentUser,
      });

      message.success(`Đã xóa xe số khung [${item.frame_number}] khỏi hệ thống!`);
      setSelectedRowKeys((prev) => prev.filter((key) => key !== item.id));
      fetchData();
    } catch (err: any) {
      message.error('Xóa thất bại: ' + err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    const hide = message.loading(`Đang xóa ${selectedRowKeys.length} xe đã chọn...`, 0);

    try {
      const idsToDelete = selectedRowKeys;
      const { error } = await supabase.from('Inventory').delete().in('id', idsToDelete);
      if (error) throw error;

      for (const item of selectedVehicles) {
        await supabase.from('InventoryLog').insert([
          {
            type: 'delete',
            brand: item.brand,
            model: item.model,
            color: item.color,
            quantity: 1,
            from_branch: item.branch,
            note: `Xóa hàng loạt xe SK: ${item.frame_number}`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      // Ghi log xóa hàng loạt
      const frameListStr = selectedVehicles.map((v) => v.frame_number).join(', ');
      await logActivity({
        actionType: 'DELETE',
        description: `Xóa hàng loạt ${selectedVehicles.length} xe số khung: [${frameListStr}]`,
        user: currentUser,
      });

      hide();
      message.success(`Đã xóa thành công ${idsToDelete.length} xe!`);
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi xóa hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchTransferSubmit = async (values: any) => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    const { toBranch, note } = values;
    const hide = message.loading(`Đang chuyển ${selectedRowKeys.length} xe sang ${toBranch}...`, 0);

    try {
      for (const item of selectedVehicles) {
        const fromBranch = item.branch;
        if (fromBranch === toBranch) continue;

        await supabase
          .from('Inventory')
          .update({
            branch: toBranch,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        await supabase.from('InventoryLog').insert([
          {
            type: 'transfer',
            brand: item.brand,
            model: item.model,
            color: item.color,
            quantity: 1,
            from_branch: fromBranch,
            to_branch: toBranch,
            note: `Chuyển hàng loạt xe SK: ${item.frame_number} (${note || 'Điều chuyển lô'})`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      // Ghi log luân chuyển hàng loạt
      const transferredFrames = selectedVehicles.map((v) => v.frame_number).join(', ');
      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển hàng loạt ${selectedVehicles.length} xe [${transferredFrames}] sang chi nhánh [${toBranch}]`,
        user: currentUser,
      });

      hide();
      message.success(`Đã chuyển thành công ${selectedRowKeys.length} xe sang ${toBranch}!`);
      setIsBatchTransferModalOpen(false);
      batchTransferForm.resetFields();
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi chuyển kho hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Chi Nhánh': 'Chợ Mới',
        'Hãng Xe': 'Yadea',
        'Model Xe': 'I8',
        'Màu Sắc': 'Trắng Sữa',
        'Số Khung': 'RL9Y5DGMHTFEU1001',
        'Số Acquy': '1008264-100926-001',
        'Ghi Chú': 'Lô xe mới nhập',
      },
      {
        'Chi Nhánh': 'Lấp Vò',
        'Hãng Xe': 'Yadea',
        'Model Xe': 'OVA',
        'Màu Sắc': 'Vàng Cam Đất',
        'Số Khung': 'RL9Y5DGMHTFEU1002',
        'Số Acquy': '1008264-100926-002',
        'Ghi Chú': 'Lô xe mới nhập',
      },
      {
        'Chi Nhánh': 'Mỹ Luông 3',
        'Hãng Xe': 'Dkbike',
        'Model Xe': 'Xzone',
        'Màu Sắc': 'Xám Bóng',
        'Số Khung': 'RL9Y5DGMHTFEU1003',
        'Số Acquy': '1008264-100926-003',
        'Ghi Chú': 'Lô xe mới nhập',
      },
      {
        'Chi Nhánh': 'Mỹ Luông 4',
        'Hãng Xe': 'Vinfast',
        'Model Xe': 'Feliz 2',
        'Màu Sắc': 'Đen',
        'Số Khung': 'RL9Y5DGMHTFEU1004',
        'Số Acquy': '1008264-100926-004',
        'Ghi Chú': 'Lô xe mới nhập',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [{ wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 24 }, { wch: 24 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhapXeSoKhung');
    XLSX.writeFile(workbook, 'Mau_Nhap_Xe_Theo_So_Khung.xlsx');
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rawJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

        if (rawJson.length === 0) {
          message.warning('File Excel không có dữ liệu!');
          return;
        }

        const formattedRows: ExcelVehicleRow[] = rawJson
          .map((row: any) => {
            let branchName = String(row['Chi Nhánh'] || row['chi_nhanh'] || currentUser.branch).trim();
            if (branchName.toLowerCase() === 'mỹ luông') branchName = 'Mỹ Luông 3';

            return {
              branch: branchName,
              brand: String(row['Hãng Xe'] || row['hang_xe'] || row['Hãng'] || '').trim(),
              model: String(row['Model Xe'] || row['model_xe'] || row['Model'] || row['Tên Xe'] || '').trim(),
              color: String(row['Màu Sắc'] || row['mau_sac'] || row['Màu'] || 'Tiêu chuẩn').trim(),
              frame_number: String(row['Số Khung'] || row['so_khung'] || row['SK'] || '').trim(),
              battery_number: String(row['Số Acquy'] || row['Số Pin'] || row['so_pin'] || row['so_acquy'] || '').trim(),
              note: String(row['Ghi Chú'] || row['ghi_chu'] || 'Nhập kho Excel').trim(),
            };
          })
          .filter((item) => item.frame_number && item.brand && item.model);

        if (formattedRows.length === 0) {
          message.error('Không tìm thấy cột Số Khung, Hãng Xe, hoặc Model hợp lệ!');
          return;
        }

        setExcelPreviewData(formattedRows);
        setIsExcelModalOpen(true);
      } catch {
        message.error('Định dạng file Excel không hợp lệ!');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmImportExcel = async () => {
    if (excelPreviewData.length === 0) return;
    setSubmitting(true);
    const hide = message.loading('Đang lưu danh sách xe vào kho...', 0);

    try {
      for (const row of excelPreviewData) {
        const { data: existing } = await supabase
          .from('Inventory')
          .select('id')
          .eq('frame_number', row.frame_number)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('Inventory')
            .update({
              branch: row.branch,
              brand: row.brand,
              model: row.model,
              color: row.color,
              battery_number: row.battery_number,
              status: 'in_stock',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('Inventory').insert([
            {
              frame_number: row.frame_number,
              battery_number: row.battery_number,
              branch: row.branch,
              brand: row.brand,
              model: row.model,
              color: row.color,
              status: 'in_stock',
            },
          ]);
        }

        await supabase.from('InventoryLog').insert([
          {
            type: 'import',
            brand: row.brand,
            model: row.model,
            color: row.color,
            quantity: 1,
            to_branch: row.branch,
            note: `Nhập xe SK: ${row.frame_number} (${row.note})`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      // Ghi log nhập lô Excel
      await logActivity({
        actionType: 'IMPORT',
        description: `Nhập kho bằng Excel: Nạp thành công ${excelPreviewData.length} xe vào hệ thống`,
        user: currentUser,
      });

      hide();
      message.success(`Đã nạp thành công ${excelPreviewData.length} xe theo số khung vào kho!`);
      setIsExcelModalOpen(false);
      setExcelPreviewData([]);
      await fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi lưu dữ liệu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSubmit = async (values: any) => {
    setSubmitting(true);
    const { branch, brand, model, color, frame_number, battery_number, note } = values;

    try {
      const { data: existing } = await supabase
        .from('Inventory')
        .select('id')
        .eq('frame_number', frame_number.trim())
        .maybeSingle();

      if (existing) {
        message.warning(`Số khung [${frame_number}] đã tồn tại trong hệ thống!`);
        setSubmitting(false);
        return;
      }

      await supabase.from('Inventory').insert([
        {
          frame_number: frame_number.trim(),
          battery_number: (battery_number || '').trim(),
          branch,
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          status: 'in_stock',
        },
      ]);

      await supabase.from('InventoryLog').insert([
        {
          type: 'import',
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          quantity: 1,
          to_branch: branch,
          note: `Nhập xe SK: ${frame_number} - ${note || 'Nhập thủ công'}`,
          created_by: currentUser.fullName,
        },
      ]);

      // Ghi log nhập xe thủ công
      await logActivity({
        actionType: 'IMPORT',
        description: `Nhập xe mới thủ công: [${frame_number}] (${brand} ${model}, màu ${color}) vào chi nhánh [${branch}]`,
        user: currentUser,
      });

      message.success(`Đã thêm xe ${brand} ${model} (SK: ${frame_number}) vào ${branch}!`);
      setIsImportModalOpen(false);
      importForm.resetFields();
      await fetchData();
    } catch (err: any) {
      message.error('Lỗi khi thêm xe: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (values: any) => {
    setSubmitting(true);
    const { frame_number, toBranch, note } = values;

    try {
      const { data: item } = await supabase
        .from('Inventory')
        .select('*')
        .eq('frame_number', frame_number)
        .maybeSingle();

      if (!item) {
        message.error('Không tìm thấy xe với số khung này!');
        setSubmitting(false);
        return;
      }

      if (item.branch === toBranch) {
        message.warning('Chi nhánh nhận phải khác chi nhánh hiện tại của xe!');
        setSubmitting(false);
        return;
      }

      const fromBranch = item.branch;

      await supabase
        .from('Inventory')
        .update({
          branch: toBranch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase.from('InventoryLog').insert([
        {
          type: 'transfer',
          brand: item.brand,
          model: item.model,
          color: item.color,
          quantity: 1,
          from_branch: fromBranch,
          to_branch: toBranch,
          note: `Chuyển xe SK: ${frame_number} (${note || 'Điều tiết kho'})`,
          created_by: currentUser.fullName,
        },
      ]);

      // Ghi log chuyển 1 xe
      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển xe [${frame_number}] (${item.brand} ${item.model}) từ [${fromBranch}] sang [${toBranch}]`,
        user: currentUser,
      });

      message.success(`Đã chuyển xe số khung [${frame_number}] từ ${fromBranch} sang ${toBranch}!`);
      setIsTransferModalOpen(false);
      transferForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi luân chuyển: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicleList.filter((item) => {
      const matchBranch = filterBranch === 'all' ? true : item.branch === filterBranch;
      const matchStatus = filterStatus === 'all' ? true : item.status === filterStatus;
      const search = searchText.toLowerCase();
      const matchSearch =
        item.frame_number.toLowerCase().includes(search) ||
        (item.battery_number && item.battery_number.toLowerCase().includes(search)) ||
        item.brand.toLowerCase().includes(search) ||
        item.model.toLowerCase().includes(search) ||
        item.color.toLowerCase().includes(search) ||
        item.branch.toLowerCase().includes(search);
      return matchBranch && matchStatus && matchSearch;
    });
  }, [vehicleList, filterBranch, filterStatus, searchText]);

  const inStockCount = vehicleList.filter((v) => v.status === 'in_stock').length;
  const soldCount = vehicleList.filter((v) => v.status === 'sold').length;

  const availableInStockVehicles = useMemo(() => {
    return vehicleList.filter((v) => v.status === 'in_stock');
  }, [vehicleList]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#e6f7ff', borderColor: '#91caff' }}>
            <Statistic
              title={<span style={{ color: '#0958d9', fontWeight: 600 }}>Xe Đang Tồn Trong Kho</span>}
              value={inStockCount}
              suffix="chiếc"
              prefix={<CarOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title={<span style={{ color: '#389e0d', fontWeight: 600 }}>Tổng Xe Đã Xuất Bán</span>}
              value={soldCount}
              suffix="chiếc"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#fff7e6', borderColor: '#ffd591' }}>
            <Statistic
              title={<span style={{ color: '#d46b08', fontWeight: 600 }}>Chi Nhánh Đang Quản Lý</span>}
              value={4}
              suffix="shop"
              prefix={<ShopOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
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
                <BarcodeOutlined /> Quản Lý Xe Theo Số Khung ({filteredVehicles.length})
              </span>
            ),
            children: (
              <Card size="small" style={{ borderRadius: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <Space wrap>
                    <Select
                      value={filterBranch}
                      onChange={setFilterBranch}
                      style={{ width: 180 }}
                      options={[
                        { label: '🏪 Tất cả chi nhánh', value: 'all' },
                        { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                        { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                        { label: 'Chi nhánh Mỹ Luông 3', value: 'Mỹ Luông 3' },
                        { label: 'Chi nhánh Mỹ Luông 4', value: 'Mỹ Luông 4' },
                      ]}
                    />

                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 150 }}
                      options={[
                        { label: '📦 Đang tồn kho', value: 'in_stock' },
                        { label: '✅ Đã bán', value: 'sold' },
                        { label: 'Tất cả trạng thái', value: 'all' },
                      ]}
                    />

                    <Input
                      placeholder="Tìm số khung, số pin, hãng, model..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 240 }}
                      allowClear
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                      Tải lại
                    </Button>
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={syncing} />}
                      style={{ backgroundColor: '#1890ff' }}
                      onClick={() => handleSyncSoldStatus(true)}
                      loading={syncing}
                    >
                      Đồng Bộ Đơn Đã Bán
                    </Button>
                  </Space>

                  <Space wrap>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadSampleExcel}>
                      Tải Mẫu Excel Số Khung
                    </Button>

                    <Upload beforeUpload={handleFileSelect} showUploadList={false} accept=".xlsx, .xls">
                      <Button type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }} icon={<FileExcelOutlined />}>
                        Nhập Lô Xe Bằng Excel
                      </Button>
                    </Upload>

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
                      Nhập Xe Thủ Công
                    </Button>

                    <Button
                      type="primary"
                      style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                      icon={<SwapOutlined />}
                      onClick={() => {
                        transferForm.resetFields();
                        setIsTransferModalOpen(true);
                      }}
                    >
                      Chuyển 1 Xe Cụ Thể
                    </Button>
                  </Space>
                </div>

                {selectedRowKeys.length > 0 && (
                  <Alert
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Space>
                          <CheckSquareOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                          <span>
                            Đã chọn <strong>{selectedRowKeys.length}</strong> xe trong danh sách
                          </span>
                          <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
                            Bỏ chọn tất cả
                          </Button>
                        </Space>
                        <Space wrap>
                          <Button
                            type="primary"
                            icon={<SwapOutlined />}
                            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                            onClick={() => {
                              batchTransferForm.resetFields();
                              setIsBatchTransferModalOpen(true);
                            }}
                          >
                            Luân Chuyển {selectedRowKeys.length} Xe Đã Chọn
                          </Button>

                          <Popconfirm
                            title="Xác nhận xóa hàng loạt"
                            description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} xe đã chọn khỏi hệ thống?`}
                            onConfirm={handleBatchDelete}
                            okText="Xóa Tất Cả"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button danger icon={<DeleteOutlined />}>
                              Xóa {selectedRowKeys.length} Xe Đã Chọn
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    }
                    type="info"
                    showIcon={false}
                  />
                )}

                <Table<VehicleStockItem>
                  rowSelection={rowSelection}
                  dataSource={filteredVehicles}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                  columns={[
                    {
                      title: 'SỐ KHUNG (VIN)',
                      dataIndex: 'frame_number',
                      key: 'frame_number',
                      render: (sk) => <Text code style={{ color: '#d46b08', fontWeight: 700, fontSize: 13 }}>{sk}</Text>,
                      width: 170,
                    },
                    {
                      title: 'SỐ ACQUY / PIN',
                      dataIndex: 'battery_number',
                      key: 'battery_number',
                      render: (bat) => (bat ? <Text code style={{ color: '#389e0d', fontWeight: 600 }}>{bat}</Text> : <Text type="secondary">---</Text>),
                      width: 160,
                    },
                    {
                      title: 'HÃNG & MODEL XE',
                      key: 'vehicle',
                      render: (_, r) => <strong>{r.brand} {r.model}</strong>,
                      width: 170,
                    },
                    {
                      title: 'MÀU SẮC',
                      dataIndex: 'color',
                      key: 'color',
                      render: (c) => <Tag color="cyan">{c}</Tag>,
                      width: 120,
                    },
                    {
                      title: 'VỊ TRÍ CHI NHÁNH',
                      dataIndex: 'branch',
                      key: 'branch',
                      render: (b) => <Tag color="blue" style={{ fontWeight: 600 }}>{b}</Tag>,
                      width: 140,
                    },
                    {
                      title: 'TRẠNG THÁI',
                      dataIndex: 'status',
                      key: 'status',
                      align: 'center',
                      render: (st, record) => (
                        <Popconfirm
                          title="Đổi trạng thái xe"
                          description={`Chuyển xe [${record.frame_number}] sang: ${st === 'in_stock' ? 'ĐÃ BÁN' : 'TRONG KHO'}?`}
                          onConfirm={() => handleToggleStatus(record)}
                          okText="Đổi"
                          cancelText="Hủy"
                        >
                          {st === 'in_stock' ? (
                            <Tag color="green" style={{ fontWeight: 600, cursor: 'pointer' }}>
                              Trong kho (Bấm để đổi)
                            </Tag>
                          ) : (
                            <Tag color="default" style={{ cursor: 'pointer' }}>
                              Đã bán (Bấm để đổi)
                            </Tag>
                          )}
                        </Popconfirm>
                      ),
                      width: 150,
                    },
                    {
                      title: 'NGÀY NHẬP',
                      dataIndex: 'imported_at',
                      key: 'imported_at',
                      align: 'center',
                      render: (dt) => (dt ? dayjs(dt).format('DD/MM/YYYY') : '---'),
                      width: 120,
                    },
                    {
                      title: 'THAO TÁC',
                      key: 'action',
                      align: 'center',
                      width: 100,
                      render: (_, record) => (
                        <Popconfirm
                          title="Xác nhận xóa xe"
                          description={`Bạn có chắc muốn xóa xe số khung [${record.frame_number}] khỏi kho?`}
                          onConfirm={() => handleDeleteVehicle(record)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            Xóa
                          </Button>
                        </Popconfirm>
                      ),
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
                <HistoryOutlined /> Lịch Sử Nhập / Luân Chuyển / Bán Xe
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
                        if (t === 'import') return <Tag color="green">Nhập Kho</Tag>;
                        if (t === 'transfer') return <Tag color="purple">Chuyển Shop</Tag>;
                        if (t === 'delete') return <Tag color="red">Xóa Xe</Tag>;
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
                      render: (b) => (b ? <Tag color="blue">{b}</Tag> : <Text type="secondary">Khách mua / Xóa</Text>),
                      width: 130,
                    },
                    {
                      title: 'NGƯỜI THỰC HIỆN',
                      dataIndex: 'created_by',
                      key: 'created_by',
                      width: 140,
                    },
                    {
                      title: 'GHI CHÚ / SỐ KHUNG',
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

      {/* MODAL 1: PREVIEW EXCEL */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#13c2c2' }} />
            <span>Xác Nhận Lô Xe Nhập Từ Excel ({excelPreviewData.length} xe)</span>
          </Space>
        }
        open={isExcelModalOpen}
        onCancel={() => setIsExcelModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <Table<ExcelVehicleRow>
          dataSource={excelPreviewData}
          rowKey={(r, idx) => `${r.frame_number}_${idx}`}
          pagination={{ pageSize: 5 }}
          size="small"
          bordered
          columns={[
            { title: 'Số Khung', dataIndex: 'frame_number', render: (sk) => <Text code strong>{sk}</Text> },
            { title: 'Số Acquy', dataIndex: 'battery_number' },
            { title: 'Chi Nhánh Nhận', dataIndex: 'branch', render: (b) => <Tag color="blue">{b}</Tag> },
            { title: 'Hãng & Model', render: (_, r) => `${r.brand} ${r.model}` },
            { title: 'Màu Sắc', dataIndex: 'color', render: (c) => <Tag color="cyan">{c}</Tag> },
            { title: 'Ghi Chú', dataIndex: 'note' },
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setIsExcelModalOpen(false)}>Hủy</Button>
          <Button type="primary" icon={<UploadOutlined />} loading={submitting} onClick={handleConfirmImportExcel} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>
            Xác Nhận Nạp Vào Kho
          </Button>
        </div>
      </Modal>

      {/* MODAL 2: NHẬP THỦ CÔNG 1 XE */}
      <Modal
        title={
          <Space>
            <InboxOutlined style={{ color: '#52c41a' }} />
            <span>Nhập Xe Mới Theo Số Khung</span>
          </Space>
        }
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImportSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="branch" label="Chi nhánh nhập về" rules={[{ required: true, message: 'Chọn chi nhánh!' }]}>
            <Select
              options={[
                { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                { label: 'Chi nhánh Mỹ Luông 3', value: 'Mỹ Luông 3' },
                { label: 'Chi nhánh Mỹ Luông 4', value: 'Mỹ Luông 4' },
              ]}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="frame_number" label="Số Khung (Bắt buộc)" rules={[{ required: true, message: 'Nhập số khung!' }]}>
                <Input placeholder="VD: RL9Y5DGMHTFEU..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="battery_number" label="Số Acquy / Pin">
                <Input placeholder="VD: 1008264..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="brand" label="Hãng Xe" rules={[{ required: true, message: 'Nhập hãng!' }]}>
                <Input placeholder="Yadea, Vinfast..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Model Xe" rules={[{ required: true, message: 'Nhập model!' }]}>
                <Input placeholder="I8, Feliz 2, OVA..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="color" label="Màu Sắc" rules={[{ required: true, message: 'Nhập màu!' }]}>
            <Input placeholder="Trắng Sữa, Xám Bóng..." />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú phiếu nhập">
            <Input.TextArea placeholder="Số hoá đơn, đơn vị vận chuyển..." rows={2} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsImportModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
              Xác Nhận Nhập Kho
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 3: LUÂN CHUYỂN XE THEO SỐ KHUNG */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#722ed1' }} />
            <span>Luân Chuyển Xe Theo Số Khung Sang Shop Khác</span>
          </Space>
        }
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        footer={null}
        destroyOnClose
        width={540}
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="frame_number" label="Chọn chiếc xe cần luân chuyển (Theo Số Khung)" rules={[{ required: true, message: 'Chọn xe cần chuyển!' }]}>
            <Select
              showSearch
              placeholder="Tìm theo số khung hoặc model xe..."
              optionFilterProp="label"
              options={availableInStockVehicles.map((v) => ({
                label: `[${v.frame_number}] - ${v.brand} ${v.model} (${v.color}) - Đang ở: ${v.branch}`,
                value: v.frame_number,
              }))}
            />
          </Form.Item>

          <Form.Item name="toBranch" label="Chuyển đến Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh nhận!' }]}>
            <Select
              options={[
                { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                { label: 'Chi nhánh Mỹ Luông 3', value: 'Mỹ Luông 3' },
                { label: 'Chi nhánh Mỹ Luông 4', value: 'Mỹ Luông 4' },
              ]}
            />
          </Form.Item>

          <Form.Item name="note" label="Lý do luân chuyển">
            <Input.TextArea placeholder="Khách hàng ở shop khác yêu cầu..." rows={2} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsTransferModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
              Xác Nhận Chuyển Kho
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 4: LUÂN CHUYỂN HÀNG LOẠT */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#722ed1' }} />
            <span>Luân Chuyển Hàng Loạt ({selectedRowKeys.length} Xe Đã Chọn)</span>
          </Space>
        }
        open={isBatchTransferModalOpen}
        onCancel={() => setIsBatchTransferModalOpen(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Bạn đang thực hiện luân chuyển <strong>{selectedRowKeys.length} xe</strong> sang chi nhánh mới:
          </Text>
          <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 6 }}>
            {selectedVehicles.map((v, idx) => (
              <div key={v.id || idx} style={{ fontSize: 13, marginBottom: 4 }}>
                • <Text code>{v.frame_number}</Text> - {v.brand} {v.model} ({v.color}) | Hiện ở: <Tag color="blue">{v.branch}</Tag>
              </div>
            ))}
          </div>
        </div>

        <Form form={batchTransferForm} layout="vertical" onFinish={handleBatchTransferSubmit}>
          <Form.Item name="toBranch" label="Chuyển tất cả đến Chi nhánh" rules={[{ required: true, message: 'Vui lòng chọn chi nhánh nhận!' }]}>
            <Select
              placeholder="Chọn chi nhánh đích..."
              options={[
                { label: 'Chi nhánh Chợ Mới', value: 'Chợ Mới' },
                { label: 'Chi nhánh Lấp Vò', value: 'Lấp Vò' },
                { label: 'Chi nhánh Mỹ Luông 3', value: 'Mỹ Luông 3' },
                { label: 'Chi nhánh Mỹ Luông 4', value: 'Mỹ Luông 4' },
              ]}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú đợt chuyển hàng loạt">
            <Input.TextArea placeholder="Điều chuyển kho theo kế hoạch..." rows={2} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsBatchTransferModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
              Xác Nhận Chuyển {selectedRowKeys.length} Xe
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};