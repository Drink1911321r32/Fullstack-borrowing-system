const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางรีเซ็ตรหัสผ่าน
 * เก็บ token สำหรับการรีเซ็ตรหัสผ่าน
 */
const PasswordReset = sequelize.define('PasswordReset', {
  reset_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'รูปแบบอีเมลไม่ถูกต้อง'
      }
    },
    comment: 'อีเมลที่ขอรีเซ็ตรหัสผ่าน'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Token สำหรับยืนยันการรีเซ็ต'
  },
  user_type: {
    type: DataTypes.ENUM('member', 'admin'),
    allowNull: false,
    defaultValue: 'member',
    comment: 'ประเภทผู้ใช้'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'วันหมดอายุของ token'
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'ใช้งานแล้วหรือยัง'
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'วันที่ใช้งาน token'
  }
}, {
  tableName: 'password_resets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['email']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = PasswordReset;
