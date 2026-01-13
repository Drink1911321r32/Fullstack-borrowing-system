const express = require('express');
const router = express.Router();
const equipmentController = require('../../controllers/equipmentController');
const { protect, admin } = require('../../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ค้นหาตามสถานะ (ต้องอยู่ก่อน route อื่นๆ)
router.get('/search-by-status', protect, equipmentController.searchByStatus);

// กำหนดที่เก็บไฟล์รูปภาพ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/equipment';
    // ตรวจสอบว่ามีโฟลเดอร์หรือไม่ ถ้าไม่มีให้สร้างใหม่
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'equipment-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('เฉพาะไฟล์รูปภาพเท่านั้น!'));
  } 
});

// เส้นทาง API
router.get('/', equipmentController.getAllEquipment);
router.get('/export/excel', protect, admin, equipmentController.exportInventoryExcel);
router.get('/search', equipmentController.searchEquipment);
router.get('/types', equipmentController.getEquipmentTypes);
router.get('/categories', equipmentController.getEquipmentCategories);
router.get('/available', equipmentController.getAvailableEquipment);
router.get('/usage/:usageType', equipmentController.getEquipmentByUsageType);
router.get('/:id', equipmentController.getEquipmentById);
router.post('/', protect, admin, upload.single('image'), equipmentController.createEquipment);
router.put('/:id', protect, admin, upload.single('image'), equipmentController.updateEquipment);
router.delete('/:id', protect, admin, equipmentController.deleteEquipment);


module.exports = router;