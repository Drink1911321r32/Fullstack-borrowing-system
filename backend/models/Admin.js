const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางผู้ดูแลระบบ (Admin)
 */
const Admin = sequelize.define('Admin', {
  admin_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'อีเมลนี้ถูกใช้งานแล้ว'
    },
    validate: {
      isEmail: {
        msg: 'รูปแบบอีเมลไม่ถูกต้อง'
      },
      len: {
        args: [5, 100],
        msg: 'อีเมลต้องมีความยาว 5-100 ตัวอักษร'
      }
    }
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [6, 100],
        msg: 'รหัสผ่านต้องมีความยาว 6-100 ตัวอักษร'
      }
    }
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'ชื่อต้องไม่เป็นค่าว่าง'
      },
      len: {
        args: [2, 50],
        msg: 'ชื่อต้องมีความยาว 2-50 ตัวอักษร'
      }
    }
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'นามสกุลต้องไม่เป็นค่าว่าง'
      },
      len: {
        args: [2, 50],
        msg: 'นามสกุลต้องมีความยาว 2-50 ตัวอักษร'
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'inactive'),
    defaultValue: 'active'
  },
  profile_image: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'admins',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['status']
    }
  ]
}, {
  tableName: 'admins',
  underscored: true,
  timestamps: true
});

module.exports = Admin;
