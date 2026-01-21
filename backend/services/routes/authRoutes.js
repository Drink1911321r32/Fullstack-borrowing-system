const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  forgotPassword, 
  verifyResetToken, 
  resetPassword 
} = require('../../controllers/passwordResetController');

// ขอรีเซ็ตรหัสผ่าน (ส่งอีเมล)
router.post('/forgot-password', 
  [
    body('email')
      .trim()
      .isEmail().withMessage('กรุณาระบุอีเมลที่ถูกต้อง')
      .normalizeEmail()
  ],
  forgotPassword
);

// ตรวจสอบ token ว่ายังใช้ได้หรือไม่
router.get('/verify-reset-token/:token', verifyResetToken);

// รีเซ็ตรหัสผ่าน
router.post('/reset-password/:token',
  [
    body('password')
      .trim()
      .isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        }
        return true;
      })
  ],
  resetPassword
);

module.exports = router;
