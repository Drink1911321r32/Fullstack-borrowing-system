const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ตรวจสอบว่าอยู่ใน development mode หรือไม่
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Rate Limiter สำหรับ API ทั่วไป
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: isDevelopment ? 500 : 100, // Development: 500, Production: 100 requests ต่อ window
  message: {
    success: false,
    message: 'มีการเรียกใช้ API มากเกินไป กรุณารอสักครู่'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip localhost ใน development
  skip: (req) => isDevelopment && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === 'localhost'),
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'มีการเรียกใช้ API มากเกินไป กรุณารอสักครู่',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Rate Limiter สำหรับ Login
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ window
  skipSuccessfulRequests: true, // ไม่นับถ้า login สำเร็จ
  message: {
    success: false,
    message: 'พยายาม login มากเกินไป กรุณารอ 15 นาที'
  },
  handler: (req, res) => {
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}, Email: ${req.body.email}`);
    res.status(429).json({
      success: false,
      message: 'พยายาม login มากเกินไป กรุณารอ 15 นาที',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Rate Limiter สำหรับ Registration
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 3, // จำกัด 3 ครั้งต่อ window
  message: {
    success: false,
    message: 'สร้างบัญชีมากเกินไป กรุณารอ 1 ชั่วโมง'
  }
});

/**
 * Rate Limiter สำหรับ Credit Adjustment (Admin)
 */
const creditAdjustmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 10, // จำกัด 10 ครั้งต่อนาที
  message: {
    success: false,
    message: 'ปรับเครดิตมากเกินไป กรุณารอสักครู่'
  }
});

/**
 * Rate Limiter สำหรับ Borrow Request
 */
const borrowLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 นาที
  max: 20, // จำกัด 20 ครั้งต่อ 5 นาที
  message: {
    success: false,
    message: 'ส่งคำขอยืมมากเกินไป กรุณารอสักครู่'
  }
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  creditAdjustmentLimiter,
  borrowLimiter
};
