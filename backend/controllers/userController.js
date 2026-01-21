const { formatSuccessResponse, formatErrorResponse } = require('../utils');
const { HTTP_STATUS } = require('../constants');
const { pool } = require('../config/db');
const { Member, Admin, Student, SystemSettings } = require('../models');
const bcrypt = require('bcryptjs');
const { generateUserReportPDF } = require('../utils/pdfGenerator');
const { generateUserReportExcel } = require('../utils/excelGenerator');

// Import Services
const authService = require('../services/authService');
const historyService = require('../services/user/historyService');
const profileService = require('../services/user/profileService');
const reportService = require('../services/user/reportService');

// @desc    ลงทะเบียนผู้ใช้ใหม่
// @route   POST /api/users/register
// @access  Public
exports.register = async (req, res) => {
  try {
    
    // รับข้อมูลจาก request body
    const { first_name, last_name, email, password, role, credit } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!first_name || !last_name || !email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณากรอกข้อมูลให้ครบถ้วน', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ตรวจสอบความยาวและรูปแบบของชื่อ
    if (first_name.trim().length < 2 || first_name.trim().length > 50) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ชื่อต้องมีความยาว 2-50 ตัวอักษร', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    if (!/^[a-zA-Zก-๙\s]+$/.test(first_name.trim())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ชื่อต้องเป็นตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น ไม่อนุญาตให้มีอักขระพิเศษ', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ตรวจสอบความยาวและรูปแบบของนามสกุล
    if (last_name.trim().length < 2 || last_name.trim().length > 50) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('นามสกุลต้องมีความยาว 2-50 ตัวอักษร', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    if (!/^[a-zA-Zก-๙\s]+$/.test(last_name.trim())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('นามสกุลต้องเป็นตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น ไม่อนุญาตให้มีอักขระพิเศษ', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ✅ ตรวจสอบรูปแบบอีเมลและ domain @rmuti.ac.th สำหรับนักศึกษา
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('รูปแบบอีเมลไม่ถูกต้อง', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ✅ สำหรับการสมัครสมาชิกทั่วไป (public registration) ต้องเป็น @rmuti.ac.th เท่านั้น
    // (Admin เพิ่มผู้ใช้จะใช้ endpoint อื่น)
    if (!email.toLowerCase().endsWith('@rmuti.ac.th')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาใช้อีเมลของมหาวิทยาลัย (@rmuti.ac.th) เท่านั้น', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    if (email.length > 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('อีเมลต้องไม่เกิน 100 ตัวอักษร', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ตรวจสอบรหัสผ่าน
    if (password.length < 6 || password.length > 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('รหัสผ่านต้องมีความยาว 6-100 ตัวอักษร', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ตรวจสอบว่ามีอีเมลซ้ำหรือไม่ (ตรวจสอบทั้ง members และ admins)
    const existingMember = await Member.findOne({ where: { email: email.toLowerCase() } });
    const existingAdmin = await Admin.findOne({ where: { email: email.toLowerCase() } });
    
    if (existingMember || existingAdmin) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ดึงค่าเครดิตเริ่มต้นจาก settings
    let defaultCredit = 100; // ค่า default ถ้าหาไม่เจอ
    try {
      const creditSetting = await SystemSettings.findOne({
        where: { setting_key: 'default_user_credit' }
      });
      
      if (creditSetting) {
        defaultCredit = Number(creditSetting.setting_value) || 100;
      }
    } catch (settingError) {
      console.error('Error fetching credit setting:', settingError);
      console.warn('ไม่สามารถดึงค่าเครดิตเริ่มต้นได้ ใช้ค่า default:', settingError.message);
    }
    
    // ตรวจสอบ credit ถ้ามีการส่งมา
    const userCredit = credit ? Number(credit) : defaultCredit;
    if (isNaN(userCredit) || userCredit < -10000 || userCredit > 10000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('เครดิตต้องเป็นตัวเลขระหว่าง -10,000 ถึง 10,000', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ตรวจสอบ member_type และรหัสนักศึกษา
    const { student_code, member_type, faculty_id, major_id } = req.body;
    const finalMemberType = member_type || 'student'; // default เป็น student
    
    // ✅ ถ้าเป็น student ต้องมีรหัสนักศึกษา
    if (finalMemberType === 'student') {
      if (!student_code) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('นักศึกษาต้องระบุรหัสนักศึกษา', HTTP_STATUS.BAD_REQUEST)
        );
      }
      
      const studentCodePattern = /^\d{11}-\d{1}$/;
      if (!studentCodePattern.test(student_code)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('รูปแบบรหัสนักศึกษาไม่ถูกต้อง (ต้องเป็น 11 หลัก-1 หลัก เช่น 12345678901-2)', HTTP_STATUS.BAD_REQUEST)
        );
      }
      
      const existingStudent = await Student.findOne({ where: { student_code } });
      if (existingStudent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('รหัสนักศึกษานี้ถูกใช้งานแล้ว', HTTP_STATUS.BAD_REQUEST)
        );
      }
    }
    
    // สร้าง Member ใหม่
    const newMember = await Member.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      member_type: finalMemberType,
      credit: userCredit,
      status: 'active'
    });
    
    // สร้าง Student record สำหรับนักศึกษา
    if (finalMemberType === 'student' && student_code) {
      await Student.create({
        member_id: newMember.member_id,
        student_code: student_code,
        faculty_id: faculty_id || null,
        major_id: major_id || null
      });
    }
    
    // ส่งข้อมูลกลับไปยัง frontend
    const memberData = newMember.get({ plain: true });
    delete memberData.password; // ไม่ส่งรหัสผ่านกลับไป
    
    // สร้าง JWT token สำหรับสมาชิกใหม่
    const token = authService.generateAuthToken(newMember, 'user');
    
    res.status(HTTP_STATUS.CREATED).json(
      formatSuccessResponse({
        user: memberData,
        token
      }, 'ลงทะเบียนสำเร็จ')
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการลงทะเบียน', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    เข้าสู่ระบบ
// @route   POST /api/users/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณากรอกรหัสนักศึกษาหรืออีเมลและรหัสผ่าน', HTTP_STATUS.BAD_REQUEST)
      );
    }

    const result = await authService.loginWithCredentials(identifier, password);

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(result, 'เข้าสู่ระบบสำเร็จ')
    );
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific error types from authService
    if (error.message.includes('รูปแบบ')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST)
      );
    }
    if (error.message.includes('ไม่พบผู้ใช้')) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse(error.message, HTTP_STATUS.NOT_FOUND)
      );
    }
    if (error.message.includes('รหัสผ่านไม่ถูกต้อง')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        formatErrorResponse(error.message, HTTP_STATUS.UNAUTHORIZED)
      );
    }
    if (error.message.includes('ระงับ') || error.message.includes('ลบ')) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        formatErrorResponse(error.message, HTTP_STATUS.FORBIDDEN)
      );
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    รับข้อมูลผู้ใช้ปัจจุบัน
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.admin_id;
    const userType = req.user.user_type || req.user.role;
    
    let user;
    if (userType === 'admin') {
      user = await Admin.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });
    } else {
      user = await Member.findByPk(userId, {
        attributes: { 
          exclude: ['password'],
          include: ['created_at', 'updated_at']
        }
      });
    }

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    // เพิ่ม user_type เข้าไปในข้อมูล
    const userData = user.get({ plain: true });
    userData.user_type = userType;

    // ถ้าเป็นนักศึกษา ดึงข้อมูล student_code มาด้วย
    if (userType !== 'admin' && userData.member_type === 'student') {
      const Student = require('../models/Student');
      const { Faculty, Major } = require('../models');
      const studentData = await Student.findOne({
        where: { member_id: userId },
        attributes: ['student_code', 'faculty_id', 'major_id'],
        include: [
          {
            model: Faculty,
            as: 'faculty',
            attributes: ['faculty_id', 'faculty_name']
          },
          {
            model: Major,
            as: 'major',
            attributes: ['major_id', 'major_name']
          }
        ]
      });
      if (studentData) {
        userData.student_code = studentData.student_code;
        userData.faculty_id = studentData.faculty_id;
        userData.major_id = studentData.major_id;
        userData.faculty_name = studentData.faculty?.faculty_name;
        userData.major_name = studentData.major?.major_name;
      }
    }

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(userData, 'ดึงข้อมูลโปรไฟล์สำเร็จ')
    );
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// Alias สำหรับ backward compatibility
exports.getProfile = exports.getUserProfile;

// @desc    อัพเดทข้อมูลโปรไฟล์ผู้ใช้
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, current_password, new_password } = req.body;
    const userId = req.user.member_id;

    // ค้นหาผู้ใช้
    const user = await Member.findByPk(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    // ตรวจสอบรหัสผ่านปัจจุบันถ้าต้องการเปลี่ยนรหัสผ่าน
    if (new_password) {
      if (!current_password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('กรุณากรอกรหัสผ่านปัจจุบัน', HTTP_STATUS.BAD_REQUEST)
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('รหัสผ่านปัจจุบันไม่ถูกต้อง', HTTP_STATUS.BAD_REQUEST)
        );
      }
    }

    // เตรียมข้อมูลที่จะอัพเดท
    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) updateData.email = email;
    if (new_password) {
      updateData.password = await bcrypt.hash(new_password, 10);
    }

    // อัพเดทข้อมูล
    await user.update(updateData);

    // ส่งข้อมูลผู้ใช้ที่อัพเดทแล้ว (ไม่รวมรหัสผ่าน)
    const updatedUser = await Member.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(updatedUser, 'อัพเดทข้อมูลโปรไฟล์สำเร็จ')
    );
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการอัพเดทข้อมูล', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ดูรายชื่อผู้ใช้ทั้งหมด (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await Member.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(users, 'ดึงข้อมูลผู้ใช้ทั้งหมดสำเร็จ')
    );
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    อัพเดทข้อมูลผู้ใช้ (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, credit, new_password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    // เตรียมข้อมูลที่จะอัพเดท
    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (credit !== undefined) updateData.credit = credit;
    if (new_password) {
      updateData.password = await bcrypt.hash(new_password, 10);
    }

    await user.update(updateData);

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(updatedUser, 'อัพเดทข้อมูลผู้ใช้สำเร็จ')
    );
  } catch (error) {
    console.error('Update user error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการอัพเดทข้อมูลผู้ใช้', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ลบผู้ใช้ (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    await user.destroy();

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(null, 'ลบผู้ใช้สำเร็จ')
    );
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการลบผู้ใช้', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    รีเซ็ตรหัสผ่านผู้ใช้ (Admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณากรอกรหัสผ่านใหม่', HTTP_STATUS.BAD_REQUEST)
      );
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(null, 'รีเซ็ตรหัสผ่านสำเร็จ')
    );
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ดูสถิติระบบโดยรวม (Admin only)
// @route   GET /api/users/system-stats
// @access  Private/Admin
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const adminUsers = await User.count({ where: { role: 'admin' } });
    const regularUsers = await User.count({ where: { role: 'user' } });
    const totalCredits = await User.sum('credit');
    
    // ข้อมูลผู้ใช้ที่ลงทะเบียนใหม่ใน 30 วันที่ผ่านมา
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersThisMonth = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    const stats = {
      users: {
        total: totalUsers,
        admins: adminUsers,
        regular: regularUsers,
        newThisMonth: newUsersThisMonth
      },
      credits: {
        total: totalCredits || 0,
        average: totalUsers > 0 ? Math.round((totalCredits || 0) / totalUsers) : 0
      },
      system: {
        uptime: process.uptime(),
        lastUpdated: new Date().toISOString()
      }
    };

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(stats, 'ดึงสถิติระบบสำเร็จ')
    );
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงสถิติระบบ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ดึงประวัติการยืม-คืนและเบิกจ่ายของผู้ใช้
// @route   GET /api/users/history
// @access  Private
exports.getUserHistory = async (req, res) => {
  try {
    const userId = req.user.member_id;
    const { type, status, startDate, endDate } = req.query;

    let history = [];

    // ดึงข้อมูลการยืม-คืน
    if (!type || type === 'all' || type === 'borrow') {
      let borrowQuery = `
        SELECT 
          bt.transaction_id,
          'borrow' as type,
          bt.borrow_date,
          bt.expected_return_date,
          MAX(rt.actual_return_date) as actual_return_date,
          bt.quantity_borrowed as quantity,
          bt.status,
          bt.purpose,
          bt.notes,
          bt.created_at,
          bt.updated_at,
          bt.approval_date,
          bt.credit_deducted,
          CASE 
            WHEN bt.status = 'Cancelled' THEN bt.notes
            ELSE NULL
          END as rejection_reason,
          e.equipment_id,
          e.equipment_name,
          e.model,
          e.credit as credit_cost,
          MAX(approver.first_name) as approver_first_name,
          MAX(approver.last_name) as approver_last_name,
          GROUP_CONCAT(ei.serial_number SEPARATOR ',') as serial_numbers
        FROM borrowing_transactions bt
        LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
        LEFT JOIN admins approver ON bt.approved_by_admin = approver.admin_id
        LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
        LEFT JOIN borrowing_transaction_items bti ON bt.transaction_id = bti.transaction_id
        LEFT JOIN equipment_items ei ON bti.item_id = ei.item_id
        WHERE bt.member_id = ?
      `;

      const borrowParams = [userId];

      if (startDate && endDate) {
        borrowQuery += ` AND bt.created_at BETWEEN ? AND ?`;
        borrowParams.push(startDate, endDate);
      }

      if (status && status !== 'all') {
        borrowQuery += ` AND bt.status = ?`;
        borrowParams.push(status);
      }

      borrowQuery += ` GROUP BY bt.transaction_id ORDER BY bt.created_at DESC`;

      try {
        const [borrowResults] = await pool.query(borrowQuery, borrowParams);
        history = [...history, ...borrowResults];
      } catch (error) {
        console.error('Error fetching borrow history:', error);
      }
    }

    // ดึงข้อมูลการเบิกจ่าย
    if (!type || type === 'all' || type === 'disbursement') {
      let disbursementQuery = `
        SELECT 
          dt.transaction_id,
          'disbursement' as type,
          dt.request_date as borrow_date,
          NULL as expected_return_date,
          dt.disbursement_date,
          NULL as actual_return_date,
          dt.quantity_requested as quantity,
          dt.status,
          dt.purpose,
          dt.notes,
          dt.created_at,
          dt.updated_at,
          dt.approval_date,
          CASE 
            WHEN dt.status = 'Cancelled' THEN dt.notes
            ELSE NULL
          END as rejection_reason,
          e.equipment_id,
          e.equipment_name,
          e.model,
          e.credit as credit_cost,
          approver.first_name as approver_first_name,
          approver.last_name as approver_last_name
        FROM disbursement_transactions dt
        LEFT JOIN equipments e ON dt.equipment_id = e.equipment_id
        LEFT JOIN admins approver ON dt.approved_by_admin = approver.admin_id
        WHERE dt.member_id = ?
      `;

      const disbursementParams = [userId];

      if (startDate && endDate) {
        disbursementQuery += ` AND dt.created_at BETWEEN ? AND ?`;
        disbursementParams.push(startDate, endDate);
      }

      if (status && status !== 'all') {
        disbursementQuery += ` AND dt.status = ?`;
        disbursementParams.push(status);
      }

      disbursementQuery += ` ORDER BY dt.created_at DESC`;

      try {
        const [disbursementResults] = await pool.query(disbursementQuery, disbursementParams);
        history = [...history, ...disbursementResults];
      } catch (error) {
        console.error('Error fetching disbursement history:', error);
      }
    }

    // เรียงลำดับตามวันที่สร้างล่าสุด
    history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // คำนวณ credit ที่ใช้ไป
    const historyWithCredit = history.map(item => {
      let creditUsed = 0;
      
      if (item.type === 'borrow') {
        // ใช้ credit_deducted ที่บันทึกไว้ตอนอนุมัติการยืม
        if (item.credit_deducted !== null && item.credit_deducted !== undefined) {
          creditUsed = parseFloat(item.credit_deducted || 0);
        } else if (item.status === 'Approved' || item.status === 'Returned' || item.status === 'Overdue') {
          // Fallback: คำนวณจำนวนวันที่ยืม (สำหรับข้อมูลเก่าที่ไม่มี credit_deducted)
          if (item.borrow_date && item.expected_return_date) {
            const borrowDate = new Date(item.borrow_date);
            const returnDate = item.actual_return_date 
              ? new Date(item.actual_return_date)
              : new Date(item.expected_return_date);
            
            const days = Math.max(1, Math.ceil((returnDate - borrowDate) / (1000 * 60 * 60 * 24)));
            const quantity = item.quantity || 1;
            creditUsed = (item.credit_cost || 0) * quantity * days;
          }
        }
      } else if (item.type === 'disbursement') {
        if (item.status === 'Approved' || item.status === 'Disbursed') {
          const quantity = item.quantity || 1;
          creditUsed = (item.credit_cost || 0) * quantity;
        }
      }

      return {
        ...item,
        credit_used: creditUsed
      };
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse({
        history: historyWithCredit,
        total: historyWithCredit.length
      }, 'ดึงประวัติสำเร็จ')
    );
  } catch (error) {
    console.error('Get user history error:', error);
    console.error('Error stack:', error.stack);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงประวัติ: ' + error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ออกจากระบบ
// @route   POST /api/users/logout
// @access  Public (เพราะ JWT เป็น stateless)
exports.logout = async (req, res) => {
  try {
    // สำหรับ JWT ไม่ต้องทำอะไรฝั่ง server เพราะเป็น stateless
    // ฝั่ง client จะต้องลบ token เอง
    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(null, 'ออกจากระบบสำเร็จ')
    );
  } catch (error) {
    console.error('Logout error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการออกจากระบบ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }

};

// Middleware สำหรับอัปโหลดรูปโปรไฟล์ (ใช้จาก profileService)
exports.uploadProfileImage = profileService.profileUpload.single('profile_image');

// @desc    อัปโหลด/อัปเดทรูปโปรไฟล์
// @route   POST /api/users/profile/image
// @access  Private
exports.updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.member_id;

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาเลือกไฟล์รูปภาพ', HTTP_STATUS.BAD_REQUEST)
      );
    }

    const updatedUser = await profileService.updateUserProfileImage(userId, req.file);

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(updatedUser, 'อัปโหลดรูปโปรไฟล์สำเร็จ')
    );
  } catch (error) {
    console.error('Upload profile image error:', error);
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ลบรูปโปรไฟล์
// @route   DELETE /api/users/profile/image
// @access  Private
exports.deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.member_id;

    const updatedUser = await profileService.deleteUserProfileImage(userId);

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(updatedUser, 'ลบรูปโปรไฟล์สำเร็จ')
    );
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error.message || 'เกิดข้อผิดพลาดในการลบรูปภาพ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// @desc    ดึงข้อมูลรายงานของผู้ใช้
// @route   GET /api/users/reports
// @access  Private
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.member_id;
    const userRole = req.user.user_type || req.user.role;
    const { dateRange = '3months', creditPeriod = 'monthly', startDate: customStartDate, endDate: customEndDate } = req.query;

    // ตรวจสอบว่าเป็น member เท่านั้น (ไม่ใช่ admin)
    if (userRole !== 'member' && userRole !== 'user') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        formatErrorResponse('คุณไม่มีสิทธิ์เข้าถึงรายงานนี้', HTTP_STATUS.FORBIDDEN)
      );
    }

    // คำนวณช่วงวันที่
    let endDate, startDate;
    
    if (customStartDate && customEndDate) {
      // ใช้วันที่ที่ผู้ใช้เลือก
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      // ตั้งเวลาให้ครอบคลุมทั้งวัน
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // ใช้ preset date range
      endDate = new Date();
      startDate = new Date();
      
      switch(dateRange) {
        case 'all':
          startDate = new Date('2000-01-01'); // ตั้งแต่เริ่มต้น
          break;
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }
    }

    // กำหนดวันเริ่มต้นสำหรับ credit history เป็น 1 ธันวาคม 2025
    const creditStartDate = '2025-12-01';

    // ดึงข้อมูลผู้ใช้
    const [userResult] = await pool.query(
      'SELECT credit, first_name, last_name FROM members WHERE member_id = ?',
      [userId]
    );
    const currentUser = userResult[0];

    // 1. ภาพรวมการใช้งาน
    const [borrowStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_borrowings,
        SUM(CASE WHEN bt.status IN ('Approved', 'Borrowed') THEN 1 ELSE 0 END) as active_borrowings,
        SUM(CASE WHEN bt.is_returned = 1 AND rt.days_overdue = 0 THEN 1 ELSE 0 END) as on_time_returns,
        SUM(CASE WHEN bt.is_returned = 1 AND rt.days_overdue > 0 THEN 1 ELSE 0 END) as late_returns,
        AVG(CASE 
          WHEN bt.is_returned = 1 AND rt.actual_return_date IS NOT NULL
          THEN DATEDIFF(rt.actual_return_date, bt.borrow_date) 
          ELSE NULL 
        END) as average_borrow_duration
      FROM borrowing_transactions bt
      LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
      WHERE bt.member_id = ? AND bt.created_at BETWEEN ? AND ?
    `, [userId, startDate, endDate]);

    const [creditStats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN transaction_type IN ('borrow', 'penalty') AND amount < 0 THEN ABS(amount) ELSE 0 END) as total_credit_used,
        SUM(CASE WHEN transaction_type IN ('return', 'refund', 'adjustment') AND amount > 0 THEN amount ELSE 0 END) as total_credit_returned
      FROM credit_transactions
      WHERE member_id = ? AND created_at BETWEEN ? AND ?
    `, [userId, startDate, endDate]);

    const overview = {
      total_borrowings: borrowStats[0].total_borrowings || 0,
      active_borrowings: borrowStats[0].active_borrowings || 0,
      total_credit_used: creditStats[0].total_credit_used || 0,
      current_credit: currentUser?.credit || 0,
      on_time_returns: borrowStats[0].on_time_returns || 0,
      late_returns: borrowStats[0].late_returns || 0,
      average_borrow_duration: parseFloat(borrowStats[0].average_borrow_duration || 0).toFixed(1)
    };

    // 2. แนวโน้มการยืม-คืนรายเดือน
    const [monthlyTrends] = await pool.query(`
      SELECT 
        DATE_FORMAT(bt.created_at, '%Y-%m') as month,
        COUNT(*) as borrowings,
        SUM(CASE WHEN bt.is_returned = 1 THEN 1 ELSE 0 END) as returns,
        SUM(CASE WHEN bt.is_returned = 1 AND rt.days_overdue > 0 THEN 1 ELSE 0 END) as late
      FROM borrowing_transactions bt
      LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
      WHERE bt.member_id = ? AND bt.created_at BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(bt.created_at, '%Y-%m')
      ORDER BY month
    `, [userId, startDate, endDate]);

    // แปลงเดือนเป็นภาษาไทย
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const borrowing_trends = monthlyTrends.map(item => {
      const [year, month] = item.month.split('-');
      return {
        month: thaiMonths[parseInt(month) - 1],
        borrowings: item.borrowings,
        returns: item.returns,
        late: item.late
      };
    });

    // 3. ประวัติเครดิต - รองรับรายวัน/รายเดือน/รายปี
    let creditQuery;
    
    if (creditPeriod === 'daily') {
      creditQuery = `
        SELECT 
          summary.period,
          summary.used,
          summary.returned,
          ct.balance_after as balance
        FROM (
          SELECT 
            DATE(ct.created_at) as period,
            SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as used,
            SUM(CASE 
              WHEN ct.transaction_type IN ('return', 'refund') AND ct.amount > 0 
              THEN ct.amount 
              ELSE 0 
            END) as returned,
            ct.member_id,
            MAX(ct.transaction_id) as max_trans_id
          FROM credit_transactions ct
          WHERE ct.member_id = ? AND ct.created_at >= ?
          GROUP BY DATE(ct.created_at), ct.member_id
        ) summary
        JOIN credit_transactions ct ON ct.transaction_id = summary.max_trans_id
        ORDER BY summary.period
      `;
    } else if (creditPeriod === 'monthly') {
      creditQuery = `
        SELECT 
          summary.period,
          summary.used,
          summary.returned,
          ct.balance_after as balance
        FROM (
          SELECT 
            DATE_FORMAT(ct.created_at, '%Y-%m') as period,
            SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as used,
            SUM(CASE 
              WHEN ct.transaction_type IN ('return', 'refund') AND ct.amount > 0 
              THEN ct.amount 
              ELSE 0 
            END) as returned,
            ct.member_id,
            MAX(ct.transaction_id) as max_trans_id
          FROM credit_transactions ct
          WHERE ct.member_id = ? AND ct.created_at >= ?
          GROUP BY DATE_FORMAT(ct.created_at, '%Y-%m'), ct.member_id
        ) summary
        JOIN credit_transactions ct ON ct.transaction_id = summary.max_trans_id
        ORDER BY summary.period
      `;
    } else { // yearly
      creditQuery = `
        SELECT 
          summary.period,
          summary.used,
          summary.returned,
          ct.balance_after as balance
        FROM (
          SELECT 
            YEAR(ct.created_at) as period,
            SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as used,
            SUM(CASE 
              WHEN ct.transaction_type IN ('return', 'refund') AND ct.amount > 0 
              THEN ct.amount 
              ELSE 0 
            END) as returned,
            ct.member_id,
            MAX(ct.transaction_id) as max_trans_id
          FROM credit_transactions ct
          WHERE ct.member_id = ? AND ct.created_at >= ?
          GROUP BY YEAR(ct.created_at), ct.member_id
        ) summary
        JOIN credit_transactions ct ON ct.transaction_id = summary.max_trans_id
        ORDER BY summary.period
      `;
    }

    const [creditHistory] = await pool.query(creditQuery, [userId, creditStartDate]);

    // Format ข้อมูลเครดิต
    const credit_history_data = creditHistory.map(item => {
      let label;
      if (creditPeriod === 'daily') {
        const date = new Date(item.period);
        label = date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
      } else if (creditPeriod === 'monthly') {
        const [year, month] = item.period.split('-');
        label = thaiMonths[parseInt(month) - 1] + ' ' + year;
      } else {
        label = String(item.period);
      }
      
      return {
        month: label,
        period: item.period,
        used: parseInt(item.used) || 0,
        returned: parseInt(item.returned) || 0,
        balance: parseInt(item.balance) || 0
      };
    });

    // 4. หมวดหมู่อุปกรณ์ที่ยืมบ่อย
    const [categoryStats] = await pool.query(`
      SELECT 
        et.type_name as name,
        COUNT(*) as value,
        GROUP_CONCAT(DISTINCT e.equipment_name ORDER BY e.equipment_name SEPARATOR ', ') as equipments
      FROM borrowing_transactions bt
      JOIN equipments e ON bt.equipment_id = e.equipment_id
      JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE bt.member_id = ? AND bt.created_at BETWEEN ? AND ? AND bt.status != 'Cancelled'
      GROUP BY et.type_id, et.type_name
      ORDER BY value DESC
      LIMIT 5
    `, [userId, startDate, endDate]);

    // คำนวณ total สำหรับหา percentage
    const totalBorrowings = categoryStats.reduce((sum, item) => sum + item.value, 0);
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
    const equipment_categories = categoryStats.map((item, index) => ({
      name: item.name,
      value: item.value,
      equipments: item.equipments,
      color: colors[index % colors.length],
      percent: totalBorrowings > 0 ? item.value / totalBorrowings : 0
    }));

    // 5. กิจกรรมล่าสุด
    const [recentActivities] = await pool.query(`
      SELECT 
        bt.transaction_id as id,
        'borrow' as type,
        e.equipment_name as equipment,
        bt.borrow_date as date,
        bt.status,
        e.credit * bt.quantity_borrowed as credit
      FROM borrowing_transactions bt
      JOIN equipments e ON bt.equipment_id = e.equipment_id
      WHERE bt.member_id = ? AND bt.status != 'Cancelled'
      ORDER BY bt.created_at DESC
      LIMIT 5
    `, [userId]);

    const recent_activities = recentActivities.map(activity => ({
      id: activity.id,
      type: activity.type,
      equipment: activity.equipment,
      date: activity.date,
      status: activity.status === 'Returned' ? 'returned' : 
              activity.status === 'Overdue' ? 'returned_late' : 'active',
      credit: activity.credit
    }));

    // 6. คะแนนประเมิน
    const totalBorrowingsForScore = overview.total_borrowings || 1;
    const punctuality_score = Math.round((overview.on_time_returns / totalBorrowingsForScore) * 100);
    
    // คะแนนการดูแลอุปกรณ์ (ตรวจสอบจากสถานะอุปกรณ์ที่คืน)
    const [equipmentCondition] = await pool.query(`
      SELECT 
        COUNT(*) as total_returns,
        SUM(CASE WHEN rt.return_status = 'Returned' AND (rt.damage_description IS NULL OR rt.damage_description = '') THEN 1 ELSE 0 END) as good_condition
      FROM return_transactions rt
      JOIN borrowing_transactions bt ON rt.borrowing_id = bt.transaction_id
      WHERE bt.member_id = ? AND rt.created_at BETWEEN ? AND ?
    `, [userId, startDate, endDate]);

    const equipment_care_score = equipmentCondition[0].total_returns > 0 
      ? Math.round((equipmentCondition[0].good_condition / equipmentCondition[0].total_returns) * 100)
      : 100;

    const overall_rating = Math.round((punctuality_score + equipment_care_score) / 2);

    // อันดับของผู้ใช้
    const [rankData] = await pool.query(`
      SELECT 
        COUNT(*) + 1 as rank_position
      FROM members m
      WHERE m.credit > ? AND m.member_type IN ('student', 'teacher', 'staff')
    `, [currentUser?.credit || 0]);

    const [totalUsers] = await pool.query(`
      SELECT COUNT(*) as total FROM members WHERE member_type IN ('student', 'teacher', 'staff')
    `);

    const performance_metrics = {
      punctuality_score,
      equipment_care_score,
      overall_rating,
      rank_position: rankData[0].rank_position || 1,
      total_users: totalUsers[0].total || 1
    };

    // 7. แนวโน้มการเบิกจ่าย (Disbursement Trends)
    const [disbursementByType] = await pool.query(`
      SELECT 
        et.type_name as category,
        COUNT(*) as value,
        GROUP_CONCAT(DISTINCT e.equipment_name ORDER BY e.equipment_name SEPARATOR ', ') as equipments
      FROM disbursement_transactions dt
      JOIN equipments e ON dt.equipment_id = e.equipment_id
      JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE dt.member_id = ? AND dt.request_date >= ? AND dt.status != 'Cancelled'
      GROUP BY et.type_id, et.type_name
      ORDER BY value DESC
      LIMIT 10
    `, [userId, startDate]);

    const disbursementColors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb'];
    const disbursement_categories = disbursementByType.map((item, index) => ({
      category: item.category,
      value: item.value,
      equipments: item.equipments,
      color: disbursementColors[index % disbursementColors.length]
    }));

    // ส่งข้อมูลทั้งหมดกลับ
    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse({
        overview,
        borrowing_trends,
        credit_history: credit_history_data,
        equipment_categories,
        recent_activities,
        performance_metrics,
        disbursement_categories
      }, 'ดึงข้อมูลรายงานสำเร็จ')
    );

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน: ' + error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * Export รายงาน PDF สำหรับ User
 */
exports.exportUserReportPDF = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.member_id;
    const userRole = req.user.user_type || req.user.role;
    const { dateRange = '3months', startDate: customStartDate, endDate: customEndDate } = req.query;

    // ตรวจสอบว่าเป็น member เท่านั้น (ไม่ใช่ admin)
    if (userRole !== 'member' && userRole !== 'user') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        formatErrorResponse('คุณไม่มีสิทธิ์ export รายงานนี้', HTTP_STATUS.FORBIDDEN)
      );
    }

    // ดึงข้อมูลผู้ใช้
    const [userRows] = await pool.query(
      'SELECT member_id as user_id, first_name, last_name, email, member_type as role FROM members WHERE member_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    const user = userRows[0];
    const userData = {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    };

    // ดึงข้อมูลรายงาน
    const reportData = await getUserReportData(userId, dateRange, customStartDate, customEndDate);

    // สร้างป้ายกำกับช่วงเวลา
    let dateLabel;
    if (customStartDate && customEndDate) {
      dateLabel = `${customStartDate} ถึง ${customEndDate}`;
    } else {
      const labels = {
        '7days': '7 วันที่ผ่านมา',
        '1month': '1 เดือนที่ผ่านมา',
        '3months': '3 เดือนที่ผ่านมา',
        '6months': '6 เดือนที่ผ่านมา',
        '1year': '1 ปีที่ผ่านมา'
      };
      dateLabel = labels[dateRange] || dateRange;
    }

    // สร้าง PDF
    const pdfBuffer = await generateUserReportPDF(reportData, dateLabel, userData);

    // ส่งไฟล์ PDF
    const filename = `user-report-${userId}-${dateRange || 'custom'}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting user PDF:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('ไม่สามารถสร้างรายงาน PDF ได้: ' + error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * Export รายงาน Excel สำหรับ User
 */
exports.exportUserReportExcel = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.member_id;
    const userRole = req.user.user_type || req.user.role;
    const { dateRange = '3months', startDate: customStartDate, endDate: customEndDate } = req.query;

    // ตรวจสอบว่าเป็น member เท่านั้น (ไม่ใช่ admin)
    if (userRole !== 'member' && userRole !== 'user') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        formatErrorResponse('คุณไม่มีสิทธิ์ export รายงานนี้', HTTP_STATUS.FORBIDDEN)
      );
    }

    // ดึงข้อมูลผู้ใช้
    const [userRows] = await pool.query(
      'SELECT member_id as user_id, first_name, last_name, email, member_type as role FROM members WHERE member_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    const user = userRows[0];
    const userData = {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    };

    // ดึงข้อมูลรายงาน
    const reportData = await getUserReportData(userId, dateRange, customStartDate, customEndDate);

    // สร้างป้ายกำกับช่วงเวลา
    let dateLabel;
    if (customStartDate && customEndDate) {
      dateLabel = `${customStartDate} ถึง ${customEndDate}`;
    } else {
      const labels = {
        '7days': '7 วันที่ผ่านมา',
        '1month': '1 เดือนที่ผ่านมา',
        '3months': '3 เดือนที่ผ่านมา',
        '6months': '6 เดือนที่ผ่านมา',
        '1year': '1 ปีที่ผ่านมา'
      };
      dateLabel = labels[dateRange] || dateRange;
    }

    // สร้าง Excel
    const excelBuffer = await generateUserReportExcel(reportData, dateLabel, userData);

    // ส่งไฟล์ Excel
    const filename = `user-report-${userId}-${dateRange || 'custom'}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error exporting user Excel:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('ไม่สามารถสร้างรายงาน Excel ได้: ' + error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * ฟังก์ชันช่วยดึงข้อมูลรายงานสำหรับ User
 */
const getUserReportData = async (userId, dateRange, customStartDate = null, customEndDate = null) => {
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
    
    switch(dateRange) {
      case 'all':
        startDate = new Date('2000-01-01'); // ตั้งแต่เริ่มต้น
        break;
      case '7days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1month':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3months':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
    }
  }

  // Overview
  const [overview] = await pool.query(`
    SELECT 
      COALESCE(COUNT(DISTINCT bt.transaction_id), 0) as total_borrowings,
      COALESCE(COUNT(DISTINCT CASE WHEN bt.status IN ('Approved', 'Borrowed') AND bt.is_returned = 0 THEN bt.transaction_id END), 0) as active_borrowings,
      COALESCE(COUNT(DISTINCT CASE WHEN bt.is_returned = 1 OR bt.status = 'Completed' THEN bt.transaction_id END), 0) as completed_borrowings,
      COALESCE(COUNT(DISTINCT CASE WHEN bt.status = 'Borrowed' AND bt.expected_return_date < CURDATE() THEN bt.transaction_id END), 0) as overdue_count,
      COALESCE(m.credit, 0) as current_credit
    FROM members m
    LEFT JOIN borrowing_transactions bt ON m.member_id = bt.member_id AND bt.created_at >= ? AND bt.created_at <= ?
    WHERE m.member_id = ?
    GROUP BY m.member_id, m.credit
  `, [startDate, endDate, userId]);

  // Borrowing History
  const [borrowing_history] = await pool.query(`
    SELECT 
      bt.transaction_id,
      e.equipment_name,
      bt.borrow_date,
      bt.expected_return_date,
      rt.actual_return_date as return_date,
      bt.status,
      DATEDIFF(COALESCE(rt.actual_return_date, CURDATE()), bt.borrow_date) as days_borrowed
    FROM borrowing_transactions bt
    JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
    WHERE bt.member_id = ? AND bt.created_at >= ? AND bt.created_at <= ?
    ORDER BY bt.borrow_date DESC
  `, [userId, startDate, endDate]);

  // Credit Transactions
  const [credit_transactions] = await pool.query(`
    SELECT 
      created_at as transaction_date,
      description,
      amount,
      balance_after,
      transaction_type
    FROM credit_transactions
    WHERE member_id = ? AND created_at >= ? AND created_at <= ?
    ORDER BY created_at DESC
  `, [userId, startDate, endDate]);

  // Monthly Statistics
  const [monthly_stats] = await pool.query(`
    SELECT 
      DATE_FORMAT(bt.borrow_date, '%Y-%m') as month,
      COUNT(bt.transaction_id) as borrowings,
      COUNT(rt.return_id) as returns,
      COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0) as credits_earned,
      COALESCE(SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END), 0) as credits_used
    FROM borrowing_transactions bt
    LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
    LEFT JOIN credit_transactions ct ON ct.member_id = bt.member_id AND DATE_FORMAT(ct.created_at, '%Y-%m') = DATE_FORMAT(bt.borrow_date, '%Y-%m')
    WHERE bt.member_id = ? AND bt.borrow_date >= ? AND bt.borrow_date <= ?
    GROUP BY DATE_FORMAT(bt.borrow_date, '%Y-%m')
    ORDER BY month ASC
  `, [userId, startDate, endDate]);

  // Performance Metrics
  const [onTimeReturns] = await pool.query(`
    SELECT 
      COUNT(CASE WHEN rt.actual_return_date <= bt.expected_return_date THEN 1 END) as on_time,
      COUNT(*) as total
    FROM borrowing_transactions bt
    JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
    WHERE bt.member_id = ? AND bt.created_at >= ? AND bt.created_at <= ?
  `, [userId, startDate, endDate]);

  const on_time_rate = onTimeReturns[0].total > 0 
    ? Math.round((onTimeReturns[0].on_time / onTimeReturns[0].total) * 100) 
    : 0;

  const overall_rating = on_time_rate;

  const [rankData] = await pool.query(`
    SELECT COUNT(*) + 1 as rank_position
    FROM members m
    LEFT JOIN borrowing_transactions bt ON m.member_id = bt.member_id
    WHERE m.member_type IN ('student', 'teacher', 'staff') AND m.credit > (SELECT credit FROM members WHERE member_id = ?)
  `, [userId]);

  const [totalUsers] = await pool.query(`
    SELECT COUNT(*) as total FROM members WHERE member_type IN ('student', 'teacher', 'staff')
  `);

  // Disbursement History
  const [disbursement_history] = await pool.query(`
    SELECT 
      dt.transaction_id,
      dt.equipment_id,
      e.equipment_name,
      dt.request_date,
      dt.disbursement_date,
      dt.quantity_requested,
      dt.quantity_disbursed,
      dt.purpose,
      dt.status,
      dt.notes
    FROM disbursement_transactions dt
    JOIN equipments e ON dt.equipment_id = e.equipment_id
    WHERE dt.member_id = ? AND dt.request_date >= ? AND dt.request_date <= ?
    ORDER BY dt.request_date DESC
  `, [userId, startDate, endDate]);

  return {
    overview: overview[0],
    borrowing_history,
    disbursement_history,
    credit_transactions,
    monthly_stats,
    performance_metrics: {
      on_time_rate,
      overall_rating,
      rank_position: rankData[0].rank_position || 1,
      total_users: totalUsers[0].total || 1
    }
  };
};

// @desc    ดูประวัติการยืม
// @route   GET /api/users/borrowing-history
// @access  Private
exports.getBorrowingHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [borrowing] = await pool.query(`
      SELECT 
        bt.transaction_id,
        bt.equipment_id,
        e.equipment_name,
        e.model,
        bt.borrow_date,
        bt.expected_return_date,
        bt.quantity_borrowed,
        bt.total_returned,
        bt.is_returned,
        bt.status,
        bt.credit_deducted,
        bt.created_at
      FROM borrowing_transactions bt
      LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
      WHERE bt.member_id = ?
      ORDER BY bt.created_at DESC
    `, [userId]);

    res.json(formatSuccessResponse(borrowing, 'ดึงข้อมูลประวัติการยืมสำเร็จ'));
  } catch (error) {
    console.error('Error in getBorrowingHistory:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการยืม', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// @desc    ดูประวัติ credit transactions
// @route   GET /api/users/credit-history
// @access  Private
exports.getCreditHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [history] = await pool.query(`
      SELECT 
        transaction_id,
        amount,
        transaction_type,
        reference_type,
        reference_id,
        description,
        balance_after,
        created_by,
        created_at
      FROM credit_transactions
      WHERE member_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);

    res.json(formatSuccessResponse(history, 'ดึงข้อมูลประวัติเครดิตสำเร็จ'));
  } catch (error) {
    console.error('Error in getCreditHistory:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติเครดิต', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// @desc    ดูเครดิตปัจจุบัน
// @route   GET /api/users/credit
// @access  Private
exports.getUserCredit = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [users] = await pool.query(`
      SELECT credit, first_name, last_name
      FROM members
      WHERE member_id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลผู้ใช้', HTTP_STATUS.NOT_FOUND)
      );
    }

    res.json(formatSuccessResponse({
      credit: users[0].credit,
      user_name: `${users[0].first_name} ${users[0].last_name}`
    }, 'ดึงข้อมูลเครดิตสำเร็จ'));
  } catch (error) {
    console.error('Error in getUserCredit:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลเครดิต', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// @desc    ดูรายการที่ต้องคืน
// @route   GET /api/users/items-to-return
// @access  Private
exports.getItemsToReturn = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [items] = await pool.query(`
      SELECT 
        bt.transaction_id,
        bt.equipment_id,
        e.equipment_name,
        e.model,
        bt.borrow_date,
        bt.expected_return_date,
        bt.quantity_borrowed,
        bt.total_returned,
        (bt.quantity_borrowed - bt.total_returned) as quantity_to_return,
        DATEDIFF(NOW(), bt.expected_return_date) as days_overdue,
        bt.credit_deducted
      FROM borrowing_transactions bt
      LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
      WHERE bt.member_id = ?
        AND bt.is_returned = 0
        AND bt.status = 'Borrowed'
      ORDER BY bt.expected_return_date ASC
    `, [userId]);

    res.json(formatSuccessResponse(items, 'ดึงข้อมูลรายการที่ต้องคืนสำเร็จ'));
  } catch (error) {
    console.error('Error in getItemsToReturn:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลรายการที่ต้องคืน', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// @desc    ดูประวัติการคืน
// @route   GET /api/users/return-history
// @access  Private
exports.getReturnHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [returns] = await pool.query(`
      SELECT 
        rt.return_id,
        rt.borrowing_id,
        rt.equipment_id,
        e.equipment_name,
        e.model,
        rt.quantity_returned,
        rt.actual_return_date,
        rt.return_status,
        rt.days_overdue,
        rt.expected_return_date,
        rt.damage_cost,
        rt.late_penalty,
        rt.total_penalty,
        rt.credit_returned,
        rt.credit_bonus,
        rt.net_credit_change,
        rt.notes,
        rt.created_at
      FROM return_transactions rt
      LEFT JOIN equipments e ON rt.equipment_id = e.equipment_id
      WHERE rt.member_id = ?
      ORDER BY rt.created_at DESC
    `, [userId]);

    res.json(formatSuccessResponse(returns, 'ดึงข้อมูลประวัติการคืนสำเร็จ'));
  } catch (error) {
    console.error('Error in getReturnHistory:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการคืน', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

