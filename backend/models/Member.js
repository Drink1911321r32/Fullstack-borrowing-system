const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางสมาชิก (นักศึกษา, อาจารย์, เจ้าหน้าที่)
 */
const Member = sequelize.define('Member', {
  member_id: {
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
      },
      is: {
        args: /^[a-zA-Zก-๙\s]+$/,
        msg: 'ชื่อต้องเป็นตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น'
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
      },
      is: {
        args: /^[a-zA-Zก-๙\s]+$/,
        msg: 'นามสกุลต้องเป็นตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น'
      }
    }
  },
  member_type: {
    type: DataTypes.ENUM('student', 'teacher', 'staff'),
    allowNull: false,
    defaultValue: 'student',
    comment: 'ประเภทสมาชิก: นักศึกษา, อาจารย์, เจ้าหน้าที่'
  },
  credit: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: {
      min: {
        args: [-10000],
        msg: 'เครดิตต้องไม่ต่ำกว่า -10,000'
      },
      max: {
        args: [10000],
        msg: 'เครดิตต้องไม่เกิน 10,000'
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
  tableName: 'members',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['member_type']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Member;
