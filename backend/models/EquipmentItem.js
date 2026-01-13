const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const EquipmentItem = sequelize.define('equipment_item', {
  item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipments',
      key: 'equipment_id'
    }
  },
  serial_number: {
    type: DataTypes.STRING(19), // 16 หลัก + 3 เครื่องหมาย dash
    allowNull: false,
    unique: true,
    comment: 'Serial Number รูปแบบ TTTT-EEEEE-MMMM-SSS (16 หลัก)'
  },
  item_code: {
    type: DataTypes.STRING(50),
    unique: true,
    comment: 'รหัสอุปกรณ์ภายใน เช่น ITEM-00012-001'
  },
  status: {
    type: DataTypes.ENUM('Available', 'Borrowed', 'Maintenance', 'Damaged', 'Lost'),
    defaultValue: 'Available'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  condition_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  warranty_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  last_maintenance_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'equipment_items',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = EquipmentItem;
