const { pool } = require('../config/db');
const { formatSuccessResponse, formatErrorResponse } = require('../utils');
const { HTTP_STATUS } = require('../constants');

// ดึงข้อมูลประเภทอุปกรณ์ทั้งหมด
exports.getAllEquipmentTypes = async (req, res) => {
  try {
    // ใช้ชื่อตารางที่ถูกต้อง (equipmenttypes) และเพิ่ม alias category_name
    const [rows] = await pool.query('SELECT type_id, type_name, type_name as category_name, usage_type FROM equipmenttypes ORDER BY type_id DESC');
    
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(rows, 'ดึงข้อมูลประเภทอุปกรณ์สำเร็จ')
    );
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// เพิ่มประเภทอุปกรณ์ใหม่
exports.createEquipmentType = async (req, res) => {
  try {
    const { type_name, usage_type } = req.body;
    
    if (!type_name || type_name.trim() === '') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาระบุชื่อประเภทอุปกรณ์', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ตรวจสอบว่า usage_type มีค่าที่ถูกต้อง
    const validUsageTypes = ['Loan', 'Disbursement'];
    const finalUsageType = validUsageTypes.includes(usage_type) ? usage_type : 'Loan';
    
    // ตรวจสอบชื่อซ้ำในทุกประเภท (ไม่อนุญาตให้ใช้ชื่อซ้ำแม้ต่างประเภท)
    const checkQuery = 'SELECT * FROM equipmenttypes WHERE type_name = ?';
    const [existingRows] = await pool.query(checkQuery, [type_name.trim()]);
    
    if (existingRows.length > 0) {
      const existingType = existingRows[0];
      const existingUsageTypeText = existingType.usage_type === 'Loan' ? 'ยืม-คืน' : 'เบิกจ่าย';
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse(`ชื่อประเภท "${type_name.trim()}" มีอยู่แล้วในประเภท${existingUsageTypeText}`, HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // เพิ่ม usage_type ลงในคำสั่ง SQL
    const query = 'INSERT INTO equipmenttypes (type_name, usage_type, created_at, updated_at) VALUES (?, ?, NOW(), NOW())';
    const [result] = await pool.query(query, [type_name.trim(), finalUsageType]);
    
    if (result.affectedRows === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ไม่สามารถเพิ่มประเภทอุปกรณ์ได้', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    const newType = {
      type_id: result.insertId,
      type_name: type_name.trim(),
      usage_type: finalUsageType
    };
    
    return res.status(HTTP_STATUS.CREATED).json(
      formatSuccessResponse(newType, 'เพิ่มประเภทอุปกรณ์สำเร็จ')
    );
  } catch (error) {
    console.error('Error creating equipment type:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการเพิ่มประเภทอุปกรณ์', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// ดึงข้อมูลประเภทอุปกรณ์ตาม ID
exports.getEquipmentTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM equipmenttypes WHERE type_id = ?';
    const [rows] = await pool.query(query, [id]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบประเภทอุปกรณ์ที่ระบุ' });
    }
    
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching equipment type by ID:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์',
      error: error.message
    });
  }
};

// ดึงข้อมูลประเภทอุปกรณ์ตามประเภทการใช้งาน (Loan/Disbursement)
exports.getEquipmentTypesByUsage = async (req, res) => {
  try {
    const { usageType } = req.params;
    
    if (!['Loan', 'Disbursement'].includes(usageType)) {
      return res.status(400).json({ 
        success: false,
        message: 'ประเภทการใช้งานไม่ถูกต้อง' 
      });
    }
    
    const query = 'SELECT * FROM equipmenttypes WHERE usage_type = ?';
    const [rows] = await pool.query(query, [usageType]);
    
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching equipment types by usage:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์',
      error: error.message
    });
  }
};

// อัพเดทประเภทอุปกรณ์ตาม ID
exports.updateEquipmentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { type_name, usage_type } = req.body;
    
    // หาข้อมูลเดิมก่อน
    const [existingType] = await pool.query('SELECT * FROM equipmenttypes WHERE type_id = ?', [id]);
    
    if (!existingType || existingType.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบประเภทอุปกรณ์ที่ระบุ', HTTP_STATUS.NOT_FOUND)
      );
    }
    
    // ไม่อนุญาตให้เปลี่ยน usage_type หลังจากสร้างแล้ว
    if (usage_type && usage_type !== existingType[0].usage_type) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ไม่สามารถเปลี่ยนประเภทการใช้งาน (ยืม-คืน/เบิกจ่าย) หลังจากสร้างแล้ว', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    // ถ้ามีการเปลี่ยนชื่อ ตรวจสอบว่าชื่อใหม่ซ้ำกับที่มีอยู่หรือไม่
    if (type_name && type_name.trim() !== existingType[0].type_name) {
      const [duplicateCheck] = await pool.query(
        'SELECT * FROM equipmenttypes WHERE type_name = ? AND type_id != ?',
        [type_name.trim(), id]
      );
      
      if (duplicateCheck.length > 0) {
        const duplicateUsageTypeText = duplicateCheck[0].usage_type === 'Loan' ? 'ยืม-คืน' : 'เบิกจ่าย';
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse(`ชื่อประเภท "${type_name.trim()}" มีอยู่แล้วในประเภท${duplicateUsageTypeText}`, HTTP_STATUS.BAD_REQUEST)
        );
      }
    }
    
    // อัพเดทเฉพาะชื่อ ไม่เปลี่ยน usage_type
    const finalTypeName = type_name || existingType[0].type_name;
    const query = 'UPDATE equipmenttypes SET type_name = ? WHERE type_id = ?';
    const [result] = await pool.query(query, [finalTypeName, id]);
    
    if (result.affectedRows === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ไม่สามารถอัพเดทประเภทอุปกรณ์ได้', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse({
        type_id: id,
        type_name: finalTypeName,
        usage_type: existingType[0].usage_type
      }, 'อัพเดทประเภทอุปกรณ์สำเร็จ')
    );
  } catch (error) {
    console.error('Error updating equipment type:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการอัพเดทประเภทอุปกรณ์', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// ลบประเภทอุปกรณ์ตาม ID
exports.deleteEquipmentType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ตรวจสอบว่าประเภทอุปกรณ์มีอยู่หรือไม่
    const [existing] = await pool.query('SELECT * FROM equipmenttypes WHERE type_id = ?', [id]);
    
    if (!existing || existing.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบประเภทอุปกรณ์ที่ระบุ', HTTP_STATUS.NOT_FOUND)
      );
    }
    
    // ตรวจสอบว่ามีอุปกรณ์ที่ใช้ประเภทนี้หรือไม่
    const [equipments] = await pool.query('SELECT COUNT(*) AS count FROM equipments WHERE type_id = ?', [id]);
    
    if (equipments[0].count > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse(
          `ไม่สามารถลบประเภทอุปกรณ์นี้ได้ เนื่องจากมีอุปกรณ์ที่ใช้ประเภทนี้อยู่ ${equipments[0].count} รายการ`, 
          HTTP_STATUS.BAD_REQUEST
        )
      );
    }
    
    const query = 'DELETE FROM equipmenttypes WHERE type_id = ?';
    const [result] = await pool.query(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ไม่สามารถลบประเภทอุปกรณ์ได้', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    return res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(null, 'ลบประเภทอุปกรณ์สำเร็จ')
    );
  } catch (error) {
    console.error('Error deleting equipment type:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการลบประเภทอุปกรณ์', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};
