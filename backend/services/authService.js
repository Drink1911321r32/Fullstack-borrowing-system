const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Member, Admin, Student } = require('../models');
const SystemSettings = require('../models/SystemSettings');

/**
 * ตรวจสอบอีเมลซ้ำ
 */
const checkEmailDuplicate = async (email) => {
  const existingMember = await Member.findOne({ where: { email: email.toLowerCase() } });
  const existingAdmin = await Admin.findOne({ where: { email: email.toLowerCase() } });
  return existingMember || existingAdmin;
};

/**
 * ดึงค่าเครดิตเริ่มต้นจาก settings
 */
const getDefaultCredit = async () => {
  try {
    const creditSetting = await SystemSettings.findOne({
      where: { setting_key: 'default_user_credit' }
    });
    return creditSetting ? parseInt(creditSetting.setting_value) : 100;
  } catch (error) {
    return 100; // fallback
  }
};

/**
 * สร้าง Member ใหม่
 */
const createMember = async ({ first_name, last_name, email, password, role, credit }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const member = await Member.create({
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email.toLowerCase(),
    password: hashedPassword,
    member_type: role || 'student',
    status: 'active',
    credit: credit || await getDefaultCredit()
  });

  return member;
};

/**
 * สร้าง Student record
 */
const createStudent = async (memberId, studentCode) => {
  return await Student.create({
    member_id: memberId,
    student_code: studentCode
  });
};

/**
 * สร้าง Token สำหรับ authentication
 */
const generateAuthToken = (user, role) => {
  const payload = { 
    id: user.member_id || user.admin_id,
    email: user.email,
    role: role,
    user_type: role === 'admin' ? 'admin' : 'member'
  };
  
  if (role === 'user' || role === 'member') {
    payload.member_id = user.member_id;
    payload.user_type = 'member';
  } else if (role === 'admin') {
    payload.admin_id = user.admin_id;
    payload.user_type = 'admin';
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * เข้าสู่ระบบด้วย Identifier (email หรือ student code) และ Password
 */
const loginWithCredentials = async (identifier, password) => {
  let user;
  let userType;
  let student = null;
  
  // ตรวจสอบว่าเป็นรูปแบบรหัสนักศึกษา (11 หลัก-1 หลัก) หรืออีเมล
  const studentCodePattern = /^\d{11}-\d{1}$/;
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // 1. นักศึกษา: login ได้ทั้ง email หรือ student_code
  if (studentCodePattern.test(identifier)) {
    student = await Student.findOne({
      where: { student_code: identifier },
      include: [{ model: Member, as: 'member' }]
    });
    if (student && student.member) {
      user = student.member;
      userType = 'member';
    }
  } else if (emailPattern.test(identifier)) {
    // ค้นหาในตาราง Student ก่อน (กรณี email เป็นของนักศึกษา)
    student = await Student.findOne({
      where: {},
      include: [{
        model: Member,
        as: 'member',
        where: { email: identifier.toLowerCase() }
      }]
    });
    if (student && student.member) {
      user = student.member;
      userType = 'member';
    }
  }

  // 2. Admin/Staff: login ด้วย email (ถ้ายังไม่เจอ user จาก student)
  if (!user && emailPattern.test(identifier)) {
    // ค้นหาในตาราง Admin ก่อน
    const admin = await Admin.findOne({ where: { email: identifier.toLowerCase() } });
    if (admin) {
      user = admin;
      userType = 'admin';
    } else {
      // ค้นหา member ที่เป็น staff/teacher (ไม่ใช่ student)
      const { Op } = require('sequelize');
      const member = await Member.findOne({
        where: {
          email: identifier.toLowerCase(),
          member_type: { [Op.in]: ['teacher', 'staff'] }
        }
      });
      if (member) {
        user = member;
        userType = 'member';
      }
    }
  }

  // ถ้า identifier ไม่ตรง pattern ใดเลย
  if (!user && !(studentCodePattern.test(identifier) || emailPattern.test(identifier))) {
    throw new Error('รูปแบบรหัสนักศึกษาหรืออีเมลไม่ถูกต้อง');
  }

  // ถ้าไม่พบผู้ใช้
  if (!user) {
    throw new Error('ไม่พบผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบรหัสนักศึกษาหรืออีเมลอีกครั้ง');
  }

  // ตรวจสอบรหัสผ่าน
  let isPasswordValid = false;
  try {
    isPasswordValid = await Promise.race([
      bcrypt.compare(password, user.password),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('password check timeout')), 5000)
      )
    ]);
  } catch (error) {
    if (error.message === 'password check timeout') {
      throw new Error('ระบบไม่สามารถตรวจสอบรหัสผ่านได้ในเวลา กรุณาลองใหม่อีกครั้ง');
    }
    throw error;
  }
  
  if (!isPasswordValid) {
    throw new Error('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
  }

  // ตรวจสอบสถานะของผู้ใช้
  if (user.status === 'suspended') {
    throw new Error('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  }

  if (user.status === 'deleted') {
    throw new Error('บัญชีของคุณถูกลบออกจากระบบแล้ว');
  }

  // สร้าง JWT token โดยใช้ generateAuthToken เพื่อความสอดคล้อง
  const token = generateAuthToken(user, userType === 'admin' ? 'admin' : 'user');

  // สร้าง response data
  const userData = {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    user_type: userType,
    profile_image: user.profile_image
  };

  if (userType === 'admin') {
    userData.admin_id = user.admin_id;
  } else {
    userData.member_id = user.member_id;
    userData.member_type = user.member_type;
    userData.credit = user.credit;
  }

  return {
    token,
    user: userData
  };
};

/**
 * ดึงข้อมูลผู้ใช้พร้อม Student record
 */
const getUserWithStudent = async (memberId) => {
  const member = await Member.findByPk(memberId);
  if (!member) {
    return null;
  }

  const student = await Student.findOne({ where: { member_id: memberId } });
  
  return {
    ...member.toJSON(),
    student_code: student ? student.student_code : null
  };
};

module.exports = {
  checkEmailDuplicate,
  getDefaultCredit,
  createMember,
  createStudent,
  generateAuthToken,
  loginWithCredentials,
  getUserWithStudent
};
