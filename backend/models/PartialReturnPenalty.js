const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Model สำหรับตารางค่าปรับการคืนไม่ครบ
 * บันทึกประวัติการหักเครดิตอัตโนมัติรายวัน
 */
const PartialReturnPenalty = sequelize.define('PartialReturnPenalty', {
  penalty_id: {
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
    },
    comment: 'รายการยืมที่อ้างอิง'
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'members',
      key: 'member_id'
    },
    comment: 'สมาชิกที่ถูกหักเครดิต'
  },
  penalty_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'วันที่หักเครดิต'
  },
  missing_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'จำนวนที่ยังไม่คืน'
  },
  daily_penalty: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'ค่าปรับต่อวันต่อชิ้น'
  },
  credit_deducted: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'เครดิตที่ถูกหักครั้งนี้'
  },
  balance_after: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ยอดเครดิตหลังหัก'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'หมายเหตุ'
  }
}, {
  tableName: 'partial_return_penalties',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      fields: ['borrowing_id']
    },
    {
      fields: ['member_id']
    },
    {
      fields: ['penalty_date']
    },
    {
      unique: true,
      fields: ['borrowing_id', 'penalty_date'],
      name: 'unique_penalty_per_day'
    }
  ]
});

module.exports = PartialReturnPenalty;
