const { pool } = require('../../config/db');
const { generateUserReportPDF } = require('../../utils/pdfGenerator');
const { generateUserReportExcel } = require('../../utils/excelGenerator');

/**
 * คำนวณช่วงวันที่
 */
const calculateDateRange = (dateRange, customStartDate, customEndDate) => {
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
 * ดึงข้อมูลรายงานผู้ใช้
 */
const getUserReportData = async (userId, dateRange, customStartDate, customEndDate) => {
  const { startDate, endDate } = calculateDateRange(dateRange, customStartDate, customEndDate);

  // ดึงข้อมูลผู้ใช้
  const [userInfo] = await pool.query(`
    SELECT 
      m.member_id,
      m.first_name,
      m.last_name,
      m.email,
      m.credit,
      s.student_code
    FROM members m
    LEFT JOIN students s ON m.member_id = s.member_id
    WHERE m.member_id = ?
  `, [userId]);

  // ดึงข้อมูลการยืม
  const [borrowings] = await pool.query(`
    SELECT 
      bt.transaction_id,
      bt.borrow_date,
      bt.expected_return_date,
      bt.status,
      bt.quantity_borrowed,
      e.equipment_name,
      et.type_name
    FROM borrowing_transactions bt
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE bt.member_id = ?
      AND bt.created_at BETWEEN ? AND ?
    ORDER BY bt.created_at DESC
  `, [userId, startDate, endDate]);

  // ดึงข้อมูลการเบิก
  const [disbursements] = await pool.query(`
    SELECT 
      dt.transaction_id,
      dt.request_date,
      dt.status,
      dt.quantity_requested,
      e.equipment_name,
      et.type_name
    FROM disbursement_transactions dt
    LEFT JOIN equipments e ON dt.equipment_id = e.equipment_id
    LEFT JOIN equipmenttypes et ON e.type_id = et.type_id
    WHERE dt.member_id = ?
      AND dt.created_at BETWEEN ? AND ?
    ORDER BY dt.created_at DESC
  `, [userId, startDate, endDate]);

  // ดึงข้อมูลการคืน
  const [returns] = await pool.query(`
    SELECT 
      rt.return_id,
      rt.return_date,
      rt.condition_status,
      rt.penalty_amount,
      e.equipment_name
    FROM return_transactions rt
    LEFT JOIN borrowing_transactions bt ON rt.transaction_id = bt.transaction_id
    LEFT JOIN equipments e ON bt.equipment_id = e.equipment_id
    WHERE bt.member_id = ?
      AND rt.return_date BETWEEN ? AND ?
    ORDER BY rt.return_date DESC
  `, [userId, startDate, endDate]);

  return {
    dateRange: { startDate, endDate },
    user: userInfo[0],
    borrowings,
    disbursements,
    returns
  };
};

/**
 * สร้าง PDF Report
 */
const generatePDFReport = async (userId, dateRange, customStartDate, customEndDate) => {
  const reportData = await getUserReportData(userId, dateRange, customStartDate, customEndDate);
  return await generateUserReportPDF(reportData);
};

/**
 * สร้าง Excel Report
 */
const generateExcelReport = async (userId, dateRange, customStartDate, customEndDate) => {
  const reportData = await getUserReportData(userId, dateRange, customStartDate, customEndDate);
  return generateUserReportExcel(reportData);
};

module.exports = {
  calculateDateRange,
  getUserReportData,
  generatePDFReport,
  generateExcelReport
};
