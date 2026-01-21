import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI } from '../api/api.js';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiArrowLeft, FiUser, FiUserPlus } from 'react-icons/fi';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '', // เปลี่ยนจาก email เป็น identifier
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [systemName, setSystemName] = useState('ระบบยืม-คืนและเบิกจ่ายวัสดุ');

  // โหลดข้อมูลที่บันทึกไว้จาก localStorage
  useEffect(() => {
    const savedIdentifier = localStorage.getItem('savedIdentifier');
    const savedPassword = localStorage.getItem('savedPassword');
    const rememberMeFlag = localStorage.getItem('rememberMe');
    
    if (rememberMeFlag === 'true' && savedIdentifier && savedPassword) {
      setFormData({
        identifier: savedIdentifier,
        password: savedPassword
      });
      setRememberMe(true);
    }
    
    // ดึงชื่อระบบ
    const fetchSystemName = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await axios.get(`${API_URL}/api/users/settings/public/system_name`);
        if (response.data && response.data.success) {
          setSystemName(response.data.data.setting_value);
        }
      } catch (error) {
      }
    };
    fetchSystemName();
  }, []);

  // ฟังก์ชันจัดการการเปลี่ยนแปลงข้อมูลในฟอร์ม
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // ล้าง error state เมื่อผู้ใช้เริ่มพิมพ์
    if (hasError) {
      setHasError(false);
    }
  };

  // ฟังก์ชันตรวจสอบความถูกต้องของข้อมูล
  const validateForm = () => {
    let isValid = true;
    
    // ตรวจสอบรหัสนักศึกษาหรืออีเมล
    if (!formData.identifier) {
      toast.error('กรุณากรอกรหัสนักศึกษาหรืออีเมล');
      isValid = false;
    }
    
    // ตรวจสอบรหัสผ่าน
    if (!formData.password) {
      toast.error('กรุณากรอกรหัสผ่าน');
      isValid = false;
    }
    
    return isValid;
  };

  // ฟังก์ชันจัดการการส่งฟอร์ม
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // ส่ง identifier และ password โดยตรง
      const response = await userAPI.login(formData.identifier, formData.password);
      
      // ตรวจสอบโครงสร้างของ response
      const data = response.data;
      
      if (data && data.success && data.data && data.data.token) {
        // ใช้ login function จาก useAuth
        login(data.data.user, data.data.token);
        
        // บันทึกหรือลบข้อมูลตามสถานะ Remember Me
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedIdentifier', formData.identifier);
          localStorage.setItem('savedPassword', formData.password);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('savedIdentifier');
          localStorage.removeItem('savedPassword');
        }
        
        toast.success(data.message || 'เข้าสู่ระบบสำเร็จ!', {
          position: "top-right",
          autoClose: 2000
        });
        
        // ล้างข้อมูลฟอร์มเมื่อ login สำเร็จเฉพาะถ้าไม่ได้เลือก Remember Me
        if (!rememberMe) {
          setFormData({
            identifier: '',
            password: ''
          });
        }
        
        setTimeout(() => {
          // ตรวจสอบจาก admin_id หรือ member_id แทน role
          if (data.data.user.admin_id) {
            navigate('/admin/dashboard');
          } else if (data.data.user.member_id) {
            navigate('/user/dashboard');
          } else {
            navigate('/user/dashboard'); // default
          }
        }, 1000);
      } else {
        console.error('Invalid response structure:', data);
        throw new Error('ไม่พบข้อมูลการเข้าสู่ระบบ');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // ตั้งค่า error state
      setHasError(true);
      
      // ไม่ล้างฟอร์มเมื่อเกิด error เพื่อให้ผู้ใช้สามารถแก้ไขได้
      
      // จัดการข้อผิดพลาดตามการตอบกลับจาก API
      if (error.response) {
        // ข้อผิดพลาดจาก API
        const status = error.response.status;
        const errorData = error.response.data;
        
        console.error('Error response:', status, errorData);
        
        if (status === 404) {
          toast.error('❌ ไม่พบผู้ใช้งานนี้ในระบบ\nกรุณาตรวจสอบรหัสนักศึกษาหรืออีเมลอีกครั้ง', {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
        } else if (status === 401) {
          toast.error('❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
        } else if (status === 403) {
          toast.error('⛔ ' + (errorData.message || 'บัญชีของคุณถูกระงับการใช้งาน'), {
            position: "top-right",
            autoClose: 5000
          });
        } else if (errorData && errorData.message) {
          toast.error('❌ ' + errorData.message, {
            position: "top-right",
            autoClose: 4000
          });
        } // ถ้าไม่มี errorData.message ไม่ต้องแสดง toast อะไรเลย
      } else if (error.request) {
        // ส่งคำขอแล้วแต่ไม่ได้รับ response
        console.error('No response received:', error.request);
        toast.error('🔌 ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', {
          position: "top-right",
          autoClose: 5000
        });
      } else {
        // ข้อผิดพลาดอื่น ๆ
        console.error('Error message:', error.message);
        toast.error('❌ ' + (error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'), {
          position: "top-center",
          autoClose: 4000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
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
                <img 
                  className="h-14 w-14" 
                  src="https://cdn-icons-png.flaticon.com/512/2271/2271068.png" 
                  alt="ระบบยืม-คืน"
                />
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-gradient">
            ยินดีต้อนรับ
          </h2>
          <p className="mt-3 text-base text-gray-700 font-medium">
            เข้าสู่ระบบ{systemName}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-lg py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-white/20 transform transition-all duration-300 hover:shadow-indigo-200/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-gray-800 mb-2">
                รหัสนักศึกษาหรืออีเมล
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-200">
                  <FiUser className={`h-5 w-5 ${hasError ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={formData.identifier}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                    hasError 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
                  } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                  placeholder="รหัสนักศึกษาหรืออีเมล"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-200">
                  <FiLock className={`h-5 w-5 ${hasError ? 'text-red-500' : 'text-indigo-400 group-focus-within:text-indigo-600'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-12 pr-4 py-3.5 border-2 ${
                    hasError 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
                  } rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 sm:text-sm bg-white/50`}
                  placeholder="กรอกรหัสผ่านของคุณ"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                  จดจำฉัน
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white ${
                  isLoading 
                    ? 'bg-gradient-to-r from-indigo-400 to-purple-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <FiLock className="mr-2 h-5 w-5" />
                    เข้าสู่ระบบ
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 text-gray-600 font-medium">หรือ</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="group w-full flex justify-center items-center py-3.5 px-4 border-2 border-indigo-200 rounded-2xl shadow-sm text-sm font-semibold text-indigo-700 bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <FiUserPlus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                สมัครสมาชิกใหม่
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

        {/* ส่วนแสดงข้อมูลเพิ่มเติม */}
        <div className="mt-8 text-center relative z-10">
          <p className="text-xs text-gray-600">
            การเข้าสู่ระบบถือว่าคุณยอมรับ{' '}
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

export default Login;