import { generateSerialNumber, isValidSerialNumber, getSerialNumberInfo } from '../../utils';

/**
 * Validation สำหรับ Equipment Item Form
 */
export const validateItemForm = (formData) => {
  const errors = [];

  if (!formData.serial_number) {
    errors.push('กรุณาระบุหมายเลขซีเรียล');
  } else if (!isValidSerialNumber(formData.serial_number)) {
    errors.push('Serial Number ต้องเป็นตัวเลข 16 หลัก');
  }

  if (formData.purchase_date && formData.warranty_expiry) {
    const purchaseDate = new Date(formData.purchase_date);
    const warrantyDate = new Date(formData.warranty_expiry);
    if (warrantyDate < purchaseDate) {
      errors.push('วันหมดประกันต้องมาหลังวันซื้อ');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * สร้าง Serial Number ใหม่
 */
export const generateNewSerial = (equipment, equipmentTypes) => {
  const currentType = equipmentTypes?.find(t => t.type_id === equipment?.type_id);
  return generateSerialNumber(
    currentType?.type_id,
    equipment?.equipment_id,
    equipment?.model || '0000'
  );
};

/**
 * กรอง Items ตาม status
 */
export const filterItemsByStatus = (items, statusFilter) => {
  if (statusFilter === 'all') return items;
  return items.filter(item => item.status === statusFilter);
};

/**
 * นับจำนวน Items แต่ละ status
 */
export const countItemsByStatus = (items) => {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
};

/**
 * แปลง status เป็นสีและข้อความ
 */
export const getStatusDisplay = (status) => {
  const statusMap = {
    'Available': { label: 'พร้อมใช้งาน', color: 'green', icon: 'FiCheck' },
    'Borrowed': { label: 'ถูกยืม', color: 'blue', icon: 'FiClock' },
    'Maintenance': { label: 'ซ่อมบำรุง', color: 'yellow', icon: 'FiTool' },
    'Damaged': { label: 'ชำรุด', color: 'red', icon: 'FiAlertTriangle' },
    'Lost': { label: 'สูญหาย', color: 'gray', icon: 'FiAlertCircle' }
  };
  return statusMap[status] || { label: status, color: 'gray', icon: 'FiInfo' };
};
