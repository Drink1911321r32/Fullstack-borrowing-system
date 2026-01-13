import api from './api';

/**
 * รัน manual check สำหรับการแจ้งเตือน
 */
export const runManualReminderCheck = async () => {
  const response = await api.post('/cron/reminder/run');
  return response.data;
};

/**
 * รัน manual check สำหรับการหักเครดิตคืนไม่ครบ
 */
export const runManualPenaltyCheck = async () => {
  const response = await api.post('/cron/penalty/run');
  return response.data;
};

/**
 * ดูรายการที่ใกล้ครบกำหนด
 */
export const getDueSoonBorrowings = async () => {
  const response = await api.get('/cron/reminder/due-soon');
  return response.data;
};

/**
 * ดูรายการที่เกินกำหนด
 */
export const getOverdueBorrowings = async () => {
  const response = await api.get('/cron/reminder/overdue');
  return response.data;
};

/**
 * ดูสถานะ Cron Jobs
 */
export const getCronJobStatus = async () => {
  const response = await api.get('/cron/status');
  return response.data;
};

export default {
  runManualReminderCheck,
  runManualPenaltyCheck,
  getDueSoonBorrowings,
  getOverdueBorrowings,
  getCronJobStatus
};
