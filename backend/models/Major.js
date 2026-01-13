const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางสาขาวิชา
 */
const Major = sequelize.define('Major', {
  major_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  faculty_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'faculties',
      key: 'faculty_id'
    },
    comment: 'เชื่อมโยงกับตารางคณะ'
  },
  major_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'ชื่อสาขาต้องไม่เป็นค่าว่าง'
      },
      len: {
        args: [2, 100],
        msg: 'ชื่อสาขาต้องมีความยาว 2-100 ตัวอักษร'
      }
    }
  },
  major_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      len: {
        args: [0, 20],
        msg: 'รหัสสาขาต้องไม่เกิน 20 ตัวอักษร'
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
  tableName: 'majors',
  underscored: true,
  timestamps: false,
  indexes: [
    {
      fields: ['faculty_id']
    },
    {
      fields: ['major_name']
    },
    {
      fields: ['is_active']
    },
    {
      unique: true,
      fields: ['faculty_id', 'major_name'],
      name: 'unique_major_per_faculty'
    }
  ]
});

module.exports = Major;
