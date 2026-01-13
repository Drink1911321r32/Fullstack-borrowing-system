import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiClock,
  FiFilter, FiSearch, FiRefreshCw, FiDownload, FiEye, FiEdit3,
  FiAlertTriangle, FiMessageCircle, FiPhone, FiMail, FiMapPin,
  FiTrendingUp, FiTrendingDown, FiActivity, FiUsers, FiInfo, FiX
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useNotification } from '../../contexts/NotificationContext';
import borrowingService from '../../api/borrowingService';

const BorrowingManagement = () => {
  const { notifyBorrowingApproved, notifyBorrowingRejected, notifyBorrowingReturned } = useNotification();
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectBorrowing, setRejectBorrowing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonType, setRejectReasonType] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveBorrowing, setApproveBorrowing] = useState(null);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // ฟังก์ชันสำหรับจัดรูปแบบวันที่และเวลา
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateTimeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH');
    } catch (e) {
      return dateString;
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const response = await borrowingService.getAllBorrowings();
      const data = response.data || response;
      
      setBorrowings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching borrowings:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการยืมได้');
      setBorrowings([]);
    } finally {
      setLoading(false);
    }
  };

  // ดึงรายชื่อประเภทอุปกรณ์ที่ไม่ซ้ำกัน
  const getEquipmentTypes = () => {
    const types = new Set();
    borrowings.forEach(borrowing => {
      if (borrowing.type_name) {
        types.add(borrowing.type_name);
      }
    });
    return Array.from(types).sort();
  };

  // กรองการยืม
  const getFilteredBorrowings = () => {
    let filtered = borrowings;
    
    if (searchQuery) {
      filtered = filtered.filter(borrowing => {
        const userName = `${borrowing.first_name || ''} ${borrowing.last_name || ''}`.toLowerCase();
        const email = (borrowing.email || '').toLowerCase();
        const equipmentName = (borrowing.equipment_name || '').toLowerCase();
        const model = (borrowing.model || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        
        return userName.includes(query) || 
               email.includes(query) || 
               equipmentName.includes(query) || 
               model.includes(query);
      });
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(borrowing => {
        const currentStatus = borrowing.display_status || borrowing.status;
        
        // สำหรับสถานะเกินกำหนด
        if (filterStatus === 'overdue') {
          if (currentStatus !== 'Approved' && currentStatus !== 'Borrowed') return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expectedDate = new Date(borrowing.expected_return_date);
          expectedDate.setHours(0, 0, 0, 0);
          return today > expectedDate && (borrowing.quantity_remaining || 0) > 0;
        }
        
        // กรองตามสถานะจากฐานข้อมูลโดยตรง
        return currentStatus === filterStatus;
      });
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(borrowing => borrowing.type_name === filterType);
    }
    
    if (filterDate !== 'all') {
      const now = new Date();
      const filterDate_ms = {
        'today': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000
      };
      
      if (filterDate_ms[filterDate]) {
        filtered = filtered.filter(borrowing => {
          const borrowDate = new Date(borrowing.borrow_date);
          return (now - borrowDate) <= filterDate_ms[filterDate];
        });
      }
    }
    
    return filtered.sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));
  };

  // Pagination
  const filteredBorrowings = getFilteredBorrowings();
  const totalPages = Math.ceil(filteredBorrowings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBorrowings = filteredBorrowings.slice(startIndex, startIndex + itemsPerPage);

  // ข้อมูลสถานะ
  const getStatusInfo = (status) => {
    const statusMap = {
      'Pending': { 
        text: 'รอการอนุมัติ', 
        color: 'yellow', 
        icon: FiClock,
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800'
      },
      'Approved': { 
        text: 'อนุมัติแล้ว', 
        color: 'green', 
        icon: FiCheckCircle,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      },
      'Borrowed': { 
        text: 'กำลังยืม', 
        color: 'blue', 
        icon: FiClock,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      'Returned': { 
        text: 'คืนแล้ว', 
        color: 'green', 
        icon: FiCheckCircle,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      },
      'Completed': { 
        text: 'คืนครบแล้ว', 
        color: 'green', 
        icon: FiCheckCircle,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      },
      'Cancelled': { 
        text: 'ยกเลิก', 
        color: 'gray', 
        icon: FiXCircle,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800'
      },
      'Overdue': { 
        text: 'เกินกำหนด', 
        color: 'red', 
        icon: FiXCircle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      },
      'borrowed': { 
        text: 'กำลังยืม', 
        color: 'blue', 
        icon: FiClock,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      'returned': { 
        text: 'คืนแล้ว', 
        color: 'green', 
        icon: FiCheckCircle,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      },
      'returned_late': { 
        text: 'คืนล่าช้า', 
        color: 'orange', 
        icon: FiAlertTriangle,
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800'
      },
      'overdue': { 
        text: 'เกินกำหนด', 
        color: 'red', 
        icon: FiXCircle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      },
      'pending_return': { 
        text: 'รอคืน', 
        color: 'yellow', 
        icon: FiClock,
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800'
      }
    };
    return statusMap[status] || statusMap['borrowed'];
  };

  // การดำเนินการ
  const handleApprove = (borrowing) => {
    setApproveBorrowing(borrowing);
    setIsApproveModalOpen(true);
  };

  const submitApprove = async () => {
    if (!approveBorrowing) return;
    
    try {
      setIsSubmittingApprove(true);
      const id = approveBorrowing.transaction_id || approveBorrowing.borrowing_id || approveBorrowing.id;
      
      const response = await borrowingService.approveBorrowing(id);
      
      if (response && response.success) {
        const creditMsg = response.data?.creditDeducted 
          ? ` (หักเครดิต ${response.data.creditDeducted} เครดิต, เหลือ ${response.data.remainingCredit} เครดิต)`
          : '';
        toast.success(`อนุมัติการยืมสำเร็จ${creditMsg}`);
        setIsApproveModalOpen(false);
        setApproveBorrowing(null);
        fetchBorrowings();
      }
    } catch (error) {
      console.error('Error approving borrowing:', error);
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการอนุมัติการยืม';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleReject = (borrowing) => {
    setRejectBorrowing(borrowing);
    setRejectReason('');
    setRejectReasonType('');
    setIsRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (!rejectReasonType || !rejectReason.trim()) {
      toast.warning('กรุณาเลือกประเภทและระบุเหตุผลในการปฏิเสธ');
      return;
    }

    try {
      setIsSubmittingReject(true);
      const id = rejectBorrowing.transaction_id || rejectBorrowing.borrowing_id || rejectBorrowing.id;
      const fullReason = `[${rejectReasonType}] ${rejectReason}`;
      const response = await borrowingService.rejectBorrowing(id, fullReason);
      
      if (response && response.success) {
        toast.success('ปฏิเสธการยืมสำเร็จ');
        setIsRejectModalOpen(false);
        setRejectBorrowing(null);
        setRejectReason('');
        setRejectReasonType('');
        fetchBorrowings();
      }
    } catch (error) {
      console.error('Error rejecting borrowing:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธการยืม');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleReturnEquipment = async (borrowingId) => {
    try {
      await borrowingService.returnEquipment(borrowingId);
      toast.success('บันทึกการคืนอุปกรณ์สำเร็จ');
      fetchBorrowings(); // รีเฟรชข้อมูล
    } catch (error) {
      console.error('Error returning equipment:', error);
      toast.error('ไม่สามารถบันทึกการคืนอุปกรณ์ได้');
    }
  };

  const handleSendReminder = async (borrowingId) => {
    try {
      // API call to send reminder
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  // สถิติ
  const getStats = () => {
    const total = borrowings.length;
    
    // กำลังยืม: status เป็น Approved หรือ Borrowed และยังคืนไม่ครบ
    const active = borrowings.filter(b => {
      const currentStatus = b.display_status || b.status;
      const isActive = currentStatus === 'Borrowed' || currentStatus === 'Approved';
      const hasRemaining = (b.quantity_remaining || 0) > 0;
      return isActive && hasRemaining;
    }).length;
    
    // เกินกำหนด: กำลังยืมอยู่ และเกินวันกำหนดคืน
    const overdue = borrowings.filter(b => {
      const currentStatus = b.display_status || b.status;
      if (currentStatus !== 'Approved' && currentStatus !== 'Borrowed') return false;
      if ((b.quantity_remaining || 0) <= 0) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expectedDate = new Date(b.expected_return_date);
      expectedDate.setHours(0, 0, 0, 0);
      return today > expectedDate;
    }).length;
    
    // คืนแล้ว: status เป็น Completed หรือ Returned หรือ คืนครบแล้ว
    const returned = borrowings.filter(b => {
      const currentStatus = b.display_status || b.status;
      return currentStatus === 'Returned' || 
             currentStatus === 'Completed' || 
             b.is_returned === 1 ||
             (b.quantity_borrowed > 0 && b.quantity_borrowed === (b.total_returned || 0));
    }).length;
    
    return { total, active, overdue, returned };
  };

  const stats = getStats();

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiPackage className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">จัดการการยืม-คืน</h1>
                  <p className="text-blue-100 mt-1 font-medium">ติดตามและจัดการการยืมอุปกรณ์ทั้งหมด</p>
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
                <button
                  onClick={fetchBorrowings}
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
                <p className="text-sm font-medium text-gray-600">ทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-xl">
                <FiPackage className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

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
                <p className="text-sm font-medium text-gray-600">คืนแล้ว</p>
                <p className="text-3xl font-bold text-green-600">{stats.returned}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <FiCheckCircle className="w-8 h-8 text-green-600" />
              </div>
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
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-80"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="กรองตามสถานะ"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="Approved">กำลังยืม</option>
                  <option value="Completed">คืนแล้ว</option>
                  <option value="Cancelled">ยกเลิก</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="กรองตามประเภทอุปกรณ์"
                >
                  <option value="all">ทุกประเภท</option>
                  {getEquipmentTypes().map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="กรองตามช่วงเวลา"
                >
                  <option value="all">ทุกช่วงเวลา</option>
                  <option value="today">วันนี้</option>
                  <option value="week">สัปดาห์นี้</option>
                  <option value="month">เดือนนี้</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                แสดง {currentBorrowings.length} จาก {filteredBorrowings.length} รายการ
              </div>
            </div>
          </div>
        </div>

        {/* Borrowings List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : currentBorrowings.length === 0 ? (
            <div className="p-20 text-center">
              <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">ไม่พบข้อมูลการยืม</p>
            </div>
          ) : (
            <div className="space-y-0">
              {currentBorrowings.map((borrowing) => {
                // ใช้ display_status จาก backend หรือ fallback เป็น status ปกติ
                const currentStatus = borrowing.display_status || borrowing.status;
                const statusInfo = getStatusInfo(currentStatus);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={borrowing.transaction_id} className="border-b border-gray-100 last:border-b-0 p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          {/* แสดงรูปภาพอุปกรณ์ */}
                          {borrowing.image_path ? (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0">
                              <img 
                                src={`http://localhost:5000${borrowing.image_path}`} 
                                alt={borrowing.equipment_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FiPackage className="w-8 h-8 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{borrowing.equipment_name}</h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                <StatusIcon className="w-4 h-4 mr-1" />
                                {statusInfo.text}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <p className="flex items-center mb-1">
                                  <FiUser className="w-4 h-4 mr-2" />
                                  <span className="font-medium">{borrowing.first_name} {borrowing.last_name}</span>
                                </p>
                                <p className="flex items-center mb-1">
                                  <FiMail className="w-4 h-4 mr-2" />
                                  {borrowing.email}
                                </p>
                                {borrowing.model && (
                                  <p className="flex items-center">
                                    <FiPackage className="w-4 h-4 mr-2" />
                                    รุ่น: {borrowing.model}
                                  </p>
                                )}
                                
                                {/* แสดงจำนวนที่ยืมและคืน */}
                                <div className="mt-2 space-y-1">
                                  <p className="flex items-center">
                                    <FiPackage className="w-4 h-4 mr-2 text-blue-600" />
                                    <span>ยืม: <span className="font-semibold text-blue-700">{borrowing.quantity_borrowed}</span> ชิ้น</span>
                                  </p>
                                  {borrowing.current_stock !== undefined && (
                                    <p className="flex items-center">
                                      <FiPackage className="w-4 h-4 mr-2 text-purple-600" />
                                      <span>สต็อคปัจจุบัน: <span className="font-semibold text-purple-700">{borrowing.current_stock}</span> ชิ้น</span>
                                    </p>
                                  )}
                                  {(borrowing.total_returned > 0 || borrowing.status === 'Completed' || borrowing.status === 'returned') && (
                                    <>
                                      <p className="flex items-center">
                                        <FiCheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        <span>คืนแล้ว: <span className="font-semibold text-green-700">{borrowing.total_returned || 0}</span> ชิ้น</span>
                                      </p>
                                      {borrowing.quantity_remaining > 0 && (
                                        <p className="flex items-center">
                                          <FiClock className="w-4 h-4 mr-2 text-orange-600" />
                                          <span>ต้องคืน: <span className="font-semibold text-orange-700">{borrowing.quantity_remaining}</span> ชิ้น</span>
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="flex items-center mb-1">
                                  <FiCalendar className="w-4 h-4 mr-2" />
                                  ยืม: {formatDateTime(borrowing.borrow_datetime || borrowing.borrow_date)}
                                </p>
                                <p className="flex items-center mb-1">
                                  <FiClock className="w-4 h-4 mr-2" />
                                  ครบกำหนด: {formatDate(borrowing.expected_return_date)}
                                </p>
                                {borrowing.actual_return_date && (
                                  <p className="flex items-center">
                                    <FiCheckCircle className="w-4 h-4 mr-2" />
                                    คืนแล้ว: {formatDateTime(borrowing.actual_return_date)}
                                  </p>
                                )}
                                {borrowing.created_datetime && (
                                  <p className="flex items-center text-xs text-gray-500 mt-2">
                                    <FiClock className="w-3 h-3 mr-1" />
                                    สร้างคำขอ: {formatDateTime(borrowing.created_datetime)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {borrowing.purpose && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">วัตถุประสงค์:</span> {borrowing.purpose}
                                </p>
                                {borrowing.notes && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">หมายเหตุ:</span> {borrowing.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedBorrowing(borrowing)}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <FiEye className="w-4 h-4" />
                          <span>ดูรายละเอียด</span>
                        </button>
                        
                        {borrowing.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(borrowing)}
                              className="px-4 py-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              onClick={() => handleReject(borrowing)}
                              className="px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <FiXCircle className="w-4 h-4" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </>
                        )}
                        
                        {(borrowing.status === 'Borrowed' || borrowing.status === 'borrowed') && (
                          <button
                            onClick={() => handleReturnEquipment(borrowing.transaction_id)}
                            className="px-4 py-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <FiCheckCircle className="w-4 h-4" />
                            <span>บันทึกการคืน</span>
                          </button>
                        )}
                        
                        {(borrowing.status === 'borrowed' || borrowing.status === 'overdue') && (
                          <button
                            onClick={() => handleSendReminder(borrowing.id)}
                            className="px-4 py-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <FiMessageCircle className="w-4 h-4" />
                            <span>ส่งเตือน</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  แสดง {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredBorrowings.length)} จาก {filteredBorrowings.length} รายการ
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBorrowing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FiPackage className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">รายละเอียดการยืม</h2>
                  <p className="text-blue-100 text-sm">{selectedBorrowing.equipment_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  selectedBorrowing.status === 'Pending' ? 'bg-yellow-400 text-yellow-900' :
                  selectedBorrowing.status === 'Approved' ? 'bg-green-400 text-green-900' :
                  selectedBorrowing.status === 'Borrowed' ? 'bg-blue-400 text-blue-900' :
                  (selectedBorrowing.status === 'Returned' || selectedBorrowing.status === 'Completed' || selectedBorrowing.is_returned === 1) ? 'bg-gray-400 text-gray-900' :
                  'bg-red-400 text-red-900'
                }`}>
                  {selectedBorrowing.status}
                </span>
                <button
                  onClick={() => setSelectedBorrowing(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content - Horizontal Layout */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Row 1: User & Equipment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* User Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center mb-3">
                    <FiUser className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">ข้อมูลผู้ยืม</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-sm">ชื่อ-นามสกุล</span>
                      <p className="text-gray-900 font-semibold">{selectedBorrowing.first_name} {selectedBorrowing.last_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">อีเมล</span>
                      <p className="text-gray-900">{selectedBorrowing.email}</p>
                    </div>
                  </div>
                </div>

                {/* Equipment Info */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center mb-3">
                    <FiPackage className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">ข้อมูลอุปกรณ์</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-sm">ชื่ออุปกรณ์</span>
                      <p className="text-gray-900 font-semibold">{selectedBorrowing.equipment_name}</p>
                    </div>
                    {selectedBorrowing.model && (
                      <div>
                        <span className="text-gray-600 text-sm">รุ่น</span>
                        <p className="text-gray-900">{selectedBorrowing.model}</p>
                      </div>
                    )}
                    {selectedBorrowing.type_name && (
                      <div>
                        <span className="text-gray-600 text-sm">ประเภท</span>
                        <p className="text-gray-900">{selectedBorrowing.type_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Quantity Info */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200 mb-6">
                <div className="flex items-center mb-3">
                  <FiActivity className="w-5 h-5 text-cyan-600 mr-2" />
                  <h3 className="text-lg font-bold text-gray-800">ข้อมูลจำนวนและสต็อค</h3>
                </div>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <FiPackage className="w-5 h-5 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-600">{selectedBorrowing.quantity_borrowed}</span>
                    </div>
                    <span className="text-gray-600 text-sm">ยืมทั้งหมด</span>
                  </div>
                  {(selectedBorrowing.total_returned > 0 || selectedBorrowing.status === 'Completed' || selectedBorrowing.status === 'returned') && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <FiCheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-600">{selectedBorrowing.total_returned || 0}</span>
                      </div>
                      <span className="text-gray-600 text-sm">คืนแล้ว</span>
                    </div>
                  )}
                  {selectedBorrowing.quantity_remaining > 0 && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <FiClock className="w-5 h-5 text-orange-600" />
                        <span className="text-2xl font-bold text-orange-600">{selectedBorrowing.quantity_remaining}</span>
                      </div>
                      <span className="text-gray-600 text-sm">ต้องคืน</span>
                    </div>
                  )}
                  {selectedBorrowing.current_stock !== undefined && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <FiPackage className="w-5 h-5 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-600">{selectedBorrowing.current_stock}</span>
                      </div>
                      <span className="text-gray-600 text-sm">สต็อคปัจจุบัน</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Date & Approval Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Date Info */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center mb-3">
                    <FiCalendar className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">ข้อมูลวันที่และเวลา</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-sm">สร้างคำขอ</span>
                      <p className="text-gray-900 font-semibold">{formatDateTime(selectedBorrowing.created_datetime || selectedBorrowing.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">วันที่ยืม</span>
                      <p className="text-gray-900 font-semibold">{formatDateTime(selectedBorrowing.borrow_datetime || selectedBorrowing.borrow_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">ครบกำหนด</span>
                      <p className="text-gray-900 font-semibold">{formatDate(selectedBorrowing.expected_return_date)}</p>
                    </div>
                    {selectedBorrowing.actual_return_date && (
                      <div>
                        <span className="text-gray-600 text-sm">วันที่คืน</span>
                        <p className="text-gray-900 font-semibold">{formatDateTime(selectedBorrowing.actual_return_date)}</p>
                      </div>
                    )}
                    {selectedBorrowing.location && (
                      <div>
                        <span className="text-gray-600 text-sm">สถานที่</span>
                        <p className="text-gray-900 font-semibold">{selectedBorrowing.location}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Info */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200">
                  <div className="flex items-center mb-3">
                    <FiCheckCircle className="w-5 h-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">ข้อมูลการอนุมัติ</h3>
                  </div>
                  {selectedBorrowing.approver_first_name ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600 text-sm">ผู้อนุมัติ</span>
                        <p className="text-gray-900 font-semibold">{selectedBorrowing.approver_first_name} {selectedBorrowing.approver_last_name}</p>
                      </div>
                      {selectedBorrowing.approval_datetime && (
                        <div>
                          <span className="text-gray-600 text-sm">วันที่อนุมัติ</span>
                          <p className="text-gray-900 font-semibold">{formatDateTime(selectedBorrowing.approval_datetime || selectedBorrowing.approval_date)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic py-2">รอการอนุมัติ</div>
                  )}
                </div>
              </div>

              {/* Row 4: Additional Details */}
              {(selectedBorrowing.purpose || selectedBorrowing.notes) && (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <FiMessageCircle className="w-5 h-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">รายละเอียดเพิ่มเติม</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedBorrowing.purpose && (
                      <div>
                        <span className="text-gray-600 text-sm block mb-1">วัตถุประสงค์</span>
                        <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">{selectedBorrowing.purpose}</p>
                      </div>
                    )}
                    {selectedBorrowing.notes && (
                      <div>
                        <span className="text-gray-600 text-sm block mb-1">หมายเหตุ</span>
                        <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">{selectedBorrowing.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {isApproveModalOpen && approveBorrowing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                    <FiCheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">ยืนยันการอนุมัติ</h2>
                    <p className="text-green-100 mt-1">กรุณาตรวจสอบข้อมูลก่อนอนุมัติ</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsApproveModalOpen(false)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all duration-200"
                  disabled={isSubmittingApprove}
                >
                  <FiX className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Borrowing Info */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">ข้อมูลคำขอยืม</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">ผู้ยืม</span>
                    <p className="text-gray-900 font-semibold">{approveBorrowing.first_name} {approveBorrowing.last_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">อีเมล</span>
                    <p className="text-gray-900">{approveBorrowing.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">อุปกรณ์</span>
                    <p className="text-gray-900 font-semibold">{approveBorrowing.equipment_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">จำนวนที่ยืม</span>
                    <p className="font-semibold text-blue-600">{approveBorrowing.quantity_borrowed} ชิ้น</p>
                  </div>
                  {approveBorrowing.current_stock !== undefined && (
                    <div>
                      <span className="text-gray-600 text-sm">สต็อคปัจจุบัน</span>
                      <p className="font-semibold text-purple-600">{approveBorrowing.current_stock} ชิ้น</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 text-sm">วันที่ยืม</span>
                    <p className="text-gray-900 font-semibold">{formatDate(approveBorrowing.borrow_date)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600 text-sm">ครบกำหนดคืน</span>
                    <p className="text-gray-900 font-semibold">{formatDate(approveBorrowing.expected_return_date)}</p>
                  </div>
                  {approveBorrowing.purpose && (
                    <div className="col-span-2">
                      <span className="text-gray-600 text-sm">วัตถุประสงค์</span>
                      <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200 mt-1">{approveBorrowing.purpose}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <FiInfo className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">การดำเนินการ</h4>
                    <ul className="text-xs text-green-700 mt-1 space-y-1">
                      <li>• ระบบจะหักเครดิตของผู้ยืมตามจำนวนอุปกรณ์</li>
                      <li>• จำนวนอุปกรณ์ในคลังจะลดลงตามจำนวนที่ยืม</li>
                      <li>• ผู้ยืมจะได้รับการแจ้งเตือนทันที</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">ข้อควรระวัง</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      การอนุมัติไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3 border-t">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                disabled={isSubmittingApprove}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitApprove}
                disabled={isSubmittingApprove}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmittingApprove ? (
                  <>
                    <FiClock className="w-4 h-4 animate-spin" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span>ยืนยันการอนุมัติ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && rejectBorrowing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                    <FiXCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">ปฏิเสธคำขอยืม</h2>
                    <p className="text-red-100 mt-1">กรุณาระบุเหตุผลในการปฏิเสธอย่างชัดเจน</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all duration-200"
                  disabled={isSubmittingReject}
                >
                  <FiX className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Borrowing Info */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">ข้อมูลคำขอยืม</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">ผู้ยืม</span>
                    <p className="text-gray-900 font-semibold">{rejectBorrowing.first_name} {rejectBorrowing.last_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">อุปกรณ์</span>
                    <p className="text-gray-900 font-semibold">{rejectBorrowing.equipment_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">จำนวน</span>
                    <p className="text-gray-900 font-semibold">{rejectBorrowing.quantity_borrowed} ชิ้น</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">วันที่ยืม</span>
                    <p className="text-gray-900 font-semibold">{new Date(rejectBorrowing.borrow_date).toLocaleDateString('th-TH')}</p>
                  </div>
                </div>
              </div>

              {/* Reason Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <span className="text-red-500">*</span> เหตุผลในการปฏิเสธ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'ไม่มีอุปกรณ์', icon: FiPackage, color: 'blue' },
                    { value: 'อุปกรณ์ชำรุด', icon: FiAlertTriangle, color: 'orange' },
                    { value: 'ข้อมูลไม่ครบถ้วน', icon: FiEdit3, color: 'purple' },
                    { value: 'เหตุผลอื่นๆ', icon: FiMessageCircle, color: 'gray' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setRejectReasonType(type.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        rejectReasonType === type.value
                          ? `border-${type.color}-500 bg-${type.color}-50 shadow-lg scale-105`
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                      }`}
                    >
                      <type.icon className={`w-6 h-6 mx-auto mb-2 ${
                        rejectReasonType === type.value ? `text-${type.color}-600` : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        rejectReasonType === type.value ? `text-${type.color}-700` : 'text-gray-600'
                      }`}>
                        {type.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Details */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="text-red-500">*</span> รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="กรุณาระบุรายละเอียดเหตุผลในการปฏิเสธอย่างชัดเจน..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 resize-none"
                  disabled={isSubmittingReject}
                />
                <p className="text-xs text-gray-500 mt-2">
                  เหตุผลนี้จะถูกส่งให้ผู้ยืมทราบ กรุณาให้รายละเอียดที่เป็นประโยชน์
                </p>
              </div>

              {/* Suggested Reasons (Optional) */}
              {rejectReasonType && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <FiInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">ตัวอย่างข้อความ:</h4>
                      <div className="space-y-2">
                        {rejectReasonType === 'ไม่มีอุปกรณ์' && (
                          <>
                            <button
                              onClick={() => setRejectReason('อุปกรณ์ถูกยืมหมดแล้ว กรุณายืมในวันที่อื่น')}
                              className="text-xs text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-all block w-full text-left"
                            >
                              • อุปกรณ์ถูกยืมหมดแล้ว กรุณายืมในวันที่อื่น
                            </button>
                            <button
                              onClick={() => setRejectReason('ขณะนี้อุปกรณ์ไม่เพียงพอ กรุณาลดจำนวนหรือติดต่อเจ้าหน้าที่')}
                              className="text-xs text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-all block w-full text-left"
                            >
                              • ขณะนี้อุปกรณ์ไม่เพียงพอ กรุณาลดจำนวนหรือติดต่อเจ้าหน้าที่
                            </button>
                          </>
                        )}
                        {rejectReasonType === 'อุปกรณ์ชำรุด' && (
                          <>
                            <button
                              onClick={() => setRejectReason('อุปกรณ์อยู่ระหว่างซ่อมบำรุง กรุณายืมภายหลัง')}
                              className="text-xs text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-all block w-full text-left"
                            >
                              • อุปกรณ์อยู่ระหว่างซ่อมบำรุง กรุณายืมภายหลัง
                            </button>
                            <button
                              onClick={() => setRejectReason('อุปกรณ์มีปัญหาทางเทคนิค ขณะนี้ไม่สามารถให้ยืมได้')}
                              className="text-xs text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-all block w-full text-left"
                            >
                              • อุปกรณ์มีปัญหาทางเทคนิค ขณะนี้ไม่สามารถให้ยืมได้
                            </button>
                          </>
                        )}
                        {rejectReasonType === 'ข้อมูลไม่ครบถ้วน' && (
                          <>
                            <button
                              onClick={() => setRejectReason('กรุณาระบุวัตถุประสงค์การใช้งานให้ชัดเจน')}
                              className="text-xs text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-all block w-full text-left"
                            >
                              • กรุณาระบุวัตถุประสงค์การใช้งานให้ชัดเจน
                            </button>
                            <button
                              onClick={() => setRejectReason('ช่วงเวลายืมไม่เหมาะสม กรุณาปรับช่วงเวลา')}
                              className="text-xs text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-all block w-full text-left"
                            >
                              • ช่วงเวลายืมไม่เหมาะสม กรุณาปรับช่วงเวลา
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <FiAlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">ข้อควรระวัง</h4>
                    <p className="text-xs text-red-700 mt-1">
                      การปฏิเสธคำขอนี้ไม่สามารถยกเลิกได้ และผู้ยืมจะได้รับการแจ้งเตือนทันที
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3 border-t">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                disabled={isSubmittingReject}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReasonType || !rejectReason.trim() || isSubmittingReject}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmittingReject ? (
                  <>
                    <FiClock className="w-4 h-4 animate-spin" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="w-4 h-4" />
                    <span>ยืนยันปฏิเสธ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowingManagement;
