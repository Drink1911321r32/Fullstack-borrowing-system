import React, { useState, useEffect } from 'react';
import {
  FiPackage, FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiClock,
  FiFilter, FiSearch, FiRefreshCw, FiDownload, FiEye, FiAlertTriangle,
  FiTrendingUp, FiTrendingDown, FiActivity, FiDollarSign
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useNotification } from '../../contexts/NotificationContext';
import borrowingService from '../../api/borrowingService';
import returnService from '../../api/returnService';
import adminService from '../../api/adminService';

const EquipmentReturn = () => {
  const { notifyBorrowingReturned } = useNotification();
  const [borrowings, setBorrowings] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // active = Approved/Borrowed
  const [penaltyPerHour, setPenaltyPerHour] = useState(1); // ค่าปรับต่อชั่วโมง (default 1)
  const [activeTab, setActiveTab] = useState('pending'); // pending = รอคืน, history = ประวัติการคืน
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnData, setReturnData] = useState({
    quantity_returned: 0,
    actual_return_date: new Date().toISOString().split('T')[0],
    notes: '',
    damage_cost: 0,
    damage_description: '',
    additional_penalty: 0
  });

  useEffect(() => {
    fetchBorrowings();
    fetchReturns();
    fetchPenaltySetting();
  }, []);

  const fetchPenaltySetting = async () => {
    try {
      const response = await adminService.getSettingByKey('penalty_credit_per_hour');
      const data = response.data || response;
      if (data.setting_value) {
        const penaltyValue = parseInt(data.setting_value) || 1;
        setPenaltyPerHour(penaltyValue);
      }
    } catch (error) {
      console.error('Error fetching penalty setting:', error);
      // ใช้ค่า default ถ้าดึงไม่สำเร็จ
      setPenaltyPerHour(1);
    }
  };

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const response = await borrowingService.getAllBorrowings();
      const data = response.data || response;
      const borrowingData = Array.isArray(data) ? data : [];
      
      setBorrowings(borrowingData);
    } catch (error) {
      console.error('❌ Error fetching borrowings:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการยืมได้');
      setBorrowings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      const response = await returnService.getAllReturns();
      const data = response.data || response;
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching returns:', error);
      toast.error('ไม่สามารถโหลดประวัติการคืนได้');
      setReturns([]);
    }
  };

  // กรองการยืมที่พร้อมคืน
  const getFilteredBorrowings = () => {
    let filtered = borrowings;

    // กรองตามสถานะ
    if (filterStatus === 'active') {
      filtered = filtered.filter(b => {
        if (b.status !== 'Approved' && b.status !== 'Borrowed') return false;
        const remaining = b.quantity_remaining || (b.quantity_borrowed - (b.total_returned || 0));
        return remaining > 0; // แสดงเฉพาะที่ยังมีของค้าง
      });
    } else if (filterStatus === 'overdue') {
      filtered = filtered.filter(b => {
        if (b.status !== 'Approved' && b.status !== 'Borrowed') return false;
        const remaining = b.quantity_remaining || (b.quantity_borrowed - (b.total_returned || 0));
        if (remaining <= 0) return false; // ถ้าคืนครบแล้วไม่นับเป็นเกินกำหนด
        const expectedDate = new Date(b.expected_return_date);
        const today = new Date();
        expectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return today > expectedDate;
      });
    } else if (filterStatus === 'returned') {
      filtered = filtered.filter(b => b.status === 'Returned' || b.status === 'Completed' || b.is_returned === 1);
    }

    // กรองตามคำค้นหา
    if (searchQuery) {
      filtered = filtered.filter(borrowing => {
        const userName = `${borrowing.first_name || ''} ${borrowing.last_name || ''}`.toLowerCase();
        const email = (borrowing.email || '').toLowerCase();
        const equipmentName = (borrowing.equipment_name || '').toLowerCase();
        const query = searchQuery.toLowerCase();

        return userName.includes(query) ||
          email.includes(query) ||
          equipmentName.includes(query);
      });
    }

    return filtered.sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));
  };

  const filteredBorrowings = getFilteredBorrowings();

  // คำนวณสถิติ
  const getStats = () => {
    // นับเฉพาะ transaction ที่ยังมีของที่ต้องคืน (quantity_remaining > 0)
    const active = borrowings.filter(b => {
      if (b.status !== 'Approved' && b.status !== 'Borrowed') return false;
      const remaining = b.quantity_remaining || (b.quantity_borrowed - (b.total_returned || 0));
      return remaining > 0;
    }).length;

    const overdue = borrowings.filter(b => {
      if (b.status !== 'Approved' && b.status !== 'Borrowed') return false;
      const remaining = b.quantity_remaining || (b.quantity_borrowed - (b.total_returned || 0));
      if (remaining <= 0) return false; // ถ้าคืนครบแล้วไม่นับเป็นเกินกำหนด
      const expectedDate = new Date(b.expected_return_date);
      const today = new Date();
      expectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return today > expectedDate;
    }).length;

    const returned = borrowings.filter(b => 
      b.status === 'Returned' || b.status === 'Completed' || b.is_returned === 1
    ).length;
    
    // นับจากตาราง return_transactions ที่คืนวันนี้
    const returnedToday = returns.filter(r => {
      if (!r.actual_return_date && !r.created_at) return false;
      const returnDate = new Date(r.actual_return_date || r.created_at);
      const today = new Date();
      returnDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return returnDate.getTime() === today.getTime();
    }).length;

    return { active, overdue, returned, returnedToday };
  };

  const stats = getStats();

  // เปิด Modal คืนอุปกรณ์
  const openReturnModal = (borrowing) => {
    setSelectedBorrowing(borrowing);
    // ใช้ quantity_remaining ที่มาจาก API หรือคำนวณเอง
    const remaining = borrowing.quantity_remaining || 
                     (borrowing.quantity_borrowed - (borrowing.total_returned || 0));
    
    setReturnData({
      quantity_returned: remaining,
      actual_return_date: new Date().toISOString().split('T')[0],
      notes: '',
      damage_cost: 0,
      damage_description: '',
      additional_penalty: 0
    });
    setShowReturnModal(true);
  };

  // บันทึกการคืน
  const handleReturn = async () => {
    try {
      // ป้องกันการคลิกซ้ำ
      if (submitLoading) {
        console.warn('⚠️ Submit already in progress');
        return;
      }

      if (!returnData.quantity_returned || returnData.quantity_returned <= 0) {
        toast.error('กรุณาระบุจำนวนที่คืน');
        return;
      }

      const remaining = selectedBorrowing.quantity_remaining || 
                       (selectedBorrowing.quantity_borrowed - (selectedBorrowing.total_returned || 0));
      
      if (returnData.quantity_returned > remaining) {
        toast.error(`จำนวนที่คืนต้องไม่เกิน ${remaining} ชิ้น`);
        return;
      }

      setSubmitLoading(true);

      const response = await returnService.createReturn(
        selectedBorrowing.transaction_id,
        returnData
      );

      if (response && response.success) {
        toast.success(response.message || 'บันทึกการคืนสำเร็จ');

        // แสดงข้อมูลเครดิต
        if (response.data?.net_credit_change !== undefined) {
          const change = response.data.net_credit_change;
          if (change > 0) {
            toast.info(`✨ คืนเครดิต ${change} คะแนน`);
          } else if (change < 0) {
            toast.warning(`⚠️ หักค่าปรับ ${Math.abs(change)} เครดิต`);
          }
        }

        setShowReturnModal(false);
        
        // รีเฟรชข้อมูลทั้งหมด
        await Promise.all([
          fetchBorrowings(),
          fetchReturns()
        ]);

        // ส่งการแจ้งเตือน
        if (notifyBorrowingReturned) {
          notifyBorrowingReturned(selectedBorrowing.user_id);
        }
      }
    } catch (error) {
      console.error('❌ Error returning equipment:', error);
      const errorMsg = error.response?.data?.message || error.message || 'ไม่สามารถบันทึกการคืนได้';
      toast.error(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // TODO: Implement checkLostItems and markAsLost in returnController later
  /* 
  // ตรวจสอบและเปลี่ยนสถานะรายการสูญหายอัตโนมัติ
  const handleCheckLostItems = async () => {
    try {
      const confirmed = window.confirm(
        'คุณต้องการตรวจสอบรายการที่เกินกำหนดคืน 7 วันหรือไม่?\n' +
        'ระบบจะเปลี่ยนสถานะเป็น "สูญหาย" และหักเครดิตผู้ยืมเป็น 0'
      );

      if (!confirmed) return;

      const response = await borrowingService.checkLostItems();
      
      if (response && response.success) {
        const { lostItems } = response.data;
        if (lostItems && lostItems.length > 0) {
          toast.success(`ตรวจพบและปรับสถานะเป็นสูญหาย ${lostItems.length} รายการ`);
          fetchBorrowings();
        } else {
          toast.info('ไม่พบรายการที่สูญหาย');
        }
      }
    } catch (error) {
      console.error('Error checking lost items:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
    }
  };
  */

  // คำนวณชั่วโมงที่เกินกำหนด
  const getHoursOverdue = (expectedReturnDate) => {
    const expected = new Date(expectedReturnDate);
    const now = new Date();
    const diffMs = now - expected;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return diffHours > 0 ? diffHours : 0;
  };

  // คำนวณวันที่เกินกำหนด
  const getDaysOverdue = (expectedReturnDate) => {
    const expected = new Date(expectedReturnDate);
    expected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today - expected;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiCheckCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">ตรวจรับคืนอุปกรณ์</h1>
                  <p className="text-green-100 mt-1 font-medium">ตรวจสอบและบันทึกการคืนอุปกรณ์</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiActivity className="inline w-4 h-4 mr-1 text-green-300" />
                      <span className="text-white font-semibold">กำลังยืม: {stats.active}</span>
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiAlertTriangle className="inline w-4 h-4 mr-1 text-red-300" />
                      <span className="text-white font-semibold">เกินกำหนด: {stats.overdue}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                {/* TODO: Implement lost items check later
                <button
                  onClick={handleCheckLostItems}
                  className="bg-red-500/20 hover:bg-red-500/30 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-red-300/30 flex items-center space-x-2"
                  title="ตรวจสอบรายการที่เกิน 7 วันหลังครบกำหนด"
                >
                  <FiAlertTriangle className="w-4 h-4 text-white" />
                  <span className="text-white">ตรวจสอบรายการสูญหาย</span>
                </button>
                */}
                <button
                  onClick={() => {
                    fetchBorrowings();
                    fetchReturns();
                  }}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiRefreshCw className="w-5 h-5 text-white" />
                </button>
                <button className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center space-x-2">
                  <FiDownload className="w-4 h-4 text-white" />
                  <span className="text-white">ส่งออก</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">กำลังยืม</p>
                <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <FiClock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เกินกำหนด</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <FiAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">คืนแล้วทั้งหมด</p>
                <p className="text-3xl font-bold text-green-600">{stats.returned}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <FiCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">คืนวันนี้</p>
                <p className="text-3xl font-bold text-purple-600">{stats.returnedToday}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <FiTrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'pending'
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FiClock className="inline mr-2" />
                รอตรวจรับคืน ({stats.active})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FiCheckCircle className="inline mr-2" />
                ประวัติการคืน ({returns.length})
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ค้นหาผู้ยืม หรือ อุปกรณ์..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-80"
                  />
                </div>
                {activeTab === 'pending' && (
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="active">กำลังยืม</option>
                    <option value="overdue">เกินกำหนด</option>
                    <option value="returned">คืนแล้ว</option>
                  </select>
                )}
              </div>
              <div className="text-sm text-gray-600">
                แสดง {filteredBorrowings.length} รายการ
              </div>
            </div>
          </div>
        </div>

        {/* Borrowings List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {activeTab === 'pending' ? (
            // แสดงรายการรอตรวจรับคืน
            loading ? (
              <div className="p-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
                <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredBorrowings.length === 0 ? (
              <div className="p-20 text-center">
                <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">ไม่พบข้อมูล</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ยืม
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      อุปกรณ์
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จำนวน
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ยืม
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ครบกำหนด
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBorrowings.map((borrowing) => {
                    const hoursOverdue = getHoursOverdue(borrowing.expected_return_date);
                    const daysOverdue = getDaysOverdue(borrowing.expected_return_date);
                    const isOverdue = hoursOverdue > 0 && borrowing.status !== 'Returned' && borrowing.status !== 'Completed' && borrowing.is_returned !== 1;
                    // ใช้ quantity_remaining จาก API หรือคำนวณเอง
                    const remaining = borrowing.quantity_remaining || 
                                    (borrowing.quantity_borrowed - (borrowing.total_returned || 0));
                    const totalReturned = borrowing.total_returned || 0;

                    return (
                      <tr key={borrowing.transaction_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {borrowing.profile_image ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 mr-3">
                                <img 
                                  src={`http://localhost:5000${borrowing.profile_image}`} 
                                  alt={`${borrowing.first_name} ${borrowing.last_name}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-blue-100 flex items-center justify-center"><svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="bg-blue-100 rounded-full p-2 mr-3">
                                <FiUser className="w-5 h-5 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {borrowing.first_name} {borrowing.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{borrowing.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{borrowing.equipment_name}</div>
                          {borrowing.model && (
                            <div className="text-sm text-gray-500">รุ่น: {borrowing.model}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <FiPackage className="w-4 h-4 text-blue-600 mr-1" />
                                <span className="text-gray-700">ยืม: <span className="font-semibold text-blue-700">{borrowing.quantity_borrowed}</span></span>
                              </div>
                              {totalReturned > 0 && (
                                <div className="flex items-center">
                                  <FiCheckCircle className="w-4 h-4 text-green-600 mr-1" />
                                  <span className="text-gray-700">คืน: <span className="font-semibold text-green-700">{totalReturned}</span></span>
                                </div>
                              )}
                              {remaining > 0 && borrowing.status !== 'Returned' && borrowing.status !== 'Completed' && (
                                <div className="flex items-center">
                                  <FiClock className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="text-gray-700">คงเหลือ: <span className="font-semibold text-orange-700">{remaining}</span></span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {new Date(borrowing.borrow_date).toLocaleDateString('th-TH')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(borrowing.borrow_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                              {new Date(borrowing.expected_return_date).toLocaleDateString('th-TH')}
                            </div>
                            <div className={isOverdue ? 'text-xs text-red-500' : 'text-xs text-gray-500'}>
                              {new Date(borrowing.expected_return_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </div>
                            {isOverdue && (
                              <div className="text-xs text-red-500">
                                เกิน {daysOverdue} วัน
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {borrowing.status === 'Returned' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <FiCheckCircle className="w-4 h-4 mr-1" />
                              คืนแล้ว
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              <FiAlertTriangle className="w-4 h-4 mr-1" />
                              เกินกำหนด
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              <FiClock className="w-4 h-4 mr-1" />
                              กำลังยืม
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {borrowing.status === 'Returned' || borrowing.status === 'Lost' ? (
                            <button
                              onClick={() => setSelectedBorrowing(borrowing)}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1 ml-auto"
                            >
                              <FiEye className="w-4 h-4" />
                              <span>ดูรายละเอียด</span>
                            </button>
                          ) : (
                            <div className="flex items-center space-x-2 justify-end">
                              <button
                                onClick={() => openReturnModal(borrowing)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                              >
                                <FiCheckCircle className="w-4 h-4" />
                                <span>บันทึกการคืน</span>
                              </button>
                              {/* TODO: Implement mark as lost later
                              {(() => {
                                const hoursOverdue = getHoursOverdue(borrowing.expected_return_date);
                                if (hoursOverdue >= 168) { // 7 วัน = 168 ชั่วโมง
                                  return (
                                    <button
                                      onClick={() => handleMarkAsLost(borrowing.transaction_id)}
                                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                                      title="เกินกำหนด 7 วัน - ระบุเป็นสูญหาย"
                                    >
                                      <FiXCircle className="w-4 h-4" />
                                      <span>สูญหาย</span>
                                    </button>
                                  );
                                }
                              })()}
                              */}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )
          ) : (
            // แสดงประวัติการคืน (จากตาราง return_transactions)
            returns.length === 0 ? (
              <div className="p-20 text-center">
                <FiCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">ยังไม่มีประวัติการคืน</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">ผู้คืน</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">อุปกรณ์</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">วันที่คืน</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">เกิน (วัน)</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">ค่าปรับ</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">เครดิต</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">ผู้ตรวจ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returns.map((returnItem) => (
                      <tr key={returnItem.return_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {returnItem.profile_image ? (
                              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 mr-3">
                                <img 
                                  src={`http://localhost:5000${returnItem.profile_image}`} 
                                  alt={`${returnItem.first_name} ${returnItem.last_name}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-purple-100 flex items-center justify-center"><svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="bg-purple-100 rounded-full p-2 mr-3">
                                <FiUser className="w-4 h-4 text-purple-600" />
                              </div>
                            )}
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{returnItem.first_name} {returnItem.last_name}</div>
                              <div className="text-gray-500">{returnItem.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{returnItem.equipment_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">{returnItem.quantity_returned}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(returnItem.actual_return_date).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {returnItem.days_overdue > 0 ? (
                            <span className="text-red-600 font-semibold">{returnItem.days_overdue}</span>
                          ) : (
                            <span className="text-green-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {returnItem.total_penalty > 0 ? (
                            <span className="text-red-600 font-semibold">{returnItem.total_penalty}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-semibold ${
                            returnItem.net_credit_change > 0 ? 'text-green-600' :
                            returnItem.net_credit_change < 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {returnItem.net_credit_change > 0 ? '+' : ''}{returnItem.net_credit_change}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {returnItem.inspector_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedBorrowing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 max-h-[95vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6 text-white rounded-t-3xl flex-shrink-0 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">บันทึกการคืนอุปกรณ์</h2>
                <p className="text-green-100 mt-1">{selectedBorrowing.equipment_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedBorrowing(null);
                  setReturnData({
                    quantity_returned: 0,
                    actual_return_date: new Date().toISOString().split('T')[0],
                    notes: '',
                    damage_cost: 0,
                    damage_description: '',
                    additional_penalty: 0
                  });
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-all ml-4"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              {/* Info */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <span className="text-gray-600">ผู้ยืม:</span>
                    <div className="flex items-center mt-2">
                      {selectedBorrowing.profile_image ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-300 mr-3">
                          <img 
                            src={`http://localhost:5000${selectedBorrowing.profile_image}`} 
                            alt={`${selectedBorrowing.first_name} ${selectedBorrowing.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.parentElement.innerHTML = '<div class="w-full h-full bg-blue-200 flex items-center justify-center"><svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                          <FiUser className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <span className="font-medium text-base">{selectedBorrowing.first_name} {selectedBorrowing.last_name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">วันที่ยืม:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedBorrowing.borrow_date).toLocaleDateString('th-TH')}
                      {' เวลา '}
                      {new Date(selectedBorrowing.borrow_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">จำนวนที่ยืม:</span>
                    <span className="ml-2 font-medium">{selectedBorrowing.quantity_borrowed} ชิ้น</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ครบกำหนดคืน:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedBorrowing.expected_return_date).toLocaleDateString('th-TH')}
                      {' เวลา '}
                      {new Date(selectedBorrowing.expected_return_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                  </div>
                </div>
              </div>

              {/* Days Overdue Warning */}
              {(() => {
                const daysOverdue = getDaysOverdue(selectedBorrowing.expected_return_date);
                if (daysOverdue > 0) {
                  const penaltyPerDay = penaltyPerHour * 24; // คำนวณค่าปรับต่อวัน (24 ชั่วโมง)
                  return (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center">
                        <FiAlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                        <div>
                          <p className="text-red-800 font-medium">คืนช้า {daysOverdue} วัน</p>
                          <p className="text-red-600 text-sm">จะถูกหักค่าปรับ {daysOverdue * penaltyPerDay} เครดิต</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวนที่คืน (ชิ้น) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedBorrowing.quantity_remaining || 
                         (selectedBorrowing.quantity_borrowed - (selectedBorrowing.total_returned || 0))}
                    value={returnData.quantity_returned}
                    onChange={(e) => setReturnData({ ...returnData, quantity_returned: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    วันที่คืนจริง *
                  </label>
                  <input
                    type="date"
                    value={returnData.actual_return_date}
                    onChange={(e) => setReturnData({ ...returnData, actual_return_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หมายเหตุ
                  </label>
                  <textarea
                    rows="3"
                    value={returnData.notes}
                    onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                    placeholder="สภาพอุปกรณ์, ความเสียหาย (ถ้ามี)..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  ></textarea>
                </div>

                {/* ส่วนเพิ่มเติม: ความเสียหายและค่าปรับ */}
                <div className="border-t pt-6 mt-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                    <FiAlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                    ค่าปรับและความเสียหาย (ถ้ามี)
                  </h4>

                  {/* แสดงค่าปรับที่คำนวณได้ (คืนช้า) */}
                  {(() => {
                    const hoursOverdue = getHoursOverdue(selectedBorrowing.expected_return_date);
                    const latePenalty = hoursOverdue > 0 ? hoursOverdue * penaltyPerHour : 0;
                    
                    if (latePenalty > 0) {
                      return (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                          <h5 className="font-semibold text-red-800 mb-3 flex items-center">
                            <FiDollarSign className="w-5 h-5 mr-2" />
                            ค่าปรับคืนช้า: {latePenalty} เครดิต
                          </h5>
                          <p className="text-sm text-red-700">
                            คืนช้า {hoursOverdue} ชั่วโมง × {penaltyPerHour} เครดิต/ชม. = {latePenalty} เครดิต
                          </p>
                        </div>
                      );
                    }
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ค่าชำรุด (เครดิต)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={returnData.damage_cost || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // อนุญาตให้ใส่แค่ตัวเลขและจุดทศนิยม
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setReturnData({ ...returnData, damage_cost: value === '' ? 0 : parseFloat(value) || 0 });
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">สำหรับอุปกรณ์ที่ชำรุด</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ค่าปรับเพิ่มเติม (เครดิต)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={returnData.additional_penalty || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // อนุญาตให้ใส่แค่ตัวเลขและจุดทศนิยม
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setReturnData({ ...returnData, additional_penalty: value === '' ? 0 : parseFloat(value) || 0 });
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">ค่าปรับพิเศษอื่นๆ (ถ้ามี)</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        รายละเอียดความเสียหาย
                      </label>
                      <textarea
                        rows="2"
                        value={returnData.damage_description}
                        onChange={(e) => setReturnData({ ...returnData, damage_description: e.target.value })}
                        placeholder="ระบุรายละเอียดความเสียหาย (ถ้ามี)..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      ></textarea>
                    </div>
                  </div>

                  {/* แสดงค่าปรับเพิ่มเติมถ้ามี */}
                  {returnData.additional_penalty > 0 && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-orange-800 font-medium">ค่าปรับเพิ่มเติม:</span>
                        <span className="text-orange-800 font-semibold text-lg">{returnData.additional_penalty} เครดิต</span>
                      </div>
                    </div>
                  )}

                  {/* แจ้งเตือนถ้าคืนไม่ครบ */}
                  {returnData.quantity_returned > 0 && returnData.quantity_returned < (selectedBorrowing.quantity_remaining || 
                    (selectedBorrowing.quantity_borrowed - (selectedBorrowing.total_returned || 0))) && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center text-yellow-800">
                        <FiAlertTriangle className="w-5 h-5 mr-2" />
                        <span className="font-medium">คืนไม่ครบ (จะมีค่าปรับเพิ่มเติมในภายหลัง)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions - Sticky Footer */}
            <div className="flex space-x-4 p-6 border-t bg-white rounded-b-3xl flex-shrink-0">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedBorrowing(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReturn}
                disabled={!returnData.quantity_returned || returnData.quantity_returned <= 0 || submitLoading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span>{submitLoading ? 'กำลังบันทึก...' : 'บันทึกการคืน'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (for returned items) */}
      {selectedBorrowing && !showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-8 max-h-[95vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white rounded-t-3xl flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">รายละเอียดการคืนอุปกรณ์</h2>
                  <p className="text-blue-100 mt-1">{selectedBorrowing.equipment_name}</p>
                </div>
                <button
                  onClick={() => setSelectedBorrowing(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <FiXCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">ข้อมูลผู้ยืม</h3>
                  <div className="flex items-center mb-3">
                    {selectedBorrowing.profile_image ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-300 mr-3">
                        <img 
                          src={`http://localhost:5000${selectedBorrowing.profile_image}`} 
                          alt={`${selectedBorrowing.first_name} ${selectedBorrowing.last_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = '<div class="w-full h-full bg-blue-200 flex items-center justify-center"><svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                        <FiUser className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{selectedBorrowing.first_name} {selectedBorrowing.last_name}</div>
                      <div className="text-sm text-gray-600">{selectedBorrowing.email}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">ข้อมูลอุปกรณ์</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">ชื่ออุปกรณ์:</span> <span className="ml-2 font-medium">{selectedBorrowing.equipment_name}</span></div>
                    <div><span className="text-gray-600">จำนวน:</span> <span className="ml-2 font-medium">{selectedBorrowing.quantity_returned}/{selectedBorrowing.quantity_borrowed} ชิ้น</span></div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">วันที่</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">วันที่ยืม:</span> <span className="ml-2">{new Date(selectedBorrowing.borrow_date).toLocaleDateString('th-TH')} เวลา {new Date(selectedBorrowing.borrow_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span></div>
                    <div><span className="text-gray-600">ครบกำหนด:</span> <span className="ml-2">{new Date(selectedBorrowing.expected_return_date).toLocaleDateString('th-TH')} เวลา {new Date(selectedBorrowing.expected_return_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span></div>
                    {selectedBorrowing.actual_return_date && (
                      <div><span className="text-gray-600">วันที่คืน:</span> <span className="ml-2 font-medium text-green-600">{new Date(selectedBorrowing.actual_return_date).toLocaleDateString('th-TH')}</span></div>
                    )}
                  </div>
                </div>

                <div className="bg-orange-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">สถานะ</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <FiCheckCircle className="w-4 h-4 mr-1" />
                        {selectedBorrowing.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBorrowing.notes && (
                <div className="mt-6 bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">หมายเหตุ</h3>
                  <p className="text-sm text-gray-700">{selectedBorrowing.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentReturn;
