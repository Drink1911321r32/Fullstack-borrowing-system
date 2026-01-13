require('dotenv').config();
const { pool } = require('../config/db');

async function addPenaltyTypeSetting() {
  try {
    const sql = "INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES ('penalty_type', 'day', 'string', 'Penalty calculation type') ON DUPLICATE KEY UPDATE description = 'Penalty calculation type'";
    
    await pool.query(sql);
    console.log('✅ penalty_type setting added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addPenaltyTypeSetting();
