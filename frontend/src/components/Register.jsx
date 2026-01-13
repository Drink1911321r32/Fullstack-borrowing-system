import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI } from '../api/api';
import { FiMail, FiLock, FiArrowLeft, FiUser, FiAlertCircle, FiCreditCard, FiUserPlus } from 'react-icons/fi';
import axios from 'axios';
import { getAllFaculties, getAllMajors } from '../api/facultyMajorService';

const Register = () => {
  const navigate = useNavigate();
  const [defaultCredit, setDefaultCredit] = useState(100);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [systemName, setSystemName] = useState('ระบบยืม-คืนและเบิกจ่ายวัสดุ');
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [filteredMajors, setFilteredMajors] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentCode: '',
    facultyId: '',
    majorId: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    credit: 100
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const creditRes = await axios.get(`${API_URL}/api/users/settings/public/default_user_credit`);
        if (creditRes.data && creditRes.data.success) {
          const credit = Number(creditRes.data.data.setting_value) || 100;
          setDefaultCredit(credit);
          setFormData(prev => ({ ...prev, credit }));
        }
        
        const regRes = await axios.get(`${API_URL}/api/users/settings/public/allow_registration`);
        if (regRes.data && regRes.data.success) {
          setAllowRegistration(regRes.data.data.setting_value === 'true');
        }
        
        const nameRes = await axios.get(`${API_URL}/api/users/settings/public/system_name`);
        if (nameRes.data && nameRes.data.success) {
          setSystemName(nameRes.data.data.setting_value);
        }
      } catch (error) {
        // Use defaults
      }
    };

    const fetchFacultiesAndMajors = async () => {
      try {
        const [facultiesRes, majorsRes] = await Promise.all([
          getAllFaculties(),
          getAllMajors()
        ]);
        setFaculties(facultiesRes.data || []);
        setMajors(majorsRes.data || []);
      } catch (error) {
        // Handle error
      }
    };

    fetchSettings();
    fetchFacultiesAndMajors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // ถ้าเปลี่ยนคณะ ให้รีเซ็ตสาขา และกรองสาขาใหม่
    if (name === 'facultyId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        majorId: '' // รีเซ็ตสาขา
      }));
      
      // กรองสาขาตามคณะที่เลือก
      if (value) {
        const filtered = majors.filter(m => m.faculty_id === parseInt(value));
        setFilteredMajors(filtered);
      } else {
        setFilteredMajors([]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'กรุณากรอกชื่อ';
      } else if (formData.firstName.trim().length < 2) {
        newErrors.firstName = 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร';
      } else if (formData.firstName.trim().length > 50) {
        newErrors.firstName = 'ชื่อต้องไม่เกิน 50 ตัวอักษร';
      } else if (!/^[ก-๙]+$/.test(formData.firstName.trim())) {
        newErrors.firstName = 'ชื่อต้องเป็นภาษาไทยเท่านั้น และห้ามมีตัวเลขหรืออักขระพิเศษ';
      }
      
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'กรุณากรอกนามสกุล';
      } else if (formData.lastName.trim().length < 2) {
        newErrors.lastName = 'นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร';
      } else if (formData.lastName.trim().length > 50) {
        newErrors.lastName = 'นามสกุลต้องไม่เกิน 50 ตัวอักษร';
      } else if (!/^[ก-๙]+$/.test(formData.lastName.trim())) {
        newErrors.lastName = 'นามสกุลต้องเป็นภาษาไทยเท่านั้น และห้ามมีตัวเลขหรืออักขระพิเศษ';
      }
      
      if (formData.studentCode.trim()) {
        const studentCodePattern = /^\d{11}-\d{1}$/;
        if (!studentCodePattern.test(formData.studentCode.trim())) {
          newErrors.studentCode = 'รูปแบบรหัสนักศึกษาไม่ถูกต้อง (ต้องเป็น 11 หลัก-1 หลัก เช่น 12345678901-2)';
        }
      } else {
        newErrors.studentCode = 'กรุณากรอกรหัสนักศึกษา';
      }
    } else if (step === 2) {
      if (!formData.email.trim()) {
        newErrors.email = 'กรุณากรอกอีเมล';
      } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (!formData.email.toLowerCase().endsWith('@rmuti.ac.th')) {
        newErrors.email = 'กรุณาใช้อีเมลของมหาวิทยาลัย (@rmuti.ac.th) เท่านั้น';
      } else if (formData.email.length > 100) {
        newErrors.email = 'อีเมลต้องไม่เกิน 100 ตัวอักษร';
      }
    } else if (step === 3) {
      if (!formData.password) {
        newErrors.password = 'กรุณากรอกรหัสผ่าน';
      } else if (formData.password.length < 6) {
        newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      } else if (formData.password.length > 100) {
        newErrors.password = 'รหัสผ่านต้องไม่เกิน 100 ตัวอักษร';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      toast.error('กรุณาแก้ไขข้อมูลให้ถูกต้อง');
      return;
    }
    
    setIsLoading(true);
    try {
      const userData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        member_type: 'student', // บังคับให้เป็น student เสมอ
        credit: Number(formData.credit) || 100,
        student_code: formData.studentCode.trim(), // ส่งรหัสนักศึกษา (required)
        faculty_id: formData.facultyId ? parseInt(formData.facultyId) : null,
        major_id: formData.majorId ? parseInt(formData.majorId) : null
      };

      const response = await userAPI.register(userData);
      
      if (response && response.data) {
        toast.success('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      console.error('Register error:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
        
        if (error.response.data.message.includes('อีเมลนี้ถูกใช้งานแล้ว')) {
          setErrors(prev => ({ ...prev, email: 'อีเมลนี้ถูกใช้งานแล้ว' }));
        }
      } else {
        toast.error('เกิดข้อผิดพลาดในการลงทะเบียน');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!allowRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 shadow-lg rounded-lg">
            <div className="flex items-center">
              <FiAlertCircle className="h-8 w-8 text-yellow-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-yellow-800">ปิดรับสมัครสมาชิกชั่วคราว</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  ขณะนี้ระบบปิดรับสมัครสมาชิกใหม่ กรุณาติดต่อผู้ดูแลระบบหรือลองใหม่ภายหลัง
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900">
              <FiArrowLeft className="mr-2" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
              <div className="relative bg-white p-4 rounded-full shadow-xl">
                <FiUserPlus className="h-14 w-14 text-indigo-600" />
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-gradient">
            สมัครสมาชิก
          </h2>
          <p className="mt-3 text-base text-gray-700 font-medium">
            สมัครสมาชิกเพื่อใช้งาน{systemName}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-lg py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-white/20">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600 font-medium">ข้อมูลส่วนตัว</div>
              <div className="text-xs text-gray-600 font-medium">คณะ/สาขา</div>
              <div className="text-xs text-gray-600 font-medium">รหัสผ่าน</div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
            <div className="mt-1 text-right text-xs text-gray-500">
              ขั้นตอนที่ {currentStep} จาก {totalSteps}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-800 mb-2">
                      ชื่อ
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiUser className={`h-5 w-5 ${errors.firstName ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                      </div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                          errors.firstName ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                        } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                        placeholder="กรอกชื่อของคุณ"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="mr-1 h-4 w-4" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-800 mb-2">
                      นามสกุล
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiUser className={`h-5 w-5 ${errors.lastName ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                      </div>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                          errors.lastName ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                        } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                        placeholder="กรอกนามสกุลของคุณ"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="mr-1 h-4 w-4" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="studentCode" className="block text-sm font-semibold text-gray-800 mb-2">
                    รหัสนักศึกษา <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiCreditCard className={`h-5 w-5 ${errors.studentCode ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                    </div>
                    <input
                      id="studentCode"
                      name="studentCode"
                      type="text"
                      value={formData.studentCode}
                      onChange={handleChange}
                      className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                        errors.studentCode ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                      } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                      placeholder="กรอกรหัสนักศึกษา"
                      required
                    />
                  </div>
                  {errors.studentCode && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="mr-1 h-4 w-4" />
                      {errors.studentCode}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    รหัสนักศึกษาจะใช้สำหรับเข้าสู่ระบบ
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center px-6 py-3.5 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-xl transform transition-all duration-300 hover:scale-[1.02]"
                  >
                    ถัดไป
                    <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                {/* คณะ */}
                <div>
                  <label htmlFor="facultyId" className="block text-sm font-semibold text-gray-800 mb-2">
                    คณะ
                  </label>
                  <select
                    id="facultyId"
                    name="facultyId"
                    value={formData.facultyId}
                    onChange={handleChange}
                    className="appearance-none block w-full px-4 py-3.5 border-2 border-gray-200 focus:border-indigo-500 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50"
                  >
                    <option value="">เลือกคณะ</option>
                    {faculties.map(faculty => (
                      <option key={faculty.faculty_id} value={faculty.faculty_id}>
                        {faculty.faculty_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* สาขา */}
                <div>
                  <label htmlFor="majorId" className="block text-sm font-semibold text-gray-800 mb-2">
                    สาขาวิชา
                  </label>
                  <select
                    id="majorId"
                    name="majorId"
                    value={formData.majorId}
                    onChange={handleChange}
                    disabled={!formData.facultyId}
                    className="appearance-none block w-full px-4 py-3.5 border-2 border-gray-200 focus:border-indigo-500 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">เลือกสาขาวิชา</option>
                    {filteredMajors.map(major => (
                      <option key={major.major_id} value={major.major_id}>
                        {major.major_name}
                      </option>
                    ))}
                  </select>
                  {!formData.facultyId && (
                    <p className="mt-1 text-xs text-gray-500">
                      กรุณาเลือกคณะก่อน
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className={`h-5 w-5 ${errors.email ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                        errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                      } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                      placeholder="example@rmuti.ac.th"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="mr-1 h-4 w-4" />
                      {errors.email}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    ต้องใช้อีเมลของมหาวิทยาลัย (@rmuti.ac.th)
                  </p>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 border border-transparent rounded-xl text-white font-medium hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    ถัดไป
                    <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className={`h-5 w-5 ${errors.password ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                        errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                      } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                      placeholder="กรอกรหัสผ่านของคุณ"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="mr-1 h-4 w-4" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className={`h-5 w-5 ${errors.confirmPassword ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                        errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                      } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                      placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="mr-1 h-4 w-4" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <FiCreditCard className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">
                        เครดิตเริ่มต้น
                      </h3>
                      <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        {defaultCredit} เครดิต
                      </p>
                      <p className="mt-2 text-xs text-gray-600">
                        คุณจะได้รับเครดิตสำหรับยืมและเบิกวัสดุทันทีเมื่อลงทะเบียนสำเร็จ
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-6 py-3.5 border-2 border-gray-300 text-sm font-semibold rounded-2xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`inline-flex items-center px-6 py-3.5 border border-transparent text-sm font-semibold rounded-2xl text-white ${
                      isLoading 
                        ? 'bg-gradient-to-r from-indigo-400 to-purple-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-xl transform transition-all duration-300 hover:scale-[1.02]`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        กำลังสมัครสมาชิก...
                      </>
                    ) : (
                      <>
                        <FiUserPlus className="mr-2 h-5 w-5" />
                        สมัครสมาชิก
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 text-gray-600 font-medium">มีบัญชีอยู่แล้ว?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="group w-full flex justify-center items-center py-3.5 px-4 border-2 border-indigo-200 rounded-2xl shadow-sm text-sm font-semibold text-indigo-700 bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <FiLock className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                เข้าสู่ระบบ
              </Link>
            </div>

            <div className="mt-6 text-center">
              <Link 
                to="/welcome" 
                className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 font-medium transition-all duration-200 group"
              >
                <FiArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                กลับสู่หน้าหลัก
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center relative z-10">
          <p className="text-xs text-gray-600">
            การสมัครสมาชิกถือว่าคุณยอมรับ{' '}
            <a href="#terms" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200">
              ข้อกำหนดการใช้งาน
            </a>{' '}
            และ{' '}
            <a href="#privacy" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200">
              นโยบายความเป็นส่วนตัว
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
