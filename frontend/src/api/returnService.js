import api from './api';

/**
 * บันทึกการคืนอุปกรณ์
 */
export const createReturn = async (borrowingId, returnData) => {
  const response = await api.post(`/returns/${borrowingId}`, returnData, {
    timeout: 30000 // 30 วินาที สำหรับการคืนอุปกรณ์ที่มีการคำนวณซับซ้อน
  });
  return response.data;
};

/**
 * ดึงรายการคืนทั้งหมด (Admin)
 */
export const getAllReturns = async () => {
  const response = await api.get('/returns/all');
  return response.data;
};

/**
 * ดึงรายการคืนของผู้ใช้
 */
export const getUserReturns = async () => {
  const response = await api.get('/returns/my-returns');
  return response.data;
};

export default {
  createReturn,
  getAllReturns,
  getUserReturns
};
