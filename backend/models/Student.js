const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางข้อมูลนักศึกษา
 * เชื่อมโยงกับ Member ผ่าน member_id
 */
const Student = sequelize.define('Student', {
  student_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'members',
      key: 'member_id'
    },
    comment: 'เชื่อมโยงกับ members table'
  },
  student_code: {
    type: DataTypes.STRING(13),
    allowNull: false,
    unique: {
      msg: 'รหัสนักศึกษานี้ถูกใช้งานแล้ว'
    },
    validate: {
      notEmpty: {
        msg: 'รหัสนักศึกษาต้องไม่เป็นค่าว่าง'
      },
      len: {
        args: [13, 13],
        msg: 'รหัสนักศึกษาต้องมี 13 ตัวอักษร'
      },
      isValidStudentCode(value) {
        // ตรวจสอบรูปแบบ: 11 ตัวเลข + ขีด + 1 ตัวเลข
        const pattern = /^\d{11}-\d{1}$/;
        if (!pattern.test(value)) {
          throw new Error('รูปแบบรหัสนักศึกษาไม่ถูกต้อง (ตัวอย่าง: 12345678901-2)');
        }
      }
    },
    comment: 'รหัสนักศึกษา (11 หลัก - 1 หลัก)'
  },
  faculty_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'faculties',
      key: 'faculty_id'
    },
    comment: 'รหัสคณะ'
  },
  major_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'majors',
      key: 'major_id'
    },
    comment: 'รหัสสาขา'
  },
  status: {
    type: DataTypes.ENUM('active', 'graduated', 'suspended', 'inactive'),
    defaultValue: 'active',
    comment: 'สถานะนักศึกษา'
  }
}, {
  tableName: 'students',
  underscored: true,
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['student_code']
    },
    {
      unique: true,
      fields: ['member_id']
    }
  ]
});

module.exports = Student;
