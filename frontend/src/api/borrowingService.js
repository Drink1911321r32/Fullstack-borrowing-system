import api from './api';

/**
 * Borrowing Service - จัดการ API calls สำหรับการยืม-คืน
 */

/**
 * สร้างคำขอยืมอุปกรณ์
 */
export const createBorrowRequest = async (borrowData) => {
  try {
    const response = await api.post('/borrowing', borrowData);
    return response.data;
  } catch (error) {
    console.error('Error creating borrow request:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงรายการยืมของผู้ใช้
 */
export const getUserBorrowings = async () => {
  try {
    const response = await api.get('/borrowing/user');
    return response.data;
  } catch (error) {
    console.error('Error fetching user borrowings:', error);
    throw error.response?.data || error;
  }
};

/**
 * ยกเลิกคำขอยืม
 */
export const cancelBorrowing = async (id) => {
  try {
    const response = await api.put(`/borrowing/${id}/cancel`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling borrowing:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงรายการยืมทั้งหมด (Admin)
 */
export const getAllBorrowings = async (params = {}) => {
  try {
    const response = await api.get('/borrowing', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching all borrowings:', error);
    throw error.response?.data || error;
  }
};

/**
 * อนุมัติคำขอยืม (Admin)
 */
export const approveBorrowing = async (id, notes = '') => {
  try {
    const response = await api.put(`/borrowing/${id}/approve`, { notes }, {
      timeout: 60000 // 60 วินาที สำหรับ approve ที่มีหลาย items
    });
    return response.data;
  } catch (error) {
    console.error('Error approving borrowing:', error);
    throw error.response?.data || error;
  }
};

/**
 * ปฏิเสธคำขอยืม (Admin)
 */
export const rejectBorrowing = async (id, notes) => {
  try {
    const response = await api.put(`/borrowing/${id}/reject`, { notes }, {
      timeout: 60000 // 60 วินาที
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting borrowing:', error);
    throw error.response?.data || error;
  }
};

const borrowingService = {
  createBorrowRequest,
  getUserBorrowings,
  cancelBorrowing,
  getAllBorrowings,
  approveBorrowing,
  rejectBorrowing
};

export default borrowingService;

