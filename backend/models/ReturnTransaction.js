const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางการคืนอุปกรณ์
 * แยกออกมาจาก borrowing_transactions เพื่อความชัดเจน
 */
const ReturnTransaction = sequelize.define('ReturnTransaction', {
  return_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  borrowing_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'borrowing_transactions',
      key: 'transaction_id'
    }
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'members',
      key: 'member_id'
    }
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipments',
      key: 'equipment_id'
    }
  },
  
  // ข้อมูลการคืน
  quantity_returned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  actual_return_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  return_status: {
    type: DataTypes.ENUM('Returned', 'PartialReturn', 'Damaged', 'Lost'),
    defaultValue: 'Returned'
  },
  
  // ข้อมูลวันที่และระยะเวลา
  days_overdue: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'จำนวนวันที่คืนช้า'
  },
  expected_return_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'วันที่ต้องคืนตามกำหนด'
  },
  
  // ข้อมูลความเสียหายและค่าปรับ
  damage_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'ค่าชำรุด (เครดิต)'
  },
  damage_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'รายละเอียดความเสียหาย'
  },
  late_penalty: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'ค่าปรับคืนช้า (5 เครดิต/วัน)'
  },
  partial_penalty: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'ค่าปรับคืนไม่ครบ'
  },
  additional_penalty: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'ค่าปรับเพิ่มเติมจาก Admin'
  },
  total_penalty: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'ค่าปรับรวมทั้งหมด'
  },
  
  // ข้อมูลเครดิต
  credit_returned: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'เครดิตที่คืนให้ผู้ใช้'
  },
  credit_bonus: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'โบนัสคืนตรงเวลา'
  },
  credit_deducted: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'เครดิตที่ถูกหัก'
  },
  net_credit_change: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'การเปลี่ยนแปลงเครดิตสุทธิ'
  },
  
  // ข้อมูลผู้บันทึก
  inspected_by_admin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'admins',
      key: 'admin_id'
    },
    comment: 'Admin ที่ตรวจรับคืน'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'หมายเหตุจาก Admin'
  }
}, {
  tableName: 'return_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    { fields: ['borrowing_id'] },
    { fields: ['member_id'] },
    { fields: ['equipment_id'] },
    { fields: ['inspected_by_admin'] },
    { fields: ['return_status'] },
    { fields: ['actual_return_date'] }
  ]
});

module.exports = ReturnTransaction;
