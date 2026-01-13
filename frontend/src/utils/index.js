// Format date helper
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format currency helper
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get local date string in YYYY-MM-DD format (fixes timezone issues)
export const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in local timezone (YYYY-MM-DD)
export const getTodayString = () => {
  return getLocalDateString(new Date());
};

/**
 * Format datetime to Thai locale string with time
 * @param {Date|string} datetime - Date object or ISO string
 * @param {Object} options - Format options
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (datetime, options = {}) => {
  if (!datetime) return '-';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  return new Date(datetime).toLocaleString('th-TH', { ...defaultOptions, ...options });
};

/**
 * Format datetime in short format
 * @param {Date|string} datetime
 * @returns {string} Format: "13/12/2568 14:30"
 */
export const formatDateTimeShort = (datetime) => {
  if (!datetime) return '-';
  const d = new Date(datetime);
  return `${d.toLocaleDateString('th-TH')} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Get current datetime in format for datetime-local input
 * @returns {string} Format: "2025-12-13T14:30"
 */
export const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Split datetime-local value to separate date and time
 * @param {string} datetimeLocal - Format: "2025-12-13T14:30"
 * @returns {Object} { date: "2025-12-13", time: "14:30" }
 */
export const splitDateTimeLocal = (datetimeLocal) => {
  if (!datetimeLocal) return { date: '', time: '' };
  const [date, time] = datetimeLocal.split('T');
  return { date, time };
};

/**
 * Combine date and time to datetime-local format
 * @param {string} date - Format: "2025-12-13"
 * @param {string} time - Format: "14:30"
 * @returns {string} Format: "2025-12-13T14:30"
 */
export const combineDateTimeLocal = (date, time) => {
  if (!date) return '';
  const timeValue = time || '00:00';
  return `${date}T${timeValue}`;
};

/**
 * Calculate hours difference between two datetimes
 * @param {Date|string} datetime1
 * @param {Date|string} datetime2
 * @returns {number} Hours difference
 */
export const calculateHoursDifference = (datetime1, datetime2) => {
  const d1 = new Date(datetime1);
  const d2 = new Date(datetime2);
  const diffMs = d2 - d1;
  return Math.floor(diffMs / (1000 * 60 * 60));
};

/**
 * Format duration from hours to human readable
 * @param {number} hours
 * @returns {string} Example: "2 วัน 5 ชั่วโมง" or "3 ชั่วโมง 30 นาที"
 */
export const formatDuration = (hours) => {
  if (hours < 0) return '-';
  
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const minutes = Math.floor((hours % 1) * 60);
  
  if (days > 0) {
    if (remainingHours > 0) {
      return `${days} วัน ${remainingHours} ชั่วโมง`;
    }
    return `${days} วัน`;
  } else if (remainingHours > 0) {
    if (minutes > 0) {
      return `${remainingHours} ชั่วโมง ${minutes} นาที`;
    }
    return `${remainingHours} ชั่วโมง`;
  } else {
    return `${minutes} นาที`;
  }
};

/**
 * Check if datetime is overdue
 * @param {Date|string} expectedReturnDate
 * @returns {boolean}
 */
export const isOverdue = (expectedReturnDate) => {
  if (!expectedReturnDate) return false;
  return new Date(expectedReturnDate) < new Date();
};

/**
 * Get overdue status with details
 * @param {Date|string} expectedReturnDate
 * @returns {Object} { isOverdue, hours, formatted }
 */
export const getOverdueStatus = (expectedReturnDate) => {
  if (!expectedReturnDate) {
    return { isOverdue: false, hours: 0, formatted: '-' };
  }
  
  const expected = new Date(expectedReturnDate);
  const now = new Date();
  const hours = calculateHoursDifference(expected, now);
  
  return {
    isOverdue: hours > 0,
    hours: hours,
    formatted: hours > 0 ? formatDuration(hours) : 'ยังไม่เกิน'
  };
};

/**
 * Generate numeric serial number in format: TTTTEEEEEMMMMSSS
 * - TTTT: Type ID (4 digits, zero-padded)
 * - EEEEE: Equipment ID (5 digits, zero-padded)
 * - MMMM: Model hash (4 digits, numeric hash from model name)
 * - SSS: Sequence number (3 digits, zero-padded)
 * Total: 16 digits, all numeric
 * 
 * Example: 0001000010123001
 *   Type: 1, Equipment: 1, Model hash: 0123, Sequence: 1
 */
export const generateSerialNumber = (typeId, equipmentId, model, sequence) => {
  // Pad type_id to 4 digits
  const typePart = String(typeId).padStart(4, '0');
  
  // Pad equipment_id to 5 digits
  const equipPart = String(equipmentId).padStart(5, '0');
  
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
export const generateModelHash = (model) => {
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
 * Returns: { typeId, equipmentId, modelHash, sequence }
 * Accepts both formats: "0001000010123001" or "0001-00001-0123-001"
 */
export const parseSerialNumber = (serialNumber) => {
  if (!serialNumber) {
    throw new Error('Serial number is required');
  }
  
  // Remove dashes if present
  const cleanSerial = serialNumber.replace(/-/g, '');
  
  if (cleanSerial.length !== 16) {
    throw new Error('Serial number must be exactly 16 digits');
  }
  
  return {
    typeId: parseInt(cleanSerial.substring(0, 4)),
    equipmentId: parseInt(cleanSerial.substring(4, 9)),
    modelHash: cleanSerial.substring(9, 13),
    sequence: parseInt(cleanSerial.substring(13, 16))
  };
};

/**
 * Validate serial number format
 * Accepts both formats: "0001000010123001" or "0001-00001-0123-001"
 */
export const isValidSerialNumber = (serialNumber) => {
  if (!serialNumber || typeof serialNumber !== 'string') {
    return false;
  }
  
  // Remove dashes if present
  const cleanSerial = serialNumber.replace(/-/g, '');
  
  // Must be exactly 16 digits
  return /^\d{16}$/.test(cleanSerial);
};

/**
 * Format serial number with separators for display
 * Example: 0001-00001-0123-001
 * Also handles already formatted strings with dashes
 */
export const formatSerialNumberDisplay = (serialNumber) => {
  if (!serialNumber) return '';
  
  // ถ้ามี dash อยู่แล้ว และมี 19 ตัวอักษร (16 หลัก + 3 dash)
  if (serialNumber.includes('-') && serialNumber.length === 19) {
    return serialNumber;
  }
  
  // ลบ dash ออกก่อน (กรณีที่มี dash แต่ไม่ครบ)
  const cleanSerial = serialNumber.replace(/-/g, '');
  
  if (!isValidSerialNumber(cleanSerial)) {
    return serialNumber; // คืนค่าเดิมถ้ารูปแบบไม่ถูกต้อง
  }
  
  const type = cleanSerial.substring(0, 4);
  const equip = cleanSerial.substring(4, 9);
  const model = cleanSerial.substring(9, 13);
  const seq = cleanSerial.substring(13, 16);
  
  return `${type}-${equip}-${model}-${seq}`;
};

/**
 * Get human-readable serial number info
 * Returns object with formatted parts and descriptions
 */
export const getSerialNumberInfo = (serialNumber, equipmentData = null) => {
  try {
    if (!isValidSerialNumber(serialNumber)) {
      return { valid: false, message: 'รูปแบบ Serial Number ไม่ถูกต้อง' };
    }
    
    const parsed = parseSerialNumber(serialNumber);
    
    return {
      valid: true,
      formatted: formatSerialNumberDisplay(serialNumber),
      parts: {
        typeId: parsed.typeId,
        equipmentId: parsed.equipmentId,
        modelHash: parsed.modelHash,
        sequence: parsed.sequence
      },
      display: {
        typeLabel: `ประเภท: ${parsed.typeId}`,
        equipmentLabel: `อุปกรณ์: ${parsed.equipmentId}`,
        modelLabel: `รหัสรุ่น: ${parsed.modelHash}`,
        sequenceLabel: `ลำดับ: ${parsed.sequence}`
      },
      tooltip: `Type: ${parsed.typeId} | Equipment: ${parsed.equipmentId} | Model: ${parsed.modelHash} | Seq: ${parsed.sequence}`
    };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};