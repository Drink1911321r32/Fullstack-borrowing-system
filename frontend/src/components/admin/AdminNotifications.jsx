import React, { useState, useEffect } from 'react';
import { 
  FiBell, FiEye, FiFilter, FiSearch, FiRefreshCw, FiCheckCircle, FiClock,
  FiAlertTriangle, FiCalendar, FiPackage, FiCreditCard, FiInfo, FiX, FiUser
} from 'react-icons/fi';
import notificationService from '../../api/notificationService';
import { getDueSoonBorrowings, getOverdueBorrowings } from '../../api/cronService';
import { toast } from 'react-toastify';

const AdminNotifications = () => {
  const [allNotifications, setAllNotifications] = useState([]);
  const [dueSoonList, setDueSoonList] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [activeTab, setActiveTab] = useState('notifications'); // notifications, due-soon, overdue
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0
  });

  useEffect(() => {
    fetchAllNotifications();
    fetchDueSoonList();
    fetchOverdueList();
  }, [filterType, filterStatus]);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      
      const params = { limit: 100 };
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus === 'unread') params.is_read = 'false';
      if (filterStatus === 'read') params.is_read = 'true';
      
      const response = await notificationService.getAllNotifications(params);
      
      if (response.success) {
        setAllNotifications(response.data.notifications || []);
        setStats(response.data.stats || { total: 0, unread: 0 });
      }
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setAllNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDueSoonList = async () => {
    try {
      const response = await getDueSoonBorrowings();
      if (response.success) {
        setDueSoonList(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching due soon list:', error);
    }
  };

  const fetchOverdueList = async () => {
    try {
      const response = await getOverdueBorrowings();
      if (response.success) {
        setOverdueList(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching overdue list:', error);
    }
  };

  const refreshAll = () => {
    fetchAllNotifications();
    fetchDueSoonList();
    fetchOverdueList();
  };

  const getFilteredNotifications = () => {
    let filtered = allNotifications;
    
    if (searchQuery) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const filteredNotifications = getFilteredNotifications();
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'borrow_request':
      case 'borrow_approved':
      case 'borrow_rejected':
        return <FiPackage className="text-blue-500" />;
      case 'return_confirmed':
      case 'return_reminder':
        return <FiPackage className="text-green-500" />;
      case 'disbursement_request':
      case 'disbursement_approved':
        return <FiCreditCard className="text-purple-500" />;
      case 'credit':
        return <FiCreditCard className="text-yellow-500" />;
      case 'overdue':
        return <FiAlertTriangle className="text-red-500" />;
      default:
        return <FiBell className="text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <span className={`px-3 py-1 text-xs rounded-full border ${badges[priority] || badges.low}`}>
        {priority === 'urgent' && 'เร่งด่วน'}
        {priority === 'high' && 'สำคัญ'}
        {priority === 'medium' && 'ปานกลาง'}
        {priority === 'low' && 'ทั่วไป'}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const labels = {
      borrow_request: 'คำขอยืม',
      borrow_approved: 'อนุมัติการยืม',
      borrow_rejected: 'ปฏิเสธการยืม',
      return_confirmed: 'ยืนยันการคืน',
      return_reminder: 'แจ้งเตือนการคืน',
      disbursement_request: 'คำขอเบิก',
      disbursement_approved: 'อนุมัติการเบิก',
      credit: 'เครดิต',
      overdue: 'เกินกำหนด'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetail = (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedNotification(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6 border border-purple-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <FiBell className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  จัดการการแจ้งเตือน
                </h1>
                <p className="text-gray-600 mt-1">
                  ดูและจัดการการแจ้งเตือนทั้งหมดในระบบ
                </p>
              </div>
            </div>
            <button
              onClick={refreshAll}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              รีเฟรช
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6 mt-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiBell className="inline mr-2" />
                การแจ้งเตือน
                {stats.unread > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs">
                    {stats.unread}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('due-soon')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'due-soon'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiClock className="inline mr-2" />
                ใกล้ครบกำหนด
                {dueSoonList.length > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full text-xs">
                    {dueSoonList.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('overdue')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overdue'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiAlertTriangle className="inline mr-2" />
                เกินกำหนด
                {overdueList.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs">
                    {overdueList.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">การแจ้งเตือนทั้งหมด</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <FiBell className="text-5xl text-blue-200 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm mb-1">ยังไม่ได้อ่าน</p>
                  <p className="text-3xl font-bold">{stats.unread}</p>
                </div>
                <FiAlertTriangle className="text-5xl text-orange-200 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">วันนี้</p>
                  <p className="text-3xl font-bold">{stats.today}</p>
                </div>
                <FiCalendar className="text-5xl text-green-200 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab: Notifications */}
        {activeTab === 'notifications' && (
          <>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-purple-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiSearch className="inline mr-2" />
                ค้นหา
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อหรือข้อความ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiFilter className="inline mr-2" />
                ประเภท
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">ทั้งหมด</option>
                <optgroup label="การยืม">
                  <option value="borrow_request">คำขอยืม</option>
                  <option value="borrow_approved">อนุมัติการยืม</option>
                  <option value="borrow_rejected">ปฏิเสธการยืม</option>
                </optgroup>
                <optgroup label="การคืน">
                  <option value="return_confirmed">ยืนยันการคืน</option>
                  <option value="return_reminder">แจ้งเตือนการคืน</option>
                </optgroup>
                <optgroup label="การเบิก">
                  <option value="disbursement_request">คำขอเบิก</option>
                  <option value="disbursement_approved">อนุมัติการเบิก</option>
                </optgroup>
                <option value="credit">เครดิต</option>
                <option value="overdue">เกินกำหนด</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiEye className="inline mr-2" />
                สถานะ
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">ทั้งหมด</option>
                <option value="unread">ยังไม่อ่าน</option>
                <option value="read">อ่านแล้ว</option>
              </select>
            </div>
            </div>
          </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="text-center py-20">
              <FiBell className="mx-auto text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                ไม่พบการแจ้งเตือน
              </h3>
              <p className="text-gray-500">
                ไม่มีการแจ้งเตือนที่ตรงกับเงื่อนไขที่เลือก
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        ประเภท
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        ชื่อเรื่อง / ข้อความ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        ระดับความสำคัญ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        วันที่สร้าง
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        การกระทำ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedNotifications.map((notification) => (
                      <tr 
                        key={notification.notification_id}
                        className={`hover:bg-purple-50/50 transition-colors ${
                          !notification.is_read ? 'bg-purple-50/30' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getNotificationIcon(notification.type)}
                            <span className="text-sm font-medium capitalize text-gray-700">
                              {getTypeLabel(notification.type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <p className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getPriorityBadge(notification.priority)}
                        </td>
                        <td className="px-6 py-4">
                          {notification.is_read ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                              <FiCheckCircle className="inline mr-1" />
                              อ่านแล้ว
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-xs font-medium">
                              <FiClock className="inline mr-1" />
                              ยังไม่อ่าน
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(notification.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetail(notification)}
                              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                              title="ดูรายละเอียด"
                            >
                              <FiEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} จาก {filteredNotifications.length} รายการ
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ก่อนหน้า
                    </button>
                    <div className="flex gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                            currentPage === i + 1
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </>
        )}

        {/* Tab: Due Soon */}
        {activeTab === 'due-soon' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiClock className="text-yellow-600" />
                รายการใกล้ครบกำหนด ({dueSoonList.length})
              </h2>
              {dueSoonList.length === 0 ? (
                <div className="text-center py-12">
                  <FiCheckCircle className="mx-auto text-6xl text-gray-300 mb-4" />
                  <p className="text-gray-600">ไม่มีรายการที่ใกล้ครบกำหนด</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ยืม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อุปกรณ์</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่ยืม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ครบกำหนด</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เหลือเวลา</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dueSoonList.map((item) => (
                        <tr key={item.transaction_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiUser className="text-gray-400 mr-2" />
                              <span className="font-medium text-gray-900">{item.user_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <FiPackage className="text-blue-500 mr-2" />
                              <span className="text-gray-900">{item.equipment_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(item.borrow_date).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {new Date(item.expected_return_date).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              item.days_remaining === 0 
                                ? 'bg-red-100 text-red-800' 
                                : item.days_remaining === 1
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.days_remaining} วัน
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Overdue */}
        {activeTab === 'overdue' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiAlertTriangle className="text-red-600" />
                รายการเกินกำหนด ({overdueList.length})
              </h2>
              {overdueList.length === 0 ? (
                <div className="text-center py-12">
                  <FiCheckCircle className="mx-auto text-6xl text-gray-300 mb-4" />
                  <p className="text-gray-600">ไม่มีรายการที่เกินกำหนด</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ยืม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อุปกรณ์</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่ยืม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ครบกำหนด</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เกินมาแล้ว</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {overdueList.map((item) => (
                        <tr key={item.transaction_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiUser className="text-gray-400 mr-2" />
                              <span className="font-medium text-gray-900">{item.user_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <FiPackage className="text-blue-500 mr-2" />
                              <span className="text-gray-900">{item.equipment_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(item.borrow_date).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {new Date(item.expected_return_date).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                              {item.days_overdue} วัน
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl transform transition-all">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  <h3 className="text-xl font-bold text-white">รายละเอียดการแจ้งเตือน</h3>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Type & Priority */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {getNotificationIcon(selectedNotification.type)}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ประเภท</p>
                      <p className="font-semibold text-gray-900">
                        {getTypeLabel(selectedNotification.type)}
                      </p>
                    </div>
                  </div>
                  <div>
                    {getPriorityBadge(selectedNotification.priority)}
                  </div>
                </div>

                {/* Title */}
                <div className="mb-6">
                  <div className="flex items-start gap-2 mb-2">
                    <FiInfo className="text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">หัวข้อ</p>
                      <h4 className="text-lg font-bold text-gray-900">
                        {selectedNotification.title}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <div className="flex items-start gap-2">
                    <FiBell className="text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2">ข้อความ</p>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedNotification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                {selectedNotification.user_id && (
                  <div className="mb-6">
                    <div className="flex items-start gap-2">
                      <FiUser className="text-purple-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">ผู้รับ</p>
                        <p className="text-sm text-gray-700">User ID: {selectedNotification.user_id}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date & Status */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">วันที่สร้าง</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(selectedNotification.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className="text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">สถานะ</p>
                      {selectedNotification.is_read ? (
                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                          <FiCheckCircle className="mr-1" />
                          อ่านแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-xs font-medium">
                          <FiClock className="mr-1" />
                          ยังไม่อ่าน
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action URL */}
                {selectedNotification.action_url && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs text-purple-600 font-semibold mb-2">ลิงก์ที่เกี่ยวข้อง</p>
                    <a
                      href={selectedNotification.action_url}
                      className="text-purple-600 hover:text-purple-800 text-sm break-all underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selectedNotification.action_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-end gap-3">
                {selectedNotification.action_url && (
                  <button
                    onClick={() => window.location.href = selectedNotification.action_url}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    ไปที่หน้าที่เกี่ยวข้อง
                  </button>
                )}
                <button
                  onClick={closeDetailModal}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;