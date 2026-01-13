import api from './api';

/**
 * Credit Service - จัดการ API calls สำหรับเครดิต
 */

/**
 * ดึงประวัติเครดิตของผู้ใช้
 */
export const getUserCreditHistory = async (limit = 50, offset = 0) => {
  try {
    const response = await api.get('/credit/history', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching credit history:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงประวัติเครดิตทั้งหมด (Admin)
 */
export const getAllCreditHistory = async (userId = null, limit = 100, offset = 0) => {
  try {
    const response = await api.get('/credit/history/all', {
      params: { userId, limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all credit history:', error);
    throw error.response?.data || error;
  }
};

/**
 * ปรับเครดิตผู้ใช้ (Admin)
 */
export const adjustUserCredit = async (userId, amount, description) => {
  try {
    const response = await api.post('/credit/adjust', {
      userId,
      amount,
      description
    });
    return response.data;
  } catch (error) {
    console.error('Error adjusting credit:', error);
    throw error.response?.data || error;
  }
};

const creditService = {
  getUserCreditHistory,
  getAllCreditHistory,
  adjustUserCredit
};

export default creditService;
