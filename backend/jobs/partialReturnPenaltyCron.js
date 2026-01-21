const cron = require('node-cron');
const { pool } = require('../config/db');
const { notifyCreditChange } = require('../utils/notificationHelper');
const { getPenaltyCreditPerDay, getPenaltyCreditPerHour } = require('../utils');

let partialReturnCronJob = null;

/**
 * Cron Job สำหรับหักเครดิตอัตโนมัติสำหรับการคืนไม่ครบ
 * รันทุกวันเวลา 00:30 น.
 * 
 * กฎการหักเครดิต:
 * - หัก 5 เครดิต/วัน/ชิ้นที่ขาด
 * - ทำงานต่อเนื่องจนกว่าจะคืนครบ
 * - เมื่อคืนครบ ผู้ใช้จะได้รับคืนเครดิตในอัตรา 5 เครดิต/7 วัน
 */
const startPartialReturnPenaltyCron = () => {
  // รันทุกวันเวลา 00:30 น.
  const cronSchedule = '30 0 * * *';
  
  partialReturnCronJob = cron.schedule(cronSchedule, async () => {
    try {
      await processPartialReturnPenalties();
    } catch (error) {
      console.error('[Penalty Cron] Error processing penalties:', error.message);
    }
  }, {
    runOnInit: false,
    name: 'PartialReturnPenalty'
  });
};

const stopPartialReturnPenaltyCron = () => {
  if (partialReturnCronJob) {
    partialReturnCronJob.stop();
    partialReturnCronJob.destroy();
    partialReturnCronJob = null;
  }
};

/**
 * ประมวลผลการหักเครดิตสำหรับรายการที่คืนไม่ครบ
 */
const processPartialReturnPenalties = async () => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // หารายการที่ยังคืนไม่ครบและเกินกำหนดคืน
    const [partialReturns] = await connection.query(`
      SELECT 
        bt.transaction_id,
        bt.member_id,
        bt.equipment_id,
        bt.quantity_borrowed,
        bt.total_returned,
        bt.expected_return_date,
        bt.last_penalty_date,
        bt.accumulated_penalty,
        bt.credit_deducted,
        e.equipment_name,
        e.credit as equipment_credit,
        m.credit as user_credit,
        m.first_name,
        m.last_name,
        (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) as missing_quantity,
        TIMESTAMPDIFF(HOUR, bt.expected_return_date, NOW()) as hours_overdue,
        TIMESTAMPDIFF(HOUR, bt.expected_return_date, NOW()) as hours_overdue,
        CEIL(TIMESTAMPDIFF(HOUR, bt.expected_return_date, NOW()) / 24) as days_overdue
      FROM borrowing_transactions bt
      JOIN equipments e ON bt.equipment_id = e.equipment_id
      JOIN members m ON bt.member_id = m.member_id
      WHERE bt.status IN ('Approved', 'Borrowed')
        AND bt.is_returned = FALSE
        AND (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) > 0
        AND bt.expected_return_date < NOW()
        AND (bt.last_penalty_date IS NULL OR DATE(bt.last_penalty_date) < CURDATE())
    `);
    
    let penaltyCount = 0;
    let totalDeducted = 0;
    
    for (const record of partialReturns) {
      const missingQty = record.missing_quantity;
      const hourlyPenalty = await getPenaltyCreditPerHour(); // อ่านจาก settings
      const hoursOverdue = record.hours_overdue;
      const penaltyAmount = Math.ceil(hourlyPenalty * hoursOverdue) * missingQty; // เครดิต/ชม. × ชม. × จำนวนชิ้นที่ขาด
      
      // ตรวจสอบว่าวันนี้หักไปแล้วหรือยัง
      const [existingPenalty] = await connection.query(
        `SELECT penalty_id FROM partial_return_penalties 
         WHERE borrowing_id = ? AND penalty_date = ?`,
        [record.transaction_id, todayStr]
      );
      
      if (existingPenalty.length > 0) {
        continue;
      }
      
      // หักเครดิต (อนุญาตให้ติดลบได้)
      await connection.query(
        'UPDATE members SET credit = credit - ? WHERE member_id = ?',
        [penaltyAmount, record.member_id]
      );
      
      const [userAfter] = await connection.query(
        'SELECT credit FROM members WHERE member_id = ?',
        [record.member_id]
      );
      
      const newBalance = userAfter[0].credit;
      
      // บันทึกในตาราง partial_return_penalties
      await connection.query(
        `INSERT INTO partial_return_penalties 
        (borrowing_id, member_id, penalty_date, missing_quantity, daily_penalty, credit_deducted, balance_after, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.transaction_id,
          record.member_id,
          todayStr,
          missingQty,
          hourlyPenalty,
          penaltyAmount,
          newBalance,
          `หักอัตโนมัติ: คืน${record.equipment_name}ไม่ครบ ${missingQty} ชิ้น (เกินกำหนด ${hoursOverdue} ชั่วโมง) - หัก ${penaltyAmount} เครดิต (${hourlyPenalty}/ชม./ชิ้น)`
        ]
      );
      
      // อัปเดท borrowing_transactions
      const newAccumulated = (record.accumulated_penalty || 0) + penaltyAmount;
      await connection.query(
        `UPDATE borrowing_transactions 
         SET last_penalty_date = ?, accumulated_penalty = ?
         WHERE transaction_id = ?`,
        [todayStr, newAccumulated, record.transaction_id]
      );
      
      // บันทึกประวัติเครดิต
      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_at)
        VALUES (?, ?, 'penalty', 'borrowing', ?, ?, ?, NOW())`,
        [
          record.member_id,
          -penaltyAmount,
          record.transaction_id,
          `ค่าปรับคืนไม่ครบ: ${record.equipment_name} (${missingQty} ชิ้น × ${hoursOverdue} ชม. × ${hourlyPenalty} เครดิต/ชม.)`,
          newBalance
        ]
      );
      
      // แจ้งเตือนผู้ใช้
      await notifyCreditChange(record.member_id, {
        amount: -penaltyAmount,
        description: `หักค่าปรับคืน${record.equipment_name}ไม่ครบ ${missingQty} ชิ้น (${penaltyAmount} เครดิต)`,
        balance_after: newBalance
      });
      
      penaltyCount++;
      totalDeducted += penaltyAmount;
    }
    
    await connection.commit();
    
    return {
      penaltyCount,
      totalDeducted,
      processedDate: todayStr
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error processing penalties:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * รัน manual สำหรับ testing
 */
const runManualPenaltyCheck = async () => {
  try {
    const result = await processPartialReturnPenalties();
    return result;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    throw error;
  }
};

module.exports = {
  startPartialReturnPenaltyCron,
  stopPartialReturnPenaltyCron,
  processPartialReturnPenalties
};
