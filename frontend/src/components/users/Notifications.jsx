import React, { useState, useEffect } from 'react';
import { 
  FiBell, FiCheck, FiX, FiClock, FiAlertTriangle, FiInfo, 
  FiCheckCircle, FiXCircle, FiFilter, FiTrash2,
  FiCalendar, FiPackage, FiCreditCard,
  FiEye, FiBellOff
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useNotification } from '../../contexts/NotificationContext';

const Notifications = () => {
  const { notifications: contextNotifications, unreadCount: contextUnreadCount, markAsRead: contextMarkAsRead, deleteNotification, markAllAsRead } = useNotification();
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // กรองการแจ้งเตือน
  const getFilteredNotifications = () => {
    let filtered = contextNotifications;

    if (filterType !== 'all') {
      // แปลง filter type ให้ตรงกับ notification type จริง
      if (filterType === 'borrowing') {
        filtered = filtered.filter(n => 
          n.type === 'borrow_request' || 
          n.type === 'borrow_approved' || 
          n.type === 'borrow_rejected' ||
          n.type === 'return_confirmed' ||
          n.type === 'return_reminder' ||
          n.type === 'overdue'
        );
      } else if (filterType === 'credit') {
        filtered = filtered.filter(n => n.type === 'credit' || n.type === 'credit_admin' || n.type === 'credit_change');
      } else if (filterType === 'system') {
        filtered = filtered.filter(n => n.type === 'system');
      } else {
        // สำหรับ type อื่นๆ ให้ตรวจสอบตรงๆ
        filtered = filtered.filter(n => n.type === filterType);
      }
    }

    if (filterStatus === 'read') {
      filtered = filtered.filter(n => n.is_read);
    } else if (filterStatus === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotifications = filteredNotifications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  // รีเซ็ตหน้าเมื่อเปลี่ยน filter
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStatus]);

  // ทำเครื่องหมายว่าอ่านแล้ว
  const handleMarkAsRead = async (notificationIds) => {
    // กรองเฉพาะ notifications ที่ยังไม่อ่าน
    const unreadNotifications = notificationIds.filter(id => {
      const notification = contextNotifications.find(n => 
        n.notification_id === id || n.id === id
      );
      return notification && !notification.is_read;
    });

    if (unreadNotifications.length === 0) {
      toast.info('การแจ้งเตือนที่เลือกอ่านแล้วทั้งหมด');
      setSelectedNotifications([]);
      return;
    }

    try {
      // รอให้ทำเครื่องหมายทั้งหมดเสร็จก่อน
      await Promise.all(unreadNotifications.map(id => contextMarkAsRead(id)));
      setSelectedNotifications([]);
      toast.success(`ทำเครื่องหมาย ${unreadNotifications.length} รายการว่าอ่านแล้ว`);
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('เกิดข้อผิดพลาดในการทำเครื่องหมาย');
    }
  };

  // ทำเครื่องหมายว่ายังไม่อ่าน
  const handleMarkAsUnread = (notificationIds) => {
    toast.info('ฟังก์ชันนี้ยังไม่พร้อมใช้งาน');
  };

  // ลบการแจ้งเตือน
  const handleDeleteNotifications = async (notificationIds) => {
    try {
      // ลบทีละรายการแต่ไม่แสดง toast ในแต่ละครั้ง
      await Promise.all(notificationIds.map(id => deleteNotification(id)));
      setSelectedNotifications([]);
      // แจ้งเตือนแค่ครั้งเดียวหลังลบเสร็จทั้งหมด
      const count = notificationIds.length;
      toast.success(`ลบการแจ้งเตือน ${count} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
    }
  };

  // ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
  const handleMarkAllAsRead = async () => {
    if (contextUnreadCount === 0) {
      toast.info('ไม่มีการแจ้งเตือนที่ยังไม่อ่าน');
      return;
    }
    
    try {
      await markAllAsRead();
      setSelectedNotifications([]);
      toast.success('ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('เกิดข้อผิดพลาดในการทำเครื่องหมาย');
    }
  };

  // เลือก/ยกเลิกเลือกการแจ้งเตือน
  const toggleSelectNotification = (id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  // เลือกทั้งหมด (เฉพาะที่ยังไม่อ่าน)
  const selectAll = () => {
    const filtered = getFilteredNotifications();
    const unreadOnly = filtered.filter(n => !n.is_read);
    setSelectedNotifications(unreadOnly.map(n => n.notification_id || n.id));
  };

  // ยกเลิกเลือกทั้งหมด
  const deselectAll = () => {
    setSelectedNotifications([]);
  };

  // เปิด modal ลบ
  const openDeleteModal = (target) => {
    setDeleteTarget(target);
    setShowDeleteModal(true);
  };

  // ยืนยันการลบ
  const confirmDelete = () => {
    if (deleteTarget) {
      handleDeleteNotifications(deleteTarget);
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // ไอคอนตามประเภท
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'borrow_request':
        return <FiPackage className="text-blue-500" />;
      case 'borrow_approved':
        return <FiCheckCircle className="text-green-500" />;
      case 'borrow_rejected':
        return <FiXCircle className="text-red-500" />;
      case 'return_confirmed':
        return <FiCheckCircle className="text-purple-500" />;
      case 'credit':
      case 'credit_admin':
      case 'credit_change':
        return <FiCreditCard className="text-yellow-500" />;
      case 'overdue':
        return <FiAlertTriangle className="text-red-500" />;
      case 'return_reminder':
        return <FiClock className="text-orange-500" />;
      case 'system':
        return <FiInfo className="text-gray-500" />;
      default:
        return <FiBell className="text-gray-500" />;
    }
  };

  // Badge สำหรับ priority
  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full border ${badges[priority] || badges.low}`}>
        {priority === 'urgent' && 'เร่งด่วน'}
        {priority === 'high' && 'สำคัญ'}
        {priority === 'medium' && 'ปานกลาง'}
        {priority === 'low' && 'ทั่วไป'}
      </span>
    );
  };

  // จัดรูปแบบวันที่
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // นับการแจ้งเตือนตามประเภท
  const getTypeCount = (type) => {
    if (type === 'all') return contextNotifications.length;
    
    if (type === 'borrowing') {
      return contextNotifications.filter(n => 
        n.type === 'borrow_request' || 
        n.type === 'borrow_approved' || 
        n.type === 'borrow_rejected' ||
        n.type === 'return_confirmed' ||
        n.type === 'return_reminder' ||
        n.type === 'overdue'
      ).length;
    } else if (type === 'credit') {
      return contextNotifications.filter(n => 
        n.type === 'credit' || 
        n.type === 'credit_admin' || 
        n.type === 'credit_change'
      ).length;
    } else if (type === 'system') {
      return contextNotifications.filter(n => n.type === 'system').length;
    }
    
    return contextNotifications.filter(n => n.type === type).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6 border border-purple-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <FiBell className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  การแจ้งเตือน
                </h1>
                <p className="text-gray-600 mt-1">
                  มี {contextUnreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน
                </p>
              </div>
            </div>
            <button
              onClick={handleMarkAllAsRead}
              disabled={contextUnreadCount === 0}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCheckCircle />
              อ่านทั้งหมด
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiFilter className="inline mr-2" />
                กรองตามประเภท
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'ทั้งหมด', icon: FiBell },
                  { value: 'borrowing', label: 'การยืม-คืน', icon: FiPackage },
                  { value: 'credit', label: 'เครดิต', icon: FiCreditCard },
                  { value: 'system', label: 'ระบบ', icon: FiInfo }
                ].map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setFilterType(type.value)}
                      className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                        filterType === type.value
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <Icon className="text-sm" />
                      {type.label}
                      {type.value !== 'all' && (
                        <span className="ml-1 text-xs opacity-75">
                          ({getTypeCount(type.value)})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiEye className="inline mr-2" />
                สถานะการอ่าน
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'ทั้งหมด' },
                  { value: 'unread', label: 'ยังไม่อ่าน' },
                  { value: 'read', label: 'อ่านแล้ว' }
                ].map(status => (
                  <button
                    key={status.value}
                    onClick={() => setFilterStatus(status.value)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      filterStatus === status.value
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredNotifications.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-6 border border-purple-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAll}
                  className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                >
                  <FiCheck />
                  เลือกที่ยังไม่อ่าน ({filteredNotifications.filter(n => !n.is_read).length})
                </button>
                {selectedNotifications.length > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-gray-600 hover:text-gray-700 font-medium flex items-center gap-2"
                    >
                      <FiX />
                      ยกเลิกเลือก
                    </button>
                    <span className="text-sm text-gray-600 bg-purple-100 px-3 py-1 rounded-full">
                      เลือกแล้ว: {selectedNotifications.length} รายการ
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {contextUnreadCount > 0 && selectedNotifications.length === 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
                  >
                    <FiCheckCircle />
                    อ่านทั้งหมด
                  </button>
                )}
                
                {selectedNotifications.length > 0 && (
                  <>
                    <button
                      onClick={() => handleMarkAsRead(selectedNotifications)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
                    >
                      <FiEye />
                      อ่านที่เลือก
                    </button>
                    <button
                      onClick={() => openDeleteModal(selectedNotifications)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
                    >
                      <FiTrash2 />
                      ลบที่เลือก ({selectedNotifications.length})
                    </button>
                  </>
                )}

                {filteredNotifications.filter(n => n.is_read).length > 0 && selectedNotifications.length === 0 && (
                  <button
                    onClick={() => {
                      const readNotifications = filteredNotifications
                        .filter(n => n.is_read)
                        .map(n => n.notification_id || n.id);
                      openDeleteModal(readNotifications);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
                  >
                    <FiTrash2 />
                    ลบที่อ่านแล้ว ({filteredNotifications.filter(n => n.is_read).length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-purple-100">
            <FiBellOff className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              ไม่มีการแจ้งเตือน
            </h3>
            <p className="text-gray-500">
              {filterType !== 'all' || filterStatus !== 'all' 
                ? 'ไม่พบการแจ้งเตือนตามเงื่อนไขที่เลือก'
                : 'คุณไม่มีการแจ้งเตือนในขณะนี้'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentNotifications.map(notification => (
              <div
                key={notification.notification_id || notification.id}
                className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border-l-4 ${
                  !notification.is_read 
                    ? 'border-purple-500 bg-purple-50/50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.notification_id)}
                      onChange={() => toggleSelectNotification(notification.notification_id)}
                      disabled={notification.is_read}
                      className={`mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500 ${
                        notification.is_read ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title={notification.is_read ? 'อ่านแล้ว' : 'เลือกการแจ้งเตือน'}
                    />

                    {/* Icon */}
                    <div className={`p-3 rounded-xl ${
                      !notification.is_read ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${
                              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiClock />
                              {formatDate(notification.created_at)}
                            </span>
                            {notification.priority && getPriorityBadge(notification.priority)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {notification.action_url && (
                          <button
                            onClick={() => window.location.href = notification.action_url}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                          >
                            ดูรายละเอียด
                          </button>
                        )}
                        {!notification.is_read ? (
                          <button
                            onClick={() => handleMarkAsRead([notification.notification_id])}
                            className="px-4 py-2 bg-white text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-50 transition-all duration-200 text-sm"
                          >
                            <FiCheck className="inline mr-1" />
                            ทำเครื่องหมายว่าอ่านแล้ว
                          </button>
                        ) : null}
                        <button
                          onClick={() => openDeleteModal([notification.notification_id])}
                          className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all duration-200 text-sm"
                        >
                          <FiTrash2 className="inline mr-1" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredNotifications.length > itemsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              ← ก่อนหน้า
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              ถัดไป →
            </button>
            
            <span className="ml-4 text-sm text-gray-600">
              หน้า {currentPage} จาก {totalPages} (ทั้งหมด {filteredNotifications.length} รายการ)
            </span>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scaleIn">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <FiAlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">ยืนยันการลบ</h3>
                    <p className="text-red-100 text-sm mt-1">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-700 text-lg mb-3">
                    คุณต้องการลบการแจ้งเตือนที่เลือกหรือไม่?
                  </p>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <div className="flex items-start">
                      <FiInfo className="text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-800 font-medium">
                          จำนวนที่จะลบ: {deleteTarget?.length || 0} รายการ
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          การแจ้งเตือนที่ลบแล้วจะไม่สามารถกู้คืนได้
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteTarget(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2"
                  >
                    <FiTrash2 />
                    ยืนยันการลบ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0; 
      transform: scale(0.9) translateY(20px);
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out;
  }
`;
if (!document.head.querySelector('style[data-notifications-style]')) {
  style.setAttribute('data-notifications-style', 'true');
  document.head.appendChild(style);
}
