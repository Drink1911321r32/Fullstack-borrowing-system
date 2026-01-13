import axios from './api';

/**
 * Faculty API Service
 */

// ดึงรายการคณะทั้งหมด
export const getAllFaculties = async (includeInactive = false) => {
  const params = includeInactive ? { include_inactive: 'true' } : {};
  const response = await axios.get('/faculties', { params });
  return response.data;
};

// ดึงข้อมูลคณะตาม ID
export const getFacultyById = async (id) => {
  const response = await axios.get(`/faculties/${id}`);
  return response.data;
};

// สร้างคณะใหม่
export const createFaculty = async (facultyData) => {
  const response = await axios.post('/faculties', facultyData);
  return response.data;
};

// แก้ไขข้อมูลคณะ
export const updateFaculty = async (id, facultyData) => {
  const response = await axios.put(`/faculties/${id}`, facultyData);
  return response.data;
};

// ลบคณะ
export const deleteFaculty = async (id) => {
  const response = await axios.delete(`/faculties/${id}`);
  return response.data;
};

/**
 * Major API Service
 */

// ดึงรายการสาขาทั้งหมด (สามารถ filter ตามคณะได้)
export const getAllMajors = async (facultyId = null, includeInactive = false) => {
  const params = {};
  if (facultyId) params.faculty_id = facultyId;
  if (includeInactive) params.include_inactive = 'true';
  
  const response = await axios.get('/majors', { params });
  return response.data;
};

// ดึงข้อมูลสาขาตาม ID
export const getMajorById = async (id) => {
  const response = await axios.get(`/majors/${id}`);
  return response.data;
};

// สร้างสาขาใหม่
export const createMajor = async (majorData) => {
  const response = await axios.post('/majors', majorData);
  return response.data;
};

// แก้ไขข้อมูลสาขา
export const updateMajor = async (id, majorData) => {
  const response = await axios.put(`/majors/${id}`, majorData);
  return response.data;
};

// ลบสาขา
export const deleteMajor = async (id) => {
  const response = await axios.delete(`/majors/${id}`);
  return response.data;
};
