import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FiClipboard, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiEye,
  FiUser,
  FiCalendar,
  FiBox,
  FiAlertCircle,
  FiSearch,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';
import { userAPI, equipmentAPI, equipmentTypeAPI } from '../../api/api';
import borrowingService from '../../api/borrowingService';
import Modal from '../common/Modal';

// คอมโพเนนต์แท็บสำหรับการสลับมุมมอง
const Tabs = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
              {tab.count > 0 && (
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

// คอมโพเนนต์สำหรับแสดงสถิติการยืม-คืน
const LendingStatsCard = ({ title, value, icon, bgColor, textColor, description }) => (
  <div className={`p-6 rounded-lg shadow-sm ${bgColor} border border-gray-200`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${textColor} bg-opacity-20`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-2xl font-semibold ${textColor}`}>{value}</p>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
  </div>
);

// คอมโพเนนต์สำหรับตารางรายการยืม-คืน
const LendingTable = ({ 
  borrowingData, 
  equipment, 
  users, 
  onViewDetails, 
  onApprove, 
  onReject,
  showActions = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ฟังก์ชันค้นหาชื่อผู้ใช้
  const getUserName = (userId) => {
    if (!Array.isArray(users)) return 'ไม่ระบุ';
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'ไม่ระบุ';
  };

  // ฟังก์ชันค้นหาชื่ออุปกรณ์
  const getEquipmentName = (equipmentId) => {
    if (!Array.isArray(equipment)) return 'ไม่ระบุ';
    const equip = equipment.find(e => e.equipment_id === equipmentId);
    return equip ? equip.equipment_name : 'ไม่ระบุ';
  };

  // กรองข้อมูล
  const filteredData = Array.isArray(borrowingData) ? borrowingData.filter(item => {
    const matchesSearch = 
      getUserName(item.user_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEquipmentName(item.equipment_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'รอการอนุมัติ' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'อนุมัติแล้ว' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'ไม่อนุมัติ' },
      'borrowed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'กำลังยืม' },
      'returned': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'คืนแล้ว' },
      'overdue': { bg: 'bg-red-100', text: 'text-red-800', label: 'เกินกำหนด' }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      {/* Header และ Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="ชื่อผู้ยืม หรือ อุปกรณ์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รอการอนุมัติ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
              <option value="borrowed">กำลังยืม</option>
              <option value="returned">คืนแล้ว</option>
              <option value="overdue">เกินกำหนด</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
            >
              <FiFilter className="h-4 w-4 mr-1" />
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ผู้ยืม
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                อุปกรณ์
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                วันที่ยืม
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                กำหนดคืน
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                การดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <FiClipboard className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-gray-500">ไม่พบรายการยืม-คืนที่ตรงกับเงื่อนไขการค้นหา</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <FiUser className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {getUserName(item.user_id)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {getEquipmentName(item.equipment_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(item.borrowed_date).toLocaleDateString('th-TH')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(item.return_date).toLocaleDateString('th-TH')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onViewDetails(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                      {showActions && item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => onApprove(item)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <FiCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onReject(item)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LendingSystem = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  
  // State สำหรับข้อมูล
  const [users, setUsers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [borrowingData, setBorrowingData] = useState([]);
  
  // State สำหรับ Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);

  // สถิติ
  const [lendingStats, setLendingStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    borrowed: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchEquipment(),
        fetchBorrowingData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
    }
  };

  const fetchEquipment = async () => {
    try {
      const response = await equipmentAPI.getAll();
      if (response.success) {
        setEquipment(response.data);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์');
    }
  };

  const fetchBorrowingData = async () => {
    try {
      const response = await borrowingService.getAllBorrowings();
      
      if (response && response.success && Array.isArray(response.data)) {
        setBorrowingData(response.data);
        calculateLendingStats(response.data);
      } else if (Array.isArray(response)) {
        setBorrowingData(response);
        calculateLendingStats(response);
      } else {
        console.warn('Invalid borrowing data format:', response);
        setBorrowingData([]);
        calculateLendingStats([]);
      }
    } catch (error) {
      console.error('Error fetching borrowing data:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลการยืม-คืน');
      setBorrowingData([]);
      calculateLendingStats([]);
    }
  };

  const calculateLendingStats = (data) => {
    if (!Array.isArray(data)) {
      console.warn('calculateLendingStats called with non-array data:', data);
      data = [];
    }
    
    const stats = {
      total: data.length,
      pending: data.filter(item => item.status === 'pending').length,
      approved: data.filter(item => item.status === 'approved').length,
      borrowed: data.filter(item => item.status === 'borrowed').length,
      overdue: data.filter(item => item.status === 'overdue').length
    };
    setLendingStats(stats);
  };

  const handleViewDetails = (borrowing) => {
    setSelectedBorrowing(borrowing);
    setShowDetailModal(true);
  };

  const handleApprove = async (borrowing) => {
    try {
      const id = borrowing.transaction_id || borrowing.borrowing_id || borrowing.id;
      const response = await borrowingService.approveBorrowing(id);
      
      if (response && response.success) {
        const creditMsg = response.data?.creditDeducted 
          ? ` (หักเครดิต ${response.data.creditDeducted} เครดิต)`
          : '';
        toast.success(`อนุมัติการยืมสำเร็จ${creditMsg}`);
        await fetchBorrowingData();
      }
    } catch (error) {
      console.error('Error approving borrowing:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติการยืม');
    }
  };

  const handleReject = async (borrowing) => {
    try {
      const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ:');
      if (!reason) {
        toast.warning('กรุณาระบุเหตุผลในการปฏิเสธ');
        return;
      }
      
      const id = borrowing.transaction_id || borrowing.borrowing_id || borrowing.id;
      const response = await borrowingService.rejectBorrowing(id, reason);
      
      if (response && response.success) {
        toast.success('ปฏิเสธการยืมสำเร็จ');
        await fetchBorrowingData();
      }
    } catch (error) {
      console.error('Error rejecting borrowing:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธการยืม');
    }
  };

  // ตั้งค่าแท็บ
  const tabs = [
    {
      id: 'pending',
      name: 'รอการอนุมัติ',
      icon: <FiClock className="h-4 w-4" />,
      count: lendingStats.pending
    },
    {
      id: 'approved',
      name: 'อนุมัติแล้ว',
      icon: <FiCheck className="h-4 w-4" />,
      count: lendingStats.approved
    },
    {
      id: 'borrowed',
      name: 'กำลังยืม',
      icon: <FiBox className="h-4 w-4" />,
      count: lendingStats.borrowed
    },
    {
      id: 'all',
      name: 'ทั้งหมด',
      icon: <FiClipboard className="h-4 w-4" />,
      count: lendingStats.total
    }
  ];

  // กรองข้อมูลตามแท็บที่เลือก
  const getFilteredData = () => {
    if (activeTab === 'all') return borrowingData;
    return borrowingData.filter(item => item.status === activeTab);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ระบบจัดการการยืม-คืน</h1>
          <p className="text-gray-600">จัดการและติดตามการยืม-คืนอุปกรณ์</p>
        </div>
        <button
          onClick={() => navigate('/admin/inventory')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
        >
          <FiBox className="mr-2" />
          จัดการคลัง
        </button>
      </div>

      {/* สถิติสรุป */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <LendingStatsCard
          title="รายการทั้งหมด"
          value={lendingStats.total}
          icon={<FiClipboard className="h-6 w-6" />}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
        <LendingStatsCard
          title="รอการอนุมัติ"
          value={lendingStats.pending}
          icon={<FiClock className="h-6 w-6" />}
          bgColor="bg-yellow-50"
          textColor="text-yellow-600"
          description="ต้องดำเนินการ"
        />
        <LendingStatsCard
          title="กำลังยืม"
          value={lendingStats.borrowed}
          icon={<FiBox className="h-6 w-6" />}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />
        <LendingStatsCard
          title="เกินกำหนด"
          value={lendingStats.overdue}
          icon={<FiAlertCircle className="h-6 w-6" />}
          bgColor="bg-red-50"
          textColor="text-red-600"
          description="ต้องติดตาม"
        />
      </div>

      {/* Tabs และ Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <LendingTable
          borrowingData={getFilteredData()}
          equipment={equipment}
          users={users}
          onViewDetails={handleViewDetails}
          onApprove={handleApprove}
          onReject={handleReject}
          showActions={activeTab === 'pending'}
        />
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBorrowing && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="รายละเอียดการยืม-คืน"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ผู้ยืม</label>
                <p className="text-sm text-gray-900">
                  {users.find(u => u.id === selectedBorrowing.user_id)?.first_name || 'ไม่ระบุ'} {' '}
                  {users.find(u => u.id === selectedBorrowing.user_id)?.last_name || ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">อุปกรณ์</label>
                <p className="text-sm text-gray-900">
                  {equipment.find(e => e.equipment_id === selectedBorrowing.equipment_id)?.equipment_name || 'ไม่ระบุ'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">วันที่ยืม</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedBorrowing.borrowed_date).toLocaleDateString('th-TH')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">กำหนดคืน</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedBorrowing.return_date).toLocaleDateString('th-TH')}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">วัตถุประสงค์</label>
              <p className="text-sm text-gray-900">{selectedBorrowing.purpose || 'ไม่ระบุ'}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LendingSystem;