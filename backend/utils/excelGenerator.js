const ExcelJS = require('exceljs');

/**
 * แปลงชื่อช่วงเวลาเป็นภาษาไทย
 */
const getRangeName = (dateRange) => {
  const ranges = {
    '7days': '7 วันที่ผ่านมา',
    '30days': '30 วันที่ผ่านมา',
    '3months': '3 เดือนที่ผ่านมา',
    '1year': '1 ปีที่ผ่านมา'
  };
  return ranges[dateRange] || dateRange;
};

/**
 * จัดรูปแบบ worksheet - จัดกลางทุกเซลล์และตั้งค่าความกว้างคอลัมน์
 */
const formatWorksheet = (worksheet, columnWidths) => {
  // ตั้งค่าความกว้างคอลัมน์
  worksheet.columns = columnWidths.map(width => ({ width }));
  
  // จัดกลางทุกเซลล์
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // ทำให้แถวแรก (header) เป็นตัวหนา
  if (worksheet.rowCount > 0) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 14 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }
};

/**
 * สร้าง Excel รายงานสำหรับ Admin
 */
const generateAdminReportExcel = async (reportData, dateRange) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Overview
    const overviewSheet = workbook.addWorksheet('ภาพรวม');
    overviewSheet.addRow(['รายงานสรุปภาพรวมระบบ']);
    overviewSheet.addRow([`ช่วงเวลา: ${getRangeName(dateRange)}`]);
    overviewSheet.addRow([]);
    overviewSheet.addRow(['หัวข้อ', 'จำนวน']);
    overviewSheet.addRow(['จำนวนการยืมทั้งหมด', reportData.overview.totalBorrowings]);
    overviewSheet.addRow(['การยืมที่กำลังดำเนินการ', reportData.overview.activeBorrowings]);
    overviewSheet.addRow(['การยืมที่เกินกำหนด', reportData.overview.overdueBorrowings]);
    overviewSheet.addRow(['จำนวนผู้ใช้ทั้งหมด', reportData.overview.totalUsers]);
    overviewSheet.addRow(['จำนวนอุปกรณ์ทั้งหมด', reportData.overview.totalEquipment]);
    overviewSheet.addRow(['อัตราการใช้งานอุปกรณ์ (%)', reportData.overview.equipmentUtilization]);
    overviewSheet.addRow(['ระยะเวลายืมเฉลี่ย (วัน)', parseFloat(reportData.overview.averageBorrowDays || 0).toFixed(1)]);
    overviewSheet.addRow(['อัตราการใช้เครดิต (%)', reportData.overview.creditUsage]);
    formatWorksheet(overviewSheet, [35, 20]);

    // Sheet 2: Top Equipment
    if (reportData.topEquipment && reportData.topEquipment.length > 0) {
      const topEquipmentSheet = workbook.addWorksheet('อุปกรณ์ยอดนิยม');
      topEquipmentSheet.addRow(['อุปกรณ์ยอดนิยม']);
      topEquipmentSheet.addRow([]);
      topEquipmentSheet.addRow(['อันดับ', 'ชื่ออุปกรณ์', 'หมวดหมู่', 'จำนวนครั้งที่ยืม']);
      
      reportData.topEquipment.forEach((item, index) => {
        topEquipmentSheet.addRow([
          index + 1,
          item.equipment_name,
          item.type_name || '-',
          item.borrow_count
        ]);
      });
      
      formatWorksheet(topEquipmentSheet, [12, 40, 25, 20]);
    }

    // Sheet 3: Equipment Usage by Category
    if (reportData.equipmentUsage && reportData.equipmentUsage.length > 0) {
      const categorySheet = workbook.addWorksheet('การใช้งานตามหมวดหมู่');
      categorySheet.addRow(['สถิติการใช้งานตามหมวดหมู่']);
      categorySheet.addRow([]);
      categorySheet.addRow(['หมวดหมู่', 'จำนวนครั้ง', 'เปอร์เซ็นต์']);
      
      const total = reportData.equipmentUsage.reduce((sum, item) => sum + item.count, 0);
      
      reportData.equipmentUsage.forEach((item) => {
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(2) : 0;
        categorySheet.addRow([
          item.category,
          item.count,
          `${percentage}%`
        ]);
      });
      
      formatWorksheet(categorySheet, [30, 20, 20]);
    }

    // Sheet 4: Borrowing Trends
    if (reportData.borrowingTrends && reportData.borrowingTrends.length > 0) {
      const trendsSheet = workbook.addWorksheet('แนวโน้มการยืม');
      trendsSheet.addRow(['แนวโน้มการยืม-คืน']);
      trendsSheet.addRow([]);
      trendsSheet.addRow(['วันที่', 'จำนวนการยืม', 'จำนวนการคืน', 'กำลังดำเนินการ']);
      
      reportData.borrowingTrends.forEach((item) => {
        trendsSheet.addRow([
          item.date || item.month || '-',
          item.borrowings || 0,
          item.returns || 0,
          item.active || 0
        ]);
      });
      
      formatWorksheet(trendsSheet, [20, 20, 20, 20]);
    }

    // Sheet 5: User Activity
    if (reportData.userActivity && reportData.userActivity.length > 0) {
      const userActivitySheet = workbook.addWorksheet('กิจกรรมผู้ใช้');
      userActivitySheet.addRow(['สรุปกิจกรรมผู้ใช้งาน']);
      userActivitySheet.addRow([]);
      userActivitySheet.addRow(['ชื่อผู้ใช้', 'ยืมทั้งหมด', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'เกินกำหนด']);
      
      reportData.userActivity.forEach((item) => {
        userActivitySheet.addRow([
          item.user_name || '-',
          item.total_borrowings || 0,
          item.active_borrowings || 0,
          item.completed_borrowings || 0,
          item.overdue_count || 0
        ]);
      });
      
      formatWorksheet(userActivitySheet, [30, 18, 18, 18, 18]);
    }

    // Sheet 6: Top Disbursement Equipment
    if (reportData.topDisbursementEquipment && reportData.topDisbursementEquipment.length > 0) {
      const topDisbursementSheet = workbook.addWorksheet('อุปกรณ์เบิกมากสุด');
      topDisbursementSheet.addRow(['อุปกรณ์ที่ถูกเบิกมากที่สุด']);
      topDisbursementSheet.addRow([]);
      topDisbursementSheet.addRow(['อันดับ', 'ชื่ออุปกรณ์', 'หมวดหมู่', 'จำนวนครั้ง', 'รวมจำนวน']);
      
      reportData.topDisbursementEquipment.forEach((item, index) => {
        topDisbursementSheet.addRow([
          index + 1,
          item.equipment_name || '-',
          item.type_name || '-',
          item.disbursement_count || 0,
          item.total_quantity_disbursed || 0
        ]);
      });
      
      formatWorksheet(topDisbursementSheet, [12, 35, 25, 18, 18]);
    }

    // Sheet 7: Top Disbursement Users
    if (reportData.topDisbursementUsers && reportData.topDisbursementUsers.length > 0) {
      const topUsersSheet = workbook.addWorksheet('ผู้ใช้เบิกมากสุด');
      topUsersSheet.addRow(['ผู้ใช้ที่เบิกจ่ายมากที่สุด']);
      topUsersSheet.addRow([]);
      topUsersSheet.addRow(['ชื่อผู้ใช้', 'เบิกทั้งหมด', 'จำนวนรวม', 'รออนุมัติ', 'อนุมัติแล้ว', 'เสร็จสิ้น']);
      
      reportData.topDisbursementUsers.forEach((item) => {
        topUsersSheet.addRow([
          item.user_name || '-',
          item.total_disbursements || 0,
          item.total_quantity || 0,
          item.pending_requests || 0,
          item.approved_requests || 0,
          item.completed_requests || 0
        ]);
      });
      
      formatWorksheet(topUsersSheet, [30, 18, 18, 18, 18, 18]);
    }

    // Sheet 8: Disbursement Trends
    if (reportData.disbursementTrends && reportData.disbursementTrends.length > 0) {
      const disbursementTrendsSheet = workbook.addWorksheet('แนวโน้มการเบิก');
      disbursementTrendsSheet.addRow(['แนวโน้มการเบิกจ่าย']);
      disbursementTrendsSheet.addRow([]);
      disbursementTrendsSheet.addRow(['วันที่', 'คำขอทั้งหมด', 'รออนุมัติ', 'อนุมัติแล้ว', 'เสร็จสิ้น', 'จำนวนรวม']);
      
      reportData.disbursementTrends.forEach((item) => {
        disbursementTrendsSheet.addRow([
          item.date || '-',
          item.total_requests || 0,
          item.pending || 0,
          item.approved || 0,
          item.completed || 0,
          item.total_quantity || 0
        ]);
      });
      
      formatWorksheet(disbursementTrendsSheet, [20, 18, 18, 18, 18, 18]);
    }

    // เขียน workbook เป็น buffer
    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw error;
  }
};

/**
 * สร้าง Excel รายงานสำหรับ User
 */
const generateUserReportExcel = async (reportData, dateRange, userData) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('สรุป');
    summarySheet.addRow(['รายงานกิจกรรมส่วนบุคคล']);
    summarySheet.addRow([`ผู้ใช้: ${userData.name || 'ไม่ระบุ'}`]);
    summarySheet.addRow([`ช่วงเวลา: ${getRangeName(dateRange)}`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['หัวข้อ', 'ค่า']);

    if (reportData.overview) {
      summarySheet.addRow(['จำนวนการยืมทั้งหมด', reportData.overview.total_borrowings || 0]);
      summarySheet.addRow(['กำลังยืมอยู่', reportData.overview.active_borrowings || 0]);
      summarySheet.addRow(['ยืมเสร็จสิ้นแล้ว', reportData.overview.completed_borrowings || 0]);
      summarySheet.addRow(['เกินกำหนดคืน', reportData.overview.overdue_count || 0]);
      summarySheet.addRow(['เครดิตปัจจุบัน', reportData.overview.current_credit || 0]);
    }

    if (reportData.performance_metrics) {
      summarySheet.addRow([]);
      summarySheet.addRow(['ประสิทธิภาพ', '']);
      summarySheet.addRow(['คะแนนโดยรวม (%)', reportData.performance_metrics.overall_rating || 0]);
      summarySheet.addRow(['อัตราคืนตรงเวลา (%)', reportData.performance_metrics.on_time_rate || 0]);
      summarySheet.addRow(['อันดับ', `${reportData.performance_metrics.rank_position || 0}/${reportData.performance_metrics.total_users || 0}`]);
    }

    formatWorksheet(summarySheet, [35, 20]);

    // Sheet 2: Borrowing History
    if (reportData.borrowing_history && reportData.borrowing_history.length > 0) {
      const historySheet = workbook.addWorksheet('ประวัติการยืม');
      historySheet.addRow(['ประวัติการยืม']);
      historySheet.addRow([]);
      historySheet.addRow(['อุปกรณ์', 'วันที่ยืม', 'กำหนดคืน', 'วันที่คืน', 'สถานะ', 'ระยะเวลา (วัน)']);

      reportData.borrowing_history.forEach((item) => {
        historySheet.addRow([
          item.equipment_name || '-',
          item.borrow_date ? new Date(item.borrow_date).toLocaleDateString('th-TH') : '-',
          item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString('th-TH') : '-',
          item.return_date ? new Date(item.return_date).toLocaleDateString('th-TH') : 'ยังไม่คืน',
          item.status || '-',
          item.days_borrowed || 0
        ]);
      });

      formatWorksheet(historySheet, [25, 18, 18, 18, 15, 15]);
    }

    // Sheet 3: Disbursement History
    if (reportData.disbursement_history && reportData.disbursement_history.length > 0) {
      const disbursementSheet = workbook.addWorksheet('ประวัติการเบิก');
      disbursementSheet.addRow(['ประวัติการเบิกจ่าย']);
      disbursementSheet.addRow([]);
      disbursementSheet.addRow(['อุปกรณ์', 'วันที่ขอ', 'วันที่เบิก', 'จำนวนขอ', 'เบิกจริง', 'สถานะ', 'วัตถุประสงค์']);

      reportData.disbursement_history.forEach((item) => {
        disbursementSheet.addRow([
          item.equipment_name || '-',
          item.request_date ? new Date(item.request_date).toLocaleDateString('th-TH') : '-',
          item.disbursement_date ? new Date(item.disbursement_date).toLocaleDateString('th-TH') : 'ยังไม่ได้เบิก',
          item.quantity_requested || 0,
          item.quantity_disbursed || 0,
          item.status || '-',
          item.purpose || '-'
        ]);
      });

      formatWorksheet(disbursementSheet, [25, 18, 18, 15, 15, 15, 30]);
    }

    // เขียน workbook เป็น buffer
    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw error;
  }
};

/**
 * สร้าง Excel รายการคลังอุปกรณ์
 */
const generateInventoryExcel = async (equipmentList) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // แยกอุปกรณ์ตามประเภท
    const loanEquipment = equipmentList.filter(eq => eq.usage_type === 'Loan');
    const disbursementEquipment = equipmentList.filter(eq => eq.usage_type === 'Disbursement');

    const statusThai = {
      'Available': 'พร้อมใช้งาน',
      'Borrowed': 'ถูกยืม',
      'Maintenance': 'ซ่อมบำรุง',
      'Damaged': 'ชำรุด',
      'Lost': 'สูญหาย',
      'Repairing': 'อยู่ระหว่างซ่อมบำรุง',
      'Reserved': 'สำรอง'
    };

    // Sheet 1: อุปกรณ์ยืม-คืน
    const loanSheet = workbook.addWorksheet('ยืม-คืน');
    loanSheet.addRow(['รายงานคลังอุปกรณ์ - ประเภทยืม-คืน']);
    loanSheet.addRow([`วันที่: ${new Date().toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`]);
    loanSheet.addRow([]);
    loanSheet.addRow(['รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'รุ่น', 'ประเภท', 'สถานะ', 'เครดิต/วัน', 'จำนวนทั้งหมด', 'พร้อมใช้งาน', 'ถูกยืม', 'ซ่อมบำรุง', 'ชำรุด']);

    loanEquipment.forEach(equipment => {
      loanSheet.addRow([
        equipment.equipment_id || '-',
        equipment.equipment_name || '-',
        equipment.model || '-',
        equipment.type_name || '-',
        statusThai[equipment.status] || equipment.status || '-',
        equipment.credit || 0,
        equipment.quantity || 0,
        equipment.available_quantity || 0,
        equipment.borrowed_quantity || 0,
        equipment.maintenance_quantity || 0,
        equipment.damaged_quantity || 0
      ]);
    });

    formatWorksheet(loanSheet, [15, 30, 20, 20, 18, 12, 12, 12, 12, 12, 12]);

    // Sheet 2: อุปกรณ์เบิกจ่าย
    const disbursementSheet = workbook.addWorksheet('เบิกจ่าย');
    disbursementSheet.addRow(['รายงานคลังอุปกรณ์ - ประเภทเบิกจ่าย']);
    disbursementSheet.addRow([`วันที่: ${new Date().toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`]);
    disbursementSheet.addRow([]);
    disbursementSheet.addRow(['รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'รุ่น', 'ประเภท', 'สถานะ', 'เครดิต/วัน', 'จำนวนทั้งหมด', 'พร้อมใช้งาน', 'ถูกยืม', 'ซ่อมบำรุง', 'ชำรุด']);

    disbursementEquipment.forEach(equipment => {
      disbursementSheet.addRow([
        equipment.equipment_id || '-',
        equipment.equipment_name || '-',
        equipment.model || '-',
        equipment.type_name || '-',
        statusThai[equipment.status] || equipment.status || '-',
        equipment.credit || 0,
        equipment.quantity || 0,
        equipment.available_quantity || 0,
        equipment.borrowed_quantity || 0,
        equipment.maintenance_quantity || 0,
        equipment.damaged_quantity || 0
      ]);
    });

    formatWorksheet(disbursementSheet, [15, 30, 20, 20, 18, 12, 12, 12, 12, 12, 12]);

    // Sheet 3: สรุปรวม
    const summarySheet = workbook.addWorksheet('สรุปรวม');
    summarySheet.addRow(['สรุปรวมคลังอุปกรณ์']);
    summarySheet.addRow([`วันที่: ${new Date().toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['ประเภท', 'จำนวนรายการ', 'จำนวนทั้งหมด', 'พร้อมใช้งาน', 'ถูกยืม', 'ซ่อมบำรุง', 'ชำรุด']);
    summarySheet.addRow([
      'ยืม-คืน',
      loanEquipment.length,
      loanEquipment.reduce((sum, eq) => sum + (parseInt(eq.quantity) || 0), 0),
      loanEquipment.reduce((sum, eq) => sum + (parseInt(eq.available_quantity) || 0), 0),
      loanEquipment.reduce((sum, eq) => sum + (parseInt(eq.borrowed_quantity) || 0), 0),
      loanEquipment.reduce((sum, eq) => sum + (parseInt(eq.maintenance_quantity) || 0), 0),
      loanEquipment.reduce((sum, eq) => sum + (parseInt(eq.damaged_quantity) || 0), 0)
    ]);
    summarySheet.addRow([
      'เบิกจ่าย',
      disbursementEquipment.length,
      disbursementEquipment.reduce((sum, eq) => sum + (parseInt(eq.quantity) || 0), 0),
      disbursementEquipment.reduce((sum, eq) => sum + (parseInt(eq.available_quantity) || 0), 0),
      disbursementEquipment.reduce((sum, eq) => sum + (parseInt(eq.borrowed_quantity) || 0), 0),
      disbursementEquipment.reduce((sum, eq) => sum + (parseInt(eq.maintenance_quantity) || 0), 0),
      disbursementEquipment.reduce((sum, eq) => sum + (parseInt(eq.damaged_quantity) || 0), 0)
    ]);
    summarySheet.addRow([
      'รวมทั้งหมด',
      equipmentList.length,
      equipmentList.reduce((sum, eq) => sum + (parseInt(eq.quantity) || 0), 0),
      equipmentList.reduce((sum, eq) => sum + (parseInt(eq.available_quantity) || 0), 0),
      equipmentList.reduce((sum, eq) => sum + (parseInt(eq.borrowed_quantity) || 0), 0),
      equipmentList.reduce((sum, eq) => sum + (parseInt(eq.maintenance_quantity) || 0), 0),
      equipmentList.reduce((sum, eq) => sum + (parseInt(eq.damaged_quantity) || 0), 0)
    ]);

    formatWorksheet(summarySheet, [20, 15, 15, 15, 12, 12, 12]);

    // เขียน workbook เป็น buffer
    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('Error generating inventory Excel:', error);
    throw error;
  }
};

module.exports = {
  generateAdminReportExcel,
  generateUserReportExcel,
  generateInventoryExcel
};
