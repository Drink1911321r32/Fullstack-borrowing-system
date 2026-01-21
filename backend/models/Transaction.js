const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// ตารางสำหรับจัดการการยืม (Borrowing Only)
const BorrowingTransaction = sequelize.define('borrowing_transaction', {
  transaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'members',
      key: 'member_id'
    }
  },
  member_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Snapshot ของชื่อสมาชิกตอนยืม'
  },
  member_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Snapshot ของอีเมลสมาชิกตอนยืม'
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipments',
      key: 'equipment_id'
    }
  },
  borrow_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expected_return_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  quantity_borrowed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  total_returned: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'จำนวนที่คืนแล้วทั้งหมด'
  },
  is_returned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'คืนครบแล้วหรือยัง'
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Borrowed', 'Completed', 'Cancelled', 'Rejected'),
    defaultValue: 'Pending'
  },
  batch_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'รหัสกลุ่มการยืม (สำหรับยืมหลายรายการพร้อมกัน)'
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  approval_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_by_admin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'admins',
      key: 'admin_id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  credit_deducted: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'เครดิตที่ถูกหักจริงตอนยืม (snapshot ณ ขณะนั้น)'
  }
}, {
  tableName: 'borrowing_transactions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['member_id'] },
    { fields: ['equipment_id'] },
    { fields: ['approved_by_admin'] },
    { fields: ['status'] },
    { fields: ['batch_id'] },
    { fields: ['expected_return_date'] },
    { fields: ['status', 'is_returned'] }
  ]
});

// ตารางสำหรับจัดการการเบิก-จ่าย
const DisbursementTransaction = sequelize.define('disbursement_transaction', {
  transaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  disbursement_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  quantity_requested: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  quantity_disbursed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Disbursed', 'Cancelled'),
    defaultValue: 'Pending'
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approval_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_by_admin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'admins',
      key: 'admin_id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'disbursement_transactions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['member_id'] },
    { fields: ['equipment_id'] },
    { fields: ['approved_by_admin'] },
    { fields: ['status'] },
    { fields: ['request_date'] }
  ]
});

module.exports = {
  BorrowingTransaction,
  DisbursementTransaction
};