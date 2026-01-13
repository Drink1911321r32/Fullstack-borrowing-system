const express = require('express');
const router = express.Router();
const {
  getAllFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getAllMajors,
  getMajorById,
  createMajor,
  updateMajor,
  deleteMajor
} = require('../../controllers/facultyMajorController');
const { protect, admin } = require('../../middleware/authMiddleware');

// ====================================================================
// FACULTY ROUTES
// ====================================================================

// Public routes
router.get('/faculties', getAllFaculties);
router.get('/faculties/:id', getFacultyById);

// Admin only routes
router.post('/faculties', protect, admin, createFaculty);
router.put('/faculties/:id', protect, admin, updateFaculty);
router.delete('/faculties/:id', protect, admin, deleteFaculty);

// ====================================================================
// MAJOR ROUTES
// ====================================================================

// Public routes
router.get('/majors', getAllMajors);
router.get('/majors/:id', getMajorById);

// Admin only routes
router.post('/majors', protect, admin, createMajor);
router.put('/majors/:id', protect, admin, updateMajor);
router.delete('/majors/:id', protect, admin, deleteMajor);

module.exports = router;
