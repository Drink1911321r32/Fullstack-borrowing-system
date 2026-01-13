const cron = require('node-cron');
const { pool } = require('../config/db');
const { notifyReturnDueSoon, notifyOverdue } = require('../utils/notificationHelper');

let reminderCronJob = null;

/**
 * Cron Job สำหรับตรวจสอบและแจ้งเตือนการยืมที่ใกล้ครบกำหนดและเกินกำหนด
 * รันอัตโนมัติทุก 15 นาที
 */
const startReminderCronJob = () => {
  // รันทุก 15 นาที (*/15 * * * *)
  const cronSchedule = '*/15 * * * *'; // ทุก 15 นาที
  
  reminderCronJob = cron.schedule(cronSchedule, async () => {
    try {
      await checkDueSoonBorrowings().catch(err => 
        console.error('[Reminder Cron] Error checking due soon:', err.message)
      );
      await checkOverdueBorrowings().catch(err => 
        console.error('[Reminder Cron] Error checking overdue:', err.message)
      );
    } catch (error) {
      console.error('[Reminder Cron] Unexpected error:', error.message);
    }
  }, {
    runOnInit: false,
    name: 'BorrowingReminder'
  });
};

const stopReminderCronJob = () => {
  if (reminderCronJob) {
    reminderCronJob.stop();
    reminderCronJob.destroy();
    reminderCronJob = null;
    console.log('[Cron] Reminder Cron Job stopped');
  }
};

/**
 * ตรวจสอบรายการยืมที่ใกล้ครบกำหนด (เหลือ 1-3 วัน)
 */
const checkDueSoonBorrowings = async () => {
  const connection = await pool.getConnection();
  try {
    const [borrowings] = await Promise.race([
      connection.query(`
        SELECT 
          bt.transaction_id,
          bt.member_id as user_id,
          bt.expected_return_date,
          bt.equipment_id,
          e.equipment_name,
          m.first_name,
          m.last_name,
          TIMESTAMPDIFF(HOUR, NOW(), bt.expected_return_date) as hours_remaining,
          CEIL(TIMESTAMPDIFF(HOUR, NOW(), bt.expected_return_date) / 24) as days_remaining
        FROM borrowing_transactions bt
        JOIN equipments e ON bt.equipment_id = e.equipment_id
        JOIN members m ON bt.member_id = m.member_id
        WHERE bt.status IN ('Approved', 'Borrowed')
          AND bt.is_returned = FALSE
          AND (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) > 0
          AND bt.expected_return_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 72 HOUR)
        LIMIT 100
      `),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 10000)
      )
    ]);

    // แจ้งเตือนแบบ async ไม่ต้องรอให้เสร็จ
    if (borrowings && borrowings.length > 0) {
      borrowings.slice(0, 20).forEach(borrowing => {
        notifyReturnDueSoon({
          user_id: borrowing.user_id,
          equipment_name: borrowing.equipment_name,
          days_remaining: borrowing.days_remaining,
          transaction_id: borrowing.transaction_id
        }).catch(err => 
          console.error('[Reminder Cron] Notification error:', err.message)
        );
      });
    }

    return borrowings?.length || 0;
  } catch (error) {
    console.error('[Reminder Cron] checkDueSoonBorrowings error:', error.message);
    return 0;
  } finally {
    connection.release();
  }
};

/**
 * ตรวจสอบรายการยืมที่เกินกำหนด
 */
const checkOverdueBorrowings = async () => {
  const connection = await pool.getConnection();
  try {
    const [borrowings] = await Promise.race([
      connection.query(`
        SELECT 
          bt.transaction_id,
          bt.member_id as user_id,
          bt.expected_return_date,
          bt.equipment_id,
          e.equipment_name,
          m.first_name,
          m.last_name,
          CEIL(TIMESTAMPDIFF(HOUR, bt.expected_return_date, NOW()) / 24) as days_overdue
        FROM borrowing_transactions bt
        JOIN equipments e ON bt.equipment_id = e.equipment_id
        JOIN members m ON bt.member_id = m.member_id
        WHERE bt.status IN ('Approved', 'Borrowed')
          AND bt.is_returned = FALSE
          AND (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) > 0
          AND bt.expected_return_date < NOW()
        LIMIT 100
      `),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 10000)
      )
    ]);

    // แจ้งเตือนแบบ async ไม่ต้องรอให้เสร็จ
    if (borrowings && borrowings.length > 0) {
      borrowings.slice(0, 20).forEach(borrowing => {
        notifyOverdue({
          user_id: borrowing.user_id,
          equipment_name: borrowing.equipment_name,
          days_overdue: borrowing.days_overdue,
          transaction_id: borrowing.transaction_id
        }).catch(err => 
          console.error('[Reminder Cron] Notification error:', err.message)
        );
      });
    }

    return borrowings?.length || 0;
  } catch (error) {
    console.error('[Reminder Cron] checkOverdueBorrowings error:', error.message);
    return 0;
  } finally {
    connection.release();
  }
};

module.exports = {
  startReminderCronJob,
  stopReminderCronJob
};
