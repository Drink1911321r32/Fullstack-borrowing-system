import api from './api';

/**
 * Admin Service - จัดการ API calls สำหรับ Admin
 */

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด
 */
export const getAllUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงข้อมูลผู้ใช้ตาม ID
 */
export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error.response?.data || error;
  }
};

/**
 * สร้างผู้ใช้ใหม่
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error.response?.data || error;
  }
};

/**
 * แก้ไขข้อมูลผู้ใช้
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error.response?.data || error;
  }
};

/**
 * ระงับการใช้งานผู้ใช้
 */
export const suspendUser = async (userId, reason = '') => {
  try {
    const response = await api.post(`/admin/users/${userId}/suspend`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error suspending user:', error);
    throw error.response?.data || error;
  }
};

/**
 * เปิดใช้งานผู้ใช้
 */
export const activateUser = async (userId) => {
  try {
    const response = await api.post(`/admin/users/${userId}/activate`);
    return response.data;
  } catch (error) {
    console.error('Error activating user:', error);
    throw error.response?.data || error;
  }
};

/**
 * เปิด/ปิดการใช้งานผู้ใช้
 */
export const toggleUserStatus = async (userId) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error.response?.data || error;
  }
};

/**
 * ลบผู้ใช้
 */
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงสถิติผู้ใช้
 */
export const getUserStats = async () => {
  try {
    const response = await api.get('/admin/users/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงสถิติสำหรับ Dashboard
 */
export const getDashboardStats = async () => {
  try {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงสถิติสำหรับ Reports
 */
export const getReportsStats = async (dateRange = '30days', equipmentPeriod = 'all', creditPeriod = 'monthly', disbursementPeriod = 'all', startDate = null, endDate = null) => {
  try {
    const params = { equipmentPeriod, creditPeriod, disbursementPeriod };
    
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (dateRange) {
      params.dateRange = dateRange;
    }
    
    const response = await api.get('/admin/reports/stats', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching reports stats:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงข้อมูลโปรไฟล์ของ Admin
 */
export const getAdminProfile = async () => {
  try {
    const response = await api.get('/admin/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    throw error.response?.data || error;
  }
};

/**
 * อัปเดทข้อมูลโปรไฟล์ของ Admin
 */
export const updateAdminProfile = async (profileData) => {
  try {
    const response = await api.put('/admin/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating admin profile:', error);
    throw error.response?.data || error;
  }
};

/**
 * อัปโหลดรูปโปรไฟล์ของ Admin
 */
export const uploadAdminProfileImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('profile_image', file);
    
    const response = await api.post('/admin/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading admin profile image:', error);
    throw error.response?.data || error;
  }
};

/**
 * ลบรูปโปรไฟล์ของ Admin
 */
export const deleteAdminProfileImage = async () => {
  try {
    const response = await api.delete('/admin/profile/image');
    return response.data;
  } catch (error) {
    console.error('Error deleting admin profile image:', error);
    throw error.response?.data || error;
  }
};

/**
 * อัปโหลดรูปโปรไฟล์ของผู้ใช้โดย Admin
 */
export const uploadUserProfileImage = async (userId, file) => {
  try {
    const formData = new FormData();
    formData.append('profile_image', file);
    
    const response = await api.post(`/admin/users/${userId}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading user profile image:', error);
    throw error.response?.data || error;
  }
};

/**
 * ลบรูปโปรไฟล์ของผู้ใช้โดย Admin
 */
export const deleteUserProfileImage = async (userId) => {
  try {
    const response = await api.delete(`/admin/users/${userId}/profile-image`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user profile image:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงการตั้งค่าระบบทั้งหมด
 */
export const getAllSettings = async () => {
  try {
    const response = await api.get('/admin/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงการตั้งค่าตาม key
 */
export const getSettingByKey = async (key) => {
  try {
    const response = await api.get(`/admin/settings/${key}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching setting:', error);
    throw error.response?.data || error;
  }
};

/**
 * อัพเดทการตั้งค่า
 */
export const updateSetting = async (key, value) => {
  try {
    const response = await api.put(`/admin/settings/${key}`, {
      setting_value: value
    });
    return response.data;
  } catch (error) {
    console.error('Error updating setting:', error);
    throw error.response?.data || error;
  }
};

/**
 * สร้างการตั้งค่าใหม่
 */
export const createSetting = async (settingData) => {
  try {
    const response = await api.post('/admin/settings', settingData);
    return response.data;
  } catch (error) {
    console.error('Error creating setting:', error);
    throw error.response?.data || error;
  }
};

/**
 * ลบการตั้งค่า
 */
export const deleteSetting = async (key) => {
  try {
    const response = await api.delete(`/admin/settings/${key}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting setting:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงประวัติเครดิตทั้งหมด
 */
export const getAllCreditHistory = async (params = {}) => {
  try {
    const response = await api.get('/admin/credit-history', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching credit history:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงประวัติเครดิตของผู้ใช้
 */
export const getUserCreditHistory = async (userId, params = {}) => {
  try {
    const response = await api.get(`/admin/users/${userId}/credit-history`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching user credit history:', error);
    throw error.response?.data || error;
  }
};

export const adminService = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  activateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats,
  getDashboardStats,
  getReportsStats,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminProfileImage,
  deleteAdminProfileImage,
  uploadUserProfileImage,
  deleteUserProfileImage,
  getAllSettings,
  getSettingByKey,
  updateSetting,
  createSetting,
  deleteSetting,
  getAllCreditHistory,
  getUserCreditHistory
};

export default adminService;
