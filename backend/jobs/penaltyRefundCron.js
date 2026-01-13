const cron = require('node-cron');
const { pool } = require('../config/db');

let penaltyRefundCronJob = null;

// ===================================================
// Penalty Refund Cron Job
// คืนค่าปรับทีละน้อย: 5 เครดิต/7 วัน
// ทำงานทุกวันเวลา 01:00 น.
// ===================================================

const startPenaltyRefundCron = () => {
  // รันทุกวันเวลา 01:00 น.
  const cronSchedule = '0 1 * * *';
  
  penaltyRefundCronJob = cron.schedule(cronSchedule, async () => {
    try {
      await processPenaltyRefunds();
    } catch (error) {
      console.error('[Penalty Refund Cron] Error processing refunds:', error.message);
    }
  }, {
    runOnInit: false,
    name: 'PenaltyRefund'
  });
};

const stopPenaltyRefundCron = () => {
  if (penaltyRefundCronJob) {
    penaltyRefundCronJob.stop();
    penaltyRefundCronJob.destroy();
    penaltyRefundCronJob = null;
  }
};

async function processPenaltyRefunds() {
  const connection = await pool.getConnection();
  
  try {
    // ดึงรายการที่ถึงเวลาคืนค่าปรับ
    const [schedules] = await Promise.race([
      connection.query(`
        SELECT prs.*, m.member_id, m.email, bt.transaction_id
        FROM penalty_refund_schedule prs
        INNER JOIN members m ON prs.member_id = m.member_id
        INNER JOIN borrowing_transactions bt ON prs.transaction_id = bt.transaction_id
        WHERE prs.is_completed = FALSE
          AND prs.next_refund_date <= CURDATE()
        ORDER BY prs.next_refund_date ASC
        LIMIT 50
      `),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 15000)
      )
    ]);
    
    if (!schedules || schedules.length === 0) {
      return { processed: 0, completed: 0 };
    }
    
    let processedCount = 0;
    let completedCount = 0;
    
    for (const schedule of schedules) {
      const {
        schedule_id,
        transaction_id,
        user_id,
        total_penalty,
        refunded_amount,
        username
      } = schedule;
      
      const remaining = total_penalty - refunded_amount;
      
      if (remaining <= 0) {
        // กรณีคืนครบแล้ว
        await connection.query(
          'UPDATE penalty_refund_schedule SET is_completed = TRUE WHERE schedule_id = ?',
          [schedule_id]
        );
        completedCount++;
        continue;
      }
      
      // คืนค่าปรับทีละ 5 เครดิต (หรือที่เหลือถ้าน้อยกว่า 5)
      const refundThisTime = Math.min(5, remaining);
      const newRefundedAmount = refunded_amount + refundThisTime;
      const isCompleted = newRefundedAmount >= total_penalty;
      
      // คืนเครดิตให้ผู้ใช้
      await connection.query(
        'UPDATE members SET credit = credit + ? WHERE member_id = ?',
        [refundThisTime, user_id]
      );
      
      // ดึงยอดเครดิตปัจจุบัน
      const [userResult] = await connection.query(
        'SELECT credit FROM members WHERE member_id = ?',
        [user_id]
      );
      const newBalance = userResult[0].credit;
      
      // บันทึกประวัติการคืนเครดิต
      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
        VALUES (?, ?, 'refund', 'penalty_refund', ?, ?, ?, NULL, NOW())`,
        [
          user_id,
          refundThisTime,
          transaction_id,
          `คืนค่าปรับทีละน้อย (${newRefundedAmount}/${total_penalty} เครดิต)`,
          newBalance
        ]
      );
      
      // อัพเดท schedule
      if (isCompleted) {
        await connection.query(
          `UPDATE penalty_refund_schedule 
           SET refunded_amount = ?, is_completed = TRUE, updated_at = NOW()
           WHERE schedule_id = ?`,
          [newRefundedAmount, schedule_id]
        );
        completedCount++;
      } else {
        // คืนยังไม่ครบ - กำหนดวันถัดไปใน 7 วัน
        await connection.query(
          `UPDATE penalty_refund_schedule 
           SET refunded_amount = ?, 
               next_refund_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY),
               updated_at = NOW()
           WHERE schedule_id = ?`,
          [newRefundedAmount, schedule_id]
        );
      }
      
      processedCount++;
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('❌ [Penalty Refund Cron] เกิดข้อผิดพลาด:', error);
  } finally {
    connection.release();
  }
}

// กำหนดตารางเวลา: ทุกวันเวลา 01:00 น.
module.exports = {
  startPenaltyRefundCron,
  stopPenaltyRefundCron,
  processPenaltyRefunds
};
