const { pool } = require('../../config/db');
const { notifyCreditChange, notifyCreditAdjustmentToAdmins } = require('../../utils/notificationHelper');

/**
 * จัดการเครดิตผู้ใช้โดย Admin (เพิ่ม/ลด/รีเซ็ต)
 */
const manageCreditByAdmin = async (connection, userId, { action, amount, reason, note }, adminId) => {
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!action || !reason) {
    throw new Error('กรุณาระบุประเภทการดำเนินการและเหตุผล');
  }

  if (action !== 'reset' && (!amount || amount <= 0)) {
    throw new Error('กรุณาระบุจำนวนเครดิตที่ถูกต้อง');
  }

  // ดึงข้อมูลผู้ใช้ปัจจุบัน
  const [users] = await connection.query(
    'SELECT member_id, credit, first_name, last_name FROM members WHERE member_id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new Error('ไม่พบข้อมูลผู้ใช้');
  }

  const user = users[0];
  const currentCredit = parseFloat(user.credit) || 0;
  let newCredit = currentCredit;
  let creditChange = 0;
  let transactionType = 'adjustment';
  let description = '';

  // คำนวณเครดิตใหม่ตาม action
  if (action === 'add') {
    creditChange = parseFloat(amount);
    newCredit = currentCredit + creditChange;
    description = `Admin เพิ่มเครดิต ${creditChange} - เหตุผล: ${reason}`;
    transactionType = 'adjustment';
  } else if (action === 'deduct') {
    creditChange = -parseFloat(amount);
    newCredit = currentCredit + creditChange; // อนุญาตให้ติดลบได้
    description = `Admin หักเครดิต ${Math.abs(creditChange)} - เหตุผล: ${reason}`;
    transactionType = 'penalty';
  } else if (action === 'reset') {
    const initialCredit = 100;
    creditChange = initialCredit - currentCredit;
    newCredit = initialCredit;
    description = `Admin รีเซ็ตเครดิต - เหตุผล: ${reason}`;
    transactionType = 'adjustment';
  } else {
    throw new Error('ประเภทการดำเนินการไม่ถูกต้อง');
  }

  if (note) {
    description += ` | หมายเหตุ: ${note}`;
  }

  // อัพเดตเครดิตของผู้ใช้
  await connection.query(
    'UPDATE members SET credit = ? WHERE member_id = ?',
    [newCredit, userId]
  );

  // บันทึกประวัติการเปลี่ยนแปลงเครดิต
  await connection.query(
    `INSERT INTO credit_transactions (
      member_id, 
      amount, 
      transaction_type, 
      reference_type, 
      description, 
      balance_after, 
      created_by_admin,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userId,
      Math.round(creditChange),
      transactionType,
      'manual',
      description,
      Math.round(newCredit),
      adminId
    ]
  );

  // สร้างการแจ้งเตือน
  await notifyCreditChange(userId, {
    amount: Math.round(creditChange),
    description: description,
    balance_after: Math.round(newCredit)
  });

  await notifyCreditAdjustmentToAdmins(userId, {
    amount: Math.round(creditChange),
    balance_after: Math.round(newCredit)
  }, adminId);

  return {
    user_id: userId,
    user_name: `${user.first_name} ${user.last_name}`,
    previous_credit: currentCredit,
    credit_change: creditChange,
    new_credit: newCredit,
    action: action,
    reason: reason,
    note: note || null
  };
};

/**
 * ดึงประวัติเครดิตของผู้ใช้
 */
const getUserCreditHistoryData = async (userId, type = 'all') => {
  let query = `
    SELECT 
      ct.transaction_id,
      ct.member_id,
      ct.amount,
      ct.transaction_type,
      ct.reference_type,
      ct.reference_id,
      ct.description,
      ct.balance_after,
      ct.created_at,
      ct.created_by_admin,
      a.first_name as admin_first_name,
      a.last_name as admin_last_name,
      a.email as admin_email
    FROM credit_transactions ct
    LEFT JOIN admins a ON ct.created_by_admin = a.admin_id
    WHERE ct.member_id = ?
  `;

  const queryParams = [userId];

  if (type === 'manual') {
    query += ` AND ct.reference_type = 'manual'`;
  } else if (type === 'borrowing') {
    query += ` AND ct.reference_type IN ('borrowing', 'disbursement')`;
  }

  query += ` ORDER BY ct.created_at DESC`;

  const [transactions] = await pool.query(query, queryParams);
  return transactions;
};

/**
 * ดึงประวัติเครดิตทั้งหมด (สำหรับ admin)
 */
const getAllCreditHistoryData = async (type = 'all', limit = 50) => {
  let query = `
    SELECT 
      ct.transaction_id,
      ct.member_id,
      m.first_name as user_first_name,
      m.last_name as user_last_name,
      m.email as user_email,
      m.profile_image as user_profile_image,
      ct.amount,
      ct.transaction_type,
      ct.reference_type,
      ct.reference_id,
      ct.description,
      ct.balance_after,
      ct.created_at,
      ct.created_by_admin,
      a.first_name as admin_first_name,
      a.last_name as admin_last_name,
      a.email as admin_email,
      a.profile_image as admin_profile_image
    FROM credit_transactions ct
    LEFT JOIN members m ON ct.member_id = m.member_id
    LEFT JOIN admins a ON ct.created_by_admin = a.admin_id
    WHERE 1=1
  `;

  if (type === 'manual') {
    query += ` AND ct.reference_type = 'manual'`;
  } else if (type === 'borrowing') {
    query += ` AND ct.reference_type IN ('borrowing', 'disbursement')`;
  }

  query += ` ORDER BY ct.created_at DESC LIMIT ?`;

  const [transactions] = await pool.query(query, [parseInt(limit)]);
  return transactions;
};

module.exports = {
  manageCreditByAdmin,
  getUserCreditHistoryData,
  getAllCreditHistoryData
};
