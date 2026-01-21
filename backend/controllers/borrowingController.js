const { pool } = require('../config/db');
const { notifyNewBorrowRequest, notifyBorrowApproved, notifyBorrowRejected, notifyCreditChange } = require('../utils/notificationHelper');
const { addItemHistory } = require('./equipmentItemController');
const { createBorrowRequestByItems, approveBorrowRequestByItems } = require('./borrowingByItemsController');
const { getMemberSnapshot } = require('../utils');

/**
 * สร้างคำขอยืมอุปกรณ์ (User)
 * ถ้ามี item_ids จะใช้ระบบยืมรายชิ้น มิฉะนั้นใช้ระบบยืมแบบเดิม
 */
const createBorrowRequest = async (req, res) => {
  const { equipment } = req.body;
  
  // ตรวจสอบว่าเป็นการยืมรายชิ้นหรือไม่
  const isItemBasedBorrowing = equipment && Array.isArray(equipment) && 
    equipment.some(item => item.item_ids && Array.isArray(item.item_ids));
  
  if (isItemBasedBorrowing) {
    // ใช้ระบบยืมรายชิ้น
    return createBorrowRequestByItems(req, res);
  }
  
  // ใช้ระบบยืมแบบเดิม (ระบุ quantity)
  return createBorrowRequestOld(req, res);
};

/**
 * ระบบยืมแบบเดิม (ยืมตาม quantity)
 */
const createBorrowRequestOld = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.member_id;
    const { 
      equipment, // รับเป็น array ของอุปกรณ์
      borrow_date, 
      expected_return_date, 
      purpose,
      location
    } = req.body;

    // Validate input
    if (!equipment || !Array.isArray(equipment) || equipment.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกอุปกรณ์ที่ต้องการยืม'
      });
    }

    if (!borrow_date || !expected_return_date) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลวันที่ให้ครบถ้วน'
      });
    }

    // ตรวจสอบว่าวันที่ยืมไม่เป็นวันที่ผ่านมาแล้ว
    const borrowDate = new Date(borrow_date);
    const returnDate = new Date(expected_return_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    borrowDate.setHours(0, 0, 0, 0);
    returnDate.setHours(0, 0, 0, 0);

    if (borrowDate < today) {
      return res.status(400).json({
        success: false,
        message: 'วันที่ยืมต้องไม่เป็นวันที่ผ่านมาแล้ว'
      });
    }

    if (returnDate <= borrowDate) {
      return res.status(400).json({
        success: false,
        message: 'วันที่คืนต้องมากกว่าวันที่ยืม'
      });
    }

    // เริ่ม transaction
    await connection.beginTransaction();

    const transactionIds = [];
    const errors = [];
    const batchId = `BATCH_${Date.now()}_${userId}`; // สร้าง batch ID สำหรับการยืมครั้งนี้

    // วนลูปสร้างคำขอยืมสำหรับแต่ละอุปกรณ์
    for (const item of equipment) {
      const { equipment_id, quantity } = item;

      if (!equipment_id || !quantity || quantity <= 0) {
        errors.push(`ข้อมูลอุปกรณ์ไม่ถูกต้อง: ${equipment_id}`);
        continue;
      }

      // ตรวจสอบว่ามีอุปกรณ์เพียงพอหรือไม่
      const [equipmentData] = await connection.query(
        'SELECT equipment_id, equipment_name, quantity, status FROM equipments WHERE equipment_id = ?',
        [equipment_id]
      );

      if (equipmentData.length === 0) {
        errors.push(`ไม่พบอุปกรณ์: ${equipment_id}`);
        continue;
      }

      if (equipmentData[0].status !== 'Available') {
        errors.push(`อุปกรณ์ ${equipmentData[0].equipment_name} ไม่สามารถยืมได้ในขณะนี้`);
        continue;
      }

      if (equipmentData[0].quantity < quantity) {
        errors.push(`${equipmentData[0].equipment_name} มีจำนวนไม่เพียงพอ (มีอยู่ ${equipmentData[0].quantity} ชิ้น)`);
        continue;
      }

      // Get member snapshot
      const memberSnapshot = await getMemberSnapshot(userId, connection);

      // สร้างคำขอยืม พร้อม batch_id และ member snapshot
      const [result] = await connection.query(
        `INSERT INTO borrowing_transactions 
        (batch_id, member_id, member_name, member_email, equipment_id, borrow_date, expected_return_date, quantity_borrowed, status, purpose, location, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, NOW(), NOW())`,
        [batchId, userId, memberSnapshot.member_name, memberSnapshot.member_email, equipment_id, borrow_date, expected_return_date, quantity, purpose || '', location || '']
      );

      transactionIds.push(result.insertId);
    }

    // ถ้ามี error และไม่มีการสร้างคำขอสำเร็จเลย
    if (errors.length > 0 && transactionIds.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถสร้างคำขอยืมได้',
        errors: errors
      });
    }

    // Commit transaction
    await connection.commit();

    // แจ้ง dashboard ให้อัพเดต
    const dashboardEmitter = require('../utils/dashboardEventEmitter');
    dashboardEmitter.notifyStatsChange('borrow-created');
    
    // แจ้ง inventory ให้อัพเดต
    const inventoryEmitter = require('../utils/inventoryEventEmitter');
    inventoryEmitter.notifyInventoryChange('borrow-created', { transactionIds });

    // ส่งการแจ้งเตือนแบบ async ไม่ต้องรอ (ใช้ setImmediate เพื่อไม่บล็อค response)
    if (transactionIds.length > 0) {
      setImmediate(async () => {
        try {
          const [user] = await connection.query('SELECT first_name, last_name FROM members WHERE member_id = ?', [userId]);
          const userName = `${user[0].first_name} ${user[0].last_name}`;
          
          // ดึงข้อมูลอุปกรณ์ทั้งหมดในครั้งเดียว
          const placeholders = transactionIds.map(() => '?').join(',');
          const [borrowTransactions] = await connection.query(
            `SELECT bt.transaction_id, e.equipment_name 
             FROM borrowing_transactions bt 
             JOIN equipments e ON bt.equipment_id = e.equipment_id 
             WHERE bt.transaction_id IN (${placeholders})`,
            transactionIds
          );
          
          // แจ้งเตือนทีละรายการ
          for (const tx of borrowTransactions) {
            notifyNewBorrowRequest({
              transaction_id: tx.transaction_id,
              user_name: userName,
              equipment_name: tx.equipment_name
            }).catch(err => console.error('Notification error:', err));
          }
        } catch (err) {
          console.error('Error sending notifications:', err);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: transactionIds.length > 1 
        ? `สร้างคำขอยืมสำเร็จ ${transactionIds.length} รายการ รอการอนุมัติ`
        : 'สร้างคำขอยืมสำเร็จ รอการอนุมัติ',
      data: {
        transaction_ids: transactionIds,
        total_created: transactionIds.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error creating borrow request:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างคำขอยืม',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ดึงรายการยืมของผู้ใช้ (User)
 */
const getUserBorrowings = async (req, res) => {
  try {
    const userId = req.user.member_id;

    const [borrowings] = await pool.query(
      `SELECT 
        bt.*,
        e.equipment_name,
        e.model,
        e.image_path,
        e.quantity as current_stock,
        et.type_name,
        approver.first_name as approver_first_name,
        approver.last_name as approver_last_name,
        rt.actual_return_date,
        DATE_FORMAT(bt.borrow_date, '%Y-%m-%d %H:%i:%s') as borrow_datetime,
        DATE_FORMAT(bt.expected_return_date, '%Y-%m-%d %H:%i:%s') as expected_return_datetime,
        DATE_FORMAT(bt.approval_date, '%Y-%m-%d %H:%i:%s') as approval_datetime,
        DATE_FORMAT(bt.created_at, '%Y-%m-%d %H:%i:%s') as created_datetime,
        DATE_FORMAT(rt.actual_return_date, '%Y-%m-%d %H:%i:%s') as actual_return_datetime,
        COALESCE(bt.total_returned, 0) as total_returned,
        (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) as quantity_remaining
      FROM borrowing_transactions bt
      LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN admins approver ON bt.approved_by_admin = approver.admin_id
      LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
      WHERE bt.member_id = ?
      ORDER BY bt.created_at DESC`,
      [userId]
    );

    // ดึงข้อมูล items สำหรับแต่ละ transaction
    for (const borrowing of borrowings) {
      const [items] = await pool.query(
        `SELECT 
          bti.*,
          ei.serial_number,
          ei.item_code,
          ei.location,
          ei.status as item_status
        FROM borrowing_transaction_items bti
        LEFT JOIN equipment_items ei ON bti.item_id = ei.item_id
        WHERE bti.transaction_id = ?`,
        [borrowing.transaction_id]
      );
      borrowing.borrowed_items = items;
    }

    res.json({
      success: true,
      data: borrowings
    });
  } catch (error) {
    console.error('Error fetching user borrowings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการยืม',
      error: error.message
    });
  }
};

/**
 * ดึงรายการยืมทั้งหมด (Admin)
 */
const getAllBorrowings = async (req, res) => {
  try {
    const { status, member_id, equipment_id } = req.query;
    
    let query = `
      SELECT 
        bt.*,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        e.equipment_name,
        e.model,
        e.image_path,
        e.quantity as current_stock,
        et.type_name,
        approver.first_name as approver_first_name,
        approver.last_name as approver_last_name,
        COALESCE(bt.total_returned, 0) as total_returned,
        (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) as quantity_remaining,
        bt.is_returned,
        DATE_FORMAT(bt.borrow_date, '%Y-%m-%d %H:%i:%s') as borrow_datetime,
        DATE_FORMAT(bt.expected_return_date, '%Y-%m-%d %H:%i:%s') as expected_return_datetime,
        DATE_FORMAT(bt.approval_date, '%Y-%m-%d %H:%i:%s') as approval_datetime,
        DATE_FORMAT(bt.created_at, '%Y-%m-%d %H:%i:%s') as created_datetime,
        CASE 
          WHEN bt.is_returned = 1 THEN 'Completed'
          WHEN bt.status = 'Returned' THEN 'Completed'
          WHEN COALESCE(bt.total_returned, 0) >= bt.quantity_borrowed THEN 'Completed'
          ELSE bt.status
        END as display_status
      FROM borrowing_transactions bt
      LEFT JOIN members u ON bt.member_id = u.member_id
      LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
      LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
      LEFT JOIN admins approver ON bt.approved_by_admin = approver.admin_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND bt.status = ?';
      params.push(status);
    }
    
    if (member_id) {
      query += ' AND bt.member_id = ?';
      params.push(member_id);
    }
    
    if (equipment_id) {
      query += ' AND bt.equipment_id = ?';
      params.push(equipment_id);
    }
    
    query += ' ORDER BY bt.created_at DESC';
    
    const [borrowings] = await pool.query(query, params);
    
    if (borrowings.length > 0) {
      
      // Log จำนวนที่เกินกำหนด
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdueCount = borrowings.filter(b => {
        if (b.status !== 'Approved' && b.status !== 'Borrowed') return false;
        if (b.quantity_remaining <= 0) return false;
        const expectedDate = new Date(b.expected_return_date);
        expectedDate.setHours(0, 0, 0, 0);
        return today > expectedDate;
      }).length;
    }

    // ดึงข้อมูล items สำหรับแต่ละ transaction
    for (const borrowing of borrowings) {
      const [items] = await pool.query(
        `SELECT 
          bti.*,
          ei.serial_number,
          ei.item_code,
          ei.location,
          ei.status as item_status
        FROM borrowing_transaction_items bti
        LEFT JOIN equipment_items ei ON bti.item_id = ei.item_id
        WHERE bti.transaction_id = ?`,
        [borrowing.transaction_id]
      );
      borrowing.borrowed_items = items;
    }

    res.json({
      success: true,
      data: borrowings,
      total: borrowings.length
    });
  } catch (error) {
    console.error('Error fetching all borrowings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการยืม',
      error: error.message
    });
  }
};

/**
 * อนุมัติคำขอยืม (Admin)
 * รองรับการอนุมัติทั้ง batch ถ้ามี batch_id เดียวกัน
 */
const approveBorrowing = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    // ตรวจสอบว่าเป็น transaction ที่ใช้ระบบยืมรายชิ้นหรือไม่
    const [transactionCheck] = await connection.query(
      `SELECT bt.*, 
       (SELECT COUNT(*) FROM borrowing_transaction_items WHERE transaction_id = bt.transaction_id) as item_count
       FROM borrowing_transactions bt
       WHERE bt.transaction_id = ?`,
      [id]
    );
    
    if (transactionCheck.length > 0 && transactionCheck[0].item_count > 0) {
      // ใช้ระบบอนุมัติรายชิ้น
      connection.release();
      return approveBorrowRequestByItems(req, res);
    }
    
    // ใช้ระบบอนุมัติแบบเดิม
    return approveBorrowingOld(req, res, connection);
    
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error in approveBorrowing:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอยืม',
      error: error.message
    });
  }
};

const approveBorrowingOld = async (req, res, existingConnection = null) => {
  const connection = existingConnection || await pool.getConnection();
  
  try {
    const { id } = req.params;
    const adminId = req.user.member_id;
    const { notes } = req.body;

    await connection.beginTransaction();

    // ตรวจสอบคำขอยืม
    const [borrowing] = await connection.query(
      'SELECT * FROM borrowing_transactions WHERE transaction_id = ?',
      [id]
    );

    if (borrowing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอยืมนี้'
      });
    }

    if (borrowing[0].status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'คำขอนี้ได้รับการดำเนินการแล้ว'
      });
    }

    const batchId = borrowing[0].batch_id;
    let borrowingsToApprove = [borrowing[0]];

    // ถ้ามี batch_id ให้ดึงทุก transaction ใน batch มาด้วย
    if (batchId) {
      const [batchBorrowings] = await connection.query(
        'SELECT * FROM borrowing_transactions WHERE batch_id = ? AND status = ?',
        [batchId, 'Pending']
      );
      borrowingsToApprove = batchBorrowings;
    }

    // ตรวจสอบและคำนวณเครดิตรวมทั้งหมด
    const userId = borrowing[0].member_id;
    
    // 🔒 Lock user row to prevent race condition on credit deduction
    const [user] = await connection.query(
      'SELECT credit, first_name, last_name FROM members WHERE member_id = ? FOR UPDATE',
      [userId]
    );

    if (user.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    let totalCreditNeeded = 0;
    const equipmentDetails = [];

    for (const b of borrowingsToApprove) {
      // ตรวจสอบจำนวนอุปกรณ์
      // 🔒 Lock equipment row to prevent overselling
      const [equipment] = await connection.query(
        'SELECT quantity, equipment_name, credit FROM equipments WHERE equipment_id = ? FOR UPDATE',
        [b.equipment_id]
      );

      if (equipment[0].quantity < b.quantity_borrowed) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `อุปกรณ์ ${equipment[0].equipment_name} มีจำนวนไม่เพียงพอ`
        });
      }

      // คำนวณเครดิต
      const equipmentCredit = parseFloat(equipment[0].credit) || 0;
      const creditForThis = equipmentCredit * b.quantity_borrowed;
      totalCreditNeeded += creditForThis;

      equipmentDetails.push({
        name: equipment[0].equipment_name,
        quantity: b.quantity_borrowed,
        credit_per_unit: equipmentCredit,
        total_credit: creditForThis
      });
    }

    // เช็คว่าเครดิตต้องไม่ติดลบก่อนยืม (แต่สามารถติดลบได้หลังหักค่าปรับ)
    if (user[0].credit < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถยืมได้เนื่องจากเครดิตติดลบ (${user[0].credit} เครดิต) กรุณาเติมเครดิตก่อน`
      });
    }

    // เช็คว่าเครดิตหลังหักเพียงพอหรือไม่
    if (user[0].credit < totalCreditNeeded) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `เครดิตไม่เพียงพอ (ต้องการ ${totalCreditNeeded} เครดิต, คุณมี ${user[0].credit} เครดิต)`
      });
    }

    // หักเครดิตผู้ใช้
    await connection.query(
      'UPDATE members SET credit = credit - ?, updated_at = NOW() WHERE member_id = ?',
      [totalCreditNeeded, userId]
    );

    const newBalance = user[0].credit - totalCreditNeeded;

    // บันทึกประวัติเครดิต
    const description = equipmentDetails.map(e => 
      `${e.name} ${e.quantity} ชิ้น (${e.credit_per_unit}×${e.quantity}=${e.total_credit})`
    ).join(', ');

    await connection.query(
      `INSERT INTO credit_transactions 
      (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
      VALUES (?, ?, 'borrow', 'borrowing', ?, ?, ?, ?, NOW())`,
      [userId, -totalCreditNeeded, id, `ยืม: ${description}`, newBalance, adminId]
    );

    // แจ้งเตือนผู้ใช้เกี่ยวกับการหักเครดิต
    await notifyCreditChange(userId, {
      amount: -totalCreditNeeded,
      description: `หักเครดิตจากการยืม: ${description}`,
      balance_after: newBalance
    });

    // อนุมัติทุก transaction ใน batch
    for (const b of borrowingsToApprove) {
      // คำนวณเครดิตที่หักสำหรับ transaction นี้
      const [equipInfo] = await connection.query(
        'SELECT equipment_name, credit FROM equipments WHERE equipment_id = ?',
        [b.equipment_id]
      );
      const creditDeducted = parseFloat(equipInfo[0].credit) * b.quantity_borrowed;

      await connection.query(
        `UPDATE borrowing_transactions 
        SET status = 'Approved', approved_by_admin = ?, approval_date = NOW(), notes = ?, 
            credit_deducted = ?, updated_at = NOW()
        WHERE transaction_id = ?`,
        [adminId, notes || '', creditDeducted, b.transaction_id]
      );

      // ลดจำนวนอุปกรณ์ (FOR UPDATE ป้องกัน race condition)
      await connection.query(
        'UPDATE equipments SET quantity = quantity - ? WHERE equipment_id = ?',
        [b.quantity_borrowed, b.equipment_id]
      );

      // บันทึกประวัติการยืมสำหรับ equipment items (ถ้ามี)
      try {
        // ดึง equipment items ที่ available สำหรับ equipment นี้
        const [availableItems] = await connection.query(
          `SELECT item_id FROM equipment_items 
           WHERE equipment_id = ? AND status = 'Available' 
           LIMIT ?`,
          [b.equipment_id, b.quantity_borrowed]
        );

        // บันทึกประวัติการยืมสำหรับแต่ละ item
        for (const item of availableItems) {
          await addItemHistory(
            item.item_id, 
            'borrowed', 
            userId, 
            b.transaction_id, 
            `ยืมโดย: ${user[0].first_name} ${user[0].last_name}`
          );
          
          // อัพเดทสถานะ item เป็น borrowed
          await connection.query(
            'UPDATE equipment_items SET status = "Borrowed" WHERE item_id = ?',
            [item.item_id]
          );
        }
      } catch (historyError) {
        console.warn('⚠️ Warning: Could not add item history:', historyError.message);
        // ไม่หยุดกระบวนการถ้าบันทึกประวัติไม่สำเร็จ
      }
    }

    await connection.commit();

    // แจ้ง dashboard ให้อัพเดต
    const dashboardEmitter = require('../utils/dashboardEventEmitter');
    dashboardEmitter.notifyStatsChange('borrow-approved');
    
    // แจ้ง inventory ให้อัพเดต
    const inventoryEmitter = require('../utils/inventoryEventEmitter');
    inventoryEmitter.notifyInventoryChange('borrow-approved', { borrowingsToApprove: borrowingsToApprove.map(b => b.transaction_id) });

    // แจ้งเตือนผู้ยืมทุกรายการ - รวมเป็นการแจ้งเตือนเดียว
    const equipmentIds = borrowingsToApprove.map(b => b.equipment_id);
    const [equipmentData] = await connection.query(
      'SELECT equipment_id, equipment_name FROM equipments WHERE equipment_id IN (?)',
      [equipmentIds]
    );
    
    // สร้าง Map สำหรับ O(1) lookup
    const equipmentMap = new Map(equipmentData.map(eq => [eq.equipment_id, eq.equipment_name]));
    
    // รวมการแจ้งเตือนหลายรายการเป็นหนึ่งเดียว
    if (borrowingsToApprove.length === 1) {
      // ถ้ามีการแจ้งเตือนเดียว ส่งตามปกติ
      const b = borrowingsToApprove[0];
      notifyBorrowApproved({
        user_id: userId,
        transaction_id: b.transaction_id,
        equipment_name: equipmentMap.get(b.equipment_id) || 'อุปกรณ์'
      }).catch(err => console.error('Notification error:', err));
    } else if (borrowingsToApprove.length > 1) {
      // ถ้ามีหลายรายการ ส่งการแจ้งเตือนรวม
      const { createNotification, sendNotificationToUser } = require('../utils/notificationHelper').exports || require('../controllers/notificationController');
      const equipmentNames = borrowingsToApprove
        .map(b => equipmentMap.get(b.equipment_id) || 'อุปกรณ์')
        .join(', ');
      
      const result = await createNotification(userId, {
        type: 'borrow_approved',
        title: 'อนุมัติคำขอยืม',
        message: `คำขอยืม ${borrowingsToApprove.length} รายการได้รับการอนุมัติแล้ว: ${equipmentNames}`,
        priority: 'high',
        reference_id: borrowingsToApprove[0].transaction_id,
        reference_type: 'borrowing'
      });
      
      if (result.success) {
        sendNotificationToUser(userId, {
          notification_id: result.notification_id,
          type: 'borrow_approved',
          title: 'อนุมัติคำขอยืม',
          message: `คำขอยืม ${borrowingsToApprove.length} รายการได้รับการอนุมัติแล้ว: ${equipmentNames}`,
          priority: 'high',
          is_read: false,
          created_at: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: `อนุมัติคำขอยืมสำเร็จ (${borrowingsToApprove.length} รายการ, หักเครดิต ${totalCreditNeeded} คะแนน)`,
      data: {
        creditDeducted: totalCreditNeeded,
        remainingCredit: newBalance,
        approvedCount: borrowingsToApprove.length
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving borrowing:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอนุมัติ',
      error: error.message
    });
  } finally {
    if (!existingConnection) {
      connection.release();
    }
  }
};

/**
 * ปฏิเสธคำขอยืม (Admin)
 */
const rejectBorrowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const [borrowing] = await pool.query(
      'SELECT status FROM borrowing_transactions WHERE transaction_id = ?',
      [id]
    );

    if (borrowing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอยืมนี้'
      });
    }

    if (borrowing[0].status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'คำขอนี้ได้รับการดำเนินการแล้ว'
      });
    }

    await pool.query(
      `UPDATE borrowing_transactions 
      SET status = 'Cancelled', notes = ?, updated_at = NOW()
      WHERE transaction_id = ?`,
      [notes || 'ไม่อนุมัติโดยผู้ดูแลระบบ', id]
    );

    // แจ้งเตือนผู้ยืม
    const [eqData] = await pool.query(
      'SELECT e.equipment_name, bt.member_id FROM borrowing_transactions bt JOIN equipments e ON bt.equipment_id = e.equipment_id WHERE bt.transaction_id = ?',
      [id]
    );
    
    try {
      await notifyBorrowRejected({
        user_id: eqData[0].member_id,
        transaction_id: id,
        equipment_name: eqData[0].equipment_name,
        reason: notes
      });
    } catch (notifyError) {
      console.error('❌ Notification error:', notifyError);
    }

    res.json({
      success: true,
      message: 'ปฏิเสธคำขอยืมสำเร็จ'
    });
  } catch (error) {
    console.error('Error rejecting borrowing:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ',
      error: error.message
    });
  }
};

/**
 * ยกเลิกคำขอยืม (User)
 */
const cancelBorrowing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.member_id;

    const [borrowing] = await pool.query(
      'SELECT * FROM borrowing_transactions WHERE transaction_id = ? AND member_id = ?',
      [id, userId]
    );

    if (borrowing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอยืมนี้'
      });
    }

    if (borrowing[0].status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถยกเลิกได้ เนื่องจากได้รับการอนุมัติแล้ว'
      });
    }

    await pool.query(
      `UPDATE borrowing_transactions 
      SET status = 'Cancelled', updated_at = NOW()
      WHERE transaction_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'ยกเลิกคำขอยืมสำเร็จ'
    });
  } catch (error) {
    console.error('Error cancelling borrowing:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกคำขอ',
      error: error.message
    });
  }
};

module.exports = {
  createBorrowRequest,
  getUserBorrowings,
  getAllBorrowings,
  approveBorrowing,
  rejectBorrowing,
  cancelBorrowing
};
