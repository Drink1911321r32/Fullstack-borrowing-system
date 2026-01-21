const cron = require('node-cron');
const { pool } = require('../config/db');

let penaltyRefundCronJob = null;

// ===================================================
// Credit Recovery Cron Job
// คืนเครดิตทีละน้อย: 5 เครดิต/7 วัน จนถึง 100
// ใช้สำหรับผู้ที่เครดิตติดลบหรือต่ำกว่า 100
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
    await connection.beginTransaction();
    
    // ดึงผู้ใช้ที่มีเครดิตต่ำกว่า 100 และมี schedule หรือเครดิตติดลบ
    const [usersToRecover] = await connection.query(`
      SELECT DISTINCT
        m.member_id,
        m.credit,
        m.first_name,
        m.last_name,
        COALESCE(prs.schedule_id, NULL) as schedule_id,
        COALESCE(prs.last_refund_date, DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as last_refund_date
      FROM members m
      LEFT JOIN penalty_refund_schedule prs ON m.member_id = prs.member_id 
        AND prs.is_completed = FALSE
      WHERE m.credit < 100
        AND m.status = 'active'
        AND (
          prs.next_refund_date IS NULL 
          OR prs.next_refund_date <= CURDATE()
          OR NOT EXISTS (
            SELECT 1 FROM penalty_refund_schedule prs2 
            WHERE prs2.member_id = m.member_id 
            AND prs2.is_completed = FALSE
          )
        )
      ORDER BY m.credit ASC
      LIMIT 100
    `);
    
    if (!usersToRecover || usersToRecover.length === 0) {
      await connection.commit();
      return { processed: 0, completed: 0 };
    }
    
    let processedCount = 0;
    let completedCount = 0;
    
    for (const user of usersToRecover) {
      const {
        member_id,
        credit,
        schedule_id,
        last_refund_date
      } = user;
      
      // ตรวจสอบว่าผ่านมา 7 วันแล้วหรือยัง
      const daysSinceLastRefund = schedule_id 
        ? Math.floor((new Date() - new Date(last_refund_date)) / (1000 * 60 * 60 * 24))
        : 7;
      
      if (daysSinceLastRefund < 7 && schedule_id) {
        continue; // ยังไม่ถึงเวลา
      }
      
      // คำนวณเครดิตที่จะคืน (5 เครดิตต่อครั้ง หรือเท่าที่ขาดถ้าน้อยกว่า 5)
      const creditNeeded = 100 - credit;
      const refundThisTime = Math.min(5, creditNeeded);
      
      if (refundThisTime <= 0) {
        // เครดิตครบ 100 แล้ว
        if (schedule_id) {
          await connection.query(
            'UPDATE penalty_refund_schedule SET is_completed = TRUE WHERE schedule_id = ?',
            [schedule_id]
          );
        }
        completedCount++;
        continue;
      }
      
      // คืนเครดิตให้ผู้ใช้
      await connection.query(
        'UPDATE members SET credit = credit + ? WHERE member_id = ?',
        [refundThisTime, member_id]
      );
      
      const newCredit = credit + refundThisTime;
      const isCompleted = newCredit >= 100;
      
      // บันทึกประวัติการคืนเครดิต
      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
        VALUES (?, ?, 'refund', 'auto_recovery', NULL, ?, ?, NULL, NOW())`,
        [
          member_id,
          refundThisTime,
          `คืนเครดิตอัตโนมัติ (${newCredit}/100 เครดิต)`,
          newCredit
        ]
      );
      
      // อัพเดทหรือสร้าง schedule
      if (schedule_id) {
        if (isCompleted) {
          await connection.query(
            `UPDATE penalty_refund_schedule 
             SET is_completed = TRUE, 
                 last_refund_date = CURDATE(),
                 updated_at = NOW()
             WHERE schedule_id = ?`,
            [schedule_id]
          );
          completedCount++;
        } else {
          await connection.query(
            `UPDATE penalty_refund_schedule 
             SET next_refund_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY),
                 last_refund_date = CURDATE(),
                 updated_at = NOW()
             WHERE schedule_id = ?`,
            [schedule_id]
          );
        }
      } else if (!isCompleted) {
        // สร้าง schedule ใหม่สำหรับการคืนเครดิตครั้งถัดไป
        await connection.query(
          `INSERT INTO penalty_refund_schedule 
          (transaction_id, member_id, total_penalty, refunded_amount, next_refund_date, last_refund_date, created_at)
          VALUES (NULL, ?, 0, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), CURDATE(), NOW())`,
          [member_id, refundThisTime]
        );
      }
      
      processedCount++;
    }
    
    await connection.commit();
    return { processed: processedCount, completed: completedCount };
  } catch (error) {
    await connection.rollback();
    console.error('❌ [Credit Recovery Cron] เกิดข้อผิดพลาด:', error);
    throw error;
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
