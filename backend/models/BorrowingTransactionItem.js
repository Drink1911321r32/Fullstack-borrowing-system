const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

/**
 * Model สำหรับตารางการยืมรายการย่อย (Item-level Tracking)
 * ใช้ติดตามอุปกรณ์แต่ละชิ้นที่ยืมในแต่ละรายการ
 * เชื่อมโยง borrowing_transactions กับ equipment_items
 */
const BorrowingTransactionItem = sequelize.define('borrowing_transaction_item', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'borrowing_transactions',
      key: 'transaction_id'
    },
    comment: 'รหัสรายการยืมหลัก'
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipment_items',
      key: 'item_id'
    },
    comment: 'รหัสอุปกรณ์แต่ละชิ้น (Serial Number)'
  },
  status: {
    type: DataTypes.ENUM('Borrowed', 'Returned', 'Lost', 'Damaged'),
    allowNull: false,
    defaultValue: 'Borrowed',
    comment: 'สถานะของอุปกรณ์แต่ละชิ้น'
  },
  borrowed_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'วันที่ยืม'
  },
  returned_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'วันที่คืน'
  },
  condition_on_return: {
    type: DataTypes.ENUM('Good', 'Fair', 'Damaged', 'Lost'),
    allowNull: true,
    comment: 'สภาพตอนคืน'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'หมายเหตุเพิ่มเติม'
  }
}, {
  tableName: 'borrowing_transaction_items',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_transaction_id',
      fields: ['transaction_id']
    },
    {
      name: 'idx_item_id',
      fields: ['item_id']
    },
    {
      name: 'idx_status',
      fields: ['status']
    },
    {
      unique: true,
      name: 'unique_transaction_item',
      fields: ['transaction_id', 'item_id']
    }
  ]
});

module.exports = BorrowingTransactionItem;
