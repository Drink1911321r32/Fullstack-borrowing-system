const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CreditTransaction = sequelize.define('CreditTransaction', {
  transaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'จำนวนเครดิตที่เปลี่ยนแปลง (+ หรือ -)'
  },
  transaction_type: {
    type: DataTypes.ENUM('borrow', 'return', 'penalty', 'adjustment', 'refund'),
    allowNull: false
  },
  reference_type: {
    type: DataTypes.ENUM('borrowing', 'disbursement', 'manual'),
    defaultValue: 'borrowing'
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID ของรายการที่อ้างอิง เช่น borrowing_transaction_id'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  balance_after: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ยอดเครดิตคงเหลือหลังทำรายการ'
  },
  created_by_admin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ผู้ที่ทำรายการ (admin_id)'
  }
}, {
  tableName: 'credit_transactions',
  underscored: true,
  timestamps: true,
  updatedAt: false
});

module.exports = CreditTransaction;
