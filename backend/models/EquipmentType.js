const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// ตั้งชื่อตารางให้ตรงกับฐานข้อมูล
const EquipmentType = sequelize.define('equipmenttype', {
  type_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  usage_type: {
    type: DataTypes.ENUM('Loan', 'Disbursement'),
    allowNull: false,
    defaultValue: 'Loan'
  }
}, {
  tableName: 'equipmenttypes',
  timestamps: false
});

module.exports = EquipmentType;