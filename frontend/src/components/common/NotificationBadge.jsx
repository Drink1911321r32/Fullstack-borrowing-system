import React from 'react';
import { 
  FiBell, FiPackage, FiCreditCard, FiCheckCircle, FiXCircle,
  FiClock, FiInfo, FiAlertTriangle 
} from 'react-icons/fi';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, Link } from 'react-router-dom';
import { STORAGE_KEYS } from '../../constants';

const NotificationBadge = () => {
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotification();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const navigate = useNavigate();

  // แสดงเฉพาะ 5 รายการล่าสุด
  const recentNotifications = notifications.slice(0, 5);

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

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return new Date(timestamp).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  };

  const getUserRole = () => {
    const userData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
    return userData.role || 'user';
  };

  const getNotificationsPath = () => {
    return getUserRole() === 'admin' ? '/admin/notifications' : '/user/notifications';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <FiBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 max-h-[500px] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">การแจ้งเตือน</h3>
                <span className="text-sm opacity-90">{unreadCount} ใหม่</span>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FiBell className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>ไม่มีการแจ้งเตือน</p>
                </div>
              ) : (
                recentNotifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.notification_id);
                      }
                      if (notification.action_url) {
                        navigate(notification.action_url);
                        setShowDropdown(false);
                      }
                    }}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1 text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  อ่านทั้งหมด
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const path = getNotificationsPath();
                  console.log('🔔 Navigating to:', path);
                  setShowDropdown(false);
                  // Force navigation
                  window.location.href = path;
                }}
                className="flex-1 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                ดูทั้งหมด
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBadge;
