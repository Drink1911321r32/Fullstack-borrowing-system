const { pool } = require('../../config/db');
const { generateAdminReportPDF } = require('../../utils/pdfGenerator');
const { generateAdminReportExcel } = require('../../utils/excelGenerator');

/**
 * คำนวณวันที่สำหรับ Report
 */
const calculateDateRange = (dateRange, customStartDate = null, customEndDate = null) => {
  let startDate, endDate;

  if (customStartDate && customEndDate) {
    startDate = new Date(customStartDate);
    endDate = new Date(customEndDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date();

    switch (dateRange) {
      case '7days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '3months':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '1year':
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
    }
  }

  return { startDate, endDate };
};

/**
 * สร้าง Label สำหรับช่วงวันที่
 */
const getDateLabel = (dateRange, customStartDate, customEndDate) => {
  if (customStartDate && customEndDate) {
    return `${customStartDate} ถึง ${customEndDate}`;
  }

  const labels = {
    '7days': '7 วันล่าสุด',
    '30days': '30 วันล่าสุด',
    '3months': '3 เดือนล่าสุด',
    '1year': '1 ปีล่าสุด'
  };
  
  return labels[dateRange] || dateRange;
};

/**
 * ดึงข้อมูลรายงานทั้งหมด
 */
const getReportsData = async (dateRange, customStartDate = null, customEndDate = null) => {
  const { startDate, endDate } = calculateDateRange(dateRange, customStartDate, customEndDate);

  // ดึงสถิติพื้นฐาน
  const [borrowingStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_borrowings,
      SUM(CASE WHEN status IN ('Approved', 'Borrowed') THEN 1 ELSE 0 END) as active_borrowings,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_borrowings,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_borrowings,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_borrowings,
      SUM(CASE 
        WHEN (status = 'Approved' OR status = 'Borrowed') 
        AND expected_return_date < CURDATE() 
        AND (quantity_borrowed - COALESCE(total_returned, 0)) > 0
        THEN 1 ELSE 0 
      END) as overdue_borrowings,
      AVG(DATEDIFF(expected_return_date, borrow_date)) as avg_borrow_days
    FROM borrowing_transactions
    WHERE created_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  const [disbursementStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_disbursements,
      SUM(CASE WHEN status IN ('Approved', 'Disbursed', 'Completed') THEN 1 ELSE 0 END) as approved_disbursements,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_disbursements
    FROM disbursement_transactions
    WHERE created_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  const [userStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users
    FROM members
  `);

  const [equipmentStats] = await pool.query(`
    SELECT 
      COUNT(DISTINCT e.equipment_id) as total_equipment,
      COALESCE(SUM(e.quantity), 0) as total_quantity,
      COALESCE(SUM(CASE WHEN e.status = 'Available' THEN e.quantity ELSE 0 END), 0) as available_quantity
    FROM equipments e
  `);

  // Top Equipment
  const [topEquipment] = await pool.query(`
    SELECT 
      e.equipment_name,
      et.type_name,
      COUNT(bt.transaction_id) as borrow_count,
      ROUND(AVG(DATEDIFF(bt.expected_return_date, bt.borrow_date)), 1) as avg_days
    FROM borrowing_transactions bt
    JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.created_at BETWEEN ? AND ?
      AND bt.status IN ('Approved', 'Borrowed', 'Completed')
    GROUP BY e.equipment_id, e.equipment_name, et.type_name
    ORDER BY borrow_count DESC
    LIMIT 20
  `, [startDate, endDate]);

  // Equipment Usage by Category
  const [equipmentUsage] = await pool.query(`
    SELECT 
      COALESCE(et.type_name, 'ไม่ระบุประเภท') as category,
      COUNT(bt.transaction_id) as count
    FROM borrowing_transactions bt
    JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.created_at BETWEEN ? AND ?
      AND bt.status IN ('Approved', 'Borrowed', 'Completed')
    GROUP BY et.type_name
    ORDER BY count DESC
    LIMIT 10
  `, [startDate, endDate]);

  // User Activity
  const [userActivity] = await pool.query(`
    SELECT 
      CONCAT(m.first_name, ' ', m.last_name) as user_name,
      m.email,
      COUNT(bt.transaction_id) as total_borrowings,
      SUM(CASE WHEN bt.status IN ('Approved', 'Borrowed') THEN 1 ELSE 0 END) as active_borrowings,
      SUM(CASE WHEN bt.status = 'Completed' THEN 1 ELSE 0 END) as completed_borrowings,
      SUM(CASE 
        WHEN bt.status IN ('Approved', 'Borrowed') 
        AND bt.expected_return_date < CURDATE() 
        AND (bt.quantity_borrowed - COALESCE(bt.total_returned, 0)) > 0
        THEN 1 ELSE 0 
      END) as overdue_count
    FROM borrowing_transactions bt
    JOIN members m ON bt.member_id = m.member_id
    WHERE bt.created_at BETWEEN ? AND ?
    GROUP BY m.member_id, m.first_name, m.last_name, m.email
    ORDER BY total_borrowings DESC
    LIMIT 15
  `, [startDate, endDate]);

  // Top Disbursement Equipment
  const [topDisbursementEquipment] = await pool.query(`
    SELECT 
      e.equipment_name,
      et.type_name,
      COUNT(dt.transaction_id) as disbursement_count,
      SUM(dt.quantity_disbursed) as total_quantity_disbursed
    FROM disbursement_transactions dt
    JOIN equipments e ON dt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE dt.created_at BETWEEN ? AND ?
      AND dt.status IN ('Approved', 'Disbursed', 'Cancelled')
    GROUP BY e.equipment_id, e.equipment_name, et.type_name
    ORDER BY disbursement_count DESC
    LIMIT 15
  `, [startDate, endDate]);

  // Top Disbursement Users
  const [topDisbursementUsers] = await pool.query(`
    SELECT 
      CONCAT(m.first_name, ' ', m.last_name) as user_name,
      COUNT(dt.transaction_id) as total_disbursements,
      SUM(dt.quantity_disbursed) as total_quantity,
      SUM(CASE WHEN dt.status = 'Pending' THEN 1 ELSE 0 END) as pending_requests,
      SUM(CASE WHEN dt.status IN ('Approved', 'Disbursed') THEN 1 ELSE 0 END) as approved_requests,
      SUM(CASE WHEN dt.status = 'Cancelled' THEN 1 ELSE 0 END) as completed_requests
    FROM disbursement_transactions dt
    JOIN members m ON dt.member_id = m.member_id
    WHERE dt.created_at BETWEEN ? AND ?
    GROUP BY m.member_id, m.first_name, m.last_name
    ORDER BY total_disbursements DESC
    LIMIT 15
  `, [startDate, endDate]);

  // คำนวณ equipment utilization
  const totalEquipment = parseInt(equipmentStats[0].total_quantity) || 0;
  const availableEquipment = parseInt(equipmentStats[0].available_quantity) || 0;
  const equipmentUtilization = totalEquipment > 0 
    ? Math.round(((totalEquipment - availableEquipment) / totalEquipment) * 100) 
    : 0;

  return {
    overview: {
      totalBorrowings: parseInt(borrowingStats[0].total_borrowings) || 0,
      activeBorrowings: parseInt(borrowingStats[0].active_borrowings) || 0,
      completedBorrowings: parseInt(borrowingStats[0].completed_borrowings) || 0,
      overdueBorrowings: parseInt(borrowingStats[0].overdue_borrowings) || 0,
      totalUsers: parseInt(userStats[0].total_users) || 0,
      activeUsers: parseInt(userStats[0].active_users) || 0,
      totalEquipment: parseInt(equipmentStats[0].total_equipment) || 0,
      totalDisbursements: parseInt(disbursementStats[0].total_disbursements) || 0,
      equipmentUtilization: equipmentUtilization,
      averageBorrowDays: parseFloat(borrowingStats[0].avg_borrow_days) || 0
    },
    topEquipment: topEquipment || [],
    equipmentUsage: equipmentUsage || [],
    userActivity: userActivity || [],
    topDisbursementEquipment: topDisbursementEquipment || [],
    topDisbursementUsers: topDisbursementUsers || []
  };
};

/**
 * สร้างไฟล์ PDF Report
 */
const generatePDFReport = async (dateRange, customStartDate, customEndDate) => {
  const reportData = await getReportsData(dateRange, customStartDate, customEndDate);
  const dateLabel = getDateLabel(dateRange, customStartDate, customEndDate);
  
  return await generateAdminReportPDF(reportData, dateLabel);
};

/**
 * สร้างไฟล์ Excel Report
 */
const generateExcelReport = async (dateRange, customStartDate, customEndDate) => {
  const reportData = await getReportsData(dateRange, customStartDate, customEndDate);
  const dateLabel = getDateLabel(dateRange, customStartDate, customEndDate);
  
  return generateAdminReportExcel(reportData, dateLabel);
};

module.exports = {
  calculateDateRange,
  getDateLabel,
  getReportsData,
  generatePDFReport,
  generateExcelReport
};
