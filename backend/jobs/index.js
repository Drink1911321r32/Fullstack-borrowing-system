const { startReminderCronJob, stopReminderCronJob } = require('./reminderCronJob');
const { startPartialReturnPenaltyCron, stopPartialReturnPenaltyCron } = require('./partialReturnPenaltyCron');
const { startPenaltyRefundCron, stopPenaltyRefundCron } = require('./penaltyRefundCron');

/**
 * เริ่มต้น Cron Jobs ทั้งหมด
 */
const initializeCronJobs = () => {
  // เริ่ม Reminder Cron Job (ทุก 15 นาที)
  startReminderCronJob();
  
  // เริ่ม Partial Return Penalty Cron Job (ทุกวัน 00:30)
  startPartialReturnPenaltyCron();
  
  // เริ่ม Penalty Refund Cron Job (ทุกวัน 01:00)
  startPenaltyRefundCron();
};

/**
 * หยุดทุก Cron Jobs
 */
const stopAllCronJobs = () => {
  stopReminderCronJob();
  stopPartialReturnPenaltyCron();
  stopPenaltyRefundCron();
  console.log('[Cron] All cron jobs stopped');
};

module.exports = {
  initializeCronJobs,
  stopAllCronJobs
};
