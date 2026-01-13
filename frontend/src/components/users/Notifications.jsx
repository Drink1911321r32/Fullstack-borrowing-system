import React, { useState, useEffect } from 'react';
import { 
  FiBell, FiCheck, FiX, FiClock, FiAlertTriangle, FiInfo, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiFilter, FiTrash2,
  FiMail, FiCalendar, FiUser, FiPackage, FiCreditCard,
  FiEye, FiEyeOff, FiSettings, FiBellOff, FiMessageSquare
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useNotification } from '../../contexts/NotificationContext';

const Notifications = () => {
  const { notifications: contextNotifications, unreadCount: contextUnreadCount, markAsRead: contextMarkAsRead, deleteNotification, markAllAsRead } = useNotification();
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    borrowing_reminders: true,
    approval_updates: true,
    system_updates: false,
    maintenance_alerts: true
  });

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
  const handleMarkAsRead = (notificationIds) => {
    notificationIds.forEach(id => contextMarkAsRead(id));
    setSelectedNotifications([]);
    toast.success('ทำเครื่องหมายว่าอ่านแล้ว');
  };

  // ทำเครื่องหมายว่ายังไม่อ่าน
  const handleMarkAsUnread = (notificationIds) => {
    toast.info('ฟังก์ชันนี้ยังไม่พร้อมใช้งาน');
  };

  // ลบการแจ้งเตือน
  const handleDeleteNotifications = (notificationIds) => {
    notificationIds.forEach(id => deleteNotification(id));
    setSelectedNotifications([]);
    toast.success('ลบการแจ้งเตือนเรียบร้อยแล้ว');
  };

  // ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setSelectedNotifications([]);
    toast.success('ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว');
  };

  // เลือก/ยกเลิกเลือกการแจ้งเตือน
  const toggleSelectNotification = (id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  // เลือกทั้งหมด
  const selectAll = () => {
    const filtered = getFilteredNotifications();
    setSelectedNotifications(filtered.map(n => n.id));
  };

  // ยกเลิกเลือกทั้งหมด
  const deselectAll = () => {
    setSelectedNotifications([]);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-6">
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <FiSettings />
                ตั้งค่า
              </button>
              <button
                onClick={handleMarkAllAsRead}
                disabled={contextUnreadCount === 0}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
              >
                <FiRefreshCw />
                ล้างการแจ้งเตือน
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onClick={selectedNotifications.length === filteredNotifications.length ? deselectAll : selectAll}
                  className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                >
                  {selectedNotifications.length === filteredNotifications.length ? (
                    <>
                      <FiX /> ยกเลิกเลือกทั้งหมด
                    </>
                  ) : (
                    <>
                      <FiCheck /> เลือกทั้งหมด
                    </>
                  )}
                </button>
                {selectedNotifications.length > 0 && (
                  <span className="text-sm text-gray-600">
                    เลือก {selectedNotifications.length} รายการ
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {contextUnreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <FiCheckCircle />
                    ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
                  </button>
                )}
                
                {selectedNotifications.length > 0 && (
                  <>
                    <button
                      onClick={() => handleMarkAsRead(selectedNotifications)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <FiEye />
                      ทำเครื่องหมายว่าอ่านแล้ว
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('คุณต้องการลบการแจ้งเตือนที่เลือกหรือไม่?')) {
                          handleDeleteNotifications(selectedNotifications);
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <FiTrash2 />
                      ลบที่เลือก
                    </button>
                  </>
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
                key={notification.notification_id}
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
                      className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
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
                          onClick={() => {
                            if (window.confirm('คุณต้องการลบการแจ้งเตือนนี้หรือไม่?')) {
                              handleDeleteNotifications([notification.notification_id]);
                            }
                          }}
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

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    ตั้งค่าการแจ้งเตือน
                  </h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX className="text-2xl" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {Object.entries({
                  email_notifications: { label: 'การแจ้งเตือนทางอีเมล', icon: FiMail },
                  push_notifications: { label: 'การแจ้งเตือนแบบ Push', icon: FiBell },
                  borrowing_reminders: { label: 'เตือนการยืม-คืน', icon: FiPackage },
                  approval_updates: { label: 'อัปเดตการอนุมัติ', icon: FiCheckCircle },
                  system_updates: { label: 'อัปเดตระบบ', icon: FiInfo },
                  maintenance_alerts: { label: 'แจ้งเตือนการบำรุงรักษา', icon: FiAlertTriangle }
                }).map(([key, { label, icon: Icon }]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Icon className="text-purple-600 text-xl" />
                      <span className="font-medium text-gray-700">{label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[key]}
                        onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
                    setShowSettings(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
