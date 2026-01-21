const nodemailer = require('nodemailer');

/**
 * Email Service สำหรับส่งอีเมล
 * ใช้ Nodemailer + Gmail
 * 
 * ⚠️ ต้องตั้งค่า Environment Variables ใน .env:
 * EMAIL_USER=your-email@gmail.com
 * EMAIL_PASSWORD=your-app-password (ไม่ใช่รหัสผ่านปกติ)
 * 
 * วิธีสร้าง Gmail App Password:
 * 1. ไปที่ https://myaccount.google.com/security
 * 2. เปิด 2-Step Verification
 * 3. ไปที่ App passwords
 * 4. สร้าง password ใหม่สำหรับ app นี้
 */

// สร้าง transporter สำหรับส่งอีเมล (แก้ไขจาก nodemailer.createTransporter)
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  return transporter;
};

/**
 * ส่งอีเมลรีเซ็ตรหัสผ่าน
 * @param {string} to - อีเมลผู้รับ
 * @param {string} resetToken - Token สำหรับรีเซ็ตรหัสผ่าน
 * @param {string} userName - ชื่อผู้ใช้
 */
const sendPasswordResetEmail = async (to, resetToken, userName = '') => {
  try {
    // ตรวจสอบว่ามีการตั้งค่า email credentials หรือไม่
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Email will not be sent.');
      return {
        success: false,
        message: 'Email service not configured'
      };
    }

    const transporter = createTransporter();
    
    // URL สำหรับรีเซ็ตรหัสผ่าน (ปรับตาม frontend URL ของคุณ)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    
    // HTML template สำหรับอีเมล
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #764ba2; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 รีเซ็ตรหัสผ่าน</h1>
          </div>
          <div class="content">
            <p>สวัสดี${userName ? ` คุณ${userName}` : ''},</p>
            <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ หากคุณเป็นผู้ขอ กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">รีเซ็ตรหัสผ่าน</a>
            </div>
            
            <p>หรือคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์:</p>
            <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⏰ ข้อมูลสำคัญ:</strong>
              <ul>
                <li>ลิงก์นี้จะหมดอายุใน <strong>30 นาที</strong></li>
                <li>ใช้ได้เพียงครั้งเดียวเท่านั้น</li>
                <li>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน โปรดเพิกเฉยอีเมลนี้</li>
              </ul>
            </div>
            
            <p>ขอบคุณ,<br>ทีมงานระบบ</p>
          </div>
          <div class="footer">
            <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            <p>&copy; ${new Date().getFullYear()} Equipment Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ตัวเลือกการส่งอีเมล
    const mailOptions = {
      from: `"ระบบจัดการอุปกรณ์" <${process.env.EMAIL_USER}>`,
      to,
      subject: '🔐 รีเซ็ตรหัสผ่านของคุณ',
      html: htmlContent,
      // Text version (สำหรับ email clients ที่ไม่รองรับ HTML)
      text: `
        รีเซ็ตรหัสผ่าน
        
        สวัสดี${userName ? ` คุณ${userName}` : ''},
        
        เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ
        
        กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:
        ${resetUrl}
        
        ลิงก์นี้จะหมดอายุใน 30 นาที
        
        หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน โปรดเพิกเฉยอีเมลนี้
        
        ขอบคุณ,
        ทีมงานระบบ
      `
    };

    // ส่งอีเมล
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send email'
    };
  }
};

/**
 * ส่งอีเมลแจ้งเตือนใกล้ครบกำหนดคืน
 * @param {string} to - อีเมลผู้รับ
 * @param {object} data - ข้อมูลการยืม
 * @param {string} data.userName - ชื่อผู้ยืม
 * @param {string} data.equipmentName - ชื่ออุปกรณ์
 * @param {number} data.daysRemaining - จำนวนวันที่เหลือ
 * @param {string} data.returnDate - วันที่ต้องคืน
 * @param {number} data.transactionId - รหัสธุรกรรม
 */
const sendReturnReminderEmail = async (to, data) => {
  try {
    // ตรวจสอบว่ามีการตั้งค่า email credentials หรือไม่
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Email will not be sent.');
      return {
        success: false,
        message: 'Email service not configured'
      };
    }

    const transporter = createTransporter();
    const { userName, equipmentName, daysRemaining, returnDate, transactionId } = data;
    
    // สร้าง HTML template สำหรับอีเมล
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .highlight { color: #d32f2f; font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ แจ้งเตือน: ใกล้ครบกำหนดคืนอุปกรณ์</h1>
          </div>
          <div class="content">
            <p>สวัสดีคุณ${userName},</p>
            <p>ระบบขอเตือนว่าอุปกรณ์ที่คุณยืมกำลังจะครบกำหนดคืน</p>
            
            <div class="warning-box">
              <strong>📦 อุปกรณ์:</strong> ${equipmentName}<br>
              <strong>📅 วันที่ต้องคืน:</strong> ${new Date(returnDate).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}<br>
              <strong class="highlight">⏳ เหลือเวลาอีก: ${daysRemaining} วัน</strong>
            </div>
            
            <div class="info-box">
              <strong>💡 ข้อมูลสำคัญ:</strong>
              <ul>
                <li>กรุณาคืนอุปกรณ์ภายในวันและเวลาที่กำหนด</li>
                <li>การคืนล่าช้าจะมีการหักค่าปรับตามระเบียบ</li>
                <li>ตรวจสอบสภาพอุปกรณ์ก่อนคืนทุกครั้ง</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/history" class="button">ดูรายละเอียดการยืม</a>
            </div>
            
            <p>หากมีข้อสงสัยหรือไม่สามารถคืนได้ตามกำหนด กรุณาติดต่อเจ้าหน้าที่โดยเร็ว</p>
            <p>ขอบคุณที่ใช้บริการ,<br>ทีมงานระบบจัดการอุปกรณ์</p>
          </div>
          <div class="footer">
            <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            <p>&copy; ${new Date().getFullYear()} Equipment Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ตัวเลือกการส่งอีเมล
    const mailOptions = {
      from: `"ระบบจัดการอุปกรณ์" <${process.env.EMAIL_USER}>`,
      to,
      subject: `⏰ แจ้งเตือน: ${equipmentName} ครบกำหนดคืนในอีก ${daysRemaining} วัน`,
      html: htmlContent,
      text: `
        แจ้งเตือนใกล้ครบกำหนดคืนอุปกรณ์
        
        สวัสดีคุณ${userName},
        
        อุปกรณ์: ${equipmentName}
        วันที่ต้องคืน: ${new Date(returnDate).toLocaleDateString('th-TH')}
        เหลือเวลาอีก: ${daysRemaining} วัน
        
        กรุณาคืนอุปกรณ์ภายในวันและเวลาที่กำหนด
        การคืนล่าช้าจะมีการหักค่าปรับตามระเบียบ
        
        ขอบคุณ,
        ทีมงานระบบจัดการอุปกรณ์
      `
    };

    // ส่งอีเมล
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Return reminder email sent to ${to}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Reminder email sent successfully'
    };
    
  } catch (error) {
    console.error('❌ Error sending return reminder email:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send reminder email'
    };
  }
};

/**
 * ส่งอีเมลแจ้งเตือนเกินกำหนดคืน
 * @param {string} to - อีเมลผู้รับ
 * @param {object} data - ข้อมูลการยืม
 */
const sendOverdueEmail = async (to, data) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Email will not be sent.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();
    const { userName, equipmentName, daysOverdue, returnDate, transactionId } = data;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .danger-box { background: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 15px 30px; background: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .highlight { color: #d32f2f; font-weight: bold; font-size: 1.3em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 เกินกำหนดคืนอุปกรณ์</h1>
          </div>
          <div class="content">
            <p>สวัสดีคุณ${userName},</p>
            <p><strong>อุปกรณ์ที่คุณยืมเกินกำหนดคืนแล้ว กรุณาดำเนินการคืนโดยด่วน</strong></p>
            
            <div class="danger-box">
              <strong>📦 อุปกรณ์:</strong> ${equipmentName}<br>
              <strong>📅 กำหนดคืน:</strong> ${new Date(returnDate).toLocaleDateString('th-TH')}<br>
              <strong class="highlight">⚠️ เกินกำหนด: ${daysOverdue} วัน</strong><br>
              <strong style="color: #d32f2f;">💰 กำลังมีการคิดค่าปรับ</strong>
            </div>
            
            <p><strong>โปรดดำเนินการ:</strong></p>
            <ul>
              <li>คืนอุปกรณ์โดยเร็วที่สุด</li>
              <li>ติดต่อเจ้าหน้าที่หากมีปัญหา</li>
              <li>ตรวจสอบค่าปรับที่อาจเกิดขึ้น</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/history" class="button">ดูรายละเอียด</a>
            </div>
            
            <p>ขอบคุณ,<br>ทีมงานระบบจัดการอุปกรณ์</p>
          </div>
          <div class="footer">
            <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"ระบบจัดการอุปกรณ์" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🚨 เกินกำหนดคืน: ${equipmentName} (${daysOverdue} วัน)`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Overdue email sent to ${to}:`, info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending overdue email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ทดสอบการเชื่อมต่อ Email Service
 */
const testEmailConnection = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return {
        success: false,
        message: 'Email credentials not configured in .env file'
      };
    }

    const transporter = createTransporter();
    await transporter.verify();
    
    console.log('✅ Email service connection verified');
    return {
      success: true,
      message: 'Email service is ready'
    };
  } catch (error) {
    console.error('❌ Email service connection failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Email service connection failed'
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendReturnReminderEmail,
  sendOverdueEmail,
  testEmailConnection
};
