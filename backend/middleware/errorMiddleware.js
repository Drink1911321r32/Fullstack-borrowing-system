const logger = require('../utils/logger');

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.logError('Error occurred', err);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'เกิดข้อผิดพลาดในระบบ';
  
  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'ข้อมูลไม่ถูกต้อง';
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'ข้อมูลซ้ำในระบบ';
    const field = err.errors[0]?.path || 'unknown';
    
    return res.status(statusCode).json({
      success: false,
      message: `${field} นี้ถูกใช้งานแล้ว`
    });
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'ข้อมูลอ้างอิงไม่ถูกต้อง';
    
    return res.status(statusCode).json({
      success: false,
      message
    });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token ไม่ถูกต้อง';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token หมดอายุ';
  }

  // Multer Error (File Upload)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'ไฟล์ใหญ่เกินไป';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'ประเภทไฟล์ไม่ถูกต้อง';
    } else {
      message = 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์';
    }
  }

  // Database Connection Error
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
};

/**
 * Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`ไม่พบ - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async Handler Wrapper
 * ใช้ wrap async functions เพื่อ catch errors อัตโนมัติ
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
