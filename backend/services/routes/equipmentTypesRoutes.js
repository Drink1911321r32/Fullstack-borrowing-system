const express = require('express');
const router = express.Router();
const equipmentTypeController = require('../../controllers/equipmentType.controller');

// ดึงข้อมูลประเภทอุปกรณ์ทั้งหมด
router.get('/', equipmentTypeController.getAllEquipmentTypes);

// ดึงข้อมูลประเภทอุปกรณ์ตามประเภทการใช้งาน
router.get('/usage/:usageType', equipmentTypeController.getEquipmentTypesByUsage);

// ดึงข้อมูลประเภทอุปกรณ์ตาม ID
router.get('/:id', equipmentTypeController.getEquipmentTypeById);

// เพิ่มประเภทอุปกรณ์
router.post('/', equipmentTypeController.createEquipmentType);

// อัพเดตประเภทอุปกรณ์
router.put('/:id', equipmentTypeController.updateEquipmentType);

// ลบประเภทอุปกรณ์
router.delete('/:id', equipmentTypeController.deleteEquipmentType);

module.exports = router;
