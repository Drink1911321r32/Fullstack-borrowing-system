const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize'); // เพิ่ม import Sequelize
require('dotenv').config();

// สร้าง instance ของ Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'borrow_return_system',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // ตั้งค่าเป็น true หากต้องการเห็น SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// สร้างพูล connection สำหรับการเชื่อมต่อฐานข้อมูล (เผื่อต้องใช้ mysql2 โดยตรง)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'borrow_return_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ฟังก์ชันสำหรับการทดสอบเชื่อมต่อฐานข้อมูล
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ ทดสอบการเชื่อมต่อฐานข้อมูล MySQL2 สำเร็จ');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ การเชื่อมต่อฐานข้อมูล MySQL2 ล้มเหลว:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  sequelize // ส่งออก sequelize instance
};