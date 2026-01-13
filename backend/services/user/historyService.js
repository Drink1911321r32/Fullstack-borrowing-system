const { pool } = require('../../config/db');

/**
 * ดึงประวัติการยืมของผู้ใช้
 */
const getUserBorrowingHistory = async (userId) => {
  const query = `
    SELECT 
      bt.transaction_id,
      bt.equipment_id,
      bt.quantity_borrowed,
      bt.borrow_date,
      bt.expected_return_date,
      bt.status,
      bt.is_returned,
      bt.created_at,
      e.equipment_name,
      et.type_name
    FROM borrowing_transactions bt
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.member_id = ?
    ORDER BY bt.created_at DESC
  `;

  const [results] = await pool.query(query, [userId]);
  return results;
};

/**
 * ดึงรายการที่ต้องคืน
 */
const getItemsToReturn = async (userId) => {
  const query = `
    SELECT 
      bt.transaction_id,
      bt.equipment_id,
      bt.quantity_borrowed,
      bt.borrow_date,
      bt.expected_return_date,
      bt.status,
      e.equipment_name,
      et.type_name,
      DATEDIFF(NOW(), bt.expected_return_date) as days_overdue
    FROM borrowing_transactions bt
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.member_id = ?
      AND bt.status IN ('Approved', 'Borrowed')
      AND (bt.is_returned = 0 OR bt.is_returned IS NULL)
    ORDER BY bt.expected_return_date ASC
  `;

  const [results] = await pool.query(query, [userId]);
  return results;
};

/**
 * ดึงประวัติการคืน
 */
const getReturnHistory = async (userId) => {
  const query = `
    SELECT 
      rt.return_id,
      rt.transaction_id,
      rt.return_date,
      rt.condition_status,
      rt.penalty_amount,
      rt.notes,
      bt.equipment_id,
      bt.quantity_borrowed,
      e.equipment_name,
      et.type_name
    FROM return_transactions rt
    LEFT JOIN borrowing_transactions bt ON rt.transaction_id = bt.transaction_id
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.member_id = ?
    ORDER BY rt.return_date DESC
  `;

  const [results] = await pool.query(query, [userId]);
  return results;
};

/**
 * ดึงสถิติการใช้งานของผู้ใช้
 */
const getUserStats = async (userId) => {
  const [borrowStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_borrows,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status IN ('Approved', 'Borrowed') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_returned = 1 THEN 1 ELSE 0 END) as completed
    FROM borrowing_transactions
    WHERE member_id = ?
  `, [userId]);

  const [disbursementStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_disbursements,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'Disbursed' THEN 1 ELSE 0 END) as completed
    FROM disbursement_transactions
    WHERE member_id = ?
  `, [userId]);

  return {
    borrowing: borrowStats[0] || { total_borrows: 0, pending: 0, active: 0, completed: 0 },
    disbursement: disbursementStats[0] || { total_disbursements: 0, pending: 0, completed: 0 }
  };
};

module.exports = {
  getUserBorrowingHistory,
  getItemsToReturn,
  getReturnHistory,
  getUserStats
};
