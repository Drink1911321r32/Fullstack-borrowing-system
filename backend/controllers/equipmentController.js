const Equipment = require('../models/Equipment');
const EquipmentType = require('../models/EquipmentType');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { 
  formatSuccessResponse, 
  formatErrorResponse, 
  generateSerialNumber 
} = require('../utils');
const { HTTP_STATUS } = require('../constants');
const { generateInventoryExcel } = require('../utils/excelGenerator');

// ดึงข้อมูลอุปกรณ์ทั้งหมด
exports.getAllEquipment = async (req, res) => {
  try {
    // ดึงข้อมูลอุปกรณ์พร้อมนับจำนวนจริงจาก equipment_items ตามสถานะต่างๆ
    const query = `
      SELECT 
        e.*,
        et.type_name,
        et.type_name as category_name,
        et.usage_type,
        -- สำหรับอุปกรณ์ Loan ใช้ COUNT จาก equipment_items
        -- สำหรับอุปกรณ์ Disbursement ใช้ quantity จากตาราง equipments
        CASE 
          WHEN et.usage_type = 'Loan' THEN COUNT(ei.item_id)
          ELSE e.quantity
        END as actual_quantity,
        CASE 
          WHEN et.usage_type = 'Loan' THEN COUNT(CASE WHEN ei.status = 'Available' THEN 1 END)
          ELSE (
            e.quantity - COALESCE((
              SELECT SUM(dt.quantity_disbursed)
              FROM disbursement_transactions dt
              WHERE dt.equipment_id = e.equipment_id 
              AND dt.status = 'Disbursed'
            ), 0)
          )
        END as quantity_available,
        COUNT(CASE WHEN ei.status = 'Borrowed' THEN 1 END) as quantity_borrowed,
        COUNT(CASE WHEN ei.status = 'Reserved' THEN 1 END) as quantity_reserved,
        COUNT(CASE WHEN ei.status = 'Maintenance' THEN 1 END) as quantity_maintenance,
        COUNT(CASE WHEN ei.status = 'Maintenance' THEN 1 END) as quantity_repairing,
        COUNT(CASE WHEN ei.status = 'Damaged' THEN 1 END) as quantity_damaged,
        COUNT(CASE WHEN ei.status = 'Lost' THEN 1 END) as quantity_lost,
        -- คำนวณ status รวมของอุปกรณ์ตามลำดับความสำคัญ
        CASE
          WHEN et.usage_type = 'Loan' THEN
            CASE
              WHEN COUNT(CASE WHEN ei.status = 'Borrowed' THEN 1 END) > 0 THEN 'Borrowed'
              WHEN COUNT(CASE WHEN ei.status = 'Reserved' THEN 1 END) > 0 THEN 'Reserved'
              WHEN COUNT(CASE WHEN ei.status = 'Damaged' THEN 1 END) > 0 THEN 'Damaged'
              WHEN COUNT(CASE WHEN ei.status = 'Lost' THEN 1 END) > 0 THEN 'Lost'
              WHEN COUNT(CASE WHEN ei.status = 'Maintenance' THEN 1 END) > 0 THEN 'Maintenance'
              WHEN COUNT(CASE WHEN ei.status = 'Available' THEN 1 END) > 0 THEN 'Available'
              ELSE 'Available'
            END
          ELSE 'Available'
        END as status
      FROM equipments e
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN equipment_items ei ON e.equipment_id = ei.equipment_id
      GROUP BY e.equipment_id
      HAVING (MAX(et.usage_type) = 'Loan' AND COUNT(ei.item_id) > 0) 
          OR (MAX(et.usage_type) = 'Disbursement' AND MAX(e.quantity) > 0)
    `;
    
    const [rows] = await pool.query(query);
    
    // Debug: Log status calculation
    console.log('📊 Equipment with calculated status:', rows.map(r => ({
      id: r.equipment_id,
      name: r.equipment_name,
      status: r.status,
      borrowed: r.quantity_borrowed,
      available: r.quantity_available,
      damaged: r.quantity_damaged,
      lost: r.quantity_lost
    })));
    
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์',
      error: error.message
    });
  }
};

// ดึงข้อมูลรวมทั้งอุปกรณ์และรายการแต่ละชิ้นตามสถานะ
exports.searchByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    
    if (!status || status === 'all') {
      // ถ้าไม่มีการระบุสถานะหรือเลือก all ให้ส่งข้อมูลทั้งหมด
      const equipmentQuery = `
        SELECT 
          e.*,
          et.type_name,
          et.usage_type,
          'equipment' as source_table
        FROM equipments e
        LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      `;
      
      const itemsQuery = `
        SELECT 
          ei.item_id,
          ei.serial_number,
          ei.item_code,
          ei.equipment_id,
          ei.status,
          ei.condition_note,
          ei.purchase_date,
          ei.warranty_expiry,
          e.equipment_name,
          e.model,
          e.image_path,
          et.type_name,
          et.usage_type,
          'equipment_item' as source_table
        FROM equipment_items ei
        LEFT JOIN equipments e ON ei.equipment_id = e.equipment_id
        LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      `;
      
      const [equipments] = await pool.query(equipmentQuery);
      const [items] = await pool.query(itemsQuery);
      
      return res.status(200).json({
        success: true,
        data: {
          equipments,
          items,
          total: equipments.length + items.length
        }
      });
    }
    
    // ถ้าระบุสถานะเฉพาะ
    const equipmentQuery = `
      SELECT 
        e.*,
        et.type_name,
        et.usage_type,
        'equipment' as source_table
      FROM equipments e
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE e.status = ?
    `;
    
    const itemsQuery = `
      SELECT 
        ei.item_id,
        ei.serial_number,
        ei.item_code,
        ei.equipment_id,
        ei.status,
        ei.condition_note,
        ei.purchase_date,
        ei.warranty_expiry,
        e.equipment_name,
        e.model,
        e.image_path,
        et.type_name,
        et.usage_type,
        'equipment_item' as source_table
      FROM equipment_items ei
      LEFT JOIN equipments e ON ei.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE ei.status = ?
    `;
    
    const [equipments] = await pool.query(equipmentQuery, [status]);
    const [items] = await pool.query(itemsQuery, [status]);
    
    return res.status(200).json({
      success: true,
      data: {
        equipments,
        items,
        total: equipments.length + items.length
      }
    });
  } catch (error) {
    console.error('Error searching by status:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาตามสถานะ',
      error: error.message
    });
  }
};

// ดึงข้อมูลอุปกรณ์ตาม ID
exports.getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // แก้ไขชื่อตารางจาก equipment เป็น equipments
    const query = `
      SELECT e.*, et.type_name 
      FROM equipments e
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE e.equipment_id = ?
    `;
    
    const [rows] = await pool.query(query, [id]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์ที่ระบุ' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching equipment by ID:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์',
      error: error.message
    });
  }
};

// เพิ่มอุปกรณ์ใหม่
exports.createEquipment = async (req, res) => {
  try {
    const { 
      equipment_name,
      model,
      type_id,
      status,
      credit,
      quantity,
      purchase_date,
      warranty_expiry
    } = req.body;
    
    // Validation
    if (!equipment_name || !equipment_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุชื่ออุปกรณ์'
      });
    }
    
    if (!type_id) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกประเภทอุปกรณ์'
      });
    }
    
    // ตรวจสอบว่า type_id มีอยู่จริง
    const [typeCheck] = await pool.query(
      'SELECT usage_type FROM equipmenttypes WHERE type_id = ?', 
      [type_id]
    );
    
    if (typeCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบประเภทอุปกรณ์ที่ระบุ'
      });
    }
    
    // ตั้งค่า credit ตาม usage_type
    const finalCredit = typeCheck[0].usage_type === 'Disbursement' ? 0 : (parseInt(credit) || 0);
    
    let image_path = null;
    if (req.file) {
      image_path = `/uploads/equipment/${req.file.filename}`;
    }
    
    // แก้ไขชื่อตารางจาก equipment เป็น equipments (ไม่มี created_at, updated_at)
    const query = `
      INSERT INTO equipments (
        equipment_name, 
        model,
        type_id, 
        status,
        credit, 
        quantity,
        purchase_date,
        warranty_expiry,
        image_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(query, [
      equipment_name.trim(),
      model || null,
      type_id,
      status || 'Available',
      finalCredit,
      parseInt(quantity) || 1,
      purchase_date || null,
      warranty_expiry || null,
      image_path
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'ไม่สามารถเพิ่มอุปกรณ์ได้' });
    }
    
    const equipment_id = result.insertId;
    
    // สร้าง equipment_items เฉพาะสำหรับอุปกรณ์ประเภท Loan เท่านั้น
    // อุปกรณ์เบิกจ่าย (Disbursement) ไม่ต้องมี serial number/item code
    if (typeCheck[0].usage_type === 'Loan') {
      const numQuantity = parseInt(quantity) || 1;
      if (numQuantity > 0) {
        const itemsQuery = `
          INSERT INTO equipment_items (
            equipment_id, 
            serial_number, 
            item_code, 
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, NOW(), NOW())
        `;
        
        for (let i = 1; i <= numQuantity; i++) {
          // สร้าง Serial Number รูปแบบใหม่ (16 หลัก ตัวเลขล้วน)
          // Format: TTTTEEEEEMMMMSSS
          const serial_number = generateSerialNumber(type_id, equipment_id, model || '', i);
          const item_code = `ITEM-${equipment_id}-${String(i).padStart(3, '0')}`;
          
          await pool.query(itemsQuery, [
            equipment_id,
            serial_number,
            item_code,
            'Available'
          ]);
        }
      }
    }

    // แจ้ง dashboard ให้อัพเดต
    const dashboardEmitter = require('../utils/dashboardEventEmitter');
    dashboardEmitter.notifyStatsChange('equipment-created');
    
    return res.status(201).json({
      success: true,
      data: {
        equipment_id: equipment_id,
        equipment_name: equipment_name.trim(),
        type_id: type_id,
        quantity: parseInt(quantity) || 1
      },
      message: 'เพิ่มอุปกรณ์สำเร็จ'
    });
  } catch (error) {
    console.error('Error creating equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์',
      error: error.message
    });
  }
};

// อัพเดทอุปกรณ์ตาม ID
exports.updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      equipment_name,
      model,
      type_id,
      status,
      credit,
      quantity,
      purchase_date,
      warranty_expiry
    } = req.body;
    
    // หาข้อมูลเดิมของอุปกรณ์
    const [equipment] = await pool.query('SELECT * FROM equipments WHERE equipment_id = ?', [id]);
    
    if (!equipment || equipment.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์ที่ระบุ' });
    }
    
    // ตรวจสอบว่ามีการอัพโหลดรูปภาพใหม่หรือไม่
    let image_path = equipment[0].image_path;
    if (req.file) {
      image_path = `/uploads/equipment/${req.file.filename}`;
    }
    
    // แก้ไขชื่อตารางจาก equipment เป็น equipments
    const query = `
      UPDATE equipments SET
        equipment_name = ?,
        model = ?,
        type_id = ?,
        status = ?,
        credit = ?,
        quantity = ?,
        purchase_date = ?,
        warranty_expiry = ?,
        image_path = ?
      WHERE equipment_id = ?
    `;
    
    const [result] = await pool.query(query, [
      equipment_name || equipment[0].equipment_name,
      model !== undefined ? model : equipment[0].model,
      type_id !== undefined ? type_id : equipment[0].type_id,
      status || equipment[0].status,
      credit !== undefined ? credit : equipment[0].credit,
      quantity !== undefined ? quantity : equipment[0].quantity,
      purchase_date !== undefined ? purchase_date : equipment[0].purchase_date,
      warranty_expiry !== undefined ? warranty_expiry : equipment[0].warranty_expiry,
      image_path,
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถอัพเดทอุปกรณ์ได้' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'อัพเดทอุปกรณ์สำเร็จ'
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทอุปกรณ์',
      error: error.message
    });
  }
};

// ลบอุปกรณ์ตาม ID
exports.deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ดึงข้อมูลอุปกรณ์เพื่อเช็ค image_path
    const [equipment] = await pool.query(
      'SELECT image_path FROM equipments WHERE equipment_id = ?',
      [id]
    );
    
    if (equipment.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบอุปกรณ์ที่ระบุ' 
      });
    }
    
    // ตรวจสอบว่ามีรายการอุปกรณ์แต่ละชิ้นที่ถูกยืมอยู่หรือไม่
    const [borrowedItems] = await pool.query(
      `SELECT COUNT(*) as count FROM equipment_items 
       WHERE equipment_id = ? AND status = 'Borrowed'`,
      [id]
    );
    
    if (borrowedItems[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบอุปกรณ์ได้ เนื่องจากมีรายการที่ถูกยืมอยู่'
      });
    }
    
    // ตรวจสอบว่ามีการยืมอยู่ในตาราง borrowing_transactions หรือไม่
    const [activeBorrowings] = await pool.query(
      `SELECT COUNT(*) as count FROM borrowing_transactions 
       WHERE equipment_id = ? AND status IN ('Pending', 'Approved', 'Borrowed')`,
      [id]
    );
    
    if (activeBorrowings[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบอุปกรณ์ได้ เนื่องจากมีรายการยืมที่ยังไม่เสร็จสิ้น'
      });
    }
    
    // ตรวจสอบว่ามีประวัติการคืนในตาราง return_transactions หรือไม่
    const [returnTransactions] = await pool.query(
      `SELECT COUNT(*) as count FROM return_transactions WHERE equipment_id = ?`,
      [id]
    );
    
    // ตรวจสอบว่ามีประวัติการยืมทั้งหมดในตาราง borrowing_transactions หรือไม่
    const [allBorrowings] = await pool.query(
      `SELECT COUNT(*) as count FROM borrowing_transactions WHERE equipment_id = ?`,
      [id]
    );
    
    // ถ้ามีประวัติ ต้องลบแบบ CASCADE
    if (returnTransactions[0].count > 0 || allBorrowings[0].count > 0) {
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // ลบประวัติทั้งหมดตามลำดับ
        await connection.query('DELETE FROM return_transactions WHERE equipment_id = ?', [id]);
        
        await connection.query('DELETE FROM borrowing_transactions WHERE equipment_id = ?', [id]);
        
        await connection.query('DELETE FROM equipment_items WHERE equipment_id = ?', [id]);
        
        const [result] = await connection.query('DELETE FROM equipments WHERE equipment_id = ?', [id]);
        
        if (result.affectedRows === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ 
            success: false,
            message: 'ไม่พบอุปกรณ์ที่ระบุ' 
          });
        }
        
        // ลบไฟล์รูปภาพถ้ามี
        if (equipment[0].image_path) {
          const imagePath = path.join(__dirname, '..', equipment[0].image_path);
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch (err) {
              console.error('Error deleting image file:', err);
            }
          }
        }
        
        await connection.commit();
        connection.release();
        return res.status(200).json({
          success: true,
          message: 'ลบอุปกรณ์และประวัติที่เกี่ยวข้องสำเร็จ'
        });
        
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }
    
    // ถ้าไม่มีประวัติ ลบแบบปกติ
    
    // ลบอุปกรณ์ (equipment_items จะถูกลบตาม CASCADE)
    const query = `DELETE FROM equipments WHERE equipment_id = ?`;
    
    const [result] = await pool.query(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบอุปกรณ์ที่ระบุหรืออุปกรณ์ถูกลบไปแล้ว' 
      });
    }
    
    // ลบไฟล์รูปภาพถ้ามี
    if (equipment[0].image_path) {
      const imagePath = path.join(__dirname, '..', equipment[0].image_path);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting image file:', err);
          // ไม่ return error เพราะลบข้อมูลในฐานข้อมูลสำเร็จแล้ว
        }
      }
    }
    return res.status(200).json({
      success: true,
      message: 'ลบอุปกรณ์สำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบอุปกรณ์',
      error: error.message,
      errorCode: error.code
    });
  }
};

// ดึงข้อมูลอุปกรณ์ที่พร้อมให้ยืม
exports.getAvailableEquipment = async (req, res) => {
  try {
    // ดึงอุปกรณ์ที่มีจำนวน Available > 0 จาก equipment_items
    const query = `
      SELECT 
        e.*, 
        et.type_name,
        et.usage_type,
        COUNT(CASE WHEN ei.status = 'Available' THEN 1 END) as quantity_available
      FROM equipments e
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN equipment_items ei ON e.equipment_id = ei.equipment_id
      WHERE e.status = 'Available'
      GROUP BY e.equipment_id
      HAVING quantity_available > 0
    `;
    
    const [rows] = await pool.query(query);
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching available equipment:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์',
      error: error.message
    });
  }
};

// แก้ไขฟังก์ชัน getEquipments เพื่อให้ดึงข้อมูล usage_type จาก equipmenttypes ด้วย

// ดึงข้อมูลอุปกรณ์ทั้งหมด
exports.getEquipments = async (req, res) => {
  try {
    // ใช้ JOIN เพื่อดึงข้อมูลประเภทอุปกรณ์พร้อมกับ usage_type
    const query = `
      SELECT e.*, t.type_name, t.usage_type
      FROM equipments e
      LEFT JOIN equipmenttypes t ON e.type_id = t.type_id
    `;
    const [rows] = await pool.query(query);
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error getting equipment:', error);
    return res.status(500).json({ message: 'Error getting equipment', error: error.message });
  }
};

// เพิ่มเมธอดใหม่เพื่อดึงอุปกรณ์ตามประเภทการใช้งาน
exports.getEquipmentByUsageType = async (req, res) => {
  try {
    const { usageType } = req.params;
    
    // ตรวจสอบค่า usageType
    if (!usageType || !['Loan', 'Disbursement'].includes(usageType)) {
      return res.status(400).json({ 
        message: 'ต้องระบุประเภทการใช้งานเป็น "Loan" หรือ "Disbursement"' 
      });
    }
    
    // ดึงข้อมูลอุปกรณ์ Disbursement ให้ใช้ e.quantity เป็นจำนวนรวม, quantity_available เป็นจำนวนที่ยังเบิกได้
    let query;
    if (usageType === 'Disbursement') {
      query = `
        SELECT e.*, t.type_name, t.usage_type,
          e.quantity as quantity,
          (e.quantity - COALESCE((
            SELECT SUM(dt.quantity_disbursed)
            FROM disbursement_transactions dt
            WHERE dt.equipment_id = e.equipment_id AND dt.status = 'Disbursed'
          ), 0)) as quantity_available
        FROM equipments e
        LEFT JOIN equipmenttypes t ON e.type_id = t.type_id
        WHERE t.usage_type = ?
      `;
    } else {
      query = `
        SELECT e.*, t.type_name, t.usage_type,
          COUNT(CASE WHEN ei.status = 'Available' THEN 1 END) as quantity_available
        FROM equipments e
        LEFT JOIN equipmenttypes t ON e.type_id = t.type_id
        LEFT JOIN equipment_items ei ON e.equipment_id = ei.equipment_id
        WHERE t.usage_type = ?
        GROUP BY e.equipment_id
      `;
    }
    const [rows] = await pool.query(query, [usageType]);
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error getting equipment by usage type:', error);
    return res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์', 
      error: error.message 
    });
  }
};

// ค้นหาอุปกรณ์
exports.searchEquipment = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    
    if (!searchQuery) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาระบุคำค้นหา', HTTP_STATUS.BAD_REQUEST)
      );
    }
    
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        et.type_name,
        et.usage_type,
        COUNT(ei.item_id) as actual_quantity,
        COUNT(CASE WHEN ei.status = 'Available' THEN 1 END) as quantity_available
      FROM equipments e
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN equipment_items ei ON e.equipment_id = ei.equipment_id
      WHERE e.equipment_name LIKE ? OR e.model LIKE ? OR et.type_name LIKE ?
      GROUP BY e.equipment_id
    `, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);
    
    res.json(formatSuccessResponse(rows, `พบ ${rows.length} รายการ`));
  } catch (error) {
    console.error('Error searching equipment:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการค้นหาอุปกรณ์', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// ดูประเภทอุปกรณ์ทั้งหมด (alias for equipmentType controller)
exports.getEquipmentTypes = async (req, res) => {
  try {
    const [types] = await pool.query('SELECT * FROM equipmenttypes ORDER BY type_name ASC');
    res.json(formatSuccessResponse(types, 'ดึงข้อมูลประเภทอุปกรณ์สำเร็จ'));
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// ดูหมวดหมู่อุปกรณ์ (เหมือน types)
exports.getEquipmentCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT 
        type_id as category_id,
        type_name as category_name,
        description,
        usage_type
      FROM equipmenttypes 
      ORDER BY type_name ASC
    `);
    res.json(formatSuccessResponse(categories, 'ดึงข้อมูลหมวดหมู่อุปกรณ์สำเร็จ'));
  } catch (error) {
    console.error('Error fetching equipment categories:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่อุปกรณ์', HTTP_STATUS.SERVER_ERROR)
    );
  }
};

// ส่งออกข้อมูลคลังอุปกรณ์เป็น Excel
exports.exportInventoryExcel = async (req, res) => {
  try {
    // ดึงข้อมูลอุปกรณ์ทั้งหมดพร้อมสถิติและประเภท
    const query = `
      SELECT 
        e.equipment_id,
        e.equipment_name,
        e.model,
        e.status,
        e.credit,
        et.type_name,
        et.usage_type,
        -- สำหรับอุปกรณ์ Loan ใช้ COUNT จาก equipment_items
        -- สำหรับอุปกรณ์ Disbursement ใช้ quantity จากตาราง equipments
        CASE 
          WHEN et.usage_type = 'Loan' THEN COUNT(ei.item_id)
          ELSE e.quantity
        END as quantity,
        CASE 
          WHEN et.usage_type = 'Loan' THEN COUNT(CASE WHEN ei.status = 'Available' THEN 1 END)
          ELSE (
            e.quantity - COALESCE((
              SELECT SUM(dt.quantity_disbursed)
              FROM disbursement_transactions dt
              WHERE dt.equipment_id = e.equipment_id 
              AND dt.status = 'Disbursed'
            ), 0)
          )
        END as quantity_available,
        COUNT(CASE WHEN ei.status = 'Borrowed' THEN 1 END) as quantity_borrowed,
        COUNT(CASE WHEN ei.status = 'Maintenance' THEN 1 END) as quantity_maintenance,
        COUNT(CASE WHEN ei.status = 'Maintenance' THEN 1 END) as quantity_repairing,
        COUNT(CASE WHEN ei.status = 'Damaged' THEN 1 END) as quantity_damaged,
        COUNT(CASE WHEN ei.status = 'Lost' THEN 1 END) as quantity_lost,
        -- คำนวณ status รวมของอุปกรณ์ตามลำดับความสำคัญ
        CASE
          WHEN et.usage_type = 'Loan' THEN
            CASE
              WHEN COUNT(CASE WHEN ei.status = 'Borrowed' THEN 1 END) > 0 THEN 'Borrowed'
              WHEN COUNT(CASE WHEN ei.status = 'Reserved' THEN 1 END) > 0 THEN 'Reserved'
              WHEN COUNT(CASE WHEN ei.status = 'Damaged' THEN 1 END) > 0 THEN 'Damaged'
              WHEN COUNT(CASE WHEN ei.status = 'Lost' THEN 1 END) > 0 THEN 'Lost'
              WHEN COUNT(CASE WHEN ei.status = 'Maintenance' THEN 1 END) > 0 THEN 'Maintenance'
              WHEN COUNT(CASE WHEN ei.status = 'Available' THEN 1 END) > 0 THEN 'Available'
              ELSE 'Available'
            END
          ELSE 'Available'
        END as status
      FROM equipments e
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN equipment_items ei ON e.equipment_id = ei.equipment_id
      GROUP BY e.equipment_id
      HAVING (MAX(et.usage_type) = 'Loan' AND COUNT(ei.item_id) > 0) 
          OR (MAX(et.usage_type) = 'Disbursement' AND MAX(e.quantity) > 0)
      ORDER BY et.usage_type, e.equipment_name ASC
    `;
    
    const [equipment] = await pool.query(query);

    // สร้างไฟล์ Excel
    const excelBuffer = await generateInventoryExcel(equipment);

    // ตั้งชื่อไฟล์ตามวันที่
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.xlsx`;

    // ส่งไฟล์กลับไป
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting inventory:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
    });
  }
};
