const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// ตั้งชื่อตารางให้ตรงกับฐานข้อมูล (equipments แทน equipment)
const Equipment = sequelize.define('equipment', {
  equipment_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  equipment_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  model: {
    type: DataTypes.STRING
  },
  type_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'equipmenttypes',
      key: 'type_id'
    }
  },
  status: {
    type: DataTypes.ENUM('Available', 'Maintenance', 'Damaged', 'Lost', 'Reserved'),
    defaultValue: 'Available'
  },
  credit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  warranty_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  image_path: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'equipments',
  timestamps: false,
  indexes: [
    { fields: ['type_id'] },
    { fields: ['status'] },
    { fields: ['equipment_name'] }
  ]
});

module.exports = Equipment;