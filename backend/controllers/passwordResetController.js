const { pool } = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail } = require('../utils/emailService');

/**
 * ขอรีเซ็ตรหัสผ่าน (ส่งอีเมล)
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    console.log('🔔 [Forgot Password] Request received:', req.body);
    const { email } = req.body;

    if (!email) {
      console.log('❌ [Forgot Password] Email not provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุอีเมล'
      });
    }

    console.log('🔍 [Forgot Password] Searching for email:', email);
    
    // ตรวจสอบว่ามีอีเมลนี้ในระบบหรือไม่ (ทั้ง members และ admins)
    const [members] = await pool.query(
      'SELECT member_id as user_id, email, first_name, last_name, "member" as user_type FROM members WHERE email = ? AND status = "active"',
      [email.toLowerCase()]
    );

    const [admins] = await pool.query(
      'SELECT admin_id as user_id, email, first_name, last_name, "admin" as user_type FROM admins WHERE email = ?',
      [email.toLowerCase()]
    );

    const users = [...members, ...admins];

    console.log('📊 [Forgot Password] Users found:', users.length, users.length > 0 ? `(${users[0].user_type})` : '');

    // ถ้าไม่เจออีเมล ก็ตอบว่าส่งแล้ว (เพื่อความปลอดภัย ไม่เปิดเผยว่ามีอีเมลในระบบหรือไม่)
    if (users.length === 0) {
      console.log('⚠️ [Forgot Password] Email not found in system');
      return res.json({
        success: true,
        message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้'
      });
    }

    const user = users[0];

    console.log('🔐 [Forgot Password] Generating reset token for user:', user.email);
    
    // สร้าง reset token (random 32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // กำหนดเวลาหมดอายุ (30 นาที)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    console.log('💾 [Forgot Password] Saving token to database...');
    
    // ลบ token เก่าของ email นี้ (ถ้ามี)
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE email = ?',
      [email.toLowerCase()]
    );

    // บันทึก token ใหม่
    await pool.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), resetToken, expiresAt]
    );

    console.log('📧 [Forgot Password] Sending email to:', email);
    
    // ส่งอีเมล
    const emailResult = await sendPasswordResetEmail(
      email,
      resetToken,
      `${user.first_name} ${user.last_name}`
    );

    console.log('📬 [Forgot Password] Email send result:', emailResult);

    if (!emailResult.success) {
      console.error('❌ [Forgot Password] Failed to send email:', emailResult);
      // ถึงแม้ส่งอีเมลไม่สำเร็จ ก็ยังบันทึก token ไว้ (เผื่อส่งอีเมลทีหลัง)
    } else {
      console.log('✅ [Forgot Password] Email sent successfully!');
    }

    res.json({
      success: true,
      message: 'เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบอีเมล'
    });

  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน',
      error: error.message
    });
  }
};

/**
 * ตรวจสอบ token ว่าใช้ได้หรือไม่
 * GET /api/auth/verify-reset-token/:token
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ token'
      });
    }

    // ตรวจสอบ token
    const [tokens] = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND expires_at > NOW() AND used = FALSE`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว'
      });
    }

    res.json({
      success: true,
      message: 'Token ถูกต้อง',
      email: tokens[0].email
    });

  } catch (error) {
    console.error('Error in verifyResetToken:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ token',
      error: error.message
    });
  }
};

/**
 * รีเซ็ตรหัสผ่าน
 * POST /api/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validation
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ token'
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสผ่านและยืนยันรหัสผ่าน'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
    }

    await connection.beginTransaction();

    // ตรวจสอบ token
    const [tokens] = await connection.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND expires_at > NOW() AND used = FALSE
       FOR UPDATE`,
      [token]
    );

    if (tokens.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว'
      });
    }

    const resetToken = tokens[0];

    // ตรวจสอบว่ามี user อยู่จริง (ทั้ง members และ admins)
    const [members] = await connection.query(
      'SELECT member_id as user_id, email, "member" as user_type FROM members WHERE email = ? AND status = "active"',
      [resetToken.email]
    );

    const [admins] = await connection.query(
      'SELECT admin_id as user_id, email, "admin" as user_type FROM admins WHERE email = ?',
      [resetToken.email]
    );

    const users = [...members, ...admins];

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้นี้'
      });
    }

    const user = users[0];

    // เข้ารหัสรหัสผ่านใหม่
    const hashedPassword = await bcrypt.hash(password, 10);

    // อัปเดตรหัสผ่านตาม user_type
    if (user.user_type === 'member') {
      await connection.query(
        'UPDATE members SET password = ?, updated_at = NOW() WHERE member_id = ?',
        [hashedPassword, user.user_id]
      );
    } else if (user.user_type === 'admin') {
      await connection.query(
        'UPDATE admins SET password = ?, updated_at = NOW() WHERE admin_id = ?',
        [hashedPassword, user.user_id]
      );
    }

    // ทำเครื่องหมายว่า token ถูกใช้แล้ว
    await connection.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [resetToken.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านสำเร็จ คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error in resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  forgotPassword,
  verifyResetToken,
  resetPassword
};
