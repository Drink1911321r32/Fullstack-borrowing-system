const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

/**
 * Model สำหรับตารางการแจ้งเตือน
 */
const Notification = sequelize.define('notification', {
  notification_id: {
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
    },
    comment: 'รหัสผู้รับการแจ้งเตือน'
  },
  type: {
    type: DataTypes.ENUM('approval', 'rejection', 'reminder', 'overdue', 'system', 'credit', 'return'),
    allowNull: false,
    comment: 'ประเภทการแจ้งเตือน'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'หัวข้อ'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'ข้อความ'
  },
  reference_type: {
    type: DataTypes.ENUM('borrowing', 'disbursement', 'return', 'credit', 'general'),
    allowNull: true,
    comment: 'ประเภทอ้างอิง'
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID ที่อ้างอิง'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'อ่านแล้วหรือยัง'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'วันที่อ่าน'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    comment: 'ความสำคัญ'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Notification;
