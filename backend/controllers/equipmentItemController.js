const { pool } = require('../config/db');
const { 
  updateEquipmentQuantity, 
  isValidSerialNumber,
  generateSerialNumber,
  formatSerialNumberDisplay
} = require('../utils');

// ดึงรายการ items ทั้งหมด
exports.getAllItems = async (req, res) => {
  try {
    const query = `
      SELECT 
        ei.*,
        e.equipment_name,
        e.model,
        e.image_path,
        e.type_id,
        et.type_name,
        et.usage_type,
        e.credit,
        (
          SELECT COUNT(*) 
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id AND bti.status IN ('Borrowed', 'Returned')
        ) as total_borrowed,
        (
          SELECT COUNT(*) 
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id AND bti.status = 'Returned'
        ) as total_returned,
        (
          SELECT bti.returned_date 
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id 
          ORDER BY COALESCE(bti.returned_date, bti.borrowed_date) DESC 
          LIMIT 1
        ) as last_transaction_date,
        (
          SELECT CASE WHEN bti.status = 'Returned' THEN 'returned' ELSE 'borrowed' END
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id 
          ORDER BY COALESCE(bti.returned_date, bti.borrowed_date) DESC 
          LIMIT 1
        ) as last_action_type
      FROM equipment_items ei
      LEFT JOIN equipments e ON ei.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      ORDER BY ei.created_at DESC
    `;
    
    const [items] = await pool.query(query);
    
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching all equipment items:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการอุปกรณ์ทั้งหมด',
      error: error.message
    });
  }
};

// ดึงรายการ items ทั้งหมดของอุปกรณ์ชิ้นนั้น
exports.getItemsByEquipmentId = async (req, res) => {
  try {
    const { equipmentId } = req.params;
    
    const query = `
      SELECT 
        ei.*,
        e.equipment_name,
        e.model,
        e.credit,
        e.type_id,
        et.type_name,
        et.usage_type,
        (
          SELECT COUNT(*) 
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id AND bti.status IN ('Borrowed', 'Returned')
        ) as total_borrowed,
        (
          SELECT COUNT(*) 
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id AND bti.status = 'Returned'
        ) as total_returned,
        (
          SELECT bti.returned_date 
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id 
          ORDER BY COALESCE(bti.returned_date, bti.borrowed_date) DESC 
          LIMIT 1
        ) as last_transaction_date,
        (
          SELECT CASE WHEN bti.status = 'Returned' THEN 'returned' ELSE 'borrowed' END
          FROM borrowing_transaction_items bti 
          WHERE bti.item_id = ei.item_id 
          ORDER BY COALESCE(bti.returned_date, bti.borrowed_date) DESC 
          LIMIT 1
        ) as last_action_type
      FROM equipment_items ei
      LEFT JOIN equipments e ON ei.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE ei.equipment_id = ?
      ORDER BY ei.serial_number ASC
    `;
    
    const [items] = await pool.query(query, [equipmentId]);
    
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('❌ Error fetching equipment items:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการอุปกรณ์',
      error: error.message
    });
  }
};

// ดึงข้อมูล item เดียว
exports.getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const query = `
      SELECT 
        ei.*,
        e.equipment_name,
        e.model,
        e.image_path,
        e.type_id,
        et.type_name,
        et.usage_type,
        e.credit
      FROM equipment_items ei
      LEFT JOIN equipments e ON ei.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      WHERE ei.item_id = ?
    `;
    
    const [items] = await pool.query(query, [itemId]);
    
    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการอุปกรณ์'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error('Error fetching equipment item:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการอุปกรณ์',
      error: error.message
    });
  }
};

// เพิ่ม item ใหม่
exports.createItem = async (req, res) => {
  try {
    let {
      equipment_id,
      serial_number,
      item_code,
      status,
      location,
      notes,
      condition_note,
      purchase_date,
      warranty_expiry
    } = req.body;
    
    if (!equipment_id) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ equipment_id'
      });
    }
    
    // ดึงข้อมูลอุปกรณ์เพื่อสร้าง Serial Number อัตโนมัติ
    const [equipment] = await pool.query(
      `SELECT e.equipment_id, e.model, e.type_id 
       FROM equipments e 
       WHERE e.equipment_id = ?`,
      [equipment_id]
    );
    
    if (equipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบอุปกรณ์ที่ระบุ'
      });
    }
    
    // ถ้าไม่มี serial_number ให้สร้างอัตโนมัติ
    if (!serial_number) {
      const equipmentData = equipment[0];
      const generatedSerial = await generateSerialNumber(
        equipmentData.type_id,
        equipmentData.equipment_id,
        equipmentData.model,
        pool
      );
      serial_number = generatedSerial;
    }
    
    // ตรวจสอบรูปแบบ serial number (ต้องเป็นตัวเลข 16 หลัก)
    if (!isValidSerialNumber(serial_number)) {
      return res.status(400).json({
        success: false,
        message: 'Serial Number ต้องเป็นตัวเลข 16 หลัก (Format: TTTT-EEEEE-MMMM-SSS)'
      });
    }
    
    // ตรวจสอบว่า serial_number ซ้ำหรือไม่
    const [existing] = await pool.query(
      'SELECT item_id FROM equipment_items WHERE serial_number = ?',
      [serial_number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Serial Number นี้มีอยู่ในระบบแล้ว'
      });
    }
    
    // Generate item_code ถ้าไม่มี
    if (!item_code) {
      // หา item_code ที่ไม่ซ้ำ
      let counter = 1;
      let isUnique = false;
      
      while (!isUnique) {
        item_code = `ITEM-${equipment_id}-${counter}`;
        const [existingCode] = await pool.query(
          'SELECT item_id FROM equipment_items WHERE item_code = ?',
          [item_code]
        );
        
        if (existingCode.length === 0) {
          isUnique = true;
        } else {
          counter++;
        }
      }
    } else {
      // ถ้ามี item_code มาให้ ต้องเช็คว่าซ้ำหรือไม่
      const [existingCode] = await pool.query(
        'SELECT item_id FROM equipment_items WHERE item_code = ?',
        [item_code]
      );
      
      if (existingCode.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Item Code นี้มีอยู่ในระบบแล้ว'
        });
      }
    }
    
    const query = `
      INSERT INTO equipment_items (
        equipment_id,
        serial_number,
        item_code,
        status,
        location,
        notes,
        condition_note,
        purchase_date,
        warranty_expiry,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await pool.query(query, [
      equipment_id,
      serial_number,
      item_code, // ตอนนี้จะมีค่าแน่นอนแล้ว (generate หรือ validated)
      status || 'Available',
      location || null,
      notes || null,
      condition_note || null,
      purchase_date || null,
      warranty_expiry || null
    ]);
    
    // อัพเดท quantity ในตาราง equipments
    await updateEquipmentQuantity(equipment_id, pool);
    
    return res.status(201).json({
      success: true,
      message: 'เพิ่มรายการอุปกรณ์สำเร็จ',
      item_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating equipment item:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มรายการอุปกรณ์',
      error: error.message
    });
  }
};

// แก้ไข item
exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      serial_number,
      item_code,
      status,
      location,
      notes,
      condition_note,
      purchase_date,
      warranty_expiry,
      last_maintenance_date
    } = req.body;
    
    // ตรวจสอบว่า item มีอยู่จริง
    const [existingItem] = await pool.query(
      'SELECT equipment_id FROM equipment_items WHERE item_id = ?',
      [itemId]
    );
    
    if (existingItem.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการอุปกรณ์'
      });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (serial_number !== undefined) {
      // ตรวจสอบรูปแบบ serial number ใหม่
      if (!isValidSerialNumber(serial_number)) {
        return res.status(400).json({
          success: false,
          message: 'Serial Number ต้องเป็นตัวเลข 16 หลัก (Format: TTTTEEEEEMMMMSSS)'
        });
      }
      
      // ตรวจสอบ serial_number ซ้ำ
      const [duplicate] = await pool.query(
        'SELECT item_id FROM equipment_items WHERE serial_number = ? AND item_id != ?',
        [serial_number, itemId]
      );
      
      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Serial Number นี้มีอยู่ในระบบแล้ว'
        });
      }
      
      updateFields.push('serial_number = ?');
      updateValues.push(serial_number);
    }
    
    if (item_code !== undefined) {
      updateFields.push('item_code = ?');
      updateValues.push(item_code);
    }
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    
    if (condition_note !== undefined) {
      updateFields.push('condition_note = ?');
      updateValues.push(condition_note);
    }
    
    if (purchase_date !== undefined) {
      updateFields.push('purchase_date = ?');
      updateValues.push(purchase_date || null);
    }
    
    if (warranty_expiry !== undefined) {
      updateFields.push('warranty_expiry = ?');
      updateValues.push(warranty_expiry || null);
    }
    
    if (last_maintenance_date !== undefined) {
      updateFields.push('last_maintenance_date = ?');
      updateValues.push(last_maintenance_date || null);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีข้อมูลที่ต้องการแก้ไข'
      });
    }
    
    updateValues.push(itemId);
    
    const query = `
      UPDATE equipment_items 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE item_id = ?
    `;
    
    await pool.query(query, updateValues);
    
    // อัพเดท quantity ในตาราง equipments
    await updateEquipmentQuantity(existingItem[0].equipment_id, pool);
    
    return res.status(200).json({
      success: true,
      message: 'แก้ไขรายการอุปกรณ์สำเร็จ'
    });
  } catch (error) {
    console.error('Error updating equipment item:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขรายการอุปกรณ์',
      error: error.message
    });
  }
};

// ลบ item
exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // ตรวจสอบว่า item กำลังถูกยืมอยู่หรือไม่
    const [item] = await pool.query(
      'SELECT equipment_id, status FROM equipment_items WHERE item_id = ?',
      [itemId]
    );
    
    if (item.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการอุปกรณ์'
      });
    }
    
    if (item[0].status === 'Borrowed') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบรายการที่กำลังถูกยืมอยู่ได้'
      });
    }
    
    const equipment_id = item[0].equipment_id;
    
    await pool.query('DELETE FROM equipment_items WHERE item_id = ?', [itemId]);
    
    // อัพเดท quantity ในตาราง equipments
    await updateEquipmentQuantity(equipment_id, pool);
    
    return res.status(200).json({
      success: true,
      message: 'ลบรายการอุปกรณ์สำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting equipment item:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบรายการอุปกรณ์',
      error: error.message
    });
  }
};

// ดึงประวัติการใช้งานของ item
exports.getItemHistory = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // ตรวจสอบว่า item มีอยู่จริงหรือไม่
    const [itemCheck] = await pool.query(
      'SELECT item_id, serial_number FROM equipment_items WHERE item_id = ?',
      [itemId]
    );
    
    if (!itemCheck || itemCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการอุปกรณ์'
      });
    }
    
    // ดึงข้อมูลจาก borrowing_transaction_items (เฉพาะที่ Approved/Borrowed/Returned เท่านั้น)
    const query = `
      SELECT 
        bti.transaction_id,
        bti.item_id,
        bti.status,
        bti.borrowed_date,
        bti.returned_date,
        bti.condition_on_return,
        bt.member_id,
        bt.borrow_date,
        bt.expected_return_date,
        bt.purpose,
        bt.status as transaction_status,
        bt.approval_date,
        bt.approved_by_admin,
        m.first_name,
        m.last_name,
        m.email,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name,
        CASE 
          WHEN bti.status = 'Returned' THEN 'returned'
          WHEN bti.status = 'Borrowed' THEN 'borrowed'
          ELSE NULL
        END as action_type,
        COALESCE(bti.returned_date, bt.approval_date, bt.borrow_date) as action_date,
        DATEDIFF(
          bt.expected_return_date, 
          bt.borrow_date
        ) as days_borrowed
      FROM borrowing_transaction_items bti
      JOIN borrowing_transactions bt ON bti.transaction_id = bt.transaction_id
      LEFT JOIN members m ON bt.member_id = m.member_id
      LEFT JOIN admins admin ON bt.approved_by_admin = admin.admin_id
      WHERE bti.item_id = ? 
        AND bt.status IN ('Approved', 'Borrowed', 'Completed')
        AND bti.status IN ('Borrowed', 'Returned')
      ORDER BY action_date DESC
    `;
    
    const [history] = await pool.query(query, [itemId]);
    
    return res.status(200).json({
      success: true,
      data: history,
      message: history.length === 0 ? 'ไม่มีประวัติการใช้งาน' : undefined
    });
  } catch (error) {
    console.error('❌ Error fetching item history:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติ',
      error: error.message
    });
  }
};

// ฟังก์ชันบันทึกประวัติการใช้งานอุปกรณ์
exports.addItemHistory = async (itemId, actionType, performedBy, borrowingTransactionId = null, notes = null, isAdmin = false) => {
  try {
    const performedByAdmin = isAdmin ? performedBy : null;
    const performedByMember = !isAdmin ? performedBy : null;
    
    const query = `
      INSERT INTO equipment_item_history 
      (item_id, transaction_id, action_type, action_date, performed_by_admin, performed_by_member, notes)
      VALUES (?, ?, ?, NOW(), ?, ?, ?)
    `;
    
    await pool.query(query, [
      itemId, 
      borrowingTransactionId, 
      actionType, 
      performedByAdmin, 
      performedByMember, 
      notes
    ]);
    return true;
  } catch (error) {
    console.error('❌ Error adding item history:', error);
    return false;
  }
};

/**
 * SSE Stream endpoint for real-time inventory updates
 */
exports.streamInventoryUpdates = async (req, res) => {
  const inventoryEmitter = require('../utils/inventoryEventEmitter');
  
  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Add client to emitter
  inventoryEmitter.addClient(res);
  
  // Send initial connection success
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`);
  
  // Handle inventory changes
  const handleInventoryChange = (data) => {
  };
  
  inventoryEmitter.on('inventory-changed', handleInventoryChange);
  
  // Handle client disconnect
  req.on('close', () => {
    inventoryEmitter.removeClient(res);
    inventoryEmitter.off('inventory-changed', handleInventoryChange);
  });
};

