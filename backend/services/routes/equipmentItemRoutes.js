const express = require('express');
const router = express.Router();
const equipmentItemController = require('../../controllers/equipmentItemController');
const { protect, admin } = require('../../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// Middleware for SSE authentication via query string
const verifyTokenSSE = (req, res, next) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบ Token การยืนยันตัวตน' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Token ไม่ถูกต้องหรือหมดอายุ' 
    });
  }
};

// SSE stream endpoint (must be before protect middleware)
router.get('/stream', verifyTokenSSE, equipmentItemController.streamInventoryUpdates);

// ดึงรายการ items ทั้งหมด (สำหรับหน้า Inventory)
router.get('/all', protect, equipmentItemController.getAllItems);

// ดึงรายการ items ทั้งหมดของอุปกรณ์ชิ้นนั้น
router.get('/equipment/:equipmentId/items', protect, equipmentItemController.getItemsByEquipmentId);

// ดึงข้อมูล item เดียว
router.get('/items/:itemId', protect, equipmentItemController.getItemById);

// ดึงประวัติการใช้งานของ item
router.get('/items/:itemId/history', protect, equipmentItemController.getItemHistory);

// เพิ่ม item ใหม่ (เฉพาะ admin)
router.post('/equipment/:equipmentId/items', protect, admin, equipmentItemController.createItem);

// แก้ไข item (เฉพาะ admin)
router.put('/items/:itemId', protect, admin, equipmentItemController.updateItem);

// ลบ item (เฉพาะ admin)
router.delete('/items/:itemId', protect, admin, equipmentItemController.deleteItem);

module.exports = router;
