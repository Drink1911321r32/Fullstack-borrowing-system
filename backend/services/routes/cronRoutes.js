const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { runManualCheck, checkDueSoonBorrowings, checkOverdueBorrowings } = require('../../jobs/reminderCronJob');
const { runManualPenaltyCheck } = require('../../jobs/partialReturnPenaltyCron');

/**
 * รัน manual check สำหรับการแจ้งเตือน (Admin only)
 * POST /api/cron/reminder/run
 */
router.post('/reminder/run', authenticate, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็น Admin
    const userRole = req.user.user_type || req.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const result = await runManualCheck();
    
    res.json({
      success: true,
      message: 'Manual check completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error running manual check:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรัน manual check',
      error: error.message
    });
  }
});

/**
 * รัน manual check สำหรับการหักเครดิตคืนไม่ครบ (Admin only)
 * POST /api/cron/penalty/run
 */
router.post('/penalty/run', authenticate, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็น Admin
    const userRole = req.user.user_type || req.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const result = await runManualPenaltyCheck();
    
    res.json({
      success: true,
      message: 'Penalty check completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error running penalty check:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรัน penalty check',
      error: error.message
    });
  }
});

/**
 * ตรวจสอบรายการที่ใกล้ครบกำหนด (Admin only)
 * GET /api/cron/reminder/due-soon
 */
router.get('/reminder/due-soon', authenticate, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็น Admin
    const userRole = req.user.user_type || req.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const { pool } = require('../../config/db');
    const [borrowings] = await pool.query(`
      SELECT 
        bt.transaction_id,
        bt.member_id,
        bt.expected_return_date,
        bt.borrow_date,
        e.equipment_name,
        e.equipment_id,
        CONCAT(m.first_name, ' ', m.last_name) as user_name,
        DATEDIFF(bt.expected_return_date, CURDATE()) as days_remaining
      FROM borrowing_transactions bt
      JOIN equipments e ON bt.equipment_id = e.equipment_id
      JOIN members m ON bt.member_id = m.member_id
      WHERE bt.status IN ('Approved', 'Borrowed')
        AND bt.is_returned = FALSE
        AND (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) > 0
        AND DATEDIFF(bt.expected_return_date, CURDATE()) BETWEEN 0 AND 3
      ORDER BY bt.expected_return_date ASC
    `);

    res.json({
      success: true,
      count: borrowings.length,
      data: borrowings
    });
  } catch (error) {
    console.error('Error getting due soon borrowings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  }
});

/**
 * ตรวจสอบรายการที่เกินกำหนด (Admin only)
 * GET /api/cron/reminder/overdue
 */
router.get('/reminder/overdue', authenticate, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็น Admin
    const userRole = req.user.user_type || req.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const { pool } = require('../../config/db');
    const [borrowings] = await pool.query(`
      SELECT 
        bt.transaction_id,
        bt.member_id,
        bt.expected_return_date,
        bt.borrow_date,
        e.equipment_name,
        e.equipment_id,
        CONCAT(m.first_name, ' ', m.last_name) as user_name,
        ABS(DATEDIFF(CURDATE(), bt.expected_return_date)) as days_overdue
      FROM borrowing_transactions bt
      JOIN equipments e ON bt.equipment_id = e.equipment_id
      JOIN members m ON bt.member_id = m.member_id
      WHERE bt.status IN ('Approved', 'Borrowed')
        AND bt.is_returned = FALSE
        AND (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) > 0
        AND bt.expected_return_date < CURDATE()
      ORDER BY days_overdue DESC
    `);

    res.json({
      success: true,
      count: borrowings.length,
      data: borrowings
    });
  } catch (error) {
    console.error('Error getting overdue borrowings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  }
});

/**
 * ดูสถานะ Cron Job (Admin only)
 * GET /api/cron/status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็น Admin
    const userRole = req.user.user_type || req.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    res.json({
      success: true,
      data: {
        reminderCronJob: {
          status: 'active',
          schedule: '*/15 * * * *', // ทุก 15 นาที
          description: 'ตรวจสอบและแจ้งเตือนรายการยืมที่ใกล้ครบกำหนดและเกินกำหนด (อัตโนมัติ)',
          nextRun: 'ทุก 15 นาที'
        }
      }
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  }
});

module.exports = router;
