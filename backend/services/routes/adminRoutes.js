const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const userController = require('../../controllers/userController');
const settingsController = require('../../controllers/settingsController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// SSE middleware - verify token from query string
const verifyTokenSSE = (req, res, next) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'ไม่พบ token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    
    // ตรวจสอบว่าเป็น admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้อง' });
  }
};

/**
 * @route   GET /api/admin/dashboard/stream
 * @desc    SSE stream สำหรับ real-time dashboard updates (ต้องมาก่อน middleware ทั่วไป)
 * @access  Admin only
 */
router.get('/dashboard/stream', verifyTokenSSE, adminController.streamDashboardUpdates);

// ใช้ middleware สำหรับตรวจสอบว่าเป็น admin ทุก route อื่นๆ
router.use(verifyToken);
router.use(isAdmin);

/**
 * @route   GET /api/admin/profile
 * @desc    ดึงข้อมูลโปรไฟล์ของ Admin
 * @access  Admin only
 */
router.get('/profile', userController.getUserProfile);

/**
 * @route   PUT /api/admin/profile
 * @desc    อัปเดทข้อมูลโปรไฟล์ของ Admin
 * @access  Admin only
 */
router.put('/profile', userController.updateUserProfile);

/**
 * @route   POST /api/admin/profile/image
 * @desc    อัปโหลดรูปโปรไฟล์ของ Admin
 * @access  Admin only
 */
router.post('/profile/image', userController.uploadProfileImage, userController.updateProfileImage);

/**
 * @route   DELETE /api/admin/profile/image
 * @desc    ลบรูปโปรไฟล์ของ Admin
 * @access  Admin only
 */
router.delete('/profile/image', userController.deleteProfileImage);

/**
 * @route   GET /api/admin/users
 * @desc    ดึงข้อมูลผู้ใช้ทั้งหมด
 * @access  Admin only
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   GET /api/admin/users/stats
 * @desc    ดึงสถิติผู้ใช้
 * @access  Admin only
 */
router.get('/users/stats', adminController.getUserStats);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    ดึงสถิติสำหรับ Dashboard
 * @access  Admin only
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/reports/stats
 * @desc    ดึงสถิติสำหรับ Reports
 * @access  Admin only
 */
router.get('/reports/stats', adminController.getReportsStats);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    ดึงข้อมูลผู้ใช้ตาม ID
 * @access  Admin only
 */
router.get('/users/:userId', adminController.getUserById);

/**
 * @route   POST /api/admin/users
 * @desc    สร้างผู้ใช้ใหม่
 * @access  Admin only
 */
router.post('/users', adminController.createUser);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    แก้ไขข้อมูลผู้ใช้
 * @access  Admin only
 */
router.put('/users/:userId', adminController.updateUser);

/**
 * @route   POST /api/admin/users/:userId/profile-image
 * @desc    อัปโหลดรูปโปรไฟล์ของผู้ใช้โดย Admin
 * @access  Admin only
 */
router.post('/users/:userId/profile-image', adminController.uploadUserProfileImage, adminController.updateUserProfileImage);

/**
 * @route   DELETE /api/admin/users/:userId/profile-image
 * @desc    ลบรูปโปรไฟล์ของผู้ใช้โดย Admin
 * @access  Admin only
 */
router.delete('/users/:userId/profile-image', adminController.deleteUserProfileImage);

/**
 * @route   POST /api/admin/users/:userId/suspend
 * @desc    ระงับการใช้งานผู้ใช้
 * @access  Admin only
 */
router.post('/users/:userId/suspend', adminController.suspendUser);

/**
 * @route   POST /api/admin/users/:userId/activate
 * @desc    เปิดใช้งานผู้ใช้
 * @access  Admin only
 */
router.post('/users/:userId/activate', adminController.activateUser);

/**
 * @route   PATCH /api/admin/users/:userId/toggle-status
 * @desc    เปิด/ปิดการใช้งานผู้ใช้
 * @access  Admin only
 */
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    ลบผู้ใช้
 * @access  Admin only
 */
router.delete('/users/:userId', adminController.deleteUser);

/**
 * @route   POST /api/admin/users/:userId/credit
 * @desc    จัดการเครดิตผู้ใช้ (เพิ่ม/ลด/รีเซ็ต)
 * @access  Admin only
 */
router.post('/users/:userId/credit', adminController.manageCreditByAdmin);

/**
 * @route   GET /api/admin/users/:userId/credit-history
 * @desc    ดึงประวัติเครดิตของผู้ใช้
 * @access  Admin only
 */
router.get('/users/:userId/credit-history', adminController.getUserCreditHistory);

/**
 * @route   GET /api/admin/credit-history
 * @desc    ดึงประวัติเครดิตทั้งหมด
 * @access  Admin only
 */
router.get('/credit-history', adminController.getAllCreditHistory);

/**
 * @route   GET /api/admin/settings
 * @desc    ดึงการตั้งค่าระบบทั้งหมด
 * @access  Admin only
 */
router.get('/settings', settingsController.getAllSettings);

/**
 * @route   GET /api/admin/settings/:key
 * @desc    ดึงการตั้งค่าตาม key
 * @access  Admin only
 */
router.get('/settings/:key', settingsController.getSettingByKey);

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    อัพเดทการตั้งค่า
 * @access  Admin only
 */
router.put('/settings/:key', settingsController.updateSetting);

/**
 * @route   POST /api/admin/settings
 * @desc    สร้างการตั้งค่าใหม่
 * @access  Admin only
 */
router.post('/settings', settingsController.createSetting);

/**
 * @route   DELETE /api/admin/settings/:key
 * @desc    ลบการตั้งค่า
 * @access  Admin only
 */
router.delete('/settings/:key', settingsController.deleteSetting);

/**
 * @route   GET /api/admin/reports/export/pdf
 * @desc    ดาวน์โหลดรายงาน PDF
 * @access  Admin only
 */
router.get('/reports/export/pdf', adminController.exportReportPDF);

/**
 * @route   GET /api/admin/reports/export/excel
 * @desc    ดาวน์โหลดรายงาน Excel
 * @access  Admin only
 */
router.get('/reports/export/excel', adminController.exportReportExcel);

module.exports = router;
