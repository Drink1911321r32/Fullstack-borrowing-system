const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware สำหรับตรวจสอบ validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Validation Rules สำหรับ Borrowing
 */
const borrowingValidation = {
  create: [
    body('equipment_id').isInt({ min: 1 }).withMessage('equipment_id ต้องเป็นตัวเลขบวก'),
    body('quantity_borrowed').optional().isInt({ min: 1, max: 100 }).withMessage('จำนวนต้องอยู่ระหว่าง 1-100'),
    body('expected_return_date').isISO8601().withMessage('วันที่ไม่ถูกต้อง'),
    body('purpose').optional().isLength({ max: 500 }).withMessage('วัตถุประสงค์ยาวเกินไป'),
    body('location').optional().isLength({ max: 255 }).withMessage('สถานที่ยาวเกินไป'),
    validate
  ],
  
  approve: [
    param('id').isInt({ min: 1 }).withMessage('ID ไม่ถูกต้อง'),
    body('notes').optional().isLength({ max: 500 }).withMessage('หมายเหตุยาวเกินไป'),
    validate
  ]
};

/**
 * Validation Rules สำหรับ Equipment
 */
const equipmentValidation = {
  create: [
    body('equipment_name').trim().isLength({ min: 2, max: 255 }).withMessage('ชื่ออุปกรณ์ต้องมี 2-255 ตัวอักษร'),
    body('model').optional().isLength({ max: 255 }).withMessage('รุ่นยาวเกินไป'),
    body('type_id').isInt({ min: 1 }).withMessage('ต้องระบุประเภทอุปกรณ์'),
    body('credit').optional().isFloat({ min: 0, max: 10000 }).withMessage('เครดิตต้องอยู่ระหว่าง 0-10000'),
    body('quantity').optional().isInt({ min: 1, max: 10000 }).withMessage('จำนวนต้องอยู่ระหว่าง 1-10000'),
    validate
  ],
  
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID ไม่ถูกต้อง'),
    body('equipment_name').optional().trim().isLength({ min: 2, max: 255 }),
    body('credit').optional().isFloat({ min: 0, max: 10000 }),
    body('quantity').optional().isInt({ min: 0, max: 10000 }),
    validate
  ]
};

/**
 * Validation Rules สำหรับ Return
 */
const returnValidation = {
  create: [
    body('borrowing_id').isInt({ min: 1 }).withMessage('borrowing_id ไม่ถูกต้อง'),
    body('return_quantity').optional().isInt({ min: 1, max: 100 }).withMessage('จำนวนคืนต้องอยู่ระหว่าง 1-100'),
    body('damage_cost').optional().isFloat({ min: 0, max: 100000 }).withMessage('ค่าเสียหายไม่ถูกต้อง'),
    body('late_penalty').optional().isFloat({ min: 0, max: 100000 }).withMessage('ค่าปรับไม่ถูกต้อง'),
    body('additional_penalty').optional().isFloat({ min: 0, max: 100000 }).withMessage('ค่าปรับเพิ่มเติมไม่ถูกต้อง'),
    body('damage_description').optional().isLength({ max: 500 }).withMessage('รายละเอียดยาวเกินไป'),
    validate
  ]
};

/**
 * Validation Rules สำหรับ User
 */
const userValidation = {
  create: [
    body('email').isEmail().normalizeEmail().withMessage('อีเมลไม่ถูกต้อง'),
    body('password').isLength({ min: 6, max: 100 }).withMessage('รหัสผ่านต้องมี 6-100 ตัวอักษร'),
    body('first_name').trim().isLength({ min: 2, max: 50 }).withMessage('ชื่อต้องมี 2-50 ตัวอักษร'),
    body('last_name').trim().isLength({ min: 2, max: 50 }).withMessage('นามสกุลต้องมี 2-50 ตัวอักษร'),
    body('credit').optional().isInt({ min: 0, max: 10000 }).withMessage('เครดิตต้องอยู่ระหว่าง 0-10000'),
    validate
  ],
  
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID ไม่ถูกต้อง'),
    body('email').optional().isEmail().normalizeEmail(),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }),
    body('last_name').optional().trim().isLength({ min: 2, max: 50 }),
    body('credit').optional().isInt({ min: 0, max: 10000 }),
    validate
  ],
  
  adjustCredit: [
    body('userId').isInt({ min: 1 }).withMessage('userId ไม่ถูกต้อง'),
    body('amount').isInt({ min: -10000, max: 10000 }).withMessage('จำนวนเครดิตไม่ถูกต้อง'),
    body('description').trim().isLength({ min: 1, max: 500 }).withMessage('คำอธิบายต้องมี 1-500 ตัวอักษร'),
    validate
  ]
};

/**
 * Validation สำหรับ Query Parameters
 */
const queryValidation = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('หน้าต้องเป็นตัวเลขบวก'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit ต้องอยู่ระหว่าง 1-1000'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset ต้องไม่ติดลบ'),
    validate
  ]
};

/**
 * Sanitize HTML เพื่อป้องกัน XSS
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // ลบ HTML tags
        obj[key] = obj[key].replace(/<[^>]*>/g, '');
        // ลบ script tags
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

module.exports = {
  validate,
  borrowingValidation,
  equipmentValidation,
  returnValidation,
  userValidation,
  queryValidation,
  sanitizeInput
};
