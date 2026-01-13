// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

// Equipment Status
const EQUIPMENT_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  MAINTENANCE: 'maintenance',
  DAMAGED: 'damaged'
};

// JWT Configuration
const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  ALGORITHM: 'HS256'
};

// File Upload Configuration
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  UPLOAD_PATH: './uploads/equipment/'
};

// Database Configuration
const DB_CONFIG = {
  CHARSET: 'utf8mb4',
  TIMEZONE: '+07:00'
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  EQUIPMENT_STATUS,
  JWT_CONFIG,
  UPLOAD_CONFIG,
  DB_CONFIG
};