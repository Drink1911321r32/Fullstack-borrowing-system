const { pool } = require('../config/db');

// Import Services
const userManagementService = require('../services/admin/userManagementService');
const dashboardService = require('../services/admin/dashboardService');
const creditManagementService = require('../services/admin/creditManagementService');
const reportService = require('../services/admin/reportService');
const profileImageService = require('../services/admin/profileImageService');

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await userManagementService.getAllUsersData();

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลผู้ใช้ตาม ID
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userManagementService.getUserByIdData(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: error.message
    });
  }
};

/**
 * สร้างผู้ใช้ใหม่
 */
const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      member_type = 'student',
      student_code,
      credit = 100
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
      });
    }

    // ตรวจสอบ member_type
    if (!['student', 'teacher', 'staff'].includes(member_type)) {
      return res.status(400).json({
        success: false,
        message: 'ประเภทผู้ใช้ไม่ถูกต้อง (student, teacher, staff)'
      });
    }

    // ตรวจสอบ email ซ้ำ
    if (await userManagementService.checkEmailExists(email)) {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว'
      });
    }

    // ตรวจสอบรหัสนักศึกษาซ้ำ
    if (member_type === 'student' && student_code) {
      if (await userManagementService.checkStudentCodeExists(student_code)) {
        return res.status(409).json({
          success: false,
          message: 'รหัสนักศึกษานี้ถูกใช้งานแล้ว'
        });
      }
    }

    // สร้างผู้ใช้ใหม่
    const memberId = await userManagementService.createNewUser({
      email,
      password,
      first_name,
      last_name,
      member_type,
      student_code,
      credit
    });

    res.status(201).json({
      success: true,
      message: `สร้าง${member_type === 'student' ? 'นักเรียน' : member_type === 'teacher' ? 'อาจารย์' : 'เจ้าหน้าที่'}สำเร็จ`,
      data: {
        member_id: memberId,
        email,
        first_name,
        last_name,
        member_type,
        student_code: member_type === 'student' ? student_code : undefined
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้',
      error: error.message
    });
  }
};

/**
 * แก้ไขข้อมูลผู้ใช้
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      credit
    } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const [existingUser] = await pool.query(
      'SELECT member_id FROM members WHERE member_id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // สร้าง query แบบ dynamic
    const updateFields = [];
    const updateValues = [];

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name);
    }
    if (credit !== undefined) {
      updateFields.push('credit = ?');
      updateValues.push(credit);
    }
    if (password !== undefined && password !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีข้อมูลที่ต้องการแก้ไข'
      });
    }

    updateValues.push(userId);

    const query = `UPDATE members SET ${updateFields.join(', ')} WHERE member_id = ?`;
    await pool.query(query, updateValues);

    res.json({
      success: true,
      message: 'แก้ไขข้อมูลผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้',
      error: error.message
    });
  }
};

/**
 * ระงับการใช้งานผู้ใช้
 */
const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const [existingUser] = await pool.query(
      'SELECT member_id, status FROM members WHERE member_id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ถ้าระงับอยู่แล้ว ก็ให้ success
    if (existingUser[0].status === 'suspended') {
      return res.json({
        success: true,
        message: 'ผู้ใช้ถูกระงับการใช้งานอยู่แล้ว'
      });
    }

    // ระงับการใช้งาน
    await pool.query(
      'UPDATE members SET status = ? WHERE member_id = ?',
      ['suspended', userId]
    );

    res.json({
      success: true,
      message: 'ระงับการใช้งานผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการระงับผู้ใช้',
      error: error.message
    });
  }
};

/**
 * เปิดใช้งานผู้ใช้
 */
const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const [existingUser] = await pool.query(
      'SELECT member_id, status FROM members WHERE member_id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ถ้าเปิดใช้งานอยู่แล้ว ก็ให้ success
    if (existingUser[0].status === 'active') {
      return res.json({
        success: true,
        message: 'ผู้ใช้เปิดใช้งานอยู่แล้ว'
      });
    }

    // เปิดใช้งาน
    await pool.query(
      'UPDATE members SET status = ? WHERE member_id = ?',
      ['active', userId]
    );

    res.json({
      success: true,
      message: 'เปิดใช้งานผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปิดใช้งานผู้ใช้',
      error: error.message
    });
  }
};

/**
 * ลบผู้ใช้
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const [existingUser] = await pool.query(
      'SELECT member_id, first_name, last_name, email FROM members WHERE member_id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ตรวจสอบว่ามีรายการยืมที่ยังไม่คืนหรือไม่
    const [activeTransactions] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM borrowing_transactions bt
       WHERE bt.member_id = ? 
       AND bt.status IN ('Approved', 'Borrowed')
       AND (bt.is_returned = 0 OR bt.is_returned IS NULL)`,
      [userId]
    );

    if (activeTransactions[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบผู้ใช้ที่มีรายการยืมค้างอยู่ได้ กรุณารอให้คืนอุปกรณ์ครบก่อน'
      });
    }

    // Hard Delete - ลบผู้ใช้ออกจากระบบ
    // ลบข้อมูล student ก่อน (ถ้ามี) เพื่อหลีกเลี่ยง foreign key constraint
    await pool.query(
      'DELETE FROM students WHERE member_id = ?',
      [userId]
    );

    // ลบผู้ใช้
    await pool.query(
      'DELETE FROM members WHERE member_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: `ลบบัญชี "${existingUser[0].email}" สำเร็จ`,
      action: 'deleted'
    });
  } catch (error) {
    console.error('Error deleting user:', error);

    // ถ้า error เพราะ FOREIGN KEY CONSTRAINT
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบผู้ใช้ได้ เนื่องจากมีข้อมูลที่เกี่ยวข้องในระบบ กรุณาปิดการใช้งานแทน'
      });
    }

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบผู้ใช้',
      error: error.message
    });
  }
};

/**
 * เปิด/ปิดการใช้งานผู้ใช้ (Toggle user status)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const [existingUser] = await pool.query(
      'SELECT member_id, first_name, last_name, email, status FROM members WHERE member_id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // Toggle status
    const currentStatus = existingUser[0].status;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    await pool.query(
      'UPDATE members SET status = ?, updated_at = NOW() WHERE member_id = ?',
      [newStatus, userId]
    );

    res.json({
      success: true,
      message: newStatus === 'suspended'
        ? `ปิดการใช้งานบัญชี "${existingUser[0].email}" แล้ว`
        : `เปิดการใช้งานบัญชี "${existingUser[0].email}" แล้ว`,
      status: newStatus
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้',
      error: error.message
    });
  }
};

/**
 * ดึงสถิติผู้ใช้
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await userManagementService.getUserStatsData();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้',
      error: error.message
    });
  }
};

/**
 * ดึงสถิติสำหรับ Dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    // ✅ ตรวจสอบ cache ก่อน
    const cachedData = dashboardService.getDashboardStatsFromCache();
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    // ดึงข้อมูลใหม่
    const statsData = await dashboardService.getDashboardStatsData();

    // ✅ บันทึก cache
    dashboardService.setDashboardStatsCache(statsData);

    res.json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติแดชบอร์ด',
      error: error.message
    });
  }
};

/**
 * SSE Stream สำหรับ real-time dashboard updates
 */
const streamDashboardUpdates = async (req, res) => {
  const dashboardEmitter = require('../utils/dashboardEventEmitter');

  // ตั้งค่า SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // ส่งข้อความเริ่มต้น
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Dashboard SSE connected' })}\n\n`);

  // เพิ่ม client เข้าระบบ
  dashboardEmitter.addClient(res);

  // ส่งข้อมูลเริ่มต้น
  try {
    const { pool } = require('../config/db');

    // ฟังก์ชันสำหรับดึงและส่งข้อมูล
    const sendStats = async () => {
      try {
        // ดึงข้อมูลแบบเดียวกับ getDashboardStats แต่ส่งผ่าน SSE
        const [memberStats] = await pool.query(`
          SELECT 
            COUNT(*) as total_members,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_members,
            COALESCE(SUM(credit), 0) as total_credits,
            COALESCE(AVG(credit), 0) as avg_credits
          FROM members
        `);
        const [adminStats] = await pool.query(`
          SELECT COUNT(*) as total_admins FROM admins
        `);

        const userStats = [{
          total_users: (memberStats[0].total_members || 0) + (adminStats[0].total_admins || 0),
          total_admins: adminStats[0].total_admins || 0,
          total_regular_users: memberStats[0].total_members || 0,
          active_users: memberStats[0].active_members || 0,
          total_credits: memberStats[0].total_credits || 0,
          avg_credits: memberStats[0].avg_credits || 0
        }];

        const [equipmentStats] = await pool.query(`
          SELECT 
            COUNT(DISTINCT e.equipment_id) as total_equipment_types,
            COALESCE((SELECT COUNT(*) FROM equipment_items), 0) as loan_quantity,
            COALESCE((
              SELECT SUM(e2.quantity)
              FROM equipments e2
              LEFT JOIN equipmenttypes et ON e2.type_id = et.type_id
              WHERE et.usage_type = 'Disbursement'
            ), 0) as disbursement_quantity,
            COALESCE((
              SELECT COUNT(*) 
              FROM equipment_items ei 
              WHERE ei.status = 'Available'
            ), 0) as available_loan_quantity,
            COALESCE((
              SELECT SUM(
                e2.quantity - COALESCE((
                  SELECT SUM(dt.quantity_disbursed)
                  FROM disbursement_transactions dt
                  WHERE dt.equipment_id = e2.equipment_id 
                  AND dt.status = 'Disbursed'
                ), 0)
              )
              FROM equipments e2
              LEFT JOIN equipmenttypes et ON e2.type_id = et.type_id
              WHERE et.usage_type = 'Disbursement'
            ), 0) as available_disbursement_quantity,
            COALESCE((
              SELECT COUNT(*) 
              FROM equipment_items ei 
              WHERE ei.status = 'Borrowed'
            ), 0) as borrowed_quantity,
            COALESCE((
              SELECT COUNT(*) 
              FROM equipment_items ei 
              WHERE ei.status = 'Maintenance' OR ei.status = 'Repairing'
            ), 0) as maintenance_quantity,
            COALESCE((
              SELECT COUNT(*) 
              FROM equipment_items ei 
              WHERE ei.status = 'Damaged'
            ), 0) as damaged_quantity
          FROM equipments e
        `);

        // Convert string results to numbers and match REST API structure
        const loanQty = parseInt(equipmentStats[0]?.loan_quantity) || 0;
        const disbursementQty = parseInt(equipmentStats[0]?.disbursement_quantity) || 0;
        const availableLoanQty = parseInt(equipmentStats[0]?.available_loan_quantity) || 0;
        const availableDisbursementQty = parseInt(equipmentStats[0]?.available_disbursement_quantity) || 0;

        const equipmentData = {
          total_equipment: loanQty + disbursementQty,
          total_equipment_types: equipmentStats[0]?.total_equipment_types || 0,
          total_quantity: loanQty + disbursementQty,
          loan_quantity: loanQty,
          disbursement_quantity: disbursementQty,
          available_quantity: availableLoanQty + availableDisbursementQty,
          available_loan_quantity: availableLoanQty,
          available_disbursement_quantity: availableDisbursementQty,
          borrowed_quantity: equipmentStats[0]?.borrowed_quantity || 0,
          maintenance_quantity: equipmentStats[0]?.maintenance_quantity || 0,
          damaged_quantity: equipmentStats[0]?.damaged_quantity || 0
        };

        const [borrowingStats] = await pool.query(`
          SELECT 
            COUNT(*) as total_borrowings,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_borrowings,
            SUM(CASE WHEN status = 'Approved' OR status = 'Borrowed' THEN 1 ELSE 0 END) as approved_borrowings,
            SUM(CASE WHEN (status = 'Approved' OR status = 'Borrowed') AND (is_returned = 0 OR is_returned IS NULL) THEN 1 ELSE 0 END) as active_borrowings,
            SUM(CASE WHEN is_returned = 1 THEN 1 ELSE 0 END) as returned_borrowings,
            SUM(CASE WHEN (status = 'Approved' OR status = 'Borrowed') AND (is_returned = 0 OR is_returned IS NULL) AND expected_return_date < NOW() THEN 1 ELSE 0 END) as overdue_borrowings,
            SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_borrowings
          FROM borrowing_transactions
        `);

        const [disbursementStats] = await pool.query(`
          SELECT 
            COUNT(*) as total_disbursements,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_disbursements,
            SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_disbursements,
            SUM(CASE WHEN status = 'Disbursed' THEN 1 ELSE 0 END) as completed_disbursements
          FROM disbursement_transactions
        `);

        const statsData = {
          users: userStats[0],
          equipment: equipmentData,
          borrowings: borrowingStats[0],
          disbursements: disbursementStats[0]
        };

        res.write(`data: ${JSON.stringify({ type: 'stats-update', data: statsData })}\n\n`);
      } catch (error) {
        console.error('Error sending stats:', error);
      }
    };

    // ส่งข้อมูลเริ่มต้น
    await sendStats();

    // ตั้งค่า listener สำหรับการอัพเดต
    const onStatsChanged = async () => {
      await sendStats();
    };

    dashboardEmitter.on('stats-changed', onStatsChanged);

    // จัดการเมื่อ client disconnect
    req.on('close', () => {
      dashboardEmitter.removeClient(res);
      dashboardEmitter.off('stats-changed', onStatsChanged);
    });

  } catch (error) {
    console.error('Error in dashboard stream:', error);
    dashboardEmitter.removeClient(res);
    res.end();
  }
};

/**
 * จัดการเครดิตผู้ใช้โดย Admin (เพิ่ม/ลด/รีเซ็ต)
 */
const manageCreditByAdmin = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { userId } = req.params;
    const { action, amount, reason, note } = req.body;
    const adminId = req.user.admin_id;

    const result = await creditManagementService.manageCreditByAdmin(
      connection, userId, { action, amount, reason, note }, adminId
    );

    await connection.commit();

    res.json({
      success: true,
      message: `${action === 'add' ? 'เพิ่ม' : action === 'deduct' ? 'หัก' : 'รีเซ็ต'}เครดิตสำเร็จ`,
      data: result
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error managing credit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการจัดการเครดิต',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ดึงประวัติเครดิตของผู้ใช้
 */
const getUserCreditHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query;

    const transactions = await creditManagementService.getUserCreditHistoryData(userId, type);

    res.json({
      success: true,
      data: transactions,
      total: transactions.length
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
 * ดึงประวัติเครดิตทั้งหมด (สำหรับ admin)
 */
const getAllCreditHistory = async (req, res) => {
  try {
    const { type = 'all', limit = 50 } = req.query;

    const transactions = await creditManagementService.getAllCreditHistoryData(type, limit);

    res.json({
      success: true,
      data: transactions,
      total: transactions.length
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
 * อัปโหลดรูปโปรไฟล์สำหรับผู้ใช้โดย Admin (ใช้จาก profileImageService)
 */
const uploadUserProfileImage = profileImageService.uploadProfileImage.single('profile_image');

/**
 * อัปเดทรูปโปรไฟล์ของผู้ใช้โดย Admin
 */
const updateUserProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์รูปภาพ'
      });
    }

    const updatedUser = await profileImageService.updateUserProfileImageData(userId, req.file);

    res.json({
      success: true,
      message: 'อัปโหลดรูปโปรไฟล์สำเร็จ',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error uploading user profile image:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
      error: error.message
    });
  }
};

/**
 * ลบรูปโปรไฟล์ของผู้ใช้โดย Admin
 */
const deleteUserProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;

    const updatedUser = await profileImageService.deleteUserProfileImageData(userId);

    res.json({
      success: true,
      message: 'ลบรูปโปรไฟล์สำเร็จ',
      data: updatedUser
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    if (!users[0].profile_image) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีรูปโปรไฟล์ให้ลบ'
      });
    }

    // ลบไฟล์รูปภาพ
    const imagePath = path.join(__dirname, '..', users[0].profile_image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // อัปเดทฐานข้อมูล
    await pool.query('UPDATE members SET profile_image = NULL WHERE member_id = ?', [userId]);

    // ดึงข้อมูลผู้ใช้ที่อัปเดทแล้ว
    const [updatedUsers] = await pool.query(
      'SELECT member_id as user_id, email, first_name, last_name, "user" as role, status, credit, profile_image, created_at, updated_at FROM members WHERE member_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'ลบรูปโปรไฟล์สำเร็จ',
      data: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error deleting user profile image:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบรูปภาพ',
      error: error.message
    });
  }
};

/**
 * ดึงสถิติสำหรับ Reports (ข้อมูลเชิงลึกสำหรับรายงาน)
 */
const getReportsStats = async (req, res) => {
  try {
    const {
      dateRange = '30days',
      equipmentPeriod = 'all',
      creditPeriod = 'monthly',
      startDate: customStartDate,
      endDate: customEndDate
    } = req.query;

    // คำนวณวันที่เริ่มต้น
    let startDate, endDate, daysBack = 30;

    if (customStartDate && customEndDate) {
      // ใช้วันที่ที่ผู้ใช้เลือก
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      // ใช้ preset date range - คำนวณจาก dateRange
      if (dateRange === '7days') daysBack = 7;
      else if (dateRange === '30days') daysBack = 30;
      else if (dateRange === '3months') daysBack = 90;
      else if (dateRange === '1year') daysBack = 365;
      
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      // แปลงเป็น string รูปแบบ YYYY-MM-DD
      startDate = startDate.toISOString().split('T')[0];
      endDate = endDate.toISOString().split('T')[0];
    }

    // คำนวณช่วงเวลาสำหรับ Equipment Usage
    let equipmentDateFilter = startDate;
    if (equipmentPeriod === 'daily') {
      equipmentDateFilter = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    } else if (equipmentPeriod === 'monthly') {
      equipmentDateFilter = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    } else if (equipmentPeriod === 'yearly') {
      equipmentDateFilter = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    }

    // คำนวณช่วงเวลาสำหรับ Disbursement Usage
    const { disbursementPeriod = 'all' } = req.query;
    let disbursementDateFilter = startDate;
    if (disbursementPeriod === 'daily') {
      disbursementDateFilter = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    } else if (disbursementPeriod === 'monthly') {
      disbursementDateFilter = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    } else if (disbursementPeriod === 'yearly') {
      disbursementDateFilter = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    }

    // ========== Overview Stats ==========
    const [overviewStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM borrowing_transactions 
         WHERE status IN ('Approved', 'Borrowed', 'Completed')) as totalBorrowings,
        (SELECT COUNT(*) FROM borrowing_transactions 
         WHERE status IN ('Borrowed', 'Approved')) as activeBorrowings,
        (SELECT COUNT(DISTINCT bt.transaction_id) 
         FROM borrowing_transactions bt
         LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
         WHERE bt.expected_return_date < COALESCE(rt.actual_return_date, CURDATE())
         AND bt.status IN ('Borrowed', 'Completed')
         AND bt.expected_return_date IS NOT NULL) as overdueBorrowings,
        (SELECT COUNT(*) FROM members) as totalUsers,
        (SELECT COUNT(DISTINCT e.equipment_id) FROM equipments e) as totalEquipment,
        (SELECT ROUND(AVG(DATEDIFF(expected_return_date, borrow_date))) 
         FROM borrowing_transactions 
         WHERE expected_return_date IS NOT NULL 
         AND status IN ('Borrowed', 'Completed')) as averageBorrowDays,
        (SELECT COUNT(*) FROM return_transactions) as totalReturns,
        (SELECT COUNT(*) FROM disbursement_transactions 
         WHERE status IN ('Approved', 'Completed')) as totalDisbursements
    `);

    // ========== Borrowing Trends (รายวัน) ==========
    // สร้างตารางวันที่ทั้งหมดตั้งแต่ 1 ธันวาคม 2024 จนถึงปัจจุบัน
    const [borrowingTrends] = await pool.query(`
      WITH RECURSIVE date_range AS (
        SELECT ? as date
        UNION ALL
        SELECT DATE_ADD(date, INTERVAL 1 DAY)
        FROM date_range
        WHERE date < CURDATE()
      ),
      borrowing_counts AS (
        SELECT 
          DATE(COALESCE(approval_date, borrow_date)) as date,
          COUNT(*) as borrowings
        FROM borrowing_transactions
        WHERE status IN ('Approved', 'Borrowed', 'Completed')
          AND COALESCE(approval_date, borrow_date) >= ?
        GROUP BY DATE(COALESCE(approval_date, borrow_date))
      ),
      return_counts AS (
        SELECT 
          DATE(actual_return_date) as date,
          COUNT(*) as returns
        FROM return_transactions
        WHERE actual_return_date >= ?
        GROUP BY DATE(actual_return_date)
      ),
      overdue_counts AS (
        SELECT 
          DATE(bt.expected_return_date) as date,
          COUNT(DISTINCT bt.transaction_id) as overdue
        FROM borrowing_transactions bt
        LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
        WHERE bt.expected_return_date < COALESCE(rt.actual_return_date, CURDATE())
          AND bt.expected_return_date >= ?
          AND bt.status IN ('Borrowed', 'Completed')
        GROUP BY DATE(bt.expected_return_date)
      )
      SELECT 
        dr.date,
        COALESCE(bc.borrowings, 0) as borrowings,
        COALESCE(rc.returns, 0) as returns,
        COALESCE(oc.overdue, 0) as overdue
      FROM date_range dr
      LEFT JOIN borrowing_counts bc ON dr.date = bc.date
      LEFT JOIN return_counts rc ON dr.date = rc.date
      LEFT JOIN overdue_counts oc ON dr.date = oc.date
      ORDER BY dr.date ASC
    `, [startDate, startDate, startDate, startDate]);

    // ========== Disbursement Trends (รายวัน) ==========
    const [disbursementTrends] = await pool.query(`
      WITH RECURSIVE date_range AS (
        SELECT ? as date
        UNION ALL
        SELECT DATE_ADD(date, INTERVAL 1 DAY)
        FROM date_range
        WHERE date < CURDATE()
      ),
      disbursement_counts AS (
        SELECT 
          DATE(request_date) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'Disbursed' THEN 1 ELSE 0 END) as completed
        FROM disbursement_transactions
        WHERE request_date >= ?
        GROUP BY DATE(request_date)
      )
      SELECT 
        dr.date,
        COALESCE(dc.total, 0) as total,
        COALESCE(dc.pending, 0) as pending,
        COALESCE(dc.approved, 0) as approved,
        COALESCE(dc.completed, 0) as completed
      FROM date_range dr
      LEFT JOIN disbursement_counts dc ON dr.date = dc.date
      ORDER BY dr.date ASC
    `, [startDate, startDate]);

    // ========== Equipment Usage by Type (10 อันดับ) ==========
    const [equipmentUsage] = await pool.query(`
      SELECT 
        et.type_name as category,
        et.type_id,
        COUNT(DISTINCT bt.transaction_id) as count,
        ROUND(
          CASE 
            WHEN (SELECT COUNT(*) FROM borrowing_transactions 
                  WHERE status IN ('Approved', 'Borrowed', 'Completed')
                  AND COALESCE(approval_date, borrow_date) >= ?) > 0
            THEN COUNT(DISTINCT bt.transaction_id) * 100.0 / 
                 (SELECT COUNT(*) FROM borrowing_transactions 
                  WHERE status IN ('Approved', 'Borrowed', 'Completed')
                  AND COALESCE(approval_date, borrow_date) >= ?)
            ELSE 0
          END, 
          1
        ) as percentage
      FROM equipmenttypes et
      LEFT JOIN equipments e ON et.type_id = e.type_id
      LEFT JOIN borrowing_transactions bt ON e.equipment_id = bt.equipment_id
      WHERE bt.status IN ('Approved', 'Borrowed', 'Completed')
        AND bt.transaction_id IS NOT NULL
        AND COALESCE(bt.approval_date, bt.borrow_date) >= ?
      GROUP BY et.type_id, et.type_name
      ORDER BY count DESC
      LIMIT 10
    `, [equipmentDateFilter, equipmentDateFilter, equipmentDateFilter]);

    console.log('📊 Equipment Usage Query Result:');
    console.log('Equipment Date Filter:', equipmentDateFilter);
    console.log('Raw equipment usage data:', JSON.stringify(equipmentUsage, null, 2));

    // ดึงอุปกรณ์ยอดนิยม 10 อันดับในแต่ละประเภท
    const equipmentUsageWithTop10 = await Promise.all(equipmentUsage.map(async (typeRow) => {
      const [topEquipments] = await pool.query(`
        SELECT 
          e.equipment_name,
          COUNT(bt.transaction_id) as borrowCount
        FROM equipments e
        LEFT JOIN borrowing_transactions bt ON e.equipment_id = bt.equipment_id
        WHERE e.type_id = ?
          AND bt.status IN ('Approved', 'Borrowed', 'Completed')
          AND COALESCE(bt.approval_date, bt.borrow_date) >= ?
        GROUP BY e.equipment_id, e.equipment_name
        ORDER BY borrowCount DESC
        LIMIT 10
      `, [typeRow.type_id, equipmentDateFilter]);

      return {
        category: typeRow.category,
        count: typeRow.count,
        percentage: typeRow.percentage,
        topEquipments: topEquipments.map(eq => ({
          name: eq.equipment_name,
          borrowCount: parseInt(eq.borrowCount) || 0
        }))
      };
    }));

    console.log('📦 Equipment Usage With Top 10:', JSON.stringify(equipmentUsageWithTop10, null, 2));

    // ========== Disbursement Usage by Type (10 อันดับ) ==========
    const [disbursementUsage] = await pool.query(`
      SELECT 
        et.type_name as category,
        et.type_id,
        COUNT(DISTINCT dt.transaction_id) as count,
        SUM(CASE 
          WHEN dt.quantity_disbursed > 0 THEN dt.quantity_disbursed 
          ELSE dt.quantity_requested 
        END) as totalQuantity,
        ROUND(
          CASE 
            WHEN (SELECT COUNT(*) FROM disbursement_transactions 
                  WHERE status IN ('Approved', 'Disbursed')
                  AND request_date >= ?) > 0
            THEN COUNT(DISTINCT dt.transaction_id) * 100.0 / 
                 (SELECT COUNT(*) FROM disbursement_transactions 
                  WHERE status IN ('Approved', 'Disbursed')
                  AND request_date >= ?)
            ELSE 0
          END,
          1
        ) as percentage
      FROM equipmenttypes et
      LEFT JOIN equipments e ON et.type_id = e.type_id
      LEFT JOIN disbursement_transactions dt ON e.equipment_id = dt.equipment_id
      WHERE dt.status IN ('Approved', 'Disbursed')
        AND dt.transaction_id IS NOT NULL
        AND dt.request_date >= ?
      GROUP BY et.type_id, et.type_name
      ORDER BY count DESC
      LIMIT 10
    `, [disbursementDateFilter, disbursementDateFilter, disbursementDateFilter]);

    // ดึงอุปกรณ์ที่ถูกเบิกจ่ายมากสุด 10 อันดับในแต่ละประเภท
    const disbursementUsageWithTop10 = await Promise.all(disbursementUsage.map(async (typeRow) => {
      const [topEquipments] = await pool.query(`
        SELECT 
          e.equipment_name,
          COUNT(dt.transaction_id) as disbursementCount,
          SUM(CASE 
            WHEN dt.quantity_disbursed > 0 THEN dt.quantity_disbursed 
            ELSE dt.quantity_requested 
          END) as totalQuantity
        FROM equipments e
        LEFT JOIN disbursement_transactions dt ON e.equipment_id = dt.equipment_id
        WHERE e.type_id = ?
          AND dt.status IN ('Approved', 'Disbursed')
          AND dt.request_date >= ?
        GROUP BY e.equipment_id, e.equipment_name
        ORDER BY disbursementCount DESC
        LIMIT 10
      `, [typeRow.type_id, disbursementDateFilter]);

      return {
        category: typeRow.category,
        count: typeRow.count,
        totalQuantity: parseInt(typeRow.totalQuantity) || 0,
        percentage: typeRow.percentage,
        topEquipments: topEquipments.map(eq => ({
          name: eq.equipment_name,
          disbursementCount: parseInt(eq.disbursementCount) || 0,
          totalQuantity: parseInt(eq.totalQuantity) || 0
        }))
      };
    }));

    // ========== User Activity by Faculty and Major ==========
    // แสดงข้อมูลการยืมแยกตามคณะและสาขา
    const [userActivity] = await pool.query(`
      SELECT 
        CONCAT(f.faculty_name, ' - ', m.major_name) as department,
        f.faculty_name,
        m.major_name,
        COUNT(DISTINCT s.student_id) as users,
        COUNT(bt.transaction_id) as borrowings
      FROM faculties f
      LEFT JOIN majors m ON f.faculty_id = m.faculty_id
      LEFT JOIN students s ON m.major_id = s.major_id
      LEFT JOIN members mem ON s.member_id = mem.member_id
      LEFT JOIN borrowing_transactions bt ON mem.member_id = bt.member_id 
        AND bt.status IN ('Approved', 'Borrowed', 'Completed')
        AND COALESCE(bt.approval_date, bt.borrow_date) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY f.faculty_id, m.major_id, f.faculty_name, m.major_name
      HAVING borrowings > 0
      ORDER BY borrowings DESC
      LIMIT 10
    `, [daysBack]);

    // ========== Credit Analysis (รายวัน/รายเดือน/รายปี) ==========
    let creditQuery;
    let creditGroupBy;
    let creditOrderBy;

    if (creditPeriod === 'daily') {
      creditQuery = `
        SELECT 
          summary.period,
          summary.earned,
          summary.spent,
          ct.balance_after as balance
        FROM (
          SELECT 
            DATE(ct.created_at) as period,
            SUM(CASE 
              WHEN ct.transaction_type IN ('return', 'refund') AND ct.amount > 0 
              THEN ct.amount 
              ELSE 0 
            END) as earned,
            SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as spent,
            MAX(ct.created_at) as latest_time
          FROM credit_transactions ct
          WHERE ct.created_at >= ?
          GROUP BY DATE(ct.created_at)
        ) summary
        JOIN credit_transactions ct ON DATE(ct.created_at) = summary.period AND ct.created_at = summary.latest_time
        ORDER BY summary.period ASC
      `;
    } else if (creditPeriod === 'monthly') {
      creditQuery = `
        SELECT 
          summary.period,
          summary.sortKey,
          summary.earned,
          summary.spent,
          ct.balance_after as balance
        FROM (
          SELECT 
            DATE_FORMAT(ct.created_at, '%b %Y') as period,
            DATE_FORMAT(ct.created_at, '%Y-%m') as sortKey,
            SUM(CASE 
              WHEN ct.transaction_type IN ('return', 'refund') AND ct.amount > 0 
              THEN ct.amount 
              ELSE 0 
            END) as earned,
            SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as spent,
            MAX(ct.created_at) as latest_time
          FROM credit_transactions ct
          WHERE ct.created_at >= ?
          GROUP BY DATE_FORMAT(ct.created_at, '%Y-%m'), DATE_FORMAT(ct.created_at, '%b %Y')
        ) summary
        JOIN credit_transactions ct ON DATE_FORMAT(ct.created_at, '%Y-%m') = summary.sortKey AND ct.created_at = summary.latest_time
        ORDER BY summary.sortKey ASC
      `;
    } else if (creditPeriod === 'yearly') {
      creditQuery = `
        SELECT 
          summary.period,
          summary.earned,
          summary.spent,
          ct.balance_after as balance
        FROM (
          SELECT 
            YEAR(ct.created_at) as period,
            SUM(CASE 
              WHEN ct.transaction_type IN ('return', 'refund') AND ct.amount > 0 
              THEN ct.amount 
              ELSE 0 
            END) as earned,
            SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as spent,
            MAX(ct.created_at) as latest_time
          FROM credit_transactions ct
          WHERE ct.created_at >= ?
          GROUP BY YEAR(ct.created_at)
        ) summary
        JOIN credit_transactions ct ON YEAR(ct.created_at) = summary.period AND ct.created_at = summary.latest_time
        ORDER BY summary.period ASC
      `;
    }

    const [creditAnalysis] = await pool.query(creditQuery, [startDate]);

    // ========== Top Equipment ==========
    const [topEquipment] = await pool.query(`
      SELECT 
        e.equipment_name as name,
        COUNT(bt.transaction_id) as borrowCount,
        ROUND(AVG(DATEDIFF(bt.expected_return_date, bt.borrow_date)), 1) as avgDays
      FROM equipments e
      LEFT JOIN borrowing_transactions bt ON e.equipment_id = bt.equipment_id
        AND bt.status IN ('Approved', 'Borrowed', 'Completed')
        AND COALESCE(bt.approval_date, bt.borrow_date) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      WHERE bt.transaction_id IS NOT NULL
      GROUP BY e.equipment_id, e.equipment_name
      ORDER BY borrowCount DESC
      LIMIT 5
    `, [daysBack]);

    // คำนวณ equipment utilization
    const [utilizationCalc] = await pool.query(`
      SELECT 
        (SELECT SUM(quantity) FROM equipments WHERE status = 'Available') as available,
        (SELECT SUM(quantity) FROM equipments) as total
    `);

    const equipmentUtilization = utilizationCalc[0].total > 0
      ? Math.round((1 - (utilizationCalc[0].available / utilizationCalc[0].total)) * 100)
      : 0;

    // คำนวณ credit usage จากการทำธุรกรรมจริง
    const [creditStats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as totalEarned,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as totalSpent
      FROM credit_transactions
      WHERE created_at >= ?
    `, [startDate]);

    const totalEarned = parseFloat(creditStats[0].totalEarned) || 0;
    const totalSpent = parseFloat(creditStats[0].totalSpent) || 0;

    // คำนวณ % การใช้เครดิต = (ใช้ไป / ได้รับมา) * 100
    let creditUsage = 0;
    if (totalEarned > 0) {
      creditUsage = Math.round((totalSpent / totalEarned) * 100);
    }

    const responseData = {
      overview: {
        totalBorrowings: parseInt(overviewStats[0].totalBorrowings) || 0,
        activeBorrowings: parseInt(overviewStats[0].activeBorrowings) || 0,
        overdueBorrowings: parseInt(overviewStats[0].overdueBorrowings) || 0,
        totalUsers: parseInt(overviewStats[0].totalUsers) || 0,
        totalEquipment: parseInt(overviewStats[0].totalEquipment) || 0,
        equipmentUtilization: equipmentUtilization || 0,
        averageBorrowDays: parseFloat(overviewStats[0].averageBorrowDays) || 0,
        creditUsage: creditUsage || 0,
        totalDisbursements: parseInt(overviewStats[0].totalDisbursements) || 0
      },
      borrowingTrends: borrowingTrends.map(row => ({
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
        borrowings: parseInt(row.borrowings) || 0,
        returns: parseInt(row.returns) || 0,
        overdue: parseInt(row.overdue) || 0
      })),
      disbursementTrends: disbursementTrends.map(row => ({
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
        total: parseInt(row.total) || 0,
        pending: parseInt(row.pending) || 0,
        approved: parseInt(row.approved) || 0,
        completed: parseInt(row.completed) || 0
      })),
      equipmentUsage: equipmentUsageWithTop10,
      disbursementUsage: disbursementUsageWithTop10,
      userActivity: userActivity.map(row => ({
        department: row.department,
        users: parseInt(row.users) || 0,
        borrowings: parseInt(row.borrowings) || 0
      })),
      creditAnalysis: creditAnalysis.length > 0
        ? creditAnalysis.map(row => ({
          period: row.period instanceof Date
            ? row.period.toISOString().split('T')[0]
            : String(row.period),
          earned: parseInt(row.earned) || 0,
          spent: parseInt(row.spent) || 0,
          balance: parseInt(row.balance) || 0
        }))
        : [
          { period: '2025-12-01', earned: 0, spent: 0, balance: 0 }
        ],
      topEquipment: topEquipment.map(row => ({
        name: row.name,
        borrowCount: parseInt(row.borrowCount) || 0,
        avgDays: parseFloat(row.avgDays) || 0
      }))
    };

    // console.log('🚀 Final Response Data - Equipment Usage:', JSON.stringify(responseData.equipmentUsage, null, 2));

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error fetching reports stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติรายงาน',
      error: error.message
    });
  }
};

/**
 * Export รายงาน PDF
 */
const exportReportPDF = async (req, res) => {
  try {
    const { dateRange = '30days', startDate: customStartDate, endDate: customEndDate } = req.query;

    const pdfBuffer = await reportService.generatePDFReport(dateRange, customStartDate, customEndDate);

    const filename = `admin-report-${dateRange || 'custom'}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างรายงาน PDF ได้',
      error: error.message
    });
  }
};

/**
 * Export รายงาน Excel
 */
const exportReportExcel = async (req, res) => {
  try {
    const { dateRange = '30days', startDate: customStartDate, endDate: customEndDate } = req.query;

    const excelBuffer = await reportService.generateExcelReport(dateRange, customStartDate, customEndDate);

    const filename = `admin-report-${dateRange || 'custom'}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างรายงาน Excel ได้',
      error: error.message
    });
  }
};

/**
 * ฟังก์ชันช่วยดึงข้อมูลรายงาน (ใช้ร่วมกันระหว่าง API และ Export)
 */
const getReportsData = async (dateRange, customStartDate = null, customEndDate = null) => {
  // คำนวณวันที่เริ่มต้น
  let startDate, endDate;

  if (customStartDate && customEndDate) {
    // ใช้วันที่ที่ผู้ใช้เลือก
    startDate = new Date(customStartDate);
    endDate = new Date(customEndDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // ใช้ preset date range
    endDate = new Date();

    switch (dateRange) {
      case '7days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '3months':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '1year':
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
    }
  }

  // Overview Stats
  const [overviewStats] = await pool.query(`
    SELECT 
      COUNT(DISTINCT bt.transaction_id) as totalBorrowings,
      COUNT(DISTINCT CASE WHEN bt.status IN ('Approved', 'Borrowed') AND (bt.is_returned = 0 OR bt.is_returned IS NULL) THEN bt.transaction_id END) as activeBorrowings,
      COUNT(DISTINCT CASE WHEN bt.status IN ('Approved', 'Borrowed') AND (bt.is_returned = 0 OR bt.is_returned IS NULL) AND bt.expected_return_date < CURDATE() THEN bt.transaction_id END) as overdueBorrowings,
      COUNT(DISTINCT m.member_id) as totalUsers,
      COUNT(DISTINCT e.equipment_id) as totalEquipment,
      ROUND(AVG(DATEDIFF(bt.expected_return_date, bt.borrow_date)), 1) as averageBorrowDays
    FROM borrowing_transactions bt
    LEFT JOIN members m ON bt.member_id = m.member_id
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    WHERE bt.created_at >= ? AND bt.created_at <= ?
  `, [startDate, endDate]);

  // นับรายการเกินกำหนดทั้งหมดที่ยังไม่คืน (ไม่จำกัดด้วย date range)
  const [overdueStats] = await pool.query(`
    SELECT COUNT(DISTINCT transaction_id) as totalOverdue
    FROM borrowing_transactions
    WHERE status IN ('Approved', 'Borrowed')
      AND (is_returned = 0 OR is_returned IS NULL)
      AND expected_return_date < CURDATE()
  `);

  // อัพเดทค่า overdueBorrowings ด้วยจำนวนที่แท้จริง
  overviewStats[0].overdueBorrowings = overdueStats[0].totalOverdue || 0;

  // Equipment Utilization
  const [utilizationData] = await pool.query(`
    SELECT 
      COUNT(DISTINCT CASE WHEN status = 'Borrowed' THEN equipment_id END) as borrowed,
      COUNT(DISTINCT equipment_id) as total
    FROM equipments
  `);

  const equipmentUtilization = utilizationData[0].total > 0
    ? Math.round((utilizationData[0].borrowed / utilizationData[0].total) * 100)
    : 0;

  // คำนวณ credit usage จากการทำธุรกรรมจริง
  const [creditStats] = await pool.query(`
    SELECT 
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as totalEarned,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as totalSpent
    FROM credit_transactions
    WHERE created_at >= ?
  `, [startDate]);

  const totalEarned = parseFloat(creditStats[0].totalEarned) || 0;
  const totalSpent = parseFloat(creditStats[0].totalSpent) || 0;

  let creditUsage = 0;
  if (totalEarned > 0) {
    creditUsage = Math.round((totalSpent / totalEarned) * 100);
  }

  // Top Equipment
  const [topEquipment] = await pool.query(`
    SELECT 
      e.equipment_name,
      et.type_name,
      COUNT(bt.transaction_id) as borrow_count
    FROM borrowing_transactions bt
    JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.created_at >= ? AND bt.created_at <= ?
    GROUP BY e.equipment_id, e.equipment_name, et.type_name
    ORDER BY borrow_count DESC
    LIMIT 20
  `, [startDate, endDate]);

  // Equipment Usage by Category
  const [equipmentUsage] = await pool.query(`
    SELECT 
      COALESCE(et.type_name, 'Uncategorized') as category,
      COUNT(bt.transaction_id) as count
    FROM borrowing_transactions bt
    JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.created_at >= ? AND bt.created_at <= ?
    GROUP BY et.type_name
    ORDER BY count DESC
  `, [startDate, endDate]);

  // Borrowing Trends
  const [borrowingTrends] = await pool.query(`
    SELECT 
      DATE_FORMAT(borrow_date, '%Y-%m-%d') as date,
      COUNT(DISTINCT CASE WHEN status IN ('Pending', 'Approved', 'Borrowed') THEN transaction_id END) as borrowings,
      COUNT(DISTINCT CASE WHEN is_returned = 1 OR status = 'Completed' THEN transaction_id END) as returns
    FROM borrowing_transactions
    WHERE borrow_date >= ? AND borrow_date <= ?
    GROUP BY DATE_FORMAT(borrow_date, '%Y-%m-%d')
    ORDER BY date ASC
  `, [startDate, endDate]);

  // User Activity
  const [userActivity] = await pool.query(`
    SELECT 
      CONCAT(m.first_name, ' ', m.last_name) as user_name,
      COUNT(bt.transaction_id) as total_borrowings,
      COUNT(CASE WHEN bt.status IN ('Approved', 'Borrowed') AND bt.is_returned = 0 THEN 1 END) as active_borrowings,
      COUNT(CASE WHEN bt.is_returned = 1 OR bt.status = 'Completed' THEN 1 END) as completed_borrowings,
      COUNT(CASE WHEN bt.status = 'Borrowed' AND bt.expected_return_date < CURDATE() THEN 1 END) as overdue_count
    FROM members m
    LEFT JOIN borrowing_transactions bt ON m.member_id = bt.member_id AND bt.created_at >= ? AND bt.created_at <= ?
    GROUP BY m.member_id, m.first_name, m.last_name
    HAVING total_borrowings > 0
    ORDER BY total_borrowings DESC
    LIMIT 20
  `, [startDate, endDate]);

  // Top Disbursement Equipment (อุปกรณ์ที่ถูกเบิกบ่อยสุด)
  const [topDisbursementEquipment] = await pool.query(`
    SELECT 
      e.equipment_name,
      et.type_name,
      COUNT(dt.transaction_id) as disbursement_count,
      SUM(dt.quantity_disbursed) as total_quantity_disbursed
    FROM disbursement_transactions dt
    JOIN equipments e ON dt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE dt.request_date >= ? AND dt.request_date <= ?
    GROUP BY e.equipment_id, e.equipment_name, et.type_name
    ORDER BY disbursement_count DESC
    LIMIT 20
  `, [startDate, endDate]);

  // Top Users by Disbursement (ผู้ใช้ที่เบิกมากสุด)
  const [topDisbursementUsers] = await pool.query(`
    SELECT 
      CONCAT(m.first_name, ' ', m.last_name) as user_name,
      COUNT(dt.transaction_id) as total_disbursements,
      SUM(dt.quantity_disbursed) as total_quantity,
      COUNT(CASE WHEN dt.status = 'Pending' THEN 1 END) as pending_requests,
      COUNT(CASE WHEN dt.status = 'Approved' THEN 1 END) as approved_requests,
      COUNT(CASE WHEN dt.status = 'Completed' THEN 1 END) as completed_requests
    FROM members m
    LEFT JOIN disbursement_transactions dt ON m.member_id = dt.member_id AND dt.request_date >= ? AND dt.request_date <= ?
    GROUP BY m.member_id, m.first_name, m.last_name
    HAVING total_disbursements > 0
    ORDER BY total_quantity DESC
    LIMIT 20
  `, [startDate, endDate]);

  // Disbursement Trends (แนวโน้มการเบิกจ่ายรายวัน)
  const [disbursementTrends] = await pool.query(`
    SELECT 
      DATE_FORMAT(dt.request_date, '%Y-%m-%d') as date,
      COUNT(dt.transaction_id) as total_requests,
      COUNT(CASE WHEN dt.status = 'Pending' THEN 1 END) as pending,
      COUNT(CASE WHEN dt.status = 'Approved' THEN 1 END) as approved,
      COUNT(CASE WHEN dt.status = 'Completed' THEN 1 END) as completed,
      SUM(dt.quantity_disbursed) as total_quantity
    FROM disbursement_transactions dt
    WHERE dt.request_date >= ? AND dt.request_date <= ?
    GROUP BY DATE_FORMAT(dt.request_date, '%Y-%m-%d')
    ORDER BY date ASC
  `, [startDate, endDate]);

  return {
    overview: {
      totalBorrowings: parseInt(overviewStats[0].totalBorrowings) || 0,
      activeBorrowings: parseInt(overviewStats[0].activeBorrowings) || 0,
      overdueBorrowings: parseInt(overviewStats[0].overdueBorrowings) || 0,
      totalUsers: parseInt(overviewStats[0].totalUsers) || 0,
      totalEquipment: parseInt(overviewStats[0].totalEquipment) || 0,
      averageBorrowDays: parseFloat(overviewStats[0].averageBorrowDays) || 0,
      creditUsage,
      equipmentUtilization
    },
    topEquipment,
    equipmentUsage,
    borrowingTrends,
    userActivity,
    topDisbursementEquipment,
    topDisbursementUsers,
    disbursementTrends
  };
};

// 🔄 Function เพื่อ clear cache เมื่อมีการเปลี่ยนแปลง data
const invalidateDashboardCache = () => {
  dashboardService.invalidateDashboardCache();
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  activateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  getDashboardStats,
  streamDashboardUpdates,
  getReportsStats,
  manageCreditByAdmin,
  getUserCreditHistory,
  getAllCreditHistory,
  uploadUserProfileImage,
  updateUserProfileImage,
  deleteUserProfileImage,
  exportReportPDF,
  exportReportExcel,
  invalidateDashboardCache
};

