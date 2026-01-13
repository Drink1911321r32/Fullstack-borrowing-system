const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');
const { protect, admin } = require('../../middleware/authMiddleware');
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
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้อง' });
  }
};

// SSE endpoint สำหรับ real-time notifications
router.get('/stream', verifyTokenSSE, notificationController.streamNotifications);

// Admin routes
router.get('/all', protect, admin, notificationController.getAllNotifications);

// User routes
router.get('/', protect, notificationController.getUserNotifications);
router.get('/unread', protect, notificationController.getUnreadNotifications);
router.put('/:notification_id/read', protect, notificationController.markAsRead);
router.put('/mark-all-read', protect, notificationController.markAllAsRead);
router.delete('/:notification_id', protect, notificationController.deleteNotification);

module.exports = router;
