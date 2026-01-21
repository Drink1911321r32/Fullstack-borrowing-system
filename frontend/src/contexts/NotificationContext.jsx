import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiBell, FiCheckCircle, FiXCircle, FiPackage, FiCreditCard, 
  FiAlertTriangle, FiInfo, FiClock 
} from 'react-icons/fi';
import api from '../api/api';
import { STORAGE_KEYS } from '../constants';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { refreshUserData } = useAuth();


  // ดึงการแจ้งเตือนจาก API
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        // ถ้าไม่มี token ให้ clear state
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setLoading(true);
      const response = await api.get('/notifications', {
        params: { limit: 50 }
      });

      if (response.data && response.data.success) {
        const fetchedNotifications = response.data.data.notifications || [];
        const fetchedUnreadCount = response.data.data.unread_count || 0;
        
        // แปลง notification_id เป็น id สำหรับ compatibility
        const mappedNotifications = fetchedNotifications.map(n => ({
          ...n,
          id: n.notification_id,
          type: n.type || 'system',
          is_read: Boolean(n.is_read)
        }));
        
        setNotifications(mappedNotifications);
        setUnreadCount(fetchedUnreadCount);
      } else {
        // ถ้า response ไม่ success ให้ clear state
        setNotifications([]);
        setUnreadCount(0);
        console.warn('⚠️ API response not successful, clearing state');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // ถ้าเกิด error ให้ clear state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE Real-time notifications
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    let eventSource = null;
    let reconnectTimeout = null;
    let isConnecting = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 3000; // 3 seconds

    const connectSSE = () => {
      // ป้องกันการ connect ซ้ำซ้อน
      if (isConnecting || eventSource) {
        console.log('⚠️ SSE already connecting or connected, skipping...');
        return;
      }
      
      // ตรวจสอบ max attempts
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('⚠️ Max SSE reconnection attempts reached. Stopping reconnection.');
        return;
      }
      
      isConnecting = true;
      
      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        eventSource = new EventSource(`${baseURL}/api/notifications/stream?token=${token}`);

        eventSource.onopen = () => {
          isConnecting = false;
          reconnectAttempts = 0; // รีเซ็ต attempts เมื่อเชื่อมต่อสำเร็จ
          console.log('✅ SSE Connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'notification') {
              // แปลงข้อมูลให้มี format ที่ถูกต้อง
              const newNotification = {
                ...data.data,
                id: data.data.notification_id,
                notification_id: data.data.notification_id,
                is_read: Boolean(data.data.is_read)
              };
              
              // ตรวจสอบว่ามี notification ซ้ำหรือไม่ (ป้องกัน duplicate)
              setNotifications(prev => {
                const isDuplicate = prev.some(n => 
                  n.notification_id === newNotification.notification_id
                );
                
                if (isDuplicate) {
                  console.log('⚠️ Duplicate notification detected, skipping:', newNotification.notification_id);
                  return prev;
                }
                
                return [newNotification, ...prev];
              });
              
              setUnreadCount(prev => prev + 1);
              
              // ถ้าเป็น notification เกี่ยวกับเครดิต ให้ refresh user data
              const creditRelatedTypes = ['credit', 'credit_admin', 'credit_change', 'borrow_approved'];
              if (creditRelatedTypes.includes(data.data.type)) {
                refreshUserData?.();
                // Dispatch custom event for same-tab updates
                window.dispatchEvent(new Event('userCreditUpdated'));
              }
              
              // แสดง toast
              const CustomToast = () => (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getIcon(data.data.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{data.data.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{data.data.message}</p>
                  </div>
                </div>
              );
              
              toast(<CustomToast />, {
                position: 'top-right',
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ SSE Error:', error);
          isConnecting = false;
          
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
          // Clear timeout เดิมก่อน
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          
          // Exponential backoff สำหรับการ reconnect
          reconnectAttempts++;
          const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 60000); // Max 60 seconds
          
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`🔄 Attempting SSE reconnection (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay / 1000}s...`);
            reconnectTimeout = setTimeout(() => {
              connectSSE();
            }, delay);
          } else {
            console.warn('⚠️ Max reconnection attempts reached. Please refresh the page to reconnect.');
          }
        };
      } catch (error) {
        console.error('Error creating EventSource:', error);
        isConnecting = false;
      }
    };

    // Initial fetch
    fetchNotifications();
    
    // Connect SSE (delay 1 วินาทีเพื่อไม่ให้ทับกับ initial fetch)
    const initialTimeout = setTimeout(connectSSE, 1000);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        console.log('🔌 Closing SSE connection...');
        eventSource.close();
        eventSource = null;
      }
      isConnecting = false;
    };
  }, [fetchNotifications]);

  // ฟังก์ชันสร้างการแจ้งเตือน (เก็บไว้สำหรับ local notification)
  const notify = useCallback((type, title, message, options = {}) => {
    const id = Date.now();
    const notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      ...options
    };

    // เพิ่มลง state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // แสดง toast notification
    const CustomToast = () => (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon(type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
        </div>
      </div>
    );

    const toastOptions = {
      icon: false,
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options.toastOptions
    };

    switch (type) {
      case 'success':
      case 'approval':
        toast.success(<CustomToast />, toastOptions);
        break;
      case 'error':
      case 'rejection':
        toast.error(<CustomToast />, toastOptions);
        break;
      case 'warning':
      case 'overdue':
        toast.warning(<CustomToast />, toastOptions);
        break;
      case 'info':
      case 'reminder':
        toast.info(<CustomToast />, toastOptions);
        break;
      default:
        toast(<CustomToast />, toastOptions);
    }

    return id;
  }, []);

  // ไอคอนตามประเภท
  const getIcon = (type) => {
    const iconClass = "text-2xl";
    switch (type) {
      case 'success':
      case 'approval':
        return <FiCheckCircle className={`${iconClass} text-green-500`} />;
      case 'error':
      case 'rejection':
        return <FiXCircle className={`${iconClass} text-red-500`} />;
      case 'warning':
      case 'overdue':
        return <FiAlertTriangle className={`${iconClass} text-orange-500`} />;
      case 'borrowing':
        return <FiPackage className={`${iconClass} text-blue-500`} />;
      case 'disbursement':
        return <FiCreditCard className={`${iconClass} text-purple-500`} />;
      case 'reminder':
        return <FiClock className={`${iconClass} text-yellow-500`} />;
      default:
        return <FiInfo className={`${iconClass} text-gray-500`} />;
    }
  };

  // ทำเครื่องหมายว่าอ่านแล้ว
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // หา notification ที่ต้องการ mark as read
      const notification = notifications.find(n => 
        n.notification_id === notificationId || n.id === notificationId
      );
      
      if (!notification) {
        console.warn('Notification not found:', notificationId);
        return;
      }
      
      // ถ้าอ่านแล้ว ไม่ต้องทำอะไร
      if (notification.is_read) {
        return;
      }
      
      // ใช้ notification_id สำหรับ API call (ต้องเป็น integer)
      const actualId = parseInt(notification.notification_id || notification.id);
      
      if (isNaN(actualId)) {
        console.error('Invalid notification ID:', notificationId);
        return;
      }
      
      // Update UI ก่อน (Optimistic Update)
      setNotifications(prev =>
        prev.map(notif =>
          (notif.notification_id === actualId || notif.id === actualId)
            ? { ...notif, is_read: true, read_at: new Date() } 
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // เรียก API
      await api.patch(`/notifications/${actualId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Rollback UI ถ้า API ล้มเหลว
      const notification = notifications.find(n => 
        n.notification_id === notificationId || n.id === notificationId
      );
      if (notification) {
        setNotifications(prev =>
          prev.map(notif =>
            (notif.notification_id === notification.notification_id || notif.id === notificationId)
              ? { ...notif, is_read: false } 
              : notif
          )
        );
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [notifications]);

  // ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-all-read');
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true, read_at: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // ลบการแจ้งเตือน
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const notification = notifications.find(n => n.id === notificationId || n.notification_id === notificationId);
      if (!notification) {
        console.warn('Notification not found:', notificationId);
        return;
      }
      
      const actualId = notification.notification_id || notification.id;
      
      await api.delete(`/notifications/${actualId}`);
      
      setNotifications(prev => {
        const filtered = prev.filter(n => n.notification_id !== actualId && n.id !== notificationId);
        return filtered;
      });
      
      // ถ้าการแจ้งเตือนที่ลบยังไม่อ่าน ให้ลด unread count
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('ลบการแจ้งเตือนสำเร็จ');
    } catch (error) {
      console.error('Error deleting notification:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.message || 'ไม่สามารถลบการแจ้งเตือนได้');
    }
  }, [notifications]);

  // ล้างทั้งหมด
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // ฟังก์ชันสำหรับเหตุการณ์ต่างๆ
  const notifyBorrowingApproved = useCallback((equipmentName, borrower) => {
    return notify(
      'approval',
      'อนุมัติการยืมอุปกรณ์',
      `อนุมัติการยืม ${equipmentName} สำหรับ ${borrower} เรียบร้อยแล้ว`,
      { type: 'borrowing' }
    );
  }, [notify]);

  const notifyBorrowingRejected = useCallback((equipmentName, borrower, reason) => {
    return notify(
      'rejection',
      'ไม่อนุมัติการยืมอุปกรณ์',
      `ไม่อนุมัติการยืม ${equipmentName} สำหรับ ${borrower}${reason ? ` (${reason})` : ''}`,
      { type: 'borrowing' }
    );
  }, [notify]);

  const notifyBorrowingRequest = useCallback((equipmentName, borrower) => {
    return notify(
      'info',
      'คำขอยืมอุปกรณ์ใหม่',
      `${borrower} ขอยืม ${equipmentName}`,
      { type: 'borrowing', toastOptions: { autoClose: 10000 } }
    );
  }, [notify]);

  const notifyBorrowingReturned = useCallback((equipmentName, borrower) => {
    return notify(
      'success',
      'คืนอุปกรณ์สำเร็จ',
      `${borrower} คืน ${equipmentName} เรียบร้อยแล้ว`,
      { type: 'borrowing' }
    );
  }, [notify]);

  const notifyDisbursementApproved = useCallback((itemName, requester) => {
    return notify(
      'approval',
      'อนุมัติการเบิกจ่าย',
      `อนุมัติการเบิก ${itemName} สำหรับ ${requester} เรียบร้อยแล้ว`,
      { type: 'disbursement' }
    );
  }, [notify]);

  const notifyDisbursementRejected = useCallback((itemName, requester, reason) => {
    return notify(
      'rejection',
      'ไม่อนุมัติการเบิกจ่าย',
      `ไม่อนุมัติการเบิก ${itemName} สำหรับ ${requester}${reason ? ` (${reason})` : ''}`,
      { type: 'disbursement' }
    );
  }, [notify]);

  const notifyDisbursementRequest = useCallback((itemName, requester) => {
    return notify(
      'info',
      'คำขอเบิกจ่ายใหม่',
      `${requester} ขอเบิก ${itemName}`,
      { type: 'disbursement', toastOptions: { autoClose: 10000 } }
    );
  }, [notify]);

  const notifyOverdue = useCallback((equipmentName, borrower, daysOverdue) => {
    return notify(
      'overdue',
      'อุปกรณ์เกินกำหนดคืน',
      `${equipmentName} (${borrower}) เกินกำหนดคืน ${daysOverdue} วัน`,
      { type: 'borrowing', toastOptions: { autoClose: false } }
    );
  }, [notify]);

  const notifyDueSoon = useCallback((equipmentName, daysRemaining) => {
    return notify(
      'reminder',
      'เตือนกำหนดคืนอุปกรณ์',
      `${equipmentName} จะครบกำหนดคืนในอีก ${daysRemaining} วัน`,
      { type: 'borrowing', toastOptions: { autoClose: 8000 } }
    );
  }, [notify]);

  const notifyCreditUpdate = useCallback((amount, action) => {
    const isPositive = amount > 0;
    return notify(
      isPositive ? 'success' : 'warning',
      isPositive ? 'ได้รับเครดิตเพิ่ม' : 'หักเครดิต',
      `${action} ${Math.abs(amount)} เครดิต`,
      { type: 'credit' }
    );
  }, [notify]);

  const value = {
    notifications,
    unreadCount,
    loading,
    notify,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    fetchNotifications, // เพิ่มให้สามารถเรียก manual refresh ได้
    // Helper functions
    notifyBorrowingApproved,
    notifyBorrowingRejected,
    notifyBorrowingRequest,
    notifyBorrowingReturned,
    notifyDisbursementApproved,
    notifyDisbursementRejected,
    notifyDisbursementRequest,
    notifyOverdue,
    notifyDueSoon,
    notifyCreditUpdate
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
