import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLock, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import axios from 'axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // ตรวจสอบ token เมื่อโหลดหน้า
  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setIsVerifying(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${API_URL}/api/auth/verify-reset-token/${token}`);

      if (response.data && response.data.success) {
        setIsValidToken(true);
        setUserEmail(response.data.email);
      } else {
        setIsValidToken(false);
        toast.error(response.data?.message || 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setIsValidToken(false);
      toast.error(error.response?.data?.message || 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.password) {
      toast.error('กรุณากรอกรหัสผ่านใหม่');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return false;
    }

    if (!formData.confirmPassword) {
      toast.error('กรุณายืนยันรหัสผ่าน');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, {
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (response.data && response.data.success) {
        toast.success('รีเซ็ตรหัสผ่านสำเร็จ! กำลังพาคุณไปหน้าเข้าสู่ระบบ...', {
          autoClose: 2000
        });
        
        // รอ 2 วินาทีแล้วไปหน้า login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.data?.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setIsLoading(false);
    }
  };

  // แสดง loading ขณะตรวจสอบ token
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบลิงก์...</p>
        </div>
      </div>
    );
  }

  // แสดง error ถ้า token ไม่ถูกต้อง
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">ลิงก์ไม่ถูกต้อง</h3>
            <p className="text-gray-600 mb-6">
              ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว<br />
              กรุณาขอลิงก์ใหม่อีกครั้ง
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full py-3 px-4 border border-transparent text-white bg-gradient-to-r from-blue-500 to-indigo-600 
                  hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all duration-200 font-medium shadow-lg"
              >
                ขอลิงก์รีเซ็ตรหัสผ่านใหม่
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg 
                  hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <Link
            to="/login"
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-6"
          >
            <FiArrowLeft className="mr-2" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
          
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <FiLock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              ตั้งรหัสผ่านใหม่
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {userEmail && `สำหรับบัญชี: ${userEmail}`}
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6 bg-white rounded-lg shadow-xl p-8" onSubmit={handleSubmit}>
          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่านใหม่
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg 
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200"
                placeholder="กรอกรหัสผ่านใหม่"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              ยืนยันรหัสผ่านใหม่
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg 
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent 
                text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 
                hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <FiLock className="mr-2" />
                  ตั้งรหัสผ่านใหม่
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
