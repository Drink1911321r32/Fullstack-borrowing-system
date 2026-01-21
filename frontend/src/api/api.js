import axios from 'axios';
import { API_ENDPOINTS } from '../constants';
import { setupInterceptors } from './interceptors';

// Export API_URL for backward compatibility
export const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ตั้งค่า axios instance
const API = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// ตั้งค่า interceptors
setupInterceptors(API);

// ฟังก์ชันสำหรับจัดการ API requests เกี่ยวกับผู้ใช้
export const userAPI = {
  login: async (identifier, password) => {
    try {
      const response = await API.post(API_ENDPOINTS.LOGIN, { identifier, password });
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      const response = await API.post(API_ENDPOINTS.REGISTER, userData);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  getUserProfile: async () => {
    try {
      const response = await API.get(API_ENDPOINTS.PROFILE);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  updateProfile: async (userData) => {
    try {
      const response = await API.put(API_ENDPOINTS.PROFILE, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  uploadProfileImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('profile_image', file);
      
      const response = await API.post('/users/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  },

  deleteProfileImage: async () => {
    try {
      const response = await API.delete('/users/profile/image');
      return response.data;
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await API.post(API_ENDPOINTS.LOGOUT);
      return response.data;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  // Admin functions
  getAllUsers: async () => {
    try {
      const response = await API.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await API.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await API.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  resetPassword: async (userId, passwordData) => {
    try {
      const response = await API.put(`/users/${userId}/reset-password`, passwordData);
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  // System management functions
  getSystemStats: async () => {
    try {
      const response = await API.get('/users/system-stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  },

  // User history
  getUserHistory: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.status) queryParams.append('status', params.status);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      
      const url = `/users/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await API.get(url);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user history:', error);
      throw error;
    }
  }
};

// ฟังก์ชันสำหรับจัดการ Equipment Types
export const equipmentTypeAPI = {
  getAll: async () => {
    try {
      const response = await API.get(API_ENDPOINTS.EQUIPMENT_TYPES);
      
      // Backend ส่งกลับมาในรูปแบบ { success: true, data: [...], message: "..." }
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data // ใช้ response.data.data แทน response.data
        };
      } else {
        return {
          success: false,
          data: [],
          message: response.data?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์'
        };
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      return {
        success: false,
        data: [],
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์'
      };
    }
  },

  getLoanTypes: async () => {
    try {
      const response = await API.get(`${API_ENDPOINTS.EQUIPMENT_TYPES}/loan`);
      return response.data;
    } catch (error) {
      console.error('Error fetching loan equipment types:', error);
      throw error;
    }
  },

  getDisbursementTypes: async () => {
    try {
      const response = await API.get(`${API_ENDPOINTS.EQUIPMENT_TYPES}/disbursement`);
      return response.data;
    } catch (error) {
      console.error('Error fetching disbursement equipment types:', error);
      throw error;
    }
  },

  getByUsage: async (usageType) => {
    try {
      const response = await API.get(`${API_ENDPOINTS.EQUIPMENT_TYPES}/usage/${usageType}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${usageType} equipment types:`, error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      const response = await API.post(API_ENDPOINTS.EQUIPMENT_TYPES, data);
      return {
        success: true,
        data: response.data,
        message: 'เพิ่มประเภทอุปกรณ์สำเร็จ'
      };
    } catch (error) {
      console.error('Error creating equipment type:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มประเภทอุปกรณ์'
      };
    }
  },

  update: async (typeId, typeName, usageType = null) => {
    try {
      const data = {};
      if (typeName) data.type_name = typeName;
      // ไม่ส่ง usageType เพราะ backend ไม่อนุญาตให้เปลี่ยน
      // if (usageType) data.usage_type = usageType;
      
      const response = await API.put(`${API_ENDPOINTS.EQUIPMENT_TYPES}/${typeId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating equipment type:', error);
      throw error;
    }
  },

  delete: async (typeId) => {
    try {
      const response = await API.delete(`${API_ENDPOINTS.EQUIPMENT_TYPES}/${typeId}`);
      return {
        success: true,
        data: response.data,
        message: 'ลบประเภทอุปกรณ์สำเร็จ'
      };
    } catch (error) {
      console.error('Error deleting equipment type:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบประเภทอุปกรณ์'
      };
    }
  }
};

// ฟังก์ชันสำหรับจัดการ Equipment
export const equipmentAPI = {
  getAll: async () => {
    try {
      const response = await API.get(API_ENDPOINTS.EQUIPMENT);
      return response.data;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await API.get(`${API_ENDPOINTS.EQUIPMENT}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching equipment by ID:', error);
      throw error;
    }
  },

  getByUsageType: async (usageType) => {
    try {
      const response = await API.get(`${API_ENDPOINTS.EQUIPMENT}/usage/${usageType}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${usageType} equipment:`, error);
      throw error;
    }
  },

  create: async (equipmentData) => {
    try {
      const response = await API.post(API_ENDPOINTS.EQUIPMENT, equipmentData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating equipment:', error);
      throw error;
    }
  },

  update: async (id, equipmentData) => {
    try {
      const response = await API.put(`${API_ENDPOINTS.EQUIPMENT}/${id}`, equipmentData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await API.delete(`${API_ENDPOINTS.EQUIPMENT}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting equipment:', error);
      throw error;
    }
  }
};

// ฟังก์ชันสำหรับจัดการ Equipment Items (รายการอุปกรณ์แต่ละชิ้น)
export const equipmentItemAPI = {
  // ดึงรายการ items ทั้งหมด
  getAllItems: async () => {
    try {
      const response = await API.get('/equipment-items/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all equipment items:', error);
      throw error;
    }
  },

  // ดึงรายการ items ทั้งหมดของอุปกรณ์
  getItemsByEquipmentId: async (equipmentId) => {
    try {
      // ตรวจสอบว่า equipmentId ไม่เป็น undefined หรือ null
      if (!equipmentId || equipmentId === 'undefined' || equipmentId === 'null') {
        throw new Error('Equipment ID is required and cannot be undefined or null');
      }
      
      const url = `/equipment-items/equipment/${equipmentId}/items`;
      
      const response = await API.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching equipment items:', error);
      throw error;
    }
  },

  // ดึงข้อมูล item เดียว
  getItemById: async (itemId) => {
    try {
      const response = await API.get(`/equipment-items/items/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching equipment item:', error);
      throw error;
    }
  },

  // เพิ่ม item ใหม่
  createItem: async (equipmentId, itemData) => {
    try {
      const response = await API.post(`/equipment-items/equipment/${equipmentId}/items`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating equipment item:', error);
      throw error;
    }
  },

  // แก้ไข item
  updateItem: async (itemId, itemData) => {
    try {
      const response = await API.put(`/equipment-items/items/${itemId}`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error updating equipment item:', error);
      throw error;
    }
  },

  // ลบ item
  deleteItem: async (itemId) => {
    try {
      const response = await API.delete(`/equipment-items/items/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting equipment item:', error);
      throw error;
    }
  },

  // ดึงประวัติการใช้งาน
  getItemHistory: async (itemId) => {
    try {
      const response = await API.get(`/equipment-items/items/${itemId}/history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching item history:', error);
      throw error;
    }
  }
};

// ฟังก์ชันสำหรับจัดการ Notifications
export const notificationAPI = {
  getNotifications: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.is_read !== undefined) queryParams.append('is_read', params.is_read);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      
      const url = `/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await API.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const response = await API.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await API.put('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const response = await API.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
};

// ฟังก์ชันสำหรับจัดการการยืม-คืน (Borrowing)
export const borrowingAPI = {
  // ดึงรายการยืม-คืนของผู้ใช้
  getUserBorrowings: async () => {
    try {
      const response = await API.get('/borrowing/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching my borrowings:', error);
      throw error;
    }
  },

  // ดึงรายการยืม-คืนทั้งหมด (Admin)
  getAllBorrowings: async () => {
    try {
      const response = await API.get('/borrowing');
      return response.data;
    } catch (error) {
      console.error('Error fetching all borrowings:', error);
      throw error;
    }
  },

  // สร้างคำขอยืม
  createBorrowing: async (borrowingData) => {
    try {
      const response = await API.post('/borrowing', borrowingData);
      return response.data;
    } catch (error) {
      console.error('Error creating borrowing:', error);
      throw error;
    }
  },

  // อนุมัติการยืม (Admin)
  approve: async (transactionId, approvalData) => {
    try {
      const response = await API.put(`/borrowing/${transactionId}/approve`, approvalData);
      return response.data;
    } catch (error) {
      console.error('Error approving borrowing request:', error);
      throw error;
    }
  },

  // ปฏิเสธการยืม (Admin)
  reject: async (transactionId, reason) => {
    try {
      const response = await API.put(`/borrowing/${transactionId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting borrowing request:', error);
      throw error;
    }
  },

  // คืนอุปกรณ์ (Admin)
  returnItem: async (transactionId, returnData) => {
    try {
      const response = await API.put(`/borrowing/${transactionId}/return`, returnData);
      return response.data;
    } catch (error) {
      console.error('Error returning item:', error);
      throw error;
    }
  }
};

// ฟังก์ชันสำหรับจัดการการเบิกจ่าย (Disbursement)
export const disbursementAPI = {
  // ดึงรายการเบิกจ่ายของผู้ใช้
  getUserDisbursements: async () => {
    try {
      const response = await API.get('/disbursements/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching my disbursements:', error);
      throw error;
    }
  },

  // ดึงรายการเบิกจ่ายทั้งหมด (Admin)
  getAllDisbursements: async () => {
    try {
      const response = await API.get('/disbursements');
      return response.data;
    } catch (error) {
      console.error('Error fetching all disbursements:', error);
      throw error;
    }
  },

  // สร้างคำขอเบิกจ่าย
  createDisbursement: async (disbursementData) => {
    try {
      const response = await API.post('/disbursements', disbursementData);
      return response.data;
    } catch (error) {
      console.error('Error creating disbursement:', error);
      throw error;
    }
  },

  // อนุมัติการเบิกจ่าย (Admin)
  approve: async (transactionId, approvalData) => {
    try {
      const response = await API.put(`/disbursements/${transactionId}/approve`, approvalData);
      return response.data;
    } catch (error) {
      console.error('Error approving disbursement request:', error);
      throw error;
    }
  },

  // ปฏิเสธการเบิกจ่าย (Admin)
  reject: async (transactionId, reason) => {
    try {
      const response = await API.put(`/disbursements/${transactionId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting disbursement request:', error);
      throw error;
    }
  }
};

// Export fetchEquipmentTypes for backward compatibility
export const fetchEquipmentTypes = equipmentTypeAPI.getAll;

export default API;
