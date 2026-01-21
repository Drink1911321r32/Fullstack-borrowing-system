let React, renderToStream, Font, Document, Page, Text, View, StyleSheet;
let isInitialized = false;

// Dynamic import for ES Module
async function initializePDFLibrary() {
  if (isInitialized) return;
  
  const ReactModule = await import('react');
  React = ReactModule.default;
  
  const PDFModule = await import('@react-pdf/renderer');
  renderToStream = PDFModule.renderToStream;
  Font = PDFModule.Font;
  Document = PDFModule.Document;
  Page = PDFModule.Page;
  Text = PDFModule.Text;
  View = PDFModule.View;
  StyleSheet = PDFModule.StyleSheet;
  
  const path = require('path');

  // ลงทะเบียนฟอนต์ภาษาไทย - ใช้ Noto Sans Thai ซึ่งรองรับอักขระไทยครบถ้วนที่สุด
  Font.register({
    family: 'NotoSansThai',
    fonts: [
      {
        src: path.join(__dirname, '../fonts/NotoSansThai-Regular.ttf'),
        fontStyle: 'normal',
        fontWeight: 'normal'
      },
      {
        src: path.join(__dirname, '../fonts/NotoSansThai-Bold.ttf'),
        fontStyle: 'normal',
        fontWeight: 'bold'
      }
    ]
  });

  // Register hyphenation callback for Thai - ป้องกันการตัดคำ
  Font.registerHyphenationCallback(word => [word]);

  // Register emoji fonts for better Unicode support
  Font.registerEmojiSource({
    format: 'png',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
  });
  
  isInitialized = true;
}

/**
 * สร้าง PDF รายงานสำหรับ Admin ด้วย @react-pdf/renderer
 */
const generateAdminReportPDF = async (reportData, dateRange) => {
  await initializePDFLibrary();
  try {
    const AdminPDF = () =>
      React.createElement(
        Document,
        {},
        // Page 1 - Overview and Top Equipment
        React.createElement(
          Page,
          { 
            size: 'A4',
            style: { 
              padding: 50,
              fontFamily: 'NotoSansThai',
              fontSize: 18
            }
          },
          // Header
          React.createElement(
            View,
            { style: { textAlign: 'center', marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 22, fontWeight: 'bold' } }, 'รายงานผู้ดูแลระบบ - สรุปสถิติระบบ'),
            React.createElement(Text, { style: { fontSize: 14, marginTop: 5 } }, `ช่วงเวลา: ${dateRange}`)
          ),
          // Divider
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 15 } }),
          // Overview
          React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 } }, 'ภาพรวม'),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `จำนวนการยืมทั้งหมด: ${reportData.overview?.totalBorrowings || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `การยืมที่กำลังดำเนินการ: ${reportData.overview?.activeBorrowings || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `การยืมที่เกินกำหนด: ${reportData.overview?.overdueBorrowings || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `จำนวนผู้ใช้ทั้งหมด: ${reportData.overview?.totalUsers || 0} คน`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `จำนวนอุปกรณ์ทั้งหมด: ${reportData.overview?.totalEquipment || 0} ชิ้น`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `อัตราการใช้งานอุปกรณ์: ${reportData.overview?.equipmentUtilization || 0}%`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 14 } }, `ระยะเวลาเฉลี่ยในการยืม: ${reportData.overview?.averageBorrowDays || 0} วัน`)
          ),
          // Top Equipment
          reportData.topEquipment && reportData.topEquipment.length > 0 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 } }, 'อุปกรณ์ยอดนิยม'),
            reportData.topEquipment.slice(0, 15).map((item, idx) =>
              React.createElement(Text, { key: idx, style: { marginBottom: 4, fontSize: 15 } }, `${idx + 1}. ${item.equipment_name} (${item.type_name || 'ไม่ระบุประเภท'}) - ${item.borrow_count} ครั้ง`)
            )
          ) : null,
          // Equipment by Category
          reportData.equipmentUsage && reportData.equipmentUsage.length > 0 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, 'การใช้งานอุปกรณ์แยกตามประเภท'),
            reportData.equipmentUsage.map((item, idx) =>
              React.createElement(Text, { key: idx, style: { marginBottom: 4, fontSize: 15 } }, `${item.category}: ${item.count} ครั้ง`)
            )
          ) : null,
          // Footer
          React.createElement(
            Text,
            { 
              style: { 
                position: 'absolute',
                bottom: 30,
                left: 50,
                right: 50,
                textAlign: 'center',
                fontSize: 12
              }
            },
            'หน้า 1'
          )
        ),
        // Page 2 - User Activity
        reportData.userActivity && reportData.userActivity.length > 0 ? React.createElement(
          Page,
          { 
            size: 'A4',
            style: { 
              padding: 50,
              fontFamily: 'NotoSansThai',
              fontSize: 15
            }
          },
          React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, 'กิจกรรมผู้ใช้งานมากที่สุด'),
            reportData.userActivity.map((item, idx) =>
              React.createElement(
                View,
                { key: idx, style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 14 } }, `${idx + 1}. ${item.user_name}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 15 } }, `   ยืมทั้งหมด: ${item.total_borrowings} ครั้ง | กำลังยืม: ${item.active_borrowings} | เสร็จสิ้น: ${item.completed_borrowings} | เกินกำหนด: ${item.overdue_count}`)
              )
            )
          ),
          // Footer
          React.createElement(
            Text,
            { 
              style: { 
                position: 'absolute',
                bottom: 30,
                left: 50,
                right: 50,
                textAlign: 'center',
                fontSize: 12
              }
            },
            'หน้า 2'
          )
        ) : null,
        // Page 3 - Disbursement Statistics
        (reportData.topDisbursementEquipment && reportData.topDisbursementEquipment.length > 0) || 
        (reportData.topDisbursementUsers && reportData.topDisbursementUsers.length > 0) ? React.createElement(
          Page,
          { 
            size: 'A4',
            style: { 
              padding: 50,
              fontFamily: 'NotoSansThai',
              fontSize: 15
            }
          },
          // Top Disbursement Equipment
          reportData.topDisbursementEquipment && reportData.topDisbursementEquipment.length > 0 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, 'อุปกรณ์ที่ถูกเบิกมากที่สุด'),
            reportData.topDisbursementEquipment.slice(0, 15).map((item, idx) =>
              React.createElement(Text, { key: idx, style: { marginBottom: 4, fontSize: 15 } }, 
                `${idx + 1}. ${item.equipment_name} (${item.type_name || 'ไม่ระบุประเภท'}) - ${item.disbursement_count} ครั้ง, รวม ${item.total_quantity_disbursed} ชิ้น`
              )
            )
          ) : null,
          // Top Disbursement Users
          reportData.topDisbursementUsers && reportData.topDisbursementUsers.length > 0 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, 'ผู้ใช้ที่เบิกจ่ายมากที่สุด'),
            reportData.topDisbursementUsers.map((item, idx) =>
              React.createElement(
                View,
                { key: idx, style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 14 } }, `${idx + 1}. ${item.user_name}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 15 } }, 
                  `   เบิกทั้งหมด: ${item.total_disbursements} ครั้ง | จำนวน: ${item.total_quantity} ชิ้น | รออนุมัติ: ${item.pending_requests} | อนุมัติ: ${item.approved_requests} | เสร็จสิ้น: ${item.completed_requests}`
                )
              )
            )
          ) : null,
          // Footer
          React.createElement(
            Text,
            { 
              style: { 
                position: 'absolute',
                bottom: 30,
                left: 50,
                right: 50,
                textAlign: 'center',
                fontSize: 12
              }
            },
            `หน้า 3 - สร้างเมื่อ ${new Date().toLocaleString('th-TH')}`
          )
        ) : null
      );

    return new Promise((resolve, reject) => {
      renderToStream(AdminPDF()).then((stream) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        stream.on('error', reject);
      }).catch(reject);
    });
  } catch (error) {
    console.error('❌ Error generating Admin PDF:', error.message);
    throw error;
  }
};

/**
 * สร้าง PDF รายงานสำหรับ User ด้วย @react-pdf/renderer
 */
const generateUserReportPDF = async (reportData, dateRange, userData) => {
  await initializePDFLibrary();
  try {
    const UserPDF = () =>
      React.createElement(
        Document,
        {},
        // Page 1
        React.createElement(
          Page,
          { 
            size: 'A4',
            style: { 
              padding: 50,
              fontFamily: 'NotoSansThai',
              fontSize: 13
            }
          },
          // Header
          React.createElement(
            View,
            { style: { textAlign: 'center', marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 20, fontWeight: 'bold' } }, 'รายงานกิจกรรมผู้ใช้'),
            React.createElement(Text, { style: { fontSize: 13, marginTop: 5 } }, `ผู้ใช้: ${userData?.name || 'ไม่ระบุ'}`),
            React.createElement(Text, { style: { fontSize: 13 } }, `ช่วงเวลา: ${dateRange}`)
          ),
          // Divider
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 15 } }),
          // Summary
          React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 } }, 'สรุป'),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `จำนวนการยืมทั้งหมด: ${Number(reportData.overview?.total_borrowings) || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `การยืมที่กำลังดำเนินการ: ${Number(reportData.overview?.active_borrowings) || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `การยืมที่เสร็จสมบูรณ์: ${Number(reportData.overview?.completed_borrowings) || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `จำนวนครั้งที่เกินกำหนด: ${Number(reportData.overview?.overdue_count) || 0} ครั้ง`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `เครดิตปัจจุบัน: ${Number(reportData.overview?.current_credit) || 0} คะแนน`)
          ),
          // Performance
          reportData.performance_metrics ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 } }, 'ประสิทธิภาพการใช้งาน'),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `คะแนนรวม: ${reportData.performance_metrics.overall_rating || 0}%`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `อัตราการคืนตรงเวลา: ${reportData.performance_metrics.on_time_rate || 0}%`),
            React.createElement(Text, { style: { marginBottom: 5, fontSize: 13 } }, `อันดับ: ${reportData.performance_metrics.rank_position || 0}/${reportData.performance_metrics.total_users || 0}`)
          ) : null,
          // Borrowing History (first 5 items)
          reportData.borrowing_history && reportData.borrowing_history.length > 0 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 } }, 'ประวัติการยืม'),
            reportData.borrowing_history.slice(0, 5).map((item, idx) =>
              React.createElement(
                View,
                { key: idx, style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 13, flexWrap: 'wrap' } }, `${idx + 1}. ${item.equipment_name}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่ยืม: ${new Date(item.borrow_date).toLocaleDateString('th-TH')}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่คืน: ${item.return_date ? new Date(item.return_date).toLocaleDateString('th-TH') : 'ยังไม่คืน'}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   สถานะ: ${item.status}`)
              )
            )
          ) : null,
          // Disbursement History (first 5 items)
          reportData.disbursement_history && reportData.disbursement_history.length > 0 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 } }, 'ประวัติการเบิกจ่าย'),
            reportData.disbursement_history.slice(0, 5).map((item, idx) =>
              React.createElement(
                View,
                { key: idx, style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 13, flexWrap: 'wrap' } }, `${idx + 1}. ${item.equipment_name}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่ขอ: ${new Date(item.request_date).toLocaleDateString('th-TH')}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่เบิก: ${item.disbursement_date ? new Date(item.disbursement_date).toLocaleDateString('th-TH') : 'ยังไม่ได้เบิก'}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   จำนวนขอ: ${item.quantity_requested} | เบิกจริง: ${item.quantity_disbursed || 0} | สถานะ: ${item.status}`)
              )
            )
          ) : null,
          // Footer
          React.createElement(
            Text,
            { 
              style: { 
                position: 'absolute',
                bottom: 30,
                left: 50,
                right: 50,
                textAlign: 'center',
                fontSize: 12
              }
            },
            'หน้า 1'
          )
        ),
        // Page 2 - Continuing Borrowing History and Disbursement History
        reportData.borrowing_history && reportData.borrowing_history.length > 5 ||
        reportData.disbursement_history && reportData.disbursement_history.length > 5 ? React.createElement(
          Page,
          { 
            size: 'A4',
            style: { 
              padding: 50,
              fontFamily: 'NotoSansThai',
              fontSize: 13
            }
          },
          // Continuing Borrowing History
          reportData.borrowing_history && reportData.borrowing_history.length > 5 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 } }, 'ประวัติการยืม (ต่อ)'),
            reportData.borrowing_history.slice(5).map((item, idx) =>
              React.createElement(
                View,
                { key: idx, style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 13, flexWrap: 'wrap' } }, `${idx + 6}. ${item.equipment_name}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่ยืม: ${new Date(item.borrow_date).toLocaleDateString('th-TH')}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่คืน: ${item.return_date ? new Date(item.return_date).toLocaleDateString('th-TH') : 'ยังไม่คืน'}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   สถานะ: ${item.status}`)
              )
            )
          ) : null,
          // Continuing Disbursement History
          reportData.disbursement_history && reportData.disbursement_history.length > 5 ? React.createElement(
            View,
            { style: { marginBottom: 20 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 } }, 'ประวัติการเบิกจ่าย (ต่อ)'),
            reportData.disbursement_history.slice(5).map((item, idx) =>
              React.createElement(
                View,
                { key: idx, style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 13, flexWrap: 'wrap' } }, `${idx + 6}. ${item.equipment_name}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่ขอ: ${new Date(item.request_date).toLocaleDateString('th-TH')}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   วันที่เบิก: ${item.disbursement_date ? new Date(item.disbursement_date).toLocaleDateString('th-TH') : 'ยังไม่ได้เบิก'}`),
                React.createElement(Text, { style: { marginBottom: 2, fontSize: 12 } }, `   จำนวนขอ: ${item.quantity_requested} | เบิกจริง: ${item.quantity_disbursed || 0} | สถานะ: ${item.status}`)
              )
            )
          ) : null,
          // Footer
          React.createElement(
            Text,
            { 
              style: { 
                position: 'absolute',
                bottom: 30,
                left: 50,
                right: 50,
                textAlign: 'center',
                fontSize: 12
              }
            },
            `หน้า 2 - สร้างเมื่อ ${new Date().toLocaleString('th-TH')}`
          )
        ) : null
      );

    return new Promise((resolve, reject) => {
      renderToStream(UserPDF()).then((stream) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        stream.on('error', reject);
      }).catch(reject);
    });
  } catch (error) {
    console.error('❌ Error generating User PDF:', error.message);
    throw error;
  }
};

module.exports = {
  generateAdminReportPDF,
  generateUserReportPDF
};
