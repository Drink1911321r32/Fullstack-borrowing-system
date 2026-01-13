import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiBookOpen, FiLayers } from 'react-icons/fi';
import {
  getAllFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getAllMajors,
  createMajor,
  updateMajor,
  deleteMajor
} from '../../api/facultyMajorService';

const FacultyMajorManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('faculties'); // 'faculties' or 'majors'

  // Faculty states
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [facultyForm, setFacultyForm] = useState({
    faculty_name: '',
    faculty_code: '',
    description: ''
  });

  // Major states
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [editingMajor, setEditingMajor] = useState(null);
  const [majorForm, setMajorForm] = useState({
    faculty_id: '',
    major_name: '',
    major_code: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facultiesRes, majorsRes] = await Promise.all([
        getAllFaculties(),
        getAllMajors()
      ]);
      setFaculties(facultiesRes.data || []);
      setMajors(majorsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // ==================== Faculty Functions ====================
  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFaculty) {
        await updateFaculty(editingFaculty.faculty_id, facultyForm);
        toast.success('แก้ไขคณะสำเร็จ');
      } else {
        await createFaculty(facultyForm);
        toast.success('เพิ่มคณะสำเร็จ');
      }
      setShowFacultyModal(false);
      setEditingFaculty(null);
      setFacultyForm({ faculty_name: '', faculty_code: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleEditFaculty = (faculty) => {
    setEditingFaculty(faculty);
    setFacultyForm({
      faculty_name: faculty.faculty_name,
      faculty_code: faculty.faculty_code || '',
      description: faculty.description || ''
    });
    setShowFacultyModal(true);
  };

  const handleDeleteFaculty = async (faculty) => {
    if (window.confirm(`ต้องการลบคณะ "${faculty.faculty_name}" หรือไม่?`)) {
      try {
        await deleteFaculty(faculty.faculty_id);
        toast.success('ลบคณะสำเร็จ');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'ไม่สามารถลบคณะได้');
      }
    }
  };

  // ==================== Major Functions ====================
  const handleMajorSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMajor) {
        await updateMajor(editingMajor.major_id, majorForm);
        toast.success('แก้ไขสาขาสำเร็จ');
      } else {
        await createMajor(majorForm);
        toast.success('เพิ่มสาขาสำเร็จ');
      }
      setShowMajorModal(false);
      setEditingMajor(null);
      setMajorForm({ faculty_id: '', major_name: '', major_code: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleEditMajor = (major) => {
    setEditingMajor(major);
    setMajorForm({
      faculty_id: major.faculty_id,
      major_name: major.major_name,
      major_code: major.major_code || '',
      description: major.description || ''
    });
    setShowMajorModal(true);
  };

  const handleDeleteMajor = async (major) => {
    if (window.confirm(`ต้องการลบสาขา "${major.major_name}" หรือไม่?`)) {
      try {
        await deleteMajor(major.major_id);
        toast.success('ลบสาขาสำเร็จ');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'ไม่สามารถลบสาขาได้');
      }
    }
  };

  const getMajorsByFaculty = (facultyId) => {
    return majors.filter(m => m.faculty_id === facultyId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">จัดการคณะและสาขาวิชา</h1>
          <p className="text-gray-600">จัดการข้อมูลคณะและสาขาวิชาในระบบ</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-1 inline-flex gap-1">
            <button
              onClick={() => setActiveTab('faculties')}
              className={`flex items-center gap-2 py-3 px-6 font-medium rounded-md transition-all duration-200 ${
                activeTab === 'faculties'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiBookOpen className="text-lg" />
              <span>จัดการคณะ</span>
              <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'faculties' ? 'bg-indigo-500' : 'bg-gray-200'
              }`}>
                {faculties.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('majors')}
              className={`flex items-center gap-2 py-3 px-6 font-medium rounded-md transition-all duration-200 ${
                activeTab === 'majors'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiLayers className="text-lg" />
              <span>จัดการสาขา</span>
              <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'majors' ? 'bg-indigo-500' : 'bg-gray-200'
              }`}>
                {majors.length}
              </span>
            </button>
          </div>
        </div>

        {/* Faculty Tab */}
        {activeTab === 'faculties' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">รายการคณะ</h2>
                <p className="text-gray-600 text-sm mt-1">ทั้งหมด {faculties.length} คณะ</p>
              </div>
              <button
                onClick={() => {
                  setEditingFaculty(null);
                  setFacultyForm({ faculty_name: '', faculty_code: '', description: '' });
                  setShowFacultyModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FiPlus className="text-lg" /> 
                <span className="font-medium">เพิ่มคณะใหม่</span>
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {faculties.map(faculty => (
                <div 
                  key={faculty.faculty_id} 
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <FiBookOpen className="text-indigo-600 text-xl" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{faculty.faculty_name}</h3>
                          {faculty.faculty_code && (
                            <p className="text-sm text-indigo-600 font-medium">รหัส: {faculty.faculty_code}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFaculty(faculty)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <FiEdit2 className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaculty(faculty)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <FiTrash2 className="text-lg" />
                      </button>
                    </div>
                  </div>
                  
                  {faculty.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{faculty.description}</p>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">จำนวนสาขา</span>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                        {getMajorsByFaculty(faculty.faculty_id).length} สาขา
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {faculties.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <FiBookOpen className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">ยังไม่มีข้อมูลคณะ</h3>
                <p className="text-gray-500">เริ่มต้นโดยการเพิ่มคณะใหม่</p>
              </div>
            )}
          </div>
        )}

        {/* Major Tab */}
        {activeTab === 'majors' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">รายการสาขาวิชา</h2>
                <p className="text-gray-600 text-sm mt-1">ทั้งหมด {majors.length} สาขา</p>
              </div>
              <button
                onClick={() => {
                  setEditingMajor(null);
                  setMajorForm({ faculty_id: '', major_name: '', major_code: '', description: '' });
                  setShowMajorModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FiPlus className="text-lg" /> 
                <span className="font-medium">เพิ่มสาขาใหม่</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        สาขาวิชา
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        รหัสสาขา
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        คณะ
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {majors.map((major, index) => (
                      <tr key={major.major_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <FiLayers className="text-indigo-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{major.major_name}</div>
                              {major.description && (
                                <div className="text-sm text-gray-500 line-clamp-1">{major.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                            {major.major_code || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium">
                            {major.faculty?.faculty_name || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditMajor(major)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <FiEdit2 className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleDeleteMajor(major)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <FiTrash2 className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {majors.length === 0 && (
                <div className="p-12 text-center">
                  <FiLayers className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">ยังไม่มีข้อมูลสาขา</h3>
                  <p className="text-gray-500">เริ่มต้นโดยการเพิ่มสาขาใหม่</p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Faculty Modal */}
      {showFacultyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md transform transition-all animate-slideUp shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <FiBookOpen className="text-white text-xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    {editingFaculty ? 'แก้ไขคณะ' : 'เพิ่มคณะใหม่'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowFacultyModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFacultySubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ชื่อคณะ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={facultyForm.faculty_name}
                    onChange={(e) => setFacultyForm({ ...facultyForm, faculty_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="เช่น คณะวิศวกรรมศาสตร์"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    รหัสคณะ
                  </label>
                  <input
                    type="text"
                    value={facultyForm.faculty_code}
                    onChange={(e) => setFacultyForm({ ...facultyForm, faculty_code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="เช่น ENG"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    คำอธิบาย
                  </label>
                  <textarea
                    value={facultyForm.description}
                    onChange={(e) => setFacultyForm({ ...facultyForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    rows="3"
                    placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับคณะ"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowFacultyModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  {editingFaculty ? 'บันทึกการแก้ไข' : 'เพิ่มคณะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Major Modal */}
      {showMajorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md transform transition-all animate-slideUp shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <FiLayers className="text-white text-xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    {editingMajor ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowMajorModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleMajorSubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    คณะ <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={majorForm.faculty_id}
                    onChange={(e) => setMajorForm({ ...majorForm, faculty_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">เลือกคณะ</option>
                    {faculties.map(f => (
                      <option key={f.faculty_id} value={f.faculty_id}>
                        {f.faculty_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ชื่อสาขา <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={majorForm.major_name}
                    onChange={(e) => setMajorForm({ ...majorForm, major_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    รหัสสาขา
                  </label>
                  <input
                    type="text"
                    value={majorForm.major_code}
                    onChange={(e) => setMajorForm({ ...majorForm, major_code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="เช่น CPE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    คำอธิบาย
                  </label>
                  <textarea
                    value={majorForm.description}
                    onChange={(e) => setMajorForm({ ...majorForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    rows="3"
                    placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสาขา"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowMajorModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  {editingMajor ? 'บันทึกการแก้ไข' : 'เพิ่มสาขา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default FacultyMajorManagement;
