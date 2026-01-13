require('dotenv').config();
const { pool } = require('../config/db');
async function run() {
  try {
    await pool.query(INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES ('penalty_type', 'day', 'string', 'ประเภทการคำนวณค่าปรับ: day หรือ hour') ON DUPLICATE KEY UPDATE description = 'ประเภทการคำนวณค่าปรับ: day หรือ hour');
    console.log(' เพิ่ม penalty_type setting สำเร็จ');
    process.exit(0);
  } catch (e) {
    console.error('', e.message);
    process.exit(1);
  }
}
run();
