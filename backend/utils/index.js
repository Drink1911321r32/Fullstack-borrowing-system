const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate random string
const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Validate file type
const isValidFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

// Format error response
const formatErrorResponse = (message, statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

// Format success response
const formatSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

// Update equipment quantity based on actual item count
const updateEquipmentQuantity = async (equipment_id, pool) => {
  try {
    const [counts] = await pool.query(
      'SELECT COUNT(*) as total FROM equipment_items WHERE equipment_id = ?',
      [equipment_id]
    );
    
    await pool.query(
      'UPDATE equipments SET quantity = ? WHERE equipment_id = ?',
      [counts[0].total, equipment_id]
    );
    
    return counts[0].total;
  } catch (error) {
    console.error(`❌ Error updating quantity for equipment_id ${equipment_id}:`, error);
    throw error;
  }
};

/**
 * Generate numeric serial number in format: TTTTEEEEEMMMMSSS
 * - TTTT: Type ID (4 digits, zero-padded)
 * - EEEEE: Equipment ID (5 digits, zero-padded)
 * - MMMM: Model hash (4 digits, numeric hash from model name)
 * - SSS: Sequence number (3 digits, zero-padded)
 * Total: 16 digits, all numeric, human-readable
 * 
 * Example: 0001000010123001
 *   Type: 1, Equipment: 1, Model hash: 0123, Sequence: 1
 */
const generateSerialNumber = (type_id, equipment_id, model, sequence) => {
  // Pad type_id to 4 digits
  const typePart = String(type_id).padStart(4, '0');
  
  // Pad equipment_id to 5 digits
  const equipPart = String(equipment_id).padStart(5, '0');
  
  // Generate 4-digit numeric hash from model name
  const modelPart = generateModelHash(model);
  
  // Pad sequence to 3 digits
  const seqPart = String(sequence).padStart(3, '0');
  
  return `${typePart}${equipPart}${modelPart}${seqPart}`;
};

/**
 * Generate a 4-digit numeric hash from model name
 * Uses simple character code summation with modulo to ensure 4 digits
 */
const generateModelHash = (model) => {
  if (!model || model.length === 0) {
    return '0000';
  }
  
  let hash = 0;
  for (let i = 0; i < model.length; i++) {
    hash = ((hash << 5) - hash) + model.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Ensure positive and 4 digits
  const positiveHash = Math.abs(hash) % 10000;
  return String(positiveHash).padStart(4, '0');
};

/**
 * Parse serial number to extract components
 * Returns: { type_id, equipment_id, model_hash, sequence }
 */
const parseSerialNumber = (serialNumber) => {
  if (!serialNumber || serialNumber.length !== 16) {
    throw new Error('Serial number must be exactly 16 digits');
  }
  
  return {
    type_id: parseInt(serialNumber.substring(0, 4)),
    equipment_id: parseInt(serialNumber.substring(4, 9)),
    model_hash: serialNumber.substring(9, 13),
    sequence: parseInt(serialNumber.substring(13, 16))
  };
};

/**
 * Validate serial number format
 */
const isValidSerialNumber = (serialNumber) => {
  if (!serialNumber || typeof serialNumber !== 'string') {
    return false;
  }
  
  // Must be exactly 16 digits
  return /^\d{16}$/.test(serialNumber);
};

/**
 * Format serial number with separators for display
 * Example: 0001-00001-0123-001
 */
const formatSerialNumberDisplay = (serialNumber) => {
  if (!isValidSerialNumber(serialNumber)) {
    return serialNumber;
  }
  
  const type = serialNumber.substring(0, 4);
  const equip = serialNumber.substring(4, 9);
  const model = serialNumber.substring(9, 13);
  const seq = serialNumber.substring(13, 16);
  
  return `${type}-${equip}-${model}-${seq}`;
};

/**
 * Get system setting value
 */
const getSystemSetting = async (key, defaultValue = null) => {
  try {
    const { pool } = require('../config/db');
    const [rows] = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    
    if (rows.length === 0) {
      return defaultValue;
    }
    
    return rows[0].setting_value;
  } catch (error) {
    console.error('Error getting system setting:', error);
    return defaultValue;
  }
};

/**
 * Get penalty credit per hour from settings
 */
const getPenaltyCreditPerHour = async () => {
  const value = await getSystemSetting('penalty_credit_per_hour', '1');
  return parseInt(value, 10) || 1;
};

/**
 * Get penalty credit per day from settings
 * @deprecated Use getPenaltyCreditPerHour instead for more accurate calculations
 */
const getPenaltyCreditPerDay = async () => {
  const hourlyPenalty = await getPenaltyCreditPerHour();
  return hourlyPenalty * 24; // Convert hourly to daily rate
};

/**
 * Format date to MySQL DATETIME format
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 */
const formatMySQLDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Combine date and time strings into MySQL DATETIME
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} timeStr - Time string (HH:MM or HH:MM:SS)
 * @returns {string} MySQL DATETIME format
 */
const combineDateTimeToMySQL = (dateStr, timeStr = '00:00:00') => {
  if (!dateStr) return null;
  
  // Ensure time has seconds
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr} ${time}`;
};

/**
 * Calculate hours difference between two datetimes
 * @param {Date|string} datetime1
 * @param {Date|string} datetime2
 * @returns {number} Hours difference
 */
const calculateHoursDifference = (datetime1, datetime2) => {
  const d1 = new Date(datetime1);
  const d2 = new Date(datetime2);
  const diffMs = d2 - d1;
  return Math.floor(diffMs / (1000 * 60 * 60));
};

/**
 * Calculate penalty based on hours overdue
 * @param {number} hoursOverdue
 * @param {number} penaltyCreditPerHour - Penalty credit per hour
 * @param {number} graceHours - Grace period in hours (default: 0)
 * @returns {number} Penalty amount
 */
const calculateTimePenalty = (hoursOverdue, penaltyCreditPerHour, graceHours = 0) => {
  if (hoursOverdue <= graceHours) return 0;
  
  const chargeableHours = hoursOverdue - graceHours;
  
  // คำนวณค่าปรับตามชั่วโมง (ปัดขึ้น)
  return Math.ceil(chargeableHours * penaltyCreditPerHour);
};

/**
 * Get member snapshot data for transaction history
 * @param {number} memberId - Member ID
 * @param {object} pool - Database pool
 * @returns {object} - { member_name, member_email }
 */
const getMemberSnapshot = async (memberId, pool) => {
  try {
    const [members] = await pool.query(
      'SELECT first_name, last_name, email FROM members WHERE member_id = ?',
      [memberId]
    );
    
    if (members.length === 0) {
      return { member_name: null, member_email: null };
    }
    
    const member = members[0];
    return {
      member_name: `${member.first_name} ${member.last_name}`,
      member_email: member.email
    };
  } catch (error) {
    console.error('Error getting member snapshot:', error);
    return { member_name: null, member_email: null };
  }
};

/**
 * Format display name from member data or snapshot
 * @param {object} data - Object with member_id, first_name, last_name, member_name
 * @returns {string} - Formatted name
 */
const formatMemberName = (data) => {
  // If member exists, use current name
  if (data.first_name && data.last_name) {
    return `${data.first_name} ${data.last_name}`;
  }
  // If member deleted, use snapshot
  if (data.member_name) {
    return `${data.member_name} (ลบแล้ว)`;
  }
  return 'ไม่ทราบชื่อ';
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateRandomString,
  isValidFileType,
  formatErrorResponse,
  formatSuccessResponse,
  updateEquipmentQuantity,
  generateSerialNumber,
  generateModelHash,
  parseSerialNumber,
  isValidSerialNumber,
  formatSerialNumberDisplay,
  getSystemSetting,
  getPenaltyCreditPerHour,
  getPenaltyCreditPerDay,
  formatMySQLDateTime,
  combineDateTimeToMySQL,
  calculateHoursDifference,
  calculateTimePenalty,
  getMemberSnapshot,
  formatMemberName
};