const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางคณะ
 */
const Faculty = sequelize.define('Faculty', {
  faculty_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  faculty_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'ชื่อคณะนี้ถูกใช้งานแล้ว'
    },
    validate: {
      notEmpty: {
        msg: 'ชื่อคณะต้องไม่เป็นค่าว่าง'
      },
      len: {
        args: [2, 100],
        msg: 'ชื่อคณะต้องมีความยาว 2-100 ตัวอักษร'
      }
    }
  },
  faculty_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      len: {
        args: [0, 20],
        msg: 'รหัสคณะต้องไม่เกิน 20 ตัวอักษร'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'สถานะการใช้งาน'
  }
}, {
  tableName: 'faculties',
  underscored: true,
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['faculty_name']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Faculty;
