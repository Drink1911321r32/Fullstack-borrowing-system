const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SystemSettings = sequelize.define('SystemSettings', {
  setting_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  setting_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'Setting key ต้องไม่เป็นค่าว่าง'
      }
    }
  },
  setting_value: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Setting value ต้องไม่เป็นค่าว่าง'
      }
    }
  },
  setting_type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'system_settings',
  underscored: true,
  timestamps: false
});

module.exports = SystemSettings;
