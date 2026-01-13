const { pool } = require('../config/db');
const { notifyCreditChange, notifyCreditAdjustmentToAdmins } = require('../utils/notificationHelper');

/**
 * ดึงประวัติเครดิตของผู้ใช้
 */
const getUserCreditHistory = async (req, res) => {
  try {
    const userId = req.user.member_id;
    const { limit = 50, offset = 0 } = req.query;

    const [transactions] = await pool.query(
      `SELECT 
        ct.*,
        m.first_name,
        m.last_name,
        a.first_name as creator_first_name,
        a.last_name as creator_last_name
      FROM credit_transactions ct
      LEFT JOIN members m ON ct.member_id = m.member_id
      LEFT JOIN admins a ON ct.created_by_admin = a.admin_id
      WHERE ct.member_id = ?
      ORDER BY ct.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // ดึงเครดิตปัจจุบัน
    const [user] = await pool.query(
      'SELECT credit FROM members WHERE member_id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: {
        currentCredit: user[0]?.credit || 0,
        transactions
      }
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติเครดิต',
      error: error.message
    });
  }
};

/**
 * ดึงประวัติเครดิตของผู้ใช้ทั้งหมด (Admin)
 */
const getAllCreditHistory = async (req, res) => {
  try {
    const { userId, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        ct.*,
        m.first_name,
        m.last_name,
        m.email,
        m.profile_image,
        a.first_name as creator_first_name,
        a.last_name as creator_last_name
      FROM credit_transactions ct
      LEFT JOIN members m ON ct.member_id = m.member_id
      LEFT JOIN admins a ON ct.created_by_admin = a.admin_id
    `;

    const params = [];
    
    if (userId) {
      query += ' WHERE ct.member_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [transactions] = await pool.query(query, params);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching all credit history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติเครดิต',
      error: error.message
    });
  }
};

/**
 * เพิ่ม/ลดเครดิตผู้ใช้ด้วยตนเอง (Admin)
 */
const adjustUserCredit = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { userId, amount, description } = req.body;
    const adminId = req.user.admin_id;

    if (!userId || !amount || amount === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุผู้ใช้และจำนวนเครดิตที่ต้องการปรับ'
      });
    }

    await connection.beginTransaction();

    // ดึงข้อมูลผู้ใช้
    // 🔒 Lock user row to prevent concurrent credit adjustments
    const [user] = await connection.query(
      'SELECT credit, first_name, last_name FROM members WHERE member_id = ? FOR UPDATE',
      [userId]
    );

    if (user.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้นี้'
      });
    }

    // ตรวจสอบว่าเครดิตไม่ติดลบ
    const newCredit = user[0].credit + parseInt(amount);
    if (newCredit < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'เครดิตไม่สามารถติดลบได้'
      });
    }

    // อัปเดทเครดิต
    await connection.query(
      'UPDATE members SET credit = ?, updated_at = NOW() WHERE member_id = ?',
      [newCredit, userId]
    );

    // บันทึกประวัติ
    await connection.query(
      `INSERT INTO credit_transactions 
      (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
      VALUES (?, ?, 'adjustment', 'manual', NULL, ?, ?, ?, NOW())`,
      [
        userId,
        parseInt(amount),
        description || `ปรับเครดิตโดย Admin`,
        newCredit,
        adminId
      ]
    );

    await connection.commit();

    // สร้างการแจ้งเตือนให้ผู้ใช้
    await notifyCreditChange(userId, {
      amount: parseInt(amount),
      description: description || `ปรับเครดิตโดย Admin`,
      balance_after: newCredit
    });

    // สร้างการแจ้งเตือนให้ Admin คนอื่นๆ
    await notifyCreditAdjustmentToAdmins(userId, {
      amount: parseInt(amount),
      balance_after: newCredit
    }, adminId);

    res.json({
      success: true,
      message: `ปรับเครดิตสำเร็จ ${amount > 0 ? '+' : ''}${amount} คะแนน`,
      data: {
        previousCredit: user[0].credit,
        newCredit,
        amount: parseInt(amount)
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adjusting credit:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปรับเครดิต',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getUserCreditHistory,
  getAllCreditHistory,
  adjustUserCredit
};
