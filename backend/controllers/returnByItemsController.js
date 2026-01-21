const { pool } = require('../config/db');
const { BorrowingTransactionItem } = require('../models');
const { notifyEquipmentReturned, notifyCreditChange } = require('../utils/notificationHelper');
const { addItemHistory } = require('./equipmentItemController');
const { getPenaltyCreditPerHour } = require('../utils');

/**
 * คืนอุปกรณ์รายชิ้น (Return specific items)
 * รองรับการคืนแบบเลือกชิ้น
 */
const returnBorrowedItems = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { transaction_id } = req.params;
    const { 
      item_ids,  // array ของ item_id ที่ต้องการคืน
      actual_return_date,
      notes = '',
      damage_items = [] // [{ item_id, damage_cost, damage_description }]
    } = req.body;
    
    const adminId = req.user.admin_id;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกรายการที่ต้องการคืน'
      });
    }

    await connection.beginTransaction();

    // ดึงข้อมูล transaction
    const [transactions] = await connection.query(
      `SELECT bt.*, u.credit, e.equipment_name, e.credit as equipment_credit
       FROM borrowing_transactions bt
       JOIN members m ON bt.member_id = m.member_id
       JOIN equipments e ON bt.equipment_id = e.equipment_id
       WHERE bt.transaction_id = ?`,
      [transaction_id]
    );

    if (transactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการยืมนี้'
      });
    }

    const transaction = transactions[0];

    if (transaction.status !== 'Approved' && transaction.status !== 'Borrowed') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถคืนได้ เนื่องจากสถานะไม่ถูกต้อง'
      });
    }

    // ตรวจสอบ items ที่ต้องการคืน
    const borrowedItems = await BorrowingTransactionItem.findAll({
      where: { 
        transaction_id,
        item_id: item_ids,
        status: 'Borrowed'
      },
      raw: true
    });

    if (borrowedItems.length !== item_ids.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'บาง items ไม่สามารถคืนได้ (อาจคืนไปแล้วหรือไม่ได้ยืม)'
      });
    }

    // คำนวณชั่วโมงที่เกินและค่าปรับ
    const expectedDate = new Date(transaction.expected_return_date);
    const actualDate = actual_return_date ? new Date(actual_return_date) : new Date();
    
    const timeDiff = actualDate - expectedDate;
    const hoursOverdue = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60)));
    const daysOverdue = Math.ceil(hoursOverdue / 24); // สำหรับแสดงผล

    let totalPenalty = 0;
    let totalDamageCost = 0;
    const creditPerItem = parseFloat(transaction.credit_deducted || 0) / transaction.quantity_borrowed;
    const creditToReturn = creditPerItem * item_ids.length;

    // ดึงค่าปรับต่อชั่วโมงจาก settings
    const penaltyPerHour = await getPenaltyCreditPerHour();

    // คำนวณค่าปรับคืนช้า (ต่อชิ้น)
    if (hoursOverdue > 0) {
      const latePenalty = Math.ceil(hoursOverdue * penaltyPerHour) * item_ids.length;
      totalPenalty += latePenalty;
    }

    // คำนวณค่าเสียหาย
    if (damage_items && Array.isArray(damage_items) && damage_items.length > 0) {
      for (const damage of damage_items) {
        if (item_ids.includes(damage.item_id)) {
          totalDamageCost += parseFloat(damage.damage_cost) || 0;
        }
      }
      totalPenalty += totalDamageCost;
    }

    // อัพเดทสถานะ items เป็น Returned
    await BorrowingTransactionItem.update(
      {
        status: 'Returned',
        returned_date: actual_return_date || new Date(),
        condition_on_return: notes,
        notes: notes
      },
      {
        where: {
          transaction_id,
          item_id: item_ids
        }
      }
    );

    // อัพเดทสถานะ equipment_items
    for (const item_id of item_ids) {
      const damageItem = damage_items?.find(d => d.item_id === item_id);
      const newStatus = damageItem && damageItem.damage_cost > 0 ? 'Damaged' : 'Available';
      
      await connection.query(
        'UPDATE equipment_items SET status = ? WHERE item_id = ?',
        [newStatus, item_id]
      );

      // บันทึกประวัติการคืน
      await addItemHistory(
        item_id,
        'returned',
        adminId,
        transaction_id,
        damageItem ? `คืนพร้อมความเสียหาย: ${damageItem.damage_description}` : 'คืนปกติ',
        true // isAdmin = true
      );
    }

    // ตรวจสอบว่าคืนครบหรือยัง
    const totalItems = await BorrowingTransactionItem.count({
      where: { transaction_id }
    });
    
    const returnedCount = await BorrowingTransactionItem.count({
      where: { 
        transaction_id,
        status: 'Returned'
      }
    });

    const isFullyReturned = returnedCount >= totalItems;

    // อัพเดท borrowing_transactions
    const newStatus = isFullyReturned ? 'Completed' : 'Borrowed';
    const newTotalReturned = (transaction.total_returned || 0) + item_ids.length;

    await connection.query(
      `UPDATE borrowing_transactions 
       SET status = ?, total_returned = ?, is_returned = ?, updated_at = NOW()
       WHERE transaction_id = ?`,
      [newStatus, newTotalReturned, isFullyReturned ? 1 : 0, transaction_id]
    );

    // หักค่าปรับ (ถ้ามี)
    if (totalPenalty > 0) {
      await connection.query(
        'UPDATE members SET credit = credit - ? WHERE member_id = ?',
        [totalPenalty, transaction.member_id]
      );

      const [userAfterPenalty] = await connection.query(
        'SELECT credit FROM members WHERE member_id = ?',
        [transaction.member_id]
      );

      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at)
        VALUES (?, ?, 'penalty', 'return', ?, ?, ?, ?, NOW())`,
        [
          transaction.member_id,
          -totalPenalty,
          transaction_id,
          `ค่าปรับการคืน ${item_ids.length} ชิ้น (ช้า ${daysOverdue} วัน, เสียหาย ${totalDamageCost})`,
          userAfterPenalty[0].credit,
          req.user?.admin_id || null
        ]
      );

      // แจ้งเตือนผู้ใช้เกี่ยวกับค่าปรับ
      await notifyCreditChange(transaction.member_id, {
        amount: -totalPenalty,
        description: `ค่าปรับการคืน ${item_ids.length} ชิ้น (ช้า ${daysOverdue} วัน, เสียหาย ${totalDamageCost})`,
        balance_after: userAfterPenalty[0].credit
      });
    }

    // คืนเครดิต (ถ้าคืนครบ)
    if (isFullyReturned && creditToReturn > 0) {
      await connection.query(
        'UPDATE members SET credit = credit + ? WHERE member_id = ?',
        [creditToReturn, transaction.member_id]
      );

      const [userAfterReturn] = await connection.query(
        'SELECT credit FROM members WHERE member_id = ?',
        [transaction.member_id]
      );

      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at)
        VALUES (?, ?, 'return', 'return', ?, ?, ?, ?, NOW())`,
        [
          transaction.member_id,
          creditToReturn,
          transaction_id,
          `คืนเครดิต ${item_ids.length} ชิ้น`,
          userAfterReturn[0].credit,
          req.user?.admin_id || null
        ]
      );

      // แจ้งเตือนผู้ใช้เกี่ยวกับการคืนเครดิต
      await notifyCreditChange(transaction.member_id, {
        amount: creditToReturn,
        description: `คืนเครดิต ${item_ids.length} ชิ้น`,
        balance_after: userAfterReturn[0].credit
      });
    }

    await connection.commit();

    // ส่ง notification ถึง user
    try {
      let creditMessage = '';
      if (totalPenalty > 0) {
        creditMessage = `หักเครดิต ${totalPenalty} (คืนช้า ${hoursOverdue} ชั่วโมง)`;
      }
      if (isFullyReturned && creditToReturn > 0) {
        creditMessage += (creditMessage ? ', ' : '') + `คืนเครดิต ${creditToReturn}`;
      }

      await notifyEquipmentReturned({
        user_id: transaction.member_id,
        equipment_name: transaction.equipment_name,
        credit_message: creditMessage,
        transaction_id: transaction_id
      });
    } catch (notifyError) {
      console.error('❌ Error sending notification:', notifyError);
    }

    res.json({
      success: true,
      message: isFullyReturned ? 'คืนอุปกรณ์ครบถ้วนแล้ว' : `คืนแล้ว ${item_ids.length} ชิ้น`,
      data: {
        returned_items: item_ids.length,
        total_items: allItems[0].total,
        fully_returned: isFullyReturned,
        penalty: totalPenalty,
        credit_returned: isFullyReturned ? creditToReturn : 0,
        days_overdue: daysOverdue
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error returning items:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการคืนอุปกรณ์',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ดึงรายการ items ที่ยืมไปและยังไม่ได้คืน
 */
const getBorrowedItemsForReturn = async (req, res) => {
  try {
    const { transaction_id } = req.params;

    const items = await BorrowingTransactionItem.findAll({
      where: { 
        transaction_id,
        status: 'Borrowed'
      },
      include: [
        {
          association: 'equipmentItem',
          attributes: ['item_id', 'serial_number', 'item_code', 'location', 'status'],
          include: [
            {
              association: 'equipment',
              attributes: ['equipment_name', 'model']
            }
          ]
        }
      ],
      order: [['equipmentItem', 'serial_number', 'ASC']]
    });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching borrowed items:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message
    });
  }
};

module.exports = {
  returnBorrowedItems,
  getBorrowedItemsForReturn
};
