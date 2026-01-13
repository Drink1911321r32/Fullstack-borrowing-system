const { pool } = require('../../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ตั้งค่า Multer สำหรับอัปโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF)'));
  }
};

const uploadProfileImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * ลบไฟล์รูปภาพโปรไฟล์
 */
const deleteProfileImageFile = (imagePath) => {
  if (!imagePath) return;
  
  const fullPath = path.join(__dirname, '..', '..', imagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

/**
 * อัปโหลดรูปโปรไฟล์ของผู้ใช้
 */
const uploadUserProfileImageData = async (userId, file) => {
  // ตรวจสอบว่าผู้ใช้มีอยู่จริง
  const [users] = await pool.query('SELECT profile_image FROM members WHERE member_id = ?', [userId]);

  if (users.length === 0) {
    // ลบไฟล์ที่อัปโหลด
    fs.unlinkSync(file.path);
    throw new Error('ไม่พบผู้ใช้');
  }

  // ลบรูปเก่าถ้ามี
  if (users[0].profile_image) {
    deleteProfileImageFile(users[0].profile_image);
  }

  // อัปเดท path ของรูปใหม่
  const imagePath = '/uploads/profiles/' + file.filename;
  await pool.query('UPDATE members SET profile_image = ? WHERE member_id = ?', [imagePath, userId]);

  // ดึงข้อมูลผู้ใช้ที่อัปเดทแล้ว
  const [updatedUsers] = await pool.query(
    'SELECT member_id as user_id, email, first_name, last_name, "user" as role, status, credit, profile_image, created_at, updated_at FROM members WHERE member_id = ?',
    [userId]
  );

  return updatedUsers[0];
};

/**
 * อัปเดตรูปโปรไฟล์ของผู้ใช้ (คล้าย upload แต่มีข้อความต่างกัน)
 */
const updateUserProfileImageData = async (userId, file) => {
  return await uploadUserProfileImageData(userId, file);
};

/**
 * ลบรูปโปรไฟล์ของผู้ใช้
 */
const deleteUserProfileImageData = async (userId) => {
  // ตรวจสอบว่าผู้ใช้มีอยู่จริง
  const [users] = await pool.query('SELECT profile_image FROM members WHERE member_id = ?', [userId]);

  if (users.length === 0) {
    throw new Error('ไม่พบผู้ใช้');
  }

  if (!users[0].profile_image) {
    throw new Error('ไม่มีรูปโปรไฟล์ให้ลบ');
  }

  // ลบไฟล์รูปภาพ
  deleteProfileImageFile(users[0].profile_image);

  // อัปเดทฐานข้อมูล
  await pool.query('UPDATE members SET profile_image = NULL WHERE member_id = ?', [userId]);

  // ดึงข้อมูลผู้ใช้ที่อัปเดทแล้ว
  const [updatedUsers] = await pool.query(
    'SELECT member_id as user_id, email, first_name, last_name, "user" as role, status, credit, profile_image, created_at, updated_at FROM members WHERE member_id = ?',
    [userId]
  );

  return updatedUsers[0];
};

module.exports = {
  uploadProfileImage,
  uploadUserProfileImageData,
  updateUserProfileImageData,
  deleteUserProfileImageData,
  deleteProfileImageFile
};
