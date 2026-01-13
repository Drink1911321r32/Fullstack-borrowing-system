const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');const { returnValidation } = require('../../middleware/validationMiddleware');const { 
  createReturnTransaction, 
  getAllReturns,
  getUserReturns
} = require('../../controllers/returnController');
const {
  returnBorrowedItems,
  getBorrowedItemsForReturn
} = require('../../controllers/returnByItemsController');

// Routes for admins
router.post('/:borrowing_id', verifyToken, isAdmin, createReturnTransaction);
router.post('/items/:transaction_id', verifyToken, isAdmin, returnBorrowedItems); // คืนรายชิ้น
router.get('/items/:transaction_id/borrowed', verifyToken, isAdmin, getBorrowedItemsForReturn); // ดู items ที่ยืมอยู่
router.get('/all', verifyToken, isAdmin, getAllReturns);

// Routes for users
router.get('/my-returns', verifyToken, getUserReturns);

module.exports = router;
