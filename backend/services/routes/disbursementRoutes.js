const express = require('express');
const router = express.Router();
const disbursementController = require('../../controllers/disbursementController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// User Routes - ต้อง login
router.use(verifyToken);

/**
 * @route   POST /api/disbursements
 * @desc    สร้างคำขอเบิกจ่ายใหม่
 * @access  User
 */
router.post('/', disbursementController.createDisbursementRequest);

/**
 * @route   GET /api/disbursements/user
 * @desc    ดึงรายการคำขอเบิกจ่ายของผู้ใช้
 * @access  User
 */
router.get('/user', disbursementController.getUserDisbursements);

/**
 * @route   PUT /api/disbursements/:id/cancel
 * @desc    ยกเลิกคำขอเบิก
 * @access  User
 */
router.put('/:id/cancel', disbursementController.cancelDisbursement);

// Admin Routes
/**
 * @route   GET /api/disbursements
 * @desc    ดึงรายการคำขอเบิกจ่ายทั้งหมด
 * @access  Admin
 */
router.get('/', isAdmin, disbursementController.getAllDisbursements);

/**
 * @route   PUT /api/disbursements/:id/approve
 * @desc    อนุมัติคำขอเบิกจ่าย
 * @access  Admin
 */
router.put('/:id/approve', isAdmin, disbursementController.approveDisbursement);

/**
 * @route   PUT /api/disbursements/:id/reject
 * @desc    ปฏิเสธคำขอเบิกจ่าย
 * @access  Admin
 */
router.put('/:id/reject', isAdmin, disbursementController.rejectDisbursement);

module.exports = router;
