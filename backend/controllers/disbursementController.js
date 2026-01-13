const { pool } = require('../config/db');
const { notifyNewDisbursementRequest, notifyDisbursementApproved, notifyDisbursementRejected } = require('../utils/notificationHelper');

/**
 * สร้างคำขอเบิกจ่ายใหม่
 * รองรับการเบิกหลายรายการพร้อมกัน
 */
const createDisbursementRequest = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.member_id;
    const { equipment, disbursement_date, purpose, location, urgency } = req.body;

    // Validate input
    if (!disbursement_date || !equipment || equipment.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // ตรวจสอบว่าวันที่เบิกไม่เป็นวันที่ผ่านมาแล้ว
    const reqDate = new Date(disbursement_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reqDate < today) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'วันที่เบิกต้องไม่เป็นวันที่ผ่านมาแล้ว'
      });
    }

    await connection.beginTransaction();

    const createdTransactions = [];

    // สร้างรายการเบิกสำหรับแต่ละอุปกรณ์
    for (const item of equipment) {
      const { equipment_id, quantity } = item;

      if (!equipment_id || !quantity || quantity <= 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลอุปกรณ์ไม่ถูกต้อง'
        });
      }

      // ตรวจสอบว่ามีอุปกรณ์เพียงพอหรือไม่
      // 🔒 Lock equipment row to check quantity before creating disbursement request
      const [equipmentData] = await connection.query(
        'SELECT equipment_id, equipment_name, quantity, status FROM equipments WHERE equipment_id = ? FOR UPDATE',
        [equipment_id]
      );

      if (equipmentData.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: `ไม่พบอุปกรณ์ ID: ${equipment_id}`
        });
      }

      if (equipmentData[0].quantity < quantity) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `อุปกรณ์ ${equipmentData[0].equipment_name} มีจำนวนไม่เพียงพอ (มีอยู่ ${equipmentData[0].quantity} ชิ้น)`
        });
      }

      // สร้างรายการเบิก (ใช้ structure ที่ถูกต้อง)
      const [result] = await connection.query(
        `INSERT INTO disbursement_transactions 
        (member_id, equipment_id, request_date, disbursement_date, quantity_requested, status, purpose, notes, created_at, updated_at) 
        VALUES (?, ?, NOW(), ?, ?, 'Pending', ?, ?, NOW(), NOW())`,
        [
          userId, 
          equipment_id, 
          disbursement_date, 
          quantity, 
          purpose || '',
          `Location: ${location || 'ไม่ระบุ'}, Urgency: ${urgency || 'normal'}`
        ]
      );

      createdTransactions.push({
        transaction_id: result.insertId,
        equipment_id,
        equipment_name: equipmentData[0].equipment_name,
        quantity
      });
    }

    await connection.commit();

    // ส่ง notification ถึง admin สำหรับแต่ละรายการ
    try {
      const [userInfo] = await pool.query(
        'SELECT first_name, last_name FROM members WHERE member_id = ?',
        [userId]
      );

      for (const transaction of createdTransactions) {
        await notifyNewDisbursementRequest({
          user_name: `${userInfo[0].first_name} ${userInfo[0].last_name}`,
          equipment_name: transaction.equipment_name,
          quantity: transaction.quantity,
          transaction_id: transaction.transaction_id
        });
      }
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
    }

    res.status(201).json({
      success: true,
      message: 'สร้างคำขอเบิกจ่ายสำเร็จ รอการอนุมัติ',
      data: {
        transactions: createdTransactions,
        total_items: createdTransactions.length
      }
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    
    console.error('Error creating disbursement request:', error);
    
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างคำขอเบิกจ่าย',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ดึงรายการคำขอเบิกจ่ายของผู้ใช้
 */
const getUserDisbursements = async (req, res) => {
  try {
    const userId = req.user.member_id;

    const [disbursements] = await pool.query(
      `SELECT 
        dt.*,
        e.equipment_name,
        e.model,
        e.image_path,
        et.type_name,
        a.first_name as approver_first_name,
        a.last_name as approver_last_name
      FROM disbursement_transactions dt
      LEFT JOIN equipments e ON dt.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN admins a ON dt.approved_by_admin = a.admin_id
      WHERE dt.member_id = ?
      ORDER BY dt.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: disbursements
    });
  } catch (error) {
    console.error('Error fetching user disbursements:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเบิกจ่าย',
      error: error.message
    });
  }
};

/**
 * ดึงรายการคำขอเบิกจ่ายทั้งหมด (สำหรับ admin)
 */
const getAllDisbursements = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        dt.*,
        m.first_name,
        m.last_name,
        m.email,
        m.profile_image,
        e.equipment_name,
        e.model,
        e.image_path,
        et.type_name,
        a.first_name as approver_first_name,
        a.last_name as approver_last_name
      FROM disbursement_transactions dt
      LEFT JOIN members m ON dt.member_id = m.member_id
      LEFT JOIN equipments e ON dt.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN admins a ON dt.approved_by_admin = a.admin_id
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      query += ' AND dt.status = ?';
      params.push(status);
    }

    query += ' ORDER BY dt.created_at DESC';

    const [disbursements] = await pool.query(query, params);

    res.json({
      success: true,
      data: disbursements,
      total: disbursements.length
    });
  } catch (error) {
    console.error('Error fetching all disbursements:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเบิกจ่าย',
      error: error.message
    });
  }
};

/**
 * อนุมัติคำขอเบิกจ่าย (สำหรับ admin)
 */
const approveDisbursement = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const adminId = req.user.member_id;
    const { notes } = req.body;

    await connection.beginTransaction();

    // ตรวจสอบคำขอเบิก
    const [disbursement] = await connection.query(
      'SELECT * FROM disbursement_transactions WHERE transaction_id = ?',
      [id]
    );

    if (disbursement.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอเบิกนี้'
      });
    }

    if (disbursement[0].status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'คำขอนี้ได้รับการดำเนินการแล้ว'
      });
    }

    // ตรวจสอบจำนวนอุปกรณ์
    // 🔒 Lock equipment row to prevent over-disbursement
    const [equipment] = await connection.query(
      'SELECT quantity FROM equipments WHERE equipment_id = ? FOR UPDATE',
      [disbursement[0].equipment_id]
    );

    if (equipment[0].quantity < disbursement[0].quantity_requested) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'อุปกรณ์มีจำนวนไม่เพียงพอ'
      });
    }

    // อัพเดทสถานะเป็น Approved, ระบุจำนวนที่เบิก และลดจำนวนอุปกรณ์
    await connection.query(
      `UPDATE disbursement_transactions 
      SET status = 'Approved', 
          quantity_disbursed = ?,
          approved_by_admin = ?, 
          approval_date = NOW(), 
          notes = ?, 
          updated_at = NOW()
      WHERE transaction_id = ?`,
      [disbursement[0].quantity_requested, adminId, notes || '', id]
    );

    // ลด quantity ใน equipments table
    await connection.query(
      'UPDATE equipments SET quantity = quantity - ? WHERE equipment_id = ?',
      [disbursement[0].quantity_requested, disbursement[0].equipment_id]
    );

    await connection.commit();

    // ส่ง notification ถึง user
    try {
      const [equipmentInfo] = await connection.query(
        'SELECT equipment_name FROM equipments WHERE equipment_id = ?',
        [disbursement[0].equipment_id]
      );

      await notifyDisbursementApproved({
        user_id: disbursement[0].member_id,
        equipment_name: equipmentInfo[0].equipment_name,
        quantity: disbursement[0].quantity_requested,
        transaction_id: id
      });
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
    }

    res.json({
      success: true,
      message: 'อนุมัติคำขอเบิกจ่ายสำเร็จ'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving disbursement:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอนุมัติ',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ปฏิเสธคำขอเบิกจ่าย (สำหรับ admin)
 */
const rejectDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const [disbursement] = await pool.query(
      'SELECT dt.*, e.equipment_name FROM disbursement_transactions dt LEFT JOIN equipments e ON dt.equipment_id = e.equipment_id WHERE dt.transaction_id = ?',
      [id]
    );

    if (disbursement.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอเบิกนี้'
      });
    }

    if (disbursement[0].status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'คำขอนี้ได้รับการดำเนินการแล้ว'
      });
    }

    const reason = notes || 'ไม่อนุมัติโดยผู้ดูแลระบบ';

    await pool.query(
      `UPDATE disbursement_transactions 
      SET status = 'Cancelled', notes = ?, updated_at = NOW()
      WHERE transaction_id = ?`,
      [reason, id]
    );

    // ส่ง notification ถึง user
    try {
      await notifyDisbursementRejected({
        user_id: disbursement[0].member_id,
        equipment_name: disbursement[0].equipment_name,
        reason: reason,
        transaction_id: id
      });
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
    }

    res.json({
      success: true,
      message: 'ปฏิเสธคำขอเบิกจ่ายสำเร็จ'
    });
  } catch (error) {
    console.error('Error rejecting disbursement:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ',
      error: error.message
    });
  }
};

/**
 * ยกเลิกคำขอเบิก (User)
 */
const cancelDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.member_id;

    const [disbursement] = await pool.query(
      'SELECT * FROM disbursement_transactions WHERE transaction_id = ? AND member_id = ?',
      [id, userId]
    );

    if (disbursement.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอเบิกนี้'
      });
    }

    if (disbursement[0].status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถยกเลิกได้ เนื่องจากได้รับการอนุมัติแล้ว'
      });
    }

    await pool.query(
      `UPDATE disbursement_transactions 
      SET status = 'Cancelled', updated_at = NOW()
      WHERE transaction_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'ยกเลิกคำขอเบิกสำเร็จ'
    });
  } catch (error) {
    console.error('Error cancelling disbursement:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกคำขอ',
      error: error.message
    });
  }
};

module.exports = {
  createDisbursementRequest,
  getUserDisbursements,
  getAllDisbursements,
  approveDisbursement,
  rejectDisbursement,
  cancelDisbursement
};
