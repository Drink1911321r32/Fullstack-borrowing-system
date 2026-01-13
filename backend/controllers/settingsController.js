const SystemSettings = require('../models/SystemSettings');
const { formatSuccessResponse, formatErrorResponse } = require('../utils');
const { HTTP_STATUS } = require('../constants');

/**
 * ดึงการตั้งค่าทั้งหมด
 * @route GET /api/admin/settings
 */
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.findAll({
      order: [['setting_key', 'ASC']]
    });

    res.json(formatSuccessResponse(settings, 'ดึงข้อมูลการตั้งค่าสำเร็จ'));
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * ดึงการตั้งค่าตาม key
 * @route GET /api/admin/settings/:key
 */
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await SystemSettings.findOne({
      where: { setting_key: key }
    });

    if (!setting) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบการตั้งค่า', HTTP_STATUS.NOT_FOUND)
      );
    }

    res.json(formatSuccessResponse(setting, 'ดึงข้อมูลการตั้งค่าสำเร็จ'));
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * อัพเดทการตั้งค่า
 * @route PUT /api/admin/settings/:key
 */
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value } = req.body;
    const userId = req.user.admin_id;

    if (setting_value === undefined || setting_value === null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาระบุค่าการตั้งค่า', HTTP_STATUS.BAD_REQUEST)
      );
    }

    const setting = await SystemSettings.findOne({
      where: { setting_key: key }
    });

    if (!setting) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบการตั้งค่า', HTTP_STATUS.NOT_FOUND)
      );
    }

    // ตรวจสอบค่าตาม type
    if (setting.setting_type === 'number') {
      const numValue = Number(setting_value);
      if (isNaN(numValue)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('ค่าการตั้งค่าต้องเป็นตัวเลข', HTTP_STATUS.BAD_REQUEST)
        );
      }
      
      // ตรวจสอบค่าเครดิตเริ่มต้น
      if (key === 'default_user_credit' && (numValue < 0 || numValue > 10000)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('เครดิตเริ่มต้นต้องอยู่ระหว่าง 0-10,000', HTTP_STATUS.BAD_REQUEST)
        );
      }
      
      // ตรวจสอบค่าปรับ - ดึง penalty_type เพื่อแสดง error message ที่ถูกต้อง
      if (key === 'penalty_credit_per_hour' && (numValue < 1 || numValue > 100)) {
        // ดึง penalty_type จาก database
        const penaltyTypeSetting = await SystemSettings.findOne({
          where: { setting_key: 'penalty_type' }
        });
        const penaltyType = penaltyTypeSetting?.setting_value || 'hour';
        const unit = penaltyType === 'day' ? 'วัน' : 'ชั่วโมง';
        
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse(`ค่าปรับต่อ${unit}ต้องอยู่ระหว่าง 1-100 เครดิต`, HTTP_STATUS.BAD_REQUEST)
        );
      }
    }

    if (setting.setting_type === 'boolean') {
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
      if (!validBooleans.includes(String(setting_value).toLowerCase())) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          formatErrorResponse('ค่าการตั้งค่าต้องเป็น true หรือ false', HTTP_STATUS.BAD_REQUEST)
        );
      }
    }

    // อัพเดทการตั้งค่า
    await setting.update({
      setting_value: String(setting_value),
      updated_by: userId
    });

    res.json(formatSuccessResponse(setting, 'อัพเดทการตั้งค่าสำเร็จ'));
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการอัพเดทการตั้งค่า', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * สร้างการตั้งค่าใหม่
 * @route POST /api/admin/settings
 */
exports.createSetting = async (req, res) => {
  try {
    const { setting_key, setting_value, setting_type, description } = req.body;
    const userId = req.user.admin_id;

    if (!setting_key || !setting_value) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาระบุ key และ value', HTTP_STATUS.BAD_REQUEST)
      );
    }

    // ตรวจสอบว่ามี key นี้แล้วหรือไม่
    const existing = await SystemSettings.findOne({
      where: { setting_key }
    });

    if (existing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('มีการตั้งค่านี้อยู่แล้ว', HTTP_STATUS.BAD_REQUEST)
      );
    }

    const newSetting = await SystemSettings.create({
      setting_key,
      setting_value: String(setting_value),
      setting_type: setting_type || 'string',
      description,
      updated_by: userId
    });

    res.status(HTTP_STATUS.CREATED).json(
      formatSuccessResponse(newSetting, 'สร้างการตั้งค่าสำเร็จ')
    );
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการสร้างการตั้งค่า', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * ลบการตั้งค่า
 * @route DELETE /api/admin/settings/:key
 */
exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    // ป้องกันการลบการตั้งค่าที่สำคัญ
    const protectedKeys = ['default_user_credit', 'system_name'];
    if (protectedKeys.includes(key)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ไม่สามารถลบการตั้งค่านี้ได้', HTTP_STATUS.BAD_REQUEST)
      );
    }

    const setting = await SystemSettings.findOne({
      where: { setting_key: key }
    });

    if (!setting) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบการตั้งค่า', HTTP_STATUS.NOT_FOUND)
      );
    }

    await setting.destroy();

    res.json(formatSuccessResponse(null, 'ลบการตั้งค่าสำเร็จ'));
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการลบการตั้งค่า', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};
