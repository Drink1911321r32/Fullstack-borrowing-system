require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, sequelize } = require('./config/db');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { sanitizeInput } = require('./middleware/validationMiddleware');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Railway/Vercel
app.set('trust proxy', 1);

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:3000',
  'https://borrowing-system-credit-disburse.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // อนุญาตให้ no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize input (ป้องกัน XSS)
app.use(sanitizeInput);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting สำหรับ API ทั้งหมด
app.use('/api/', apiLimiter);

async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ เชื่อมต่อฐานข้อมูล MySQL สำเร็จ');
    
    // ตั้งค่า MySQL session variables เพื่อเพิ่ม timeout
    await connection.query('SET SESSION innodb_lock_wait_timeout = 120');
    await connection.query('SET SESSION max_execution_time = 120000');
    
    connection.release();
    return true;
  } catch (error) {
    logger.logError('ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL', error);
    return false;
  }
}

testDatabaseConnection();

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('✅ เชื่อมต่อฐานข้อมูล Sequelize สำเร็จ');
    
    const models = require('./models');
    // ใช้ alter: true เพื่อสร้าง tables ใหม่ถ้ายังไม่มี
    await sequelize.sync({ alter: true });
    logger.info('✅ ซิงค์โครงสร้างฐานข้อมูลสำเร็จ');
    
    // เริ่มต้น Cron Jobs
    const { initializeCronJobs } = require('./jobs');
    initializeCronJobs();
  } catch (error) {
    logger.logError('ไม่สามารถเริ่มต้นฐานข้อมูล Sequelize', error);
  }
}

initializeDatabase();

app.use('/api/users', require('./services/routes/userRoutes'));
app.use('/api/equipment', require('./services/routes/equipmentRoutes'));
app.use('/api/equipmentTypes', require('./services/routes/equipmentTypesRoutes'));
app.use('/api/equipment-items', require('./services/routes/equipmentItemRoutes'));
app.use('/api/admin', require('./services/routes/adminRoutes'));
app.use('/api/disbursements', require('./services/routes/disbursementRoutes'));
app.use('/api/borrowing', require('./services/routes/borrowingRoutes'));
app.use('/api/returns', require('./services/routes/returnRoutes'));
app.use('/api/notifications', require('./services/routes/notificationRoutes'));
app.use('/api/credit', require('./services/routes/creditRoutes'));
app.use('/api/cron', require('./services/routes/cronRoutes'));
app.use('/api', require('./services/routes/facultyMajorRoutes'));
app.use('/api/auth', require('./services/routes/authRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/api/debug/tables', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    res.json(tables);
  } catch (error) {
    logger.logError('Error showing tables', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตาราง', error: error.message });
  }
});

// 404 Handler (ต้องอยู่หลัง routes ทั้งหมด)
app.use(notFound);

// Error Handler (ต้องอยู่ท้ายสุด)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
