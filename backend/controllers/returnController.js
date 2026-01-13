const { pool } = require('../config/db');
const ReturnTransaction = require('../models/ReturnTransaction');
const { notifyEquipmentReturned, notifyCreditChange } = require('../utils/notificationHelper');
const { addItemHistory } = require('./equipmentItemController');
const { updateEquipmentQuantity, getPenaltyCreditPerHour, calculateHoursDifference } = require('../utils');

/**
 * บันทึกการคืนอุปกรณ์
 * ใช้ตารางใหม่ return_transactions แยกจาก borrowing_transactions
 */
const createReturnTransaction = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { borrowing_id } = req.params;
    const { 
      quantity_returned, 
      actual_return_date,
      notes = '',
      damage_cost = 0,
      damage_description = '',
      additional_penalty = 0
    } = req.body;
    
    let adminId = req.user.admin_id;

    await connection.beginTransaction();

    // ดึงข้อมูลการยืมพร้อม lock row เพื่อป้องกัน race condition
    const [borrowing] = await connection.query(
      `SELECT * FROM borrowing_transactions WHERE transaction_id = ? FOR UPDATE`,
      [borrowing_id]
    );

    if (borrowing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการยืมนี้'
      });
    }

    const borrow = borrowing[0];

    // ตรวจสอบสถานะ
    if (borrow.status !== 'Approved' && borrow.status !== 'Borrowed') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถคืนได้ เนื่องจากสถานะไม่ถูกต้อง'
      });
    }

    const returnQty = quantity_returned || (borrow.quantity_borrowed - borrow.total_returned);
    const totalReturned = borrow.total_returned + returnQty;

    // ตรวจสอบว่าคืนเกินจำนวนที่ยืมหรือไม่
    if (totalReturned > borrow.quantity_borrowed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถคืนได้ ยืมไป ${borrow.quantity_borrowed} ชิ้น คืนแล้ว ${borrow.total_returned} ชิ้น`
      });
    }

    // ดึงข้อมูลผู้ใช้และอุปกรณ์
    const [user] = await connection.query(
      'SELECT credit FROM members WHERE member_id = ?',
      [borrow.member_id]
    );

    const userExists = user.length > 0;
    if (!userExists) {
      console.warn(`⚠️ WARNING: User ID ${borrow.member_id} not found (may have been deleted). Proceeding with return without credit update.`);
    }

    const [equipment] = await connection.query(
      'SELECT equipment_name, credit FROM equipments WHERE equipment_id = ?',
      [borrow.equipment_id]
    );

    if (equipment.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลอุปกรณ์'
      });
    }

    // คำนวณชั่วโมงที่เกินและค่าปรับ
    const expectedDate = new Date(borrow.expected_return_date);
    const actualDate = actual_return_date ? new Date(actual_return_date) : new Date();
    
    const timeDiff = actualDate - expectedDate;
    const hoursOverdue = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60)));
    const daysOverdue = Math.ceil(hoursOverdue / 24); // สำหรับแสดงผล

    const isFullyReturned = totalReturned >= borrow.quantity_borrowed;
    const isPartialReturn = totalReturned < borrow.quantity_borrowed && returnQty > 0;

    // คำนวณค่าปรับและเครดิต
    let latePenalty = 0;
    let partialPenalty = 0;
    let totalPenalty = 0;
    let creditReturned = 0;
    let creditBonus = 0;
    let creditDeducted = 0;
    let netCreditChange = 0;

    // ใช้เครดิตที่ถูกหักจริงตอนยืม แทนการคำนวณใหม่
    const creditDeductedOnBorrow = parseFloat(borrow.credit_deducted) || 0;
    let creditPerItem = 0;
    let isUsingFallbackCredit = false;
    
    if (creditDeductedOnBorrow > 0) {
      // ใช้เครดิตที่บันทึกไว้ตอนยืม (วิธีที่ถูกต้อง)
      creditPerItem = creditDeductedOnBorrow / borrow.quantity_borrowed;
    } else {
      // ⚠️ FALLBACK: ข้อมูลเก่าไม่มี credit_deducted บันทึกไว้
      // ใช้เครดิตปัจจุบันแทน (อาจไม่ตรงกับเครดิตตอนยืม)
      creditPerItem = parseFloat(equipment[0].credit) || 0;
      isUsingFallbackCredit = true;
      
      console.warn('⚠️ WARNING: ไม่พบข้อมูล credit_deducted สำหรับรายการยืม ID:', borrowing_id);
      console.warn('⚠️ กำลังใช้เครดิตปัจจุบันของอุปกรณ์แทน:', creditPerItem);
      console.warn('⚠️ อาจมีความคลาดเคลื่อนถ้าเครดิตเคยถูกเปลี่ยนแปลง');
    }
    
    const borrowedCredit = creditPerItem * returnQty;

    // ===================================================
    // กฎการคิดเครดิต (แก้ไขใหม่ - ถูกต้อง):
    // 1. คืนทีละส่วน → คืนเครดิตทันทีตามจำนวนที่คืน
    // 2. คืนไม่ครบ → Cron หัก 5 เครดิต/วัน/ชิ้นที่ขาด (สะสม)
    // 3. เมื่อคืนครบ → หักค่าปรับสะสมทันที + คืนค่าปรับ 5/7 วัน
    // 4. คืนช้า → คืนเครดิต - หักค่าปรับช้าทันที + คืนค่าปรับ 5/7 วัน
    // ===================================================

    // STEP 1: คืนเครดิตทันทีทุกครั้งที่คืน (ไม่ว่าครบหรือไม่ครบ)
    if (borrowedCredit > 0 && userExists) {
      const [currentUser] = await connection.query(
        'SELECT credit FROM members WHERE member_id = ?',
        [borrow.member_id]
      );

      // คืนเครดิตที่ถูกหักตอนยืม
      await connection.query(
        'UPDATE members SET credit = LEAST(credit + ?, 100) WHERE member_id = ?',
        [borrowedCredit, borrow.member_id]
      );

      // คำนวณ balance หลังคืนเครดิต (จำกัดไม่เกิน 100)
      let balanceAfterReturn = Math.min(currentUser[0].credit + borrowedCredit, 100);

      const returnDescription = isUsingFallbackCredit
        ? `คืนเครดิต: ${equipment[0].equipment_name} ${returnQty} ชิ้น [⚠️ ใช้เครดิตปัจจุบัน - ข้อมูลเก่าไม่มี credit_deducted]`
        : `คืนเครดิต: ${equipment[0].equipment_name} ${returnQty} ชิ้น`;
      
      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
        VALUES (?, ?, 'return', 'borrowing', ?, ?, ?, ?, NOW())`,
        [
          borrow.member_id,
          borrowedCredit,
          borrowing_id,
          returnDescription,
          balanceAfterReturn,
          adminId
        ]
      );

      // แจ้งเตือนผู้ใช้เกี่ยวกับการคืนเครดิต (non-blocking)
      notifyCreditChange(borrow.member_id, {
        amount: borrowedCredit,
        description: returnDescription,
        balance_after: balanceAfterReturn
      });

      creditReturned = borrowedCredit;
    }

    // STEP 2: เมื่อคืนครบ - จัดการค่าปรับ
    if (isFullyReturned) {
      // 2.1 หักค่าปรับคืนไม่ครบสะสมทันที + บันทึก schedule คืนค่าปรับ
      if (borrow.accumulated_penalty > 0 && userExists) {
        const [currentUser] = await connection.query(
          'SELECT credit FROM members WHERE member_id = ? FOR UPDATE',
          [borrow.member_id]
        );

        const totalPenaltyPaid = parseFloat(borrow.accumulated_penalty) || 0;
        
        await connection.query(
          'UPDATE members SET credit = GREATEST(credit - ?, 0) WHERE member_id = ?',
          [totalPenaltyPaid, borrow.member_id]
        );

        const balanceAfterPenalty = Math.max(currentUser[0].credit - totalPenaltyPaid, 0);

        await connection.query(
          `INSERT INTO credit_transactions 
          (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
          VALUES (?, ?, 'penalty', 'borrowing', ?, ?, ?, ?, NOW())`,
          [
            borrow.member_id,
            -totalPenaltyPaid,
            borrowing_id,
            `หักค่าปรับคืนไม่ครบสะสม: ${equipment[0].equipment_name} (${totalPenaltyPaid} เครดิต)`,
            balanceAfterPenalty,
            adminId
          ]
        );

        notifyCreditChange(borrow.member_id, {
          amount: -totalPenaltyPaid,
          description: `หักค่าปรับคืนไม่ครบสะสม: ${equipment[0].equipment_name}`,
          balance_after: balanceAfterPenalty
        });

        partialPenalty = totalPenaltyPaid;
        totalPenalty += totalPenaltyPaid;
        creditDeducted += totalPenaltyPaid;
        
        // บันทึก schedule สำหรับคืนค่าปรับทีละน้อย (ค่าปรับคืนไม่ครบ)
        await connection.query(
          `INSERT INTO penalty_refund_schedule 
          (transaction_id, member_id, total_penalty, refunded_amount, next_refund_date, created_at)
          VALUES (?, ?, ?, 0, DATE_ADD(CURDATE(), INTERVAL 7 DAY), NOW())
          ON DUPLICATE KEY UPDATE 
            total_penalty = total_penalty + VALUES(total_penalty), 
            next_refund_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY),
            is_completed = FALSE,
            updated_at = NOW()`,
          [borrowing_id, borrow.member_id, totalPenaltyPaid]
        );
      } else if (borrow.accumulated_penalty > 0 && !userExists) {
      }

      // 2.2 หักค่าปรับคืนช้าทันที + บันทึก schedule คืนค่าปรับ
      if (hoursOverdue > 0 && userExists) {
        const penaltyCreditPerHour = await getPenaltyCreditPerHour();
        
        // คำนวณค่าปรับแบบรายชั่วโมง
        latePenalty = Math.ceil(hoursOverdue * penaltyCreditPerHour);
        
        const [currentUser] = await connection.query(
          'SELECT credit FROM members WHERE member_id = ?',
          [borrow.member_id]
        );

        await connection.query(
          'UPDATE members SET credit = GREATEST(credit - ?, 0) WHERE member_id = ?',
          [latePenalty, borrow.member_id]
        );

        const balanceAfterLatePenalty = Math.max(currentUser[0].credit - latePenalty, 0);

        await connection.query(
          `INSERT INTO credit_transactions 
          (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
          VALUES (?, ?, 'penalty', 'borrowing', ?, ?, ?, ?, NOW())`,
          [
            borrow.member_id,
            -latePenalty,
            borrowing_id,
            `ค่าปรับคืนช้า: ${equipment[0].equipment_name} (${hoursOverdue} ชั่วโมง × ${penaltyCreditPerHour})`,            balanceAfterLatePenalty,
            adminId
          ]
        );

        notifyCreditChange(borrow.member_id, {
          amount: -latePenalty,
          description: `ค่าปรับคืนช้า: ${equipment[0].equipment_name} (${hoursOverdue} ชั่วโมง)`,
          balance_after: balanceAfterLatePenalty
        });

        totalPenalty += latePenalty;
        creditDeducted += latePenalty;
        
        // เพิ่มค่าปรับคืนช้าเข้า schedule (รวมกับค่าปรับคืนไม่ครบถ้ามี)
        await connection.query(
          `INSERT INTO penalty_refund_schedule 
          (transaction_id, member_id, total_penalty, refunded_amount, next_refund_date, created_at)
          VALUES (?, ?, ?, 0, DATE_ADD(CURDATE(), INTERVAL 7 DAY), NOW())
          ON DUPLICATE KEY UPDATE 
            total_penalty = total_penalty + VALUES(total_penalty), 
            next_refund_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY),
            is_completed = FALSE,
            updated_at = NOW()`,
          [borrowing_id, borrow.member_id, latePenalty]
        );
      } else if (hoursOverdue > 0 && !userExists) {
      }
    }

    // STEP 3: ค่าชำรุดและค่าปรับเพิ่มเติม (หักทันที ไม่คืน)
    let otherPenalties = 0;
    if (damage_cost > 0) {
      otherPenalties += parseFloat(damage_cost) || 0;
    }
    if (additional_penalty > 0) {
      otherPenalties += parseFloat(additional_penalty) || 0;
    }

    if (otherPenalties > 0 && userExists) {
      const [currentUser] = await connection.query(
        'SELECT credit FROM members WHERE member_id = ?',
        [borrow.member_id]
      );

      await connection.query(
        'UPDATE members SET credit = GREATEST(credit - ?, 0) WHERE member_id = ?',
        [otherPenalties, borrow.member_id]
      );

      const balanceAfterOther = Math.max(currentUser[0].credit - otherPenalties, 0);

      await connection.query(
        `INSERT INTO credit_transactions 
        (member_id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_by_admin, created_at) 
        VALUES (?, ?, 'penalty', 'borrowing', ?, ?, ?, ?, NOW())`,
        [
          borrow.member_id,
          -otherPenalties,
          borrowing_id,
          `ค่าปรับอื่นๆ: ${equipment[0].equipment_name} (ชำรุด: ${damage_cost}, เพิ่มเติม: ${additional_penalty})`,
          balanceAfterOther,
          adminId
        ]
      );

      notifyCreditChange(borrow.member_id, {
        amount: -otherPenalties,
        description: `ค่าปรับอื่นๆ: ${equipment[0].equipment_name}`,
        balance_after: balanceAfterOther
      });

      totalPenalty += otherPenalties;
      creditDeducted += otherPenalties;
    } else if (otherPenalties > 0 && !userExists) {
    }

    netCreditChange = creditReturned + creditBonus - creditDeducted;

    // กำหนดสถานะการคืน

    // กำหนดสถานะการคืน
    let returnStatus = 'Returned';
    if (damage_cost > 0) {
      returnStatus = 'Damaged';
    } else if (isPartialReturn) {
      returnStatus = 'PartialReturn';
    } else if (daysOverdue >= 7) {
      returnStatus = 'Lost';
    }

    // บันทึกในตาราง return_transactions
    const [returnResult] = await connection.query(
      `INSERT INTO return_transactions (
        borrowing_id, member_id, equipment_id, quantity_returned, actual_return_date,
        return_status, days_overdue, expected_return_date,
        damage_cost, damage_description, late_penalty, partial_penalty, 
        additional_penalty, total_penalty,
        credit_returned, credit_bonus, credit_deducted, net_credit_change,
        inspected_by_admin, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        borrowing_id, borrow.member_id, borrow.equipment_id, returnQty, actualDate,
        returnStatus, daysOverdue, expectedDate,
        damage_cost, damage_description, latePenalty, partialPenalty,
        additional_penalty, totalPenalty,
        creditReturned, creditBonus, creditDeducted, netCreditChange,
        adminId, notes
      ]
    );

    // เพิ่มจำนวนอุปกรณ์กลับ
    await connection.query(
      'UPDATE equipments SET quantity = quantity + ? WHERE equipment_id = ?',
      [returnQty, borrow.equipment_id]
    );

    // บันทึกประวัติการคืนสำหรับ equipment items (ถ้ามี)
    try {
      // ดึง equipment items ที่ยืมไปในธุรกรรมนี้
      const [borrowedItems] = await connection.query(
        `SELECT ei.item_id 
         FROM equipment_items ei 
         WHERE ei.equipment_id = ? AND ei.status = 'Borrowed' 
         LIMIT ?`,
        [borrow.equipment_id, returnQty]
      );

      // บันทึกประวัติการคืนสำหรับแต่ละ item
      for (const item of borrowedItems) {
        await addItemHistory(
          item.item_id, 
          'returned', 
          adminId, 
          borrowing_id, 
          `คืนโดย: ${borrow.member_id} ${returnStatus}${damage_description ? ` (${damage_description})` : ''}`
        );
        
        // อัพเดทสถานะ item เป็น available
        let newItemStatus = 'Available';
        if (damage_cost > 0) {
          newItemStatus = 'Maintenance'; // ถ้าเสียหายให้เข้าซ่อม
        }
        
        await connection.query(
          'UPDATE equipment_items SET status = ? WHERE item_id = ?',
          [newItemStatus, item.item_id]
        );
      }
    } catch (historyError) {
      console.warn('⚠️ Warning: Could not add return history:', historyError.message);
      // ไม่หยุดกระบวนการถ้าบันทึกประวัติไม่สำเร็จ
    }

    // อัพเดท borrowing_transactions
    // ถ้าคืนครบแล้ว ให้เปลี่ยนเป็น Completed
    // ถ้าคืนบางส่วน ให้เปลี่ยนเป็น Borrowed (ถ้ายังไม่ใช่)
    const newStatus = isFullyReturned ? 'Completed' : (borrow.status === 'Approved' ? 'Borrowed' : borrow.status);
    
    await connection.query(
      `UPDATE borrowing_transactions 
      SET total_returned = ?, 
          is_returned = ?,
          status = ?
      WHERE transaction_id = ?`,
      [totalReturned, isFullyReturned ? 1 : 0, newStatus, borrowing_id]
    );

    await connection.commit();

    // แจ้ง dashboard ให้อัพเดต
    const dashboardEmitter = require('../utils/dashboardEventEmitter');
    dashboardEmitter.notifyStatsChange('equipment-returned');
    
    // แจ้ง inventory ให้อัพเดต
    const inventoryEmitter = require('../utils/inventoryEventEmitter');
    inventoryEmitter.notifyInventoryChange('equipment-returned', { 
      transaction_id: borrowing_id, 
      equipment_id: borrow.equipment_id,
      quantity: returnQty 
    });

    // อัพเดทจำนวนอุปกรณ์ในตาราง equipments
    try {
      await updateEquipmentQuantity(borrow.equipment_id, pool);
    } catch (updateError) {
      console.error('⚠️ Warning: Could not update equipment quantity:', updateError);
    }

    // แจ้งเตือนผู้ยืม
    if (userExists) {
      let creditMessage = '';
      if (netCreditChange > 0) {
        creditMessage = `(ได้รับเครดิตคืน ${netCreditChange} คะแนน)`;
      } else if (netCreditChange < 0) {
        creditMessage = `(หักเครดิต ${Math.abs(netCreditChange)} คะแนน)`;
      }

      notifyEquipmentReturned({
        user_id: borrow.member_id,
        return_id: returnResult.insertId,
        equipment_name: equipment[0].equipment_name,
        credit_message: creditMessage
      }).catch(err => console.error('Notification error:', err));
    }

    let responseMessage = isFullyReturned
      ? `บันทึกการคืนสำเร็จ (คืนครบ ${totalReturned}/${borrow.quantity_borrowed} ชิ้น)`
      : `บันทึกการคืนบางส่วนสำเร็จ (คืน ${returnQty}/${borrow.quantity_borrowed} ชิ้น)`;
    
    if (!userExists) {
      responseMessage += ' (⚠️ ไม่พบข้อมูลผู้ใช้ - ข้ามการอัพเดทเครดิต)';
    }

    res.json({
      success: true,
      message: responseMessage,
      data: {
        return_id: returnResult.insertId,
        return_status: returnStatus,
        quantity_returned: returnQty,
        total_returned: totalReturned,
        is_fully_returned: isFullyReturned,
        days_overdue: daysOverdue,
        user_exists: userExists,
        penalties: {
          late_penalty: latePenalty,
          partial_penalty: partialPenalty,
          damage_cost: damage_cost,
          additional_penalty: additional_penalty,
          total: totalPenalty
        },
        credits: {
          returned: creditReturned,
          bonus: creditBonus,
          deducted: creditDeducted,
          net_change: netCreditChange
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error creating return transaction:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการคืน',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ดึงรายการคืนทั้งหมด (Admin)
 */
const getAllReturns = async (req, res) => {
  try {
    const [returns] = await pool.query(
      `SELECT 
        r.*,
        b.borrow_date,
        b.quantity_borrowed,
        m.first_name,
        m.last_name,
        m.email,
        m.profile_image,
        e.equipment_name,
        e.model,
        CONCAT(a.first_name, ' ', a.last_name) as inspector_name
      FROM return_transactions r
      LEFT JOIN borrowing_transactions b ON r.borrowing_id = b.transaction_id
      LEFT JOIN members m ON r.member_id = m.member_id
      LEFT JOIN equipments e ON r.equipment_id = e.equipment_id
      LEFT JOIN admins a ON r.inspected_by_admin = a.admin_id
      ORDER BY r.created_at DESC`
    );

    res.json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message
    });
  }
};

/**
 * ดึงรายการคืนของผู้ใช้
 */
const getUserReturns = async (req, res) => {
  try {
    const userId = req.user.admin_id;

    const [returns] = await pool.query(
      `SELECT 
        r.*,
        b.borrow_date,
        b.quantity_borrowed,
        e.equipment_name,
        e.model
      FROM return_transactions r
      LEFT JOIN borrowing_transactions b ON r.borrowing_id = b.transaction_id
      LEFT JOIN equipments e ON r.equipment_id = e.equipment_id
      WHERE r.member_id = ?
      ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Error fetching user returns:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message
    });
  }
};

module.exports = {
  createReturnTransaction,
  getAllReturns,
  getUserReturns
};
