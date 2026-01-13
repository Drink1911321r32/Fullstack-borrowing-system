require('dotenv').config();
const { pool } = require('../config/db');

async function updatePenaltyTypeSetting() {
  try {
    const sql = "UPDATE system_settings SET description = 'ประเภทการคำนวณค่าปรับ: day (รายวัน) หรือ hour (รายชั่วโมง)' WHERE setting_key = 'penalty_type'";
    
    await pool.query(sql);
    console.log('✅ อัพเดท penalty_type description เป็นภาษาไทยสำเร็จ');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updatePenaltyTypeSetting();
