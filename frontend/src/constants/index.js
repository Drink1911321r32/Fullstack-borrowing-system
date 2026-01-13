// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/users/login',
  REGISTER: '/users/register',
  LOGOUT: '/users/logout',
  PROFILE: '/users/profile',
  
  // Equipment
  EQUIPMENT: '/equipment',
  EQUIPMENT_TYPES: '/equipmentTypes',
  
  // Upload
  UPLOAD: '/upload'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

// Equipment Status
export const EQUIPMENT_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  MAINTENANCE: 'maintenance',
  DAMAGED: 'damaged'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'authToken',
  USER: 'userData',
  THEME: 'appTheme'
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'ระบบยืม-คืนอุปกรณ์',
  VERSION: '1.0.0',
  TIMEOUT: 10000
};