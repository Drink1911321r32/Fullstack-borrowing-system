const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const settingsController = require('../../controllers/settingsController');
const { protect, admin } = require('../../middleware/authMiddleware');

// Public routes - ไม่ต้องมี authentication
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.get('/settings/public/:key', settingsController.getSettingByKey); // Public setting endpoint

// Protected routes - ต้องมี authentication (JWT)
router.get('/profile', protect, userController.getUserProfile);
router.put('/profile', protect, userController.updateUserProfile);
router.post('/profile/image', protect, userController.uploadProfileImage, userController.updateProfileImage);
router.delete('/profile/image', protect, userController.deleteProfileImage);
router.get('/history', protect, userController.getUserHistory);
router.get('/borrowing-history', protect, userController.getBorrowingHistory);
router.get('/credit-history', protect, userController.getCreditHistory);
router.get('/credit', protect, userController.getUserCredit);
router.get('/items-to-return', protect, userController.getItemsToReturn);
router.get('/return-history', protect, userController.getReturnHistory);
router.get('/reports', protect, userController.getUserReports);
router.get('/reports/export/pdf', protect, userController.exportUserReportPDF);
router.get('/reports/export/excel', protect, userController.exportUserReportExcel);

// Admin routes - ต้องมี authentication และเป็น admin
router.get('/', protect, admin, userController.getAllUsers);
router.get('/system-stats', protect, admin, userController.getSystemStats);
router.put('/:id', protect, admin, userController.updateUser);
router.delete('/:id', protect, admin, userController.deleteUser);
router.put('/:id/reset-password', protect, admin, userController.resetUserPassword);

module.exports = router;