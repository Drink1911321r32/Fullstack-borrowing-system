const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { Admin, Member } = require('../models');
const { formatErrorResponse } = require('../utils');
const { HTTP_STATUS } = require('../constants');

// ตรวจสอบว่าผู้ใช้ได้เข้าสู่ระบบแล้ว
exports.protect = async (req, res, next) => {
  let token;

  // ตรวจสอบว่ามี token ใน header หรือไม่
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // ดึง token จาก header
      token = req.headers.authorization.split(' ')[1];

      // ตรวจสอบ token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;
      
      // ตรวจสอบ user_type ใน token (ตรวจสอบทั้ง user_type และ role)
      const isAdmin = decoded.user_type === 'admin' || decoded.role === 'admin' || decoded.admin_id;
      
      if (isAdmin) {
        const adminId = decoded.admin_id || decoded.id;
        user = await Admin.findByPk(adminId, {
          attributes: { exclude: ['password'] }
        });
        
        if (!user) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json(
            formatErrorResponse('ไม่พบผู้ดูแลระบบ', HTTP_STATUS.UNAUTHORIZED)
          );
        }
        
        req.user = user.get({ plain: true });
        req.user.user_type = 'admin';
        req.user.user_id = user.admin_id; // backward compat
        req.userRole = 'admin';
      } else {
        // member
        const memberId = decoded.member_id || decoded.id;
        user = await Member.findByPk(memberId, {
          attributes: { exclude: ['password'] }
        });
        
        if (!user) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json(
            formatErrorResponse('ไม่พบสมาชิก', HTTP_STATUS.UNAUTHORIZED)
          );
        }
        
        req.user = user.get({ plain: true });
        req.user.user_type = 'member';
        req.user.user_id = user.member_id; // backward compat
        req.userRole = user.member_type === 'student' ? 'user' : user.member_type;
      }
      
      req.userEmail = user.email;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        formatErrorResponse('Token ไม่ถูกต้องหรือหมดอายุ', HTTP_STATUS.UNAUTHORIZED)
      );
    }
  } else {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      formatErrorResponse('ไม่ได้รับอนุญาต ไม่พบ token', HTTP_STATUS.UNAUTHORIZED)
    );
  }
};

// Middleware สำหรับตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
exports.admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.userRole === 'admin')) {
    next();
  } else {
    res.status(HTTP_STATUS.FORBIDDEN).json(
      formatErrorResponse('ไม่มีสิทธิ์เข้าถึง เฉพาะผู้ดูแลระบบเท่านั้น', HTTP_STATUS.FORBIDDEN)
    );
  }
};

// Alternative middleware names (ใช้ชื่อเดียวกับที่ใช้ใน routes)
exports.verifyToken = exports.protect;
exports.isAdmin = exports.admin;
exports.authenticate = exports.protect;