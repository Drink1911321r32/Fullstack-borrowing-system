import api from './api';

/**
 * Disbursement Service - จัดการ API calls สำหรับการเบิกจ่าย
 */

/**
 * สร้างคำขอเบิกวัสดุ
 */
export const createDisbursementRequest = async (disbursementData) => {
  try {
    const response = await api.post('/disbursements', disbursementData);
    return response.data;
  } catch (error) {
    console.error('Error creating disbursement request:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงรายการเบิกของผู้ใช้
 */
export const getUserDisbursements = async () => {
  try {
    const response = await api.get('/disbursements/user');
    return response.data;
  } catch (error) {
    console.error('Error fetching user disbursements:', error);
    throw error.response?.data || error;
  }
};

/**
 * ยกเลิกคำขอเบิก
 */
export const cancelDisbursement = async (id) => {
  try {
    const response = await api.put(`/disbursements/${id}/cancel`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling disbursement:', error);
    throw error.response?.data || error;
  }
};

/**
 * ดึงรายการเบิกทั้งหมด (Admin)
 */
export const getAllDisbursements = async (params = {}) => {
  try {
    const response = await api.get('/disbursements', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching all disbursements:', error);
    throw error.response?.data || error;
  }
};

/**
 * อนุมัติคำขอเบิก (Admin)
 */
export const approveDisbursement = async (id, notes = '') => {
  try {
    const response = await api.put(`/disbursements/${id}/approve`, { notes });
    return response.data;
  } catch (error) {
    console.error('Error approving disbursement:', error);
    throw error.response?.data || error;
  }
};

/**
 * ปฏิเสธคำขอเบิก (Admin)
 */
export const rejectDisbursement = async (id, notes) => {
  try {
    const response = await api.put(`/disbursements/${id}/reject`, { notes });
    return response.data;
  } catch (error) {
    console.error('Error rejecting disbursement:', error);
    throw error.response?.data || error;
  }
};

const disbursementService = {
  createDisbursementRequest,
  getUserDisbursements,
  cancelDisbursement,
  getAllDisbursements,
  approveDisbursement,
  rejectDisbursement
};

export default disbursementService;
