const { pool } = require('../../config/db');
const bcrypt = require('bcrypt');

/**
 * Query Builder สำหรับดึงข้อมูล User พร้อม Stats
 */
const buildUserStatsQuery = (withUserId = false) => {
  const whereClause = withUserId ? 'WHERE m.member_id = ?' : '';
  
  return `
    SELECT 
      m.member_id as user_id,
      m.email,
      m.first_name,
      m.last_name,
      m.member_type,
      s.student_code,
      'user' as role,
      m.status,
      m.credit,
      m.profile_image,
      m.created_at,
      m.updated_at,
      COALESCE(t.total_transactions, 0) as total_transactions,
      COALESCE(t.total_items, 0) as total_items,
      COALESCE(t.active_transactions, 0) as active_transactions,
      COALESCE(t.active_items, 0) as active_items,
      COALESCE(t.overdue_items, 0) as overdue_items,
      COALESCE(t.total_items, 0) as total_borrowings,
      COALESCE(t.active_items, 0) as active_borrowings,
      COALESCE(t.overdue_items, 0) as overdue_count,
      COALESCE(rt.on_time_returns, 0) as on_time_return,
      COALESCE(rt.late_returns, 0) as late_return,
      COALESCE(ct.last_credit_activity, m.updated_at) as last_activity
    FROM members m
    LEFT JOIN students s ON m.member_id = s.member_id
    LEFT JOIN (
      SELECT m2.member_id,
        COALESCE((SELECT COUNT(*) FROM borrowing_transactions bt_all WHERE bt_all.member_id = m2.member_id), 0) as total_transactions,
        COALESCE((
          SELECT SUM(bt.quantity_borrowed) FROM borrowing_transactions bt
          WHERE bt.member_id = m2.member_id
        ),0) as total_items,
        COALESCE((SELECT COUNT(*) FROM borrowing_transactions bt_act WHERE bt_act.member_id = m2.member_id AND bt_act.status IN ('Approved','Borrowed') AND (bt_act.is_returned = 0 OR bt_act.is_returned IS NULL)),0) as active_transactions,
        COALESCE((
          SELECT SUM(bt.quantity_borrowed) FROM borrowing_transactions bt
          WHERE bt.member_id = m2.member_id
            AND (bt.status IN ('Approved','Borrowed'))
            AND (bt.is_returned = 0 OR bt.is_returned IS NULL)
        ),0) as active_items,
        COALESCE((
          SELECT SUM(bt.quantity_borrowed) FROM borrowing_transactions bt
          WHERE bt.member_id = m2.member_id
            AND bt.status IN ('Approved','Borrowed')
            AND (bt.is_returned = 0 OR bt.is_returned IS NULL)
            AND bt.expected_return_date < NOW()
        ),0) as overdue_items
      FROM members m2
    ) t ON m.member_id = t.member_id
    LEFT JOIN (
      SELECT 
        bt.member_id,
        COUNT(CASE WHEN rt.late_penalty = 0 OR rt.late_penalty IS NULL THEN 1 END) as on_time_returns,
        COUNT(CASE WHEN rt.late_penalty > 0 THEN 1 END) as late_returns
      FROM borrowing_transactions bt
      LEFT JOIN return_transactions rt ON bt.transaction_id = rt.borrowing_id
      WHERE bt.is_returned = 1
      GROUP BY bt.member_id
    ) rt ON m.member_id = rt.member_id
    LEFT JOIN (
      SELECT 
        member_id,
        MAX(created_at) as last_credit_activity
      FROM credit_transactions
      GROUP BY member_id
    ) ct ON m.member_id = ct.member_id
    ${whereClause}
    ORDER BY m.created_at DESC
  `;
};

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด
 */
const getAllUsersData = async () => {
  const query = buildUserStatsQuery(false);
  const [users] = await pool.query(query);
  return users;
};

/**
 * ดึงข้อมูลผู้ใช้ตาม ID
 */
const getUserByIdData = async (userId) => {
  const query = buildUserStatsQuery(true);
  const [users] = await pool.query(query, [userId]);
  return users.length > 0 ? users[0] : null;
};

/**
 * ตรวจสอบว่า Email ซ้ำหรือไม่
 */
const checkEmailExists = async (email) => {
  const [existingMembers] = await pool.query(
    'SELECT member_id FROM members WHERE email = ?',
    [email]
  );
  const [existingAdmins] = await pool.query(
    'SELECT admin_id FROM admins WHERE email = ?',
    [email]
  );
  return existingMembers.length > 0 || existingAdmins.length > 0;
};

/**
 * ตรวจสอบว่ารหัสนักศึกษาซ้ำหรือไม่
 */
const checkStudentCodeExists = async (studentCode) => {
  const [existingStudent] = await pool.query(
    'SELECT student_id FROM students WHERE student_code = ?',
    [studentCode]
  );
  return existingStudent.length > 0;
};

/**
 * สร้างผู้ใช้ใหม่ในระบบ
 */
const createNewUser = async ({ email, password, first_name, last_name, member_type, student_code, credit }) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO members (
      email, password, first_name, last_name, member_type, status, credit, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())
  `;

  const [result] = await pool.query(query, [
    email,
    hashedPassword,
    first_name,
    last_name,
    member_type,
    credit
  ]);

  const memberId = result.insertId;

  // ถ้าเป็น student และมีรหัสนักศึกษา
  if (member_type === 'student' && student_code) {
    await pool.query(
      'INSERT INTO students (member_id, student_code) VALUES (?, ?)',
      [memberId, student_code]
    );
  }

  return memberId;
};

/**
 * อัพเดตข้อมูลผู้ใช้
 */
const updateUserData = async (userId, { email, first_name, last_name, member_type, student_code, status, credit }) => {
  const updateFields = [];
  const updateValues = [];

  if (email !== undefined) {
    updateFields.push('email = ?');
    updateValues.push(email);
  }
  if (first_name !== undefined) {
    updateFields.push('first_name = ?');
    updateValues.push(first_name);
  }
  if (last_name !== undefined) {
    updateFields.push('last_name = ?');
    updateValues.push(last_name);
  }
  if (member_type !== undefined) {
    updateFields.push('member_type = ?');
    updateValues.push(member_type);
  }
  if (status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(status);
  }
  if (credit !== undefined) {
    updateFields.push('credit = ?');
    updateValues.push(credit);
  }

  updateFields.push('updated_at = NOW()');
  updateValues.push(userId);

  const query = `UPDATE members SET ${updateFields.join(', ')} WHERE member_id = ?`;
  await pool.query(query, updateValues);

  // อัพเดตรหัสนักศึกษา ถ้าจำเป็น
  if (member_type === 'student' && student_code !== undefined) {
    const [existingStudent] = await pool.query(
      'SELECT student_id FROM students WHERE member_id = ?',
      [userId]
    );

    if (existingStudent.length > 0) {
      await pool.query(
        'UPDATE students SET student_code = ? WHERE member_id = ?',
        [student_code, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO students (member_id, student_code) VALUES (?, ?)',
        [userId, student_code]
      );
    }
  }
};

/**
 * เปลี่ยนสถานะผู้ใช้
 */
const changeUserStatus = async (userId, status) => {
  await pool.query(
    'UPDATE members SET status = ?, updated_at = NOW() WHERE member_id = ?',
    [status, userId]
  );
};

/**
 * ลบผู้ใช้ (Soft delete หรือ Hard delete ตามต้องการ)
 */
const deleteUserData = async (userId) => {
  // Hard delete
  await pool.query('DELETE FROM students WHERE member_id = ?', [userId]);
  await pool.query('DELETE FROM members WHERE member_id = ?', [userId]);
};

/**
 * ดึงสถิติผู้ใช้
 */
const getUserStatsData = async () => {
  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
      0 as pending,
      COUNT(*) as students,
      0 as staff,
      0 as admins
    FROM members
  `;

  const [stats] = await pool.query(query);
  return stats[0];
};

module.exports = {
  buildUserStatsQuery,
  getAllUsersData,
  getUserByIdData,
  checkEmailExists,
  checkStudentCodeExists,
  createNewUser,
  updateUserData,
  changeUserStatus,
  deleteUserData,
  getUserStatsData
};
