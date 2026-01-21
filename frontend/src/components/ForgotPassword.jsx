import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiArrowLeft, FiSend, FiLock, FiShield, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('กรุณากรอกอีเมล');
      return;
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    try {
      setIsLoading(true);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email: email.trim().toLowerCase()
      });

      if (response.data && response.data.success) {
        setIsSubmitted(true);
        toast.success(response.data.message);
      } else {
        toast.error(response.data?.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center text-gray-700 hover:text-indigo-600 transition-all duration-200 font-medium group mb-8"
          >
            <FiArrowLeft className="mr-2 transform group-hover:-translate-x-1 transition-transform" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
          
          <div className="text-center">
            {/* Icon with animation */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              <div className="relative bg-white p-5 rounded-full shadow-2xl border-4 border-white">
                <div className="relative">
                  <FiLock className="h-12 w-12 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600" style={{WebkitTextStroke: '2px', WebkitTextStrokeColor: 'transparent', backgroundClip: 'text'}} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FiLock className="h-12 w-12 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
            
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 mb-3">
              ลืมรหัสผ่าน
            </h2>
            <p className="text-base text-gray-600 font-medium">
              กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
            </p>
          </div>
        </div>

        {/* Form */}
        {!isSubmitted ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                  อีเมล
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl 
                      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                      transition-all duration-200 text-gray-900 bg-white/50 backdrop-blur-sm"
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Security info */}
              <div className="bg-indigo-50/50 backdrop-blur-sm border border-indigo-100 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <FiShield className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium text-indigo-900 mb-1">ความปลอดภัย</p>
                    <p className="text-gray-600">เราจะส่งลิงก์รีเซ็ตรหัสผ่านที่มีความปลอดภัยไปยังอีเมลของคุณ ลิงก์จะหมดอายุภายใน 30 นาที</p>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent 
                    text-base font-semibold rounded-2xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 
                    hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300
                    shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <FiSend className="mr-2 group-hover:translate-x-1 transition-transform" />
                      ส่งลิงก์รีเซ็ตรหัสผ่าน
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Message */
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 text-center">
            {/* Success animation */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-full shadow-xl border-4 border-white">
                <FiCheckCircle className="h-16 w-16 text-green-600 animate-bounce" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ส่งอีเมลสำเร็จ!</h3>
            <p className="text-gray-600 mb-2">
              เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่
            </p>
            <p className="text-indigo-600 font-semibold text-lg mb-6">
              {email}
            </p>
            <p className="text-gray-500 text-sm mb-8">
              กรุณาตรวจสอบกล่องจดหมายของคุณและคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl 
                  hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl
                  transform hover:-translate-y-0.5"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="w-full py-3.5 px-6 border-2 border-gray-200 text-gray-700 rounded-2xl 
                  hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-semibold"
              >
                ส่งอีเมลอีกครั้ง
              </button>
            </div>
            
            <div className="bg-yellow-50/50 backdrop-blur-sm border border-yellow-100 rounded-xl p-4">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <span className="text-yellow-600 font-medium">💡</span>
                <p className="text-left">
                  <span className="font-medium text-yellow-900">ไม่พบอีเมล?</span><br />
                  ตรวจสอบในโฟลเดอร์ <span className="font-medium">Spam</span> หรือ <span className="font-medium">Junk Mail</span> ของคุณ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
