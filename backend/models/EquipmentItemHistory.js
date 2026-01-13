const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const EquipmentItemHistory = sequelize.define('equipment_item_history', {
  history_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipment_items',
      key: 'item_id'
    }
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: true
    // ไม่ใช้ foreign key เพราะอาจอ้างอิงหลายตาราง
  },
  action_type: {
    type: DataTypes.ENUM('borrowed', 'returned', 'maintenance', 'damaged', 'repaired', 'lost', 'found'),
    allowNull: false
  },
  action_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  performed_by: {
    type: DataTypes.INTEGER,
    allowNull: true
    // อาจเป็น member_id หรือ admin_id ไม่ระบุ foreign key
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'equipment_item_history',
  timestamps: false
});

module.exports = EquipmentItemHistory;
