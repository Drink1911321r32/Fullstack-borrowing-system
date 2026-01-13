const express = require('express');
const router = express.Router();
const borrowingController = require('../../controllers/borrowingController');
const borrowingByItemsController = require('../../controllers/borrowingByItemsController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// User Routes - ต้อง login
router.use(verifyToken);

/**
 * @route   POST /api/borrowing
 * @desc    สร้างคำขอยืมอุปกรณ์
 * @access  User
 */
router.post('/', borrowingByItemsController.createBorrowRequestByItems);

/**
 * @route   GET /api/borrowing/user
 * @desc    ดึงรายการยืมของผู้ใช้
 * @access  User
 */
router.get('/user', borrowingController.getUserBorrowings);

/**
 * @route   PUT /api/borrowing/:id/cancel
 * @desc    ยกเลิกคำขอยืม
 * @access  User
 */
router.put('/:id/cancel', borrowingController.cancelBorrowing);

// Admin Routes
/**
 * @route   GET /api/borrowing
 * @desc    ดึงรายการยืมทั้งหมด
 * @access  Admin
 */
router.get('/', isAdmin, borrowingController.getAllBorrowings);

/**
 * @route   PUT /api/borrowing/:id/approve
 * @desc    อนุมัติคำขอยืม
 * @access  Admin
 */
router.put('/:id/approve', isAdmin, (req, res, next) => {
  // เปลี่ยน req.params.id เป็น req.params.transactionId เพื่อให้ตรงกับ controller
  req.params.transactionId = req.params.id;
  next();
}, borrowingByItemsController.approveBorrowRequestByItems);

/**
 * @route   PUT /api/borrowing/:id/reject
 * @desc    ปฏิเสธคำขอยืม
 * @access  Admin
 */
router.put('/:id/reject', isAdmin, (req, res, next) => {
  req.params.transactionId = req.params.id;
  next();
}, borrowingByItemsController.rejectBorrowRequestByItems);

module.exports = router;

