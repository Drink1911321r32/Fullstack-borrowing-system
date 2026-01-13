const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');const { userValidation, queryValidation } = require('../../middleware/validationMiddleware');
const { creditAdjustmentLimiter } = require('../../middleware/rateLimitMiddleware');const {
  getUserCreditHistory,
  getAllCreditHistory,
  adjustUserCredit
} = require('../../controllers/creditController');

// User routes - ดูประวัติเครดิตของตัวเอง
router.get('/history', protect, getUserCreditHistory);

// Admin routes - จัดการเครดิตผู้ใช้
router.get('/history/all', protect, admin, getAllCreditHistory);
router.post('/adjust', protect, admin, adjustUserCredit);

module.exports = router;
