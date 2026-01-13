const { pool } = require('../../config/db');

// Cache สำหรับ dashboard stats
let dashboardStatsCache = null;
let dashboardStatsCacheTime = 0;
const DASHBOARD_CACHE_TTL = 30000; // 30 seconds

/**
 * ดึงข้อมูลจาก Cache
 */
const getDashboardStatsFromCache = () => {
  const now = Date.now();
  if (dashboardStatsCache && (now - dashboardStatsCacheTime) < DASHBOARD_CACHE_TTL) {
    return dashboardStatsCache;
  }
  return null;
};

/**
 * บันทึกข้อมูลลง Cache
 */
const setDashboardStatsCache = (data) => {
  dashboardStatsCache = data;
  dashboardStatsCacheTime = Date.now();
};

/**
 * ลบ Cache
 */
const invalidateDashboardCache = () => {
  dashboardStatsCache = null;
  dashboardStatsCacheTime = 0;
};

/**
 * ดึงสถิติผู้ใช้
 */
const fetchUserStats = async () => {
  const [memberStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_members,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_members,
      COALESCE(SUM(credit), 0) as total_credits,
      COALESCE(AVG(credit), 0) as avg_credits
    FROM members
  `);
  
  const [adminStats] = await pool.query(`
    SELECT COUNT(*) as total_admins FROM admins
  `);

  return {
    total_users: (memberStats[0].total_members || 0) + (adminStats[0].total_admins || 0),
    total_admins: adminStats[0].total_admins || 0,
    total_regular_users: memberStats[0].total_members || 0,
    active_users: memberStats[0].active_members || 0,
    total_credits: memberStats[0].total_credits || 0,
    avg_credits: memberStats[0].avg_credits || 0
  };
};

/**
 * ดึงสถิติอุปกรณ์
 */
const fetchEquipmentStats = async () => {
  const [equipmentStats] = await pool.query(`
    SELECT 
      COUNT(DISTINCT e.equipment_id) as total_equipment_types,
      COALESCE((SELECT COUNT(*) FROM equipment_items), 0) as loan_quantity,
      COALESCE((
        SELECT SUM(e2.quantity)
        FROM equipments e2
        LEFT JOIN equipmenttypes et ON e2.type_id = et.type_id
        WHERE et.usage_type = 'Disbursement'
      ), 0) as disbursement_quantity,
      COALESCE((
        SELECT COUNT(*) 
        FROM equipment_items ei 
        WHERE ei.status = 'Available'
      ), 0) as available_loan_quantity,
      COALESCE((
        SELECT SUM(
          e2.quantity - COALESCE((
            SELECT SUM(dt.quantity_disbursed)
            FROM disbursement_transactions dt
            WHERE dt.equipment_id = e2.equipment_id 
            AND dt.status = 'Disbursed'
          ), 0)
        )
        FROM equipments e2
        LEFT JOIN equipmenttypes et ON e2.type_id = et.type_id
        WHERE et.usage_type = 'Disbursement'
      ), 0) as available_disbursement_quantity,
      COALESCE((
        SELECT COUNT(*) 
        FROM equipment_items ei 
        WHERE ei.status = 'Borrowed'
      ), 0) as borrowed_quantity,
      COALESCE((
        SELECT COUNT(*) 
        FROM equipment_items ei 
        WHERE ei.status = 'Maintenance' OR ei.status = 'Repairing'
      ), 0) as maintenance_quantity,
      COALESCE((
        SELECT COUNT(*) 
        FROM equipment_items ei 
        WHERE ei.status = 'Damaged'
      ), 0) as damaged_quantity
    FROM equipments e
  `);

  const loanQty = parseInt(equipmentStats[0]?.loan_quantity) || 0;
  const disbursementQty = parseInt(equipmentStats[0]?.disbursement_quantity) || 0;
  const availableLoanQty = parseInt(equipmentStats[0]?.available_loan_quantity) || 0;
  const availableDisbursementQty = parseInt(equipmentStats[0]?.available_disbursement_quantity) || 0;

  return {
    total_equipment: loanQty + disbursementQty,
    total_equipment_types: equipmentStats[0]?.total_equipment_types || 0,
    total_quantity: loanQty + disbursementQty,
    loan_quantity: loanQty,
    disbursement_quantity: disbursementQty,
    available_quantity: availableLoanQty + availableDisbursementQty,
    available_loan_quantity: availableLoanQty,
    available_disbursement_quantity: availableDisbursementQty,
    borrowed_quantity: equipmentStats[0]?.borrowed_quantity || 0,
    maintenance_quantity: equipmentStats[0]?.maintenance_quantity || 0,
    damaged_quantity: equipmentStats[0]?.damaged_quantity || 0
  };
};

/**
 * ดึงสถิติการยืม
 */
const fetchBorrowingStats = async () => {
  const [borrowingStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_borrowings,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_borrowings,
      SUM(CASE WHEN status = 'Approved' OR status = 'Borrowed' THEN 1 ELSE 0 END) as approved_borrowings,
      SUM(CASE WHEN (status = 'Approved' OR status = 'Borrowed') AND (is_returned = 0 OR is_returned IS NULL) THEN 1 ELSE 0 END) as active_borrowings,
      SUM(CASE WHEN is_returned = 1 THEN 1 ELSE 0 END) as returned_borrowings,
      SUM(CASE WHEN (status = 'Approved' OR status = 'Borrowed') AND (is_returned = 0 OR is_returned IS NULL) AND expected_return_date < NOW() THEN 1 ELSE 0 END) as overdue_borrowings,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_borrowings,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_borrowings
    FROM borrowing_transactions
  `);

  return borrowingStats[0] || {
    total_borrowings: 0,
    pending_borrowings: 0,
    approved_borrowings: 0,
    active_borrowings: 0,
    returned_borrowings: 0,
    overdue_borrowings: 0,
    rejected_borrowings: 0,
    cancelled_borrowings: 0
  };
};

/**
 * ดึงสถิติการเบิก
 */
const fetchDisbursementStats = async () => {
  const [disbursementStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_disbursements,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_disbursements,
      SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_disbursements,
      SUM(CASE WHEN status = 'Disbursed' THEN 1 ELSE 0 END) as completed_disbursements,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_disbursements,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_disbursements
    FROM disbursement_transactions
  `);

  return disbursementStats[0] || {
    total_disbursements: 0,
    pending_disbursements: 0,
    approved_disbursements: 0,
    completed_disbursements: 0,
    rejected_disbursements: 0,
    cancelled_disbursements: 0
  };
};

/**
 * ดึงกิจกรรมล่าสุด
 */
const fetchRecentActivities = async () => {
  const [borrowingActivities] = await pool.query(`
    SELECT 
      bt.transaction_id,
      'borrow' as transaction_type,
      bt.status,
      bt.created_at,
      bt.quantity_borrowed as quantity,
      m.first_name,
      m.last_name,
      e.equipment_name
    FROM borrowing_transactions bt
    LEFT JOIN members m ON bt.member_id = m.member_id
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    WHERE m.member_id IS NOT NULL
    ORDER BY bt.created_at DESC
    LIMIT 5
  `);

  const [disbursementActivities] = await pool.query(`
    SELECT 
      dt.transaction_id,
      'disbursement' as transaction_type,
      dt.status,
      dt.created_at,
      dt.quantity_requested as quantity,
      m.first_name,
      m.last_name,
      e.equipment_name
    FROM disbursement_transactions dt
    LEFT JOIN members m ON dt.member_id = m.member_id
    LEFT JOIN equipments e ON dt.equipment_id = e.equipment_id
    WHERE m.member_id IS NOT NULL
    ORDER BY dt.created_at DESC
    LIMIT 5
  `);

  return [...borrowingActivities, ...disbursementActivities]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
};

/**
 * ดึงสถิติรายสัปดาห์
 */
const fetchWeeklyStats = async () => {
  const [weeklyBorrowings] = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM borrowing_transactions
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const [weeklyDisbursements] = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM disbursement_transactions
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const weeklyStatsMap = {};
  weeklyBorrowings.forEach(item => {
    const dateStr = item.date.toISOString().split('T')[0];
    weeklyStatsMap[dateStr] = (weeklyStatsMap[dateStr] || 0) + item.count;
  });
  weeklyDisbursements.forEach(item => {
    const dateStr = item.date.toISOString().split('T')[0];
    weeklyStatsMap[dateStr] = (weeklyStatsMap[dateStr] || 0) + item.count;
  });

  return Object.entries(weeklyStatsMap).map(([date, count]) => ({
    date,
    count
  }));
};

/**
 * ดึงข้อมูล Dashboard Stats ทั้งหมด
 */
const getDashboardStatsData = async () => {
  const [users, equipment, borrowings, disbursements, recentActivities, weeklyStats] = await Promise.all([
    fetchUserStats(),
    fetchEquipmentStats(),
    fetchBorrowingStats(),
    fetchDisbursementStats(),
    fetchRecentActivities(),
    fetchWeeklyStats()
  ]);

  return {
    users,
    equipment,
    borrowings,
    disbursements,
    recentActivities,
    weeklyStats
  };
};

module.exports = {
  getDashboardStatsFromCache,
  setDashboardStatsCache,
  invalidateDashboardCache,
  getDashboardStatsData,
  fetchUserStats,
  fetchEquipmentStats,
  fetchBorrowingStats,
  fetchDisbursementStats,
  fetchRecentActivities,
  fetchWeeklyStats
};
