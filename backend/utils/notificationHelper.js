const { createNotification, sendNotificationToUser } = require('../controllers/notificationController');

/**
 * สร้างการแจ้งเตือนเมื่อมีคำขอยืมใหม่ (Admin)
 */
const notifyNewBorrowRequest = async (borrowingData) => {
  try {
    const { pool } = require('../config/db');
    const [admins] = await pool.query(
      "SELECT admin_id as user_id FROM admins WHERE status = 'active'"
    );

    for (const admin of admins) {
      const result = await createNotification(admin.user_id, {
        type: 'borrow_request',
        title: 'คำขอยืมใหม่',
        message: `${borrowingData.user_name} ขอยืม ${borrowingData.equipment_name}`,
        priority: 'high',
        reference_id: borrowingData.transaction_id,
        reference_type: 'borrowing'
      }, true); // isAdmin = true
      
      if (result.success) {
        sendNotificationToUser(admin.user_id, {
          notification_id: result.notification_id,
          type: 'borrow_request',
          title: 'คำขอยืมใหม่',
          message: `${borrowingData.user_name} ขอยืม ${borrowingData.equipment_name}`,
          priority: 'high',
          is_read: false,
          created_at: new Date()
        });
      }
    }
  } catch (error) {
    console.error('❌ Error notifying new borrow request:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่อคำขอยืมได้รับการอนุมัติ (User)
 */
const notifyBorrowApproved = async (borrowingData) => {
  try {
    const result = await createNotification(borrowingData.user_id, {
      type: 'borrow_approved',
      title: 'อนุมัติคำขอยืม',
      message: `คำขอยืม ${borrowingData.equipment_name} ได้รับการอนุมัติแล้ว`,
      priority: 'high',
      reference_id: borrowingData.transaction_id,
      reference_type: 'borrowing'
    });
    
    if (result.success) {
      sendNotificationToUser(borrowingData.user_id, {
        notification_id: result.notification_id,
        type: 'borrow_approved',
        title: 'อนุมัติคำขอยืม',
        message: `คำขอยืม ${borrowingData.equipment_name} ได้รับการอนุมัติแล้ว`,
        priority: 'high',
        is_read: false,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error notifying borrow approved:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่อคำขอยืมถูกปฏิเสธ (User)
 */
const notifyBorrowRejected = async (borrowingData) => {
  try {
    const result = await createNotification(borrowingData.user_id, {
      type: 'borrow_rejected',
      title: 'ปฏิเสธคำขอยืม',
      message: `คำขอยืม ${borrowingData.equipment_name} ถูกปฏิเสธ${borrowingData.reason ? ': ' + borrowingData.reason : ''}`,
      priority: 'medium',
      reference_id: borrowingData.transaction_id,
      reference_type: 'borrowing'
    });
    
    if (result.success) {
      sendNotificationToUser(borrowingData.user_id, {
        notification_id: result.notification_id,
        type: 'borrow_rejected',
        title: 'ปฏิเสธคำขอยืม',
        message: `คำขอยืม ${borrowingData.equipment_name} ถูกปฏิเสธ${borrowingData.reason ? ': ' + borrowingData.reason : ''}`,
        priority: 'medium',
        is_read: false,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error notifying borrow rejected:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่อใกล้ครบกำหนดคืน (User)
 */
const notifyReturnDueSoon = async (borrowingData) => {
  try {
    const { pool } = require('../config/db');
    
    const [existingNotifications] = await pool.query(`
      SELECT notification_id 
      FROM notifications 
      WHERE member_id = ? 
        AND reference_id = ? 
        AND type = 'return_reminder'
        AND DATE(created_at) = CURDATE()
    `, [borrowingData.user_id, borrowingData.transaction_id]);

    if (existingNotifications.length > 0) {
      return;
    }

    const result = await createNotification(borrowingData.user_id, {
      type: 'return_reminder',
      title: 'ใกล้ครบกำหนดคืน',
      message: `${borrowingData.equipment_name} ครบกำหนดคืนในอีก ${borrowingData.days_remaining} วัน`,
      priority: 'medium',
      reference_id: borrowingData.transaction_id,
      reference_type: 'borrowing'
    });
    
    if (result.success) {
      sendNotificationToUser(borrowingData.user_id, {
        notification_id: result.notification_id,
        type: 'return_reminder',
        title: 'ใกล้ครบกำหนดคืน',
        message: `${borrowingData.equipment_name} ครบกำหนดคืนในอีก ${borrowingData.days_remaining} วัน`,
        priority: 'medium',
        is_read: false,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error notifying return due soon:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่อเกินกำหนดคืน (User)
 */
const notifyOverdue = async (borrowingData) => {
  try {
    const { pool } = require('../config/db');
    
    const [existingNotifications] = await pool.query(`
      SELECT notification_id 
      FROM notifications 
      WHERE member_id = ? 
        AND reference_id = ? 
        AND type = 'overdue'
        AND DATE(created_at) = CURDATE()
    `, [borrowingData.user_id, borrowingData.transaction_id]);

    if (existingNotifications.length > 0) {
      return;
    }

    const result = await createNotification(borrowingData.user_id, {
      type: 'overdue',
      title: 'เกินกำหนดคืน',
      message: `${borrowingData.equipment_name} เกินกำหนดคืน ${borrowingData.days_overdue} วัน`,
      priority: 'urgent',
      reference_id: borrowingData.transaction_id,
      reference_type: 'borrowing'
    });
    
    if (result.success) {
      sendNotificationToUser(borrowingData.user_id, {
        notification_id: result.notification_id,
        type: 'overdue',
        title: 'เกินกำหนดคืน',
        message: `${borrowingData.equipment_name} เกินกำหนดคืน ${borrowingData.hours_overdue} ชั่วโมง (${borrowingData.days_overdue} วัน)`,
        priority: 'urgent',
        is_read: false,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error notifying overdue:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่อมีการคืนอุปกรณ์ (User)
 * ทำงานแบบ non-blocking
 */
const notifyEquipmentReturned = async (returnData) => {
  // ทำงานแบบ async โดยไม่รอผลลัพธ์
  setImmediate(async () => {
    try {
      const result = await createNotification(returnData.user_id, {
        type: 'return_confirmed',
        title: 'บันทึกการคืนสำเร็จ',
        message: `คืน ${returnData.equipment_name} สำเร็จ ${returnData.credit_message || ''}`,
        priority: 'medium',
        reference_id: returnData.transaction_id,
        reference_type: 'return'
      });
      
      if (result.success) {
        sendNotificationToUser(returnData.user_id, {
          notification_id: result.notification_id,
          type: 'return_confirmed',
          title: 'บันทึกการคืนสำเร็จ',
          message: `คืน ${returnData.equipment_name} สำเร็จ ${returnData.credit_message || ''}`,
          priority: 'medium',
          is_read: false,
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error notifying equipment returned:', error);
    }
  });
};

/**
 * สร้างการแจ้งเตือนเมื่อเครดิตเปลี่ยนแปลง (User)
 * ทำงานแบบ non-blocking เพื่อไม่ให้ช้า
 */
const notifyCreditChange = async (userId, creditData) => {
  // ทำงานแบบ async โดยไม่รอผลลัพธ์
  setImmediate(async () => {
    try {
      const { amount, description, balance_after } = creditData;
      const isPositive = amount > 0;
      const amountText = isPositive ? `+${amount}` : amount;
      
      const result = await createNotification(userId, {
        type: 'credit',
        title: isPositive ? 'ได้รับเครดิต' : 'หักเครดิต',
        message: `${description} ${amountText} เครดิต (คงเหลือ ${balance_after} เครดิต)`,
        priority: 'medium',
        reference_type: 'credit'
      });
      
      if (result.success) {
        sendNotificationToUser(userId, {
          notification_id: result.notification_id,
          type: 'credit',
          title: isPositive ? 'ได้รับเครดิต' : 'หักเครดิต',
          message: `${description} ${amountText} เครดิต (คงเหลือ ${balance_after} เครดิต)`,
          priority: 'medium',
          is_read: false,
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error notifying credit change:', error);
    }
  });
};

/**
 * สร้างการแจ้งเตือนให้ Admin เมื่อมีการปรับเครดิตผู้ใช้
 */
const notifyCreditAdjustmentToAdmins = async (userId, creditData, adminId) => {
  try {
    const { pool } = require('../config/db');
    
    // ดึงข้อมูลผู้ใช้
    const [users] = await pool.query(
      'SELECT first_name, last_name FROM members WHERE member_id = ?',
      [userId]
    );
    
    if (users.length === 0) return;
    
    const userName = `${users[0].first_name} ${users[0].last_name}`;
    const { amount, balance_after } = creditData;
    const isPositive = amount > 0;
    const amountText = isPositive ? `+${amount}` : amount;
    
    // แจ้งเตือน Admin ทุกคนยกเว้นคนที่ทำการปรับเครดิต
    const [admins] = await pool.query(
      "SELECT admin_id as user_id FROM admins WHERE status = 'active' AND admin_id != ?",
      [adminId]
    );

    for (const admin of admins) {
      const result = await createNotification(admin.user_id, {
        type: 'credit',
        title: 'มีการปรับเครดิตผู้ใช้',
        message: `${userName} ${isPositive ? 'ได้รับเครดิต' : 'ถูกหักเครดิต'} ${amountText} เครดิต (คงเหลือ ${balance_after} เครดิต)`,
        priority: 'low',
        reference_type: 'credit',
        reference_id: userId
      }, true); // isAdmin = true
      
      if (result.success) {
        sendNotificationToUser(admin.user_id, {
          notification_id: result.notification_id,
          type: 'credit_admin',
          title: 'มีการปรับเครดิตผู้ใช้',
          message: `${userName} ${isPositive ? 'ได้รับเครดิต' : 'ถูกหักเครดิต'} ${amountText} เครดิต (คงเหลือ ${balance_after} เครดิต)`,
          priority: 'low',
          is_read: false,
          created_at: new Date()
        });
      }
    }
  } catch (error) {
    console.error('❌ Error notifying admins about credit adjustment:', error);
  }
};

/**
 * สร้างการแจ้งเตือนคำขอเบิกใหม่ (Admin)
 */
const notifyNewDisbursementRequest = async (disbursementData) => {
  try {
    const { pool } = require('../config/db');
    const [admins] = await pool.query(
      "SELECT admin_id as user_id FROM admins WHERE status = 'active'"
    );

    for (const admin of admins) {
      const result = await createNotification(admin.user_id, {
        type: 'disbursement_request',
        title: 'คำขอเบิกอุปกรณ์ใหม่',
        message: `${disbursementData.user_name} ขอเบิก ${disbursementData.equipment_name} จำนวน ${disbursementData.quantity} ชิ้น`,
        priority: 'high',
        reference_id: disbursementData.transaction_id,
        reference_type: 'disbursement'
      }, true); // isAdmin = true
      
      if (result.success) {
        sendNotificationToUser(admin.user_id, {
          notification_id: result.notification_id,
          type: 'disbursement_request',
          title: 'คำขอเบิกอุปกรณ์ใหม่',
          message: `${disbursementData.user_name} ขอเบิก ${disbursementData.equipment_name} จำนวน ${disbursementData.quantity} ชิ้น`,
          priority: 'high',
          is_read: false,
          created_at: new Date()
        });
      }
    }
  } catch (error) {
    console.error('❌ Error notifying new disbursement request:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่ออนุมัติการเบิก (User)
 */
const notifyDisbursementApproved = async (disbursementData) => {
  try {
    const result = await createNotification(disbursementData.user_id, {
      type: 'disbursement_approved',
      title: 'อนุมัติการเบิกอุปกรณ์',
      message: `คำขอเบิก ${disbursementData.equipment_name} จำนวน ${disbursementData.quantity} ชิ้น ได้รับการอนุมัติแล้ว`,
      priority: 'high',
      reference_id: disbursementData.transaction_id,
      reference_type: 'disbursement'
    });
    
    if (result.success) {
      sendNotificationToUser(disbursementData.user_id, {
        notification_id: result.notification_id,
        type: 'disbursement_approved',
        title: 'อนุมัติการเบิกอุปกรณ์',
        message: `คำขอเบิก ${disbursementData.equipment_name} จำนวน ${disbursementData.quantity} ชิ้น ได้รับการอนุมัติแล้ว`,
        priority: 'high',
        is_read: false,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error notifying disbursement approved:', error);
  }
};

/**
 * สร้างการแจ้งเตือนเมื่อปฏิเสธการเบิก (User)
 */
const notifyDisbursementRejected = async (disbursementData) => {
  try {
    const result = await createNotification(disbursementData.user_id, {
      type: 'disbursement_rejected',
      title: 'ปฏิเสธการเบิกอุปกรณ์',
      message: `คำขอเบิก ${disbursementData.equipment_name} ถูกปฏิเสธ${disbursementData.reason ? ': ' + disbursementData.reason : ''}`,
      priority: 'medium',
      reference_id: disbursementData.transaction_id,
      reference_type: 'disbursement'
    });
    
    if (result.success) {
      sendNotificationToUser(disbursementData.user_id, {
        notification_id: result.notification_id,
        type: 'disbursement_rejected',
        title: 'ปฏิเสธการเบิกอุปกรณ์',
        message: `คำขอเบิก ${disbursementData.equipment_name} ถูกปฏิเสธ${disbursementData.reason ? ': ' + disbursementData.reason : ''}`,
        priority: 'medium',
        is_read: false,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error notifying disbursement rejected:', error);
  }
};

module.exports = {
  notifyNewBorrowRequest,
  notifyBorrowApproved,
  notifyBorrowRejected,
  notifyReturnDueSoon,
  notifyOverdue,
  notifyEquipmentReturned,
  notifyCreditChange,
  notifyCreditAdjustmentToAdmins,
  notifyNewDisbursementRequest,
  notifyDisbursementApproved,
  notifyDisbursementRejected
};
