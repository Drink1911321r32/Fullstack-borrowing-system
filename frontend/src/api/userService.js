import api from './api';

// ดึงข้อมูลรายงานของผู้ใช้
export const getUserReports = async (dateRange = '3months', creditPeriod = 'monthly', startDate = null, endDate = null) => {
  try {
    const params = { creditPeriod };
    
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (dateRange) {
      params.dateRange = dateRange;
    }
    
    const response = await api.get(`/users/reports`, { params });
    return response.data;
  } catch (error) {
    console.error('Get user reports error:', error);
    throw error;
  }
};

// ดึงประวัติการใช้งาน
export const getUserHistory = async (params = {}) => {
  try {
    const response = await api.get('/users/history', { params });
    return response.data;
  } catch (error) {
    console.error('Get user history error:', error);
    throw error;
  }
};

// ดึงข้อมูลโปรไฟล์
export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    console.error('Get user profile error:', error);
    throw error;
  }
};

// อัปเดตโปรไฟล์
export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
};

// อัปโหลดรูปโปรไฟล์
export const uploadProfileImage = async (formData) => {
  try {
    const response = await api.post('/users/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Upload profile image error:', error);
    throw error;
  }
};

// ลบรูปโปรไฟล์
export const deleteProfileImage = async () => {
  try {
    const response = await api.delete('/users/profile/image');
    return response.data;
  } catch (error) {
    console.error('Delete profile image error:', error);
    throw error;
  }
};

export default {
  getUserReports,
  getUserHistory,
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  deleteProfileImage
};
