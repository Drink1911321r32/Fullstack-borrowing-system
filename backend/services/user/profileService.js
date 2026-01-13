const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../../config/db');

// ตั้งค่า Multer
const profileStorage = multer.diskStorage({
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

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * ลบไฟล์รูปภาพ
 */
const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  
  const fullPath = path.join(__dirname, '..', '..', imagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

/**
 * อัปเดตรูปโปรไฟล์
 */
const updateUserProfileImage = async (userId, file) => {
  const [users] = await pool.query('SELECT profile_image FROM members WHERE member_id = ?', [userId]);

  if (users.length === 0) {
    fs.unlinkSync(file.path);
    throw new Error('ไม่พบผู้ใช้');
  }

  // ลบรูปเก่า
  if (users[0].profile_image) {
    deleteImageFile(users[0].profile_image);
  }

  const imagePath = '/uploads/profiles/' + file.filename;
  await pool.query('UPDATE members SET profile_image = ? WHERE member_id = ?', [imagePath, userId]);

  const [updatedUsers] = await pool.query(
    'SELECT member_id, email, first_name, last_name, member_type, status, credit, profile_image FROM members WHERE member_id = ?',
    [userId]
  );

  return updatedUsers[0];
};

/**
 * ลบรูปโปรไฟล์
 */
const deleteUserProfileImage = async (userId) => {
  const [users] = await pool.query('SELECT profile_image FROM members WHERE member_id = ?', [userId]);

  if (users.length === 0) {
    throw new Error('ไม่พบผู้ใช้');
  }

  if (!users[0].profile_image) {
    throw new Error('ไม่มีรูปโปรไฟล์ให้ลบ');
  }

  deleteImageFile(users[0].profile_image);

  await pool.query('UPDATE members SET profile_image = NULL WHERE member_id = ?', [userId]);

  const [updatedUsers] = await pool.query(
    'SELECT member_id, email, first_name, last_name, member_type, status, credit, profile_image FROM members WHERE member_id = ?',
    [userId]
  );

  return updatedUsers[0];
};

module.exports = {
  profileUpload,
  updateUserProfileImage,
  deleteUserProfileImage,
  deleteImageFile
};
