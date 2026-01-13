const { Faculty, Major } = require('../models');
const { formatSuccessResponse, formatErrorResponse } = require('../utils');
const { HTTP_STATUS } = require('../constants');

// ====================================================================
// FACULTY CONTROLLERS
// ====================================================================

/**
 * @desc    ดึงรายการคณะทั้งหมด
 * @route   GET /api/faculties
 * @access  Public
 */
exports.getAllFaculties = async (req, res) => {
  try {
    const { include_inactive } = req.query;
    
    const whereClause = include_inactive === 'true' ? {} : { is_active: true };
    
    const faculties = await Faculty.findAll({
      where: whereClause,
      order: [['faculty_name', 'ASC']],
      include: [{
        model: Major,
        as: 'majors',
        where: { is_active: true },
        required: false,
        attributes: ['major_id', 'major_name', 'major_code']
      }]
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(faculties, 'ดึงข้อมูลคณะสำเร็จ')
    );
  } catch (error) {
    console.error('Get all faculties error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลคณะ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    ดึงข้อมูลคณะตาม ID
 * @route   GET /api/faculties/:id
 * @access  Public
 */
exports.getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findByPk(id, {
      include: [{
        model: Major,
        as: 'majors',
        where: { is_active: true },
        required: false
      }]
    });

    if (!faculty) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลคณะ', HTTP_STATUS.NOT_FOUND)
      );
    }

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(faculty, 'ดึงข้อมูลคณะสำเร็จ')
    );
  } catch (error) {
    console.error('Get faculty by id error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลคณะ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    สร้างคณะใหม่
 * @route   POST /api/faculties
 * @access  Private (Admin)
 */
exports.createFaculty = async (req, res) => {
  try {
    const { faculty_name, faculty_code, description, is_active } = req.body;

    // Validation
    if (!faculty_name || faculty_name.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ชื่อคณะต้องมีความยาวอย่างน้อย 2 ตัวอักษร', HTTP_STATUS.BAD_REQUEST)
      );
    }

    // ตรวจสอบชื่อซ้ำ
    const existingFaculty = await Faculty.findOne({
      where: { faculty_name: faculty_name.trim() }
    });

    if (existingFaculty) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        formatErrorResponse('ชื่อคณะนี้มีอยู่ในระบบแล้ว', HTTP_STATUS.CONFLICT)
      );
    }

    const newFaculty = await Faculty.create({
      faculty_name: faculty_name.trim(),
      faculty_code: faculty_code ? faculty_code.trim() : null,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(HTTP_STATUS.CREATED).json(
      formatSuccessResponse(newFaculty, 'สร้างคณะสำเร็จ')
    );
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการสร้างคณะ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    แก้ไขข้อมูลคณะ
 * @route   PUT /api/faculties/:id
 * @access  Private (Admin)
 */
exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { faculty_name, faculty_code, description, is_active } = req.body;

    const faculty = await Faculty.findByPk(id);

    if (!faculty) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลคณะ', HTTP_STATUS.NOT_FOUND)
      );
    }

    // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเอง)
    if (faculty_name && faculty_name.trim() !== faculty.faculty_name) {
      const existingFaculty = await Faculty.findOne({
        where: { faculty_name: faculty_name.trim() }
      });

      if (existingFaculty) {
        return res.status(HTTP_STATUS.CONFLICT).json(
          formatErrorResponse('ชื่อคณะนี้มีอยู่ในระบบแล้ว', HTTP_STATUS.CONFLICT)
        );
      }
    }

    // อัพเดตข้อมูล
    await faculty.update({
      faculty_name: faculty_name ? faculty_name.trim() : faculty.faculty_name,
      faculty_code: faculty_code !== undefined ? (faculty_code ? faculty_code.trim() : null) : faculty.faculty_code,
      description: description !== undefined ? description : faculty.description,
      is_active: is_active !== undefined ? is_active : faculty.is_active
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(faculty, 'แก้ไขข้อมูลคณะสำเร็จ')
    );
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการแก้ไขข้อมูลคณะ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    ลบคณะ
 * @route   DELETE /api/faculties/:id
 * @access  Private (Admin)
 */
exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findByPk(id, {
      include: [{
        model: Major,
        as: 'majors'
      }]
    });

    if (!faculty) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลคณะ', HTTP_STATUS.NOT_FOUND)
      );
    }

    // ตรวจสอบว่ามีสาขาที่เชื่อมโยงอยู่หรือไม่
    if (faculty.majors && faculty.majors.length > 0) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        formatErrorResponse('ไม่สามารถลบคณะที่มีสาขาวิชาผูกอยู่', HTTP_STATUS.CONFLICT)
      );
    }

    await faculty.destroy();

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(null, 'ลบคณะสำเร็จ')
    );
  } catch (error) {
    console.error('Delete faculty error:', error);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(HTTP_STATUS.CONFLICT).json(
        formatErrorResponse('ไม่สามารถลบคณะที่มีข้อมูลผูกอยู่', HTTP_STATUS.CONFLICT)
      );
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการลบคณะ', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

// ====================================================================
// MAJOR CONTROLLERS
// ====================================================================

/**
 * @desc    ดึงรายการสาขาทั้งหมด
 * @route   GET /api/majors
 * @access  Public
 */
exports.getAllMajors = async (req, res) => {
  try {
    const { faculty_id, include_inactive } = req.query;
    
    const whereClause = {};
    if (faculty_id) {
      whereClause.faculty_id = faculty_id;
    }
    if (include_inactive !== 'true') {
      whereClause.is_active = true;
    }
    
    const majors = await Major.findAll({
      where: whereClause,
      order: [['major_name', 'ASC']],
      include: [{
        model: Faculty,
        as: 'faculty',
        attributes: ['faculty_id', 'faculty_name', 'faculty_code']
      }]
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(majors, 'ดึงข้อมูลสาขาวิชาสำเร็จ')
    );
  } catch (error) {
    console.error('Get all majors error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลสาขาวิชา', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    ดึงข้อมูลสาขาตาม ID
 * @route   GET /api/majors/:id
 * @access  Public
 */
exports.getMajorById = async (req, res) => {
  try {
    const { id } = req.params;

    const major = await Major.findByPk(id, {
      include: [{
        model: Faculty,
        as: 'faculty'
      }]
    });

    if (!major) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลสาขาวิชา', HTTP_STATUS.NOT_FOUND)
      );
    }

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(major, 'ดึงข้อมูลสาขาวิชาสำเร็จ')
    );
  } catch (error) {
    console.error('Get major by id error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการดึงข้อมูลสาขาวิชา', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    สร้างสาขาใหม่
 * @route   POST /api/majors
 * @access  Private (Admin)
 */
exports.createMajor = async (req, res) => {
  try {
    const { faculty_id, major_name, major_code, description, is_active } = req.body;

    // Validation
    if (!faculty_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('กรุณาระบุคณะ', HTTP_STATUS.BAD_REQUEST)
      );
    }

    if (!major_name || major_name.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatErrorResponse('ชื่อสาขาต้องมีความยาวอย่างน้อย 2 ตัวอักษร', HTTP_STATUS.BAD_REQUEST)
      );
    }

    // ตรวจสอบว่าคณะมีอยู่จริง
    const faculty = await Faculty.findByPk(faculty_id);
    if (!faculty) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลคณะ', HTTP_STATUS.NOT_FOUND)
      );
    }

    // ตรวจสอบชื่อซ้ำในคณะเดียวกัน
    const existingMajor = await Major.findOne({
      where: {
        faculty_id,
        major_name: major_name.trim()
      }
    });

    if (existingMajor) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        formatErrorResponse('ชื่อสาขานี้มีอยู่ในคณะนี้แล้ว', HTTP_STATUS.CONFLICT)
      );
    }

    const newMajor = await Major.create({
      faculty_id,
      major_name: major_name.trim(),
      major_code: major_code ? major_code.trim() : null,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true
    });

    // ดึงข้อมูลพร้อม faculty
    const majorWithFaculty = await Major.findByPk(newMajor.major_id, {
      include: [{
        model: Faculty,
        as: 'faculty'
      }]
    });

    res.status(HTTP_STATUS.CREATED).json(
      formatSuccessResponse(majorWithFaculty, 'สร้างสาขาวิชาสำเร็จ')
    );
  } catch (error) {
    console.error('Create major error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการสร้างสาขาวิชา', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    แก้ไขข้อมูลสาขา
 * @route   PUT /api/majors/:id
 * @access  Private (Admin)
 */
exports.updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { faculty_id, major_name, major_code, description, is_active } = req.body;

    const major = await Major.findByPk(id);

    if (!major) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลสาขาวิชา', HTTP_STATUS.NOT_FOUND)
      );
    }

    // ตรวจสอบคณะถ้ามีการเปลี่ยน
    if (faculty_id && faculty_id !== major.faculty_id) {
      const faculty = await Faculty.findByPk(faculty_id);
      if (!faculty) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          formatErrorResponse('ไม่พบข้อมูลคณะ', HTTP_STATUS.NOT_FOUND)
        );
      }
    }

    // ตรวจสอบชื่อซ้ำในคณะเดียวกัน (ยกเว้นตัวเอง)
    const checkFacultyId = faculty_id || major.faculty_id;
    const checkMajorName = major_name ? major_name.trim() : major.major_name;

    if (major_name && (major_name.trim() !== major.major_name || faculty_id !== major.faculty_id)) {
      const existingMajor = await Major.findOne({
        where: {
          faculty_id: checkFacultyId,
          major_name: checkMajorName
        }
      });

      if (existingMajor && existingMajor.major_id !== major.major_id) {
        return res.status(HTTP_STATUS.CONFLICT).json(
          formatErrorResponse('ชื่อสาขานี้มีอยู่ในคณะนี้แล้ว', HTTP_STATUS.CONFLICT)
        );
      }
    }

    // อัพเดตข้อมูล
    await major.update({
      faculty_id: faculty_id || major.faculty_id,
      major_name: major_name ? major_name.trim() : major.major_name,
      major_code: major_code !== undefined ? (major_code ? major_code.trim() : null) : major.major_code,
      description: description !== undefined ? description : major.description,
      is_active: is_active !== undefined ? is_active : major.is_active
    });

    // ดึงข้อมูลพร้อม faculty
    const updatedMajor = await Major.findByPk(id, {
      include: [{
        model: Faculty,
        as: 'faculty'
      }]
    });

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(updatedMajor, 'แก้ไขข้อมูลสาขาวิชาสำเร็จ')
    );
  } catch (error) {
    console.error('Update major error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการแก้ไขข้อมูลสาขาวิชา', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * @desc    ลบสาขา
 * @route   DELETE /api/majors/:id
 * @access  Private (Admin)
 */
exports.deleteMajor = async (req, res) => {
  try {
    const { id } = req.params;

    const major = await Major.findByPk(id);

    if (!major) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        formatErrorResponse('ไม่พบข้อมูลสาขาวิชา', HTTP_STATUS.NOT_FOUND)
      );
    }

    await major.destroy();

    res.status(HTTP_STATUS.OK).json(
      formatSuccessResponse(null, 'ลบสาขาวิชาสำเร็จ')
    );
  } catch (error) {
    console.error('Delete major error:', error);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(HTTP_STATUS.CONFLICT).json(
        formatErrorResponse('ไม่สามารถลบสาขาที่มีข้อมูลผูกอยู่', HTTP_STATUS.CONFLICT)
      );
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse('เกิดข้อผิดพลาดในการลบสาขาวิชา', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }
};
