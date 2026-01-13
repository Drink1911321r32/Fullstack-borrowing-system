import api from './api';

/**
 * ดึงการแจ้งเตือนของผู้ใช้
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

/**
 * ดึงการแจ้งเตือนทั้งหมด (Admin)
 */
export const getAllNotifications = async (params = {}) => {
  const response = await api.get('/notifications/all', { params });
  return response.data;
};

/**
 * ทำเครื่องหมายว่าอ่านแล้ว
 */
export const markAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
 */
export const markAllAsRead = async () => {
  const response = await api.put('/notifications/mark-all-read');
  return response.data;
};

/**
 * ลบการแจ้งเตือน
 */
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

export default {
  getNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
