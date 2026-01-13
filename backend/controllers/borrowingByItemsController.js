const { pool } = require('../config/db');
const { BorrowingTransactionItem } = require('../models');
const { notifyNewBorrowRequest, notifyBorrowApproved, notifyBorrowRejected, notifyCreditChange } = require('../utils/notificationHelper');
const { updateEquipmentQuantity } = require('../utils');
const { addItemHistory } = require('./equipmentItemController');
const { invalidateDashboardCache } = require('./adminController');

/**
 * สร้างคำขอยืมอุปกรณ์รายชิ้น (User)
 * รองรับการเลือกอุปกรณ์เฉพาะชิ้นที่ต้องการยืม
 */
const createBorrowRequestByItems = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.member_id;
    const { 
      equipment, // array ของ { equipment_id, item_ids: [...] }
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

    // เริ่ม transaction
    await connection.beginTransaction();

    const transactionIds = [];
    const errors = [];
    const batchId = `BATCH_${Date.now()}_${userId}`;

    // วนลูปสร้างคำขอยืมสำหรับแต่ละอุปกรณ์
    for (const item of equipment) {
      const { equipment_id, item_ids } = item;

      if (!equipment_id || !item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
        errors.push(`ข้อมูลอุปกรณ์ไม่ถูกต้อง: ${equipment_id}`);
        continue;
      }

      // ตรวจสอบอุปกรณ์
      const [equipmentData] = await connection.query(
        'SELECT equipment_id, equipment_name, credit FROM equipments WHERE equipment_id = ?',
        [equipment_id]
      );

      if (equipmentData.length === 0) {
        errors.push(`ไม่พบอุปกรณ์: ${equipment_id}`);
        continue;
      }

      const equipmentName = equipmentData[0].equipment_name;
      const creditPerItem = equipmentData[0].credit;

      // ตรวจสอบ items ทั้งหมดว่าพร้อมให้ยืมหรือไม่
      const [items] = await connection.query(
        `SELECT item_id, serial_number, status 
         FROM equipment_items 
         WHERE item_id IN (?) AND equipment_id = ?`,
        [item_ids, equipment_id]
      );

      if (items.length !== item_ids.length) {
        errors.push(`บาง items ของ ${equipmentName} ไม่พบในระบบ`);
        continue;
      }

      const unavailableItems = items.filter(i => i.status !== 'Available');
      if (unavailableItems.length > 0) {
        errors.push(`${equipmentName} บางชิ้นไม่พร้อมให้ยืม: ${unavailableItems.map(i => i.serial_number).join(', ')}`);
        continue;
      }

      // สร้าง transaction หลัก
      const [transactionResult] = await connection.query(
        `INSERT INTO borrowing_transactions 
        (batch_id, member_id, equipment_id, borrow_date, expected_return_date, 
         quantity_borrowed, status, purpose, location, credit_deducted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, NOW(), NOW())`,
        [
          batchId,
          userId,
          equipment_id,
          borrow_date,
          expected_return_date,
          item_ids.length,
          purpose || '',
          location || '',
          creditPerItem * item_ids.length
        ]
      );

      const transactionId = transactionResult.insertId;
      transactionIds.push(transactionId);

      // บันทึก items ที่ยืม (ใช้ connection.query เพื่อให้อยู่ใน transaction)
      for (const itemId of item_ids) {
        await connection.query(
          `INSERT INTO borrowing_transaction_items 
           (transaction_id, item_id, status, borrowed_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [transactionId, itemId, 'Borrowed', borrow_date]
        );
      }
      
      // บันทึกประวัติการยืมแบบ async ไม่ต้องรอ (ใช้ setImmediate)
      setImmediate(() => {
        item_ids.forEach(itemId => {
          addItemHistory(itemId, 'borrowed', userId, transactionId, `สร้างคำขอยืม - รอการอนุมัติ`)
            .catch(err => console.error('Error adding item history:', err));
        });
      });

      
    }

    await connection.commit();

    // ส่ง notification ถึง admin
    if (transactionIds.length > 0) {
      try {
        // ดึงข้อมูล transaction แรกเพื่อส่ง notification
        const [transactionInfo] = await pool.query(`

          SELECT 
            bt.transaction_id,
            bt.quantity_borrowed,
            m.first_name,
            m.last_name,
            e.equipment_name
          FROM borrowing_transactions bt
          JOIN members m ON bt.member_id = m.member_id
          JOIN equipments e ON bt.equipment_id = e.equipment_id
          WHERE bt.transaction_id = ?
        `, [transactionIds[0]]);

        if (transactionInfo.length > 0) {
          const info = transactionInfo[0];
          const notificationData = {
            user_name: `${info.first_name} ${info.last_name}`,
            equipment_name: `${info.equipment_name} (${info.quantity_borrowed} ชิ้น)`,
            transaction_id: info.transaction_id
          };
          
          await notifyNewBorrowRequest(notificationData);
        }
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError);
      }
    }

    // ✅ Invalidate dashboard cache
    invalidateDashboardCache();

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: 'สร้างคำขอยืมบางส่วนสำเร็จ',
        transactionIds,
        batchId,
        errors
      });
    }

    return res.status(201).json({
      success: true,
      message: 'ส่งคำขอยืมอุปกรณ์สำเร็จ รอการอนุมัติจากเจ้าหน้าที่',
      transactionIds,
      batchId
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error creating borrow request:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างคำขอยืม',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * อนุมัติคำขอยืม (Admin)
 * อัพเดทสถานะ items และสร้างประวัติ
 */
const approveBorrowRequestByItems = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { transactionId } = req.params;
    const adminId = req.user.admin_id;
    const { notes } = req.body;

    await connection.beginTransaction();

    // ตรวจสอบ transaction
    const [transactions] = await connection.query(
      `SELECT bt.*, m.member_id, m.first_name, m.last_name, m.email, m.credit
       FROM borrowing_transactions bt
       JOIN members m ON bt.member_id = m.member_id
       WHERE bt.transaction_id = ?`,
      [transactionId]
    );

    if (transactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอยืมนี้'
      });
    }

    const transaction = transactions[0];

    if (transaction.status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'คำขอนี้ถูกดำเนินการไปแล้ว'
      });
    }

    // ตรวจสอบเครดิต
    const creditNeeded = parseFloat(transaction.credit_deducted) || 0;
    const userCredit = parseFloat(transaction.credit) || 0;

    if (userCredit < creditNeeded) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `เครดิตของผู้ใช้ไม่เพียงพอ (ต้องการ ${creditNeeded} มี ${userCredit})`
      });
    }

    // ดึง items ที่ยืม พร้อม equipment_id
    const [borrowedItems] = await connection.query(
      `SELECT bti.item_id, ei.equipment_id
       FROM borrowing_transaction_items bti
       JOIN equipment_items ei ON bti.item_id = ei.item_id
       WHERE bti.transaction_id = ?`,
      [transactionId]
    );

    if (borrowedItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรายการอุปกรณ์ที่ยืม'
      });
    }

    // อนุมัติ transaction
    await connection.query(
      `UPDATE borrowing_transactions 
       SET status = 'Approved', approval_date = NOW(), approved_by_admin = ?, notes = ?
       WHERE transaction_id = ?`,
      [adminId, notes || null, transactionId]
    );

    // หักเครดิต
    await connection.query(
      'UPDATE members SET credit = credit - ? WHERE member_id = ?',
      [creditNeeded, transaction.member_id]
    );

    // ดึงเครดิตหลังหัก
    const [userAfterDeduct] = await connection.query(
      'SELECT credit FROM members WHERE member_id = ?',
      [transaction.member_id]
    );

    // บันทึกประวัติการหักเครดิต
    await connection.query(
      `INSERT INTO credit_transactions 
      (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at)
      VALUES (?, ?, 'borrow', 'borrowing', ?, ?, ?, ?, NOW())`,
      [
        transaction.member_id,
        -creditNeeded,
        transactionId,
        `หักเครดิตสำหรับการยืม ${transaction.quantity_borrowed} รายการ`,
        userAfterDeduct[0].credit,
        req.user?.admin_id || null
      ]
    );

    // แจ้งเยือนผู้ใช้เกี่ยวกับการหักเครดิต
    await notifyCreditChange(transaction.member_id, {
      amount: -creditNeeded,
      description: `หักเครดิตจากการยืม ${transaction.quantity_borrowed} รายการ`,
      balance_after: userAfterDeduct[0].credit
    });

    // อัพเดทสถานะ items เป็น Borrowed
    const itemIds = borrowedItems.map(i => i.item_id);
    await connection.query(
      'UPDATE equipment_items SET status = \'Borrowed\' WHERE item_id IN (?)',
      [itemIds]
    );

    // บันทึกประวัติการยืม (Approved) สำหรับทุก items แบบ batch
    if (borrowedItems.length > 0) {
      const historyValues = borrowedItems.map(item => 
        [item.item_id, transactionId, 'borrowed', new Date(), adminId, `อนุมัติโดย Admin ID ${adminId}`]
      );
      await connection.query(
        `INSERT INTO equipment_item_history 
         (item_id, transaction_id, action_type, action_date, performed_by, notes)
         VALUES ?`,
        [historyValues]
      );
    }

    // ดึง equipment_id ที่ไม่ซ้ำกันสำหรับ update quantity
    const uniqueEquipmentIds = [...new Set(borrowedItems.map(item => item.equipment_id))];

    await connection.commit();
    connection.release();

    // อัพเดทจำนวนอุปกรณ์หลัง commit (ไม่ blocking)
    setImmediate(async () => {
      try {
        for (const equipmentId of uniqueEquipmentIds) {
          await updateEquipmentQuantity(equipmentId, pool);
        }
      } catch (updateError) {
        console.error('Warning: Could not update equipment quantity:', updateError);
      }
    });

    // ส่ง response ทันที
    res.status(200).json({
      success: true,
      message: 'อนุมัติคำขอยืมสำเร็จ'
    });

    // ส่ง notification แบบ async (ไม่ blocking)
    setImmediate(async () => {
      try {
        const conn = await pool.getConnection();
        const [equipmentInfo] = await conn.query(
          'SELECT equipment_name FROM equipments WHERE equipment_id = ?',
          [transaction.equipment_id]
        );
        conn.release();

        await notifyBorrowApproved({
          user_id: transaction.member_id,
          equipment_name: equipmentInfo[0]?.equipment_name || 'อุปกรณ์',
          transaction_id: transactionId
        });
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError);
      }
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error approving borrow request:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอยืม',
      error: error.message
    });
  }
};

/**
 * ปฏิเสธคำขอยืม (Admin)
 */
const rejectBorrowRequestByItems = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { transactionId } = req.params;
    const { notes } = req.body;

    await connection.beginTransaction();

    // ตรวจสอบ transaction
    const [transactions] = await connection.query(
      `SELECT bt.*, e.equipment_name
       FROM borrowing_transactions bt
       JOIN equipments e ON bt.equipment_id = e.equipment_id
       WHERE bt.transaction_id = ?`,
      [transactionId]
    );

    if (transactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขอยืมนี้'
      });
    }

    const transaction = transactions[0];

    if (transaction.status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'คำขอนี้ถูกดำเนินการไปแล้ว'
      });
    }

    // ปฏิเสธ transaction
    await connection.query(
      `UPDATE borrowing_transactions 
       SET status = 'Cancelled', notes = ?
       WHERE transaction_id = ?`,
      [notes || 'ปฏิเสธโดยผู้ดูแลระบบ', transactionId]
    );

    await connection.commit();

    // ส่ง notification
    try {
      await notifyBorrowRejected({
        user_id: transaction.member_id,
        equipment_name: transaction.equipment_name,
        reason: notes,
        transaction_id: transactionId
      });
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
    }

    return res.status(200).json({
      success: true,
      message: 'ปฏิเสธคำขอยืมสำเร็จ'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error rejecting borrow request:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอยืม',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  createBorrowRequestByItems,
  approveBorrowRequestByItems,
  rejectBorrowRequestByItems
};
