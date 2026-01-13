import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiChevronRight, FiCheck, FiUsers, FiPackage, FiClipboard } from 'react-icons/fi';
import { STORAGE_KEYS } from '../constants';
import axios from 'axios';

const Welcome = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemName, setSystemName] = useState('ระบบยืม-คืนและเบิกจ่ายวัสดุ');

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setIsLoggedIn(true);
        setUserRole(user.role || 'user');
      } catch (error) {
        setIsLoggedIn(false);
      }
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
        // Use default
      }
    };
    fetchSystemName();
  }, []);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/register');
  const handleDashboard = () => {
    if (userRole === 'admin') navigate('/admin/dashboard');
    else navigate('/user/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center">
              <img className="h-10 w-auto" src="https://cdn-icons-png.flaticon.com/512/2271/2271068.png" alt="Logo" />
              <span className="ml-2 text-xl font-bold text-indigo-600">{systemName}</span>
            </Link>
            
            <div className="hidden md:flex md:items-center md:space-x-6">
              <Link to="/about" className="text-gray-600 hover:text-indigo-600 px-3 py-2 text-sm font-medium">เกี่ยวกับ</Link>
              <Link to="/contact" className="text-gray-600 hover:text-indigo-600 px-3 py-2 text-sm font-medium">ติดต่อ</Link>
              
              {isLoggedIn ? (
                <button onClick={handleDashboard} className="px-4 py-2 text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700">แดชบอร์ด</button>
              ) : (
                <div className="flex space-x-3">
                  <button onClick={handleLogin} className="px-4 py-2 text-sm font-medium rounded-full text-indigo-600 border border-indigo-600 hover:bg-indigo-50">เข้าสู่ระบบ</button>
                  <button onClick={handleRegister} className="px-4 py-2 text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700">สมัครสมาชิก</button>
                </div>
              )}
            </div>
            
            <div className="flex md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-md text-gray-700 hover:text-indigo-600">
                {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden bg-white shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link to="/about" className="block px-3 py-2 rounded-md text-base text-gray-700 hover:text-indigo-600">เกี่ยวกับ</Link>
              <Link to="/contact" className="block px-3 py-2 rounded-md text-base text-gray-700 hover:text-indigo-600">ติดต่อ</Link>
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200 px-5">
              {isLoggedIn ? (
                <button onClick={handleDashboard} className="w-full py-2 px-4 rounded-full text-white bg-indigo-600 hover:bg-indigo-700">แดชบอร์ด</button>
              ) : (
                <div className="space-y-3">
                  <button onClick={handleLogin} className="w-full py-2 px-4 rounded-full text-indigo-600 border border-indigo-600 hover:bg-indigo-50">เข้าสู่ระบบ</button>
                  <button onClick={handleRegister} className="w-full py-2 px-4 rounded-full text-white bg-indigo-600 hover:bg-indigo-700">สมัครสมาชิก</button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="flex-grow flex flex-col md:flex-row items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="md:w-1/2 text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            <span className="block text-gray-900">{systemName}</span>
            <span className="block text-indigo-600">ออนไลน์</span>
          </h1>
          <p className="mt-3 text-base text-gray-500 sm:text-lg">
            ระบบจัดการการยืม-คืนอุปกรณ์และเบิกวัสดุสิ้นเปลืองออนไลน์ ช่วยให้การจัดการเป็นไปอย่างมีระบบ สะดวก รวดเร็ว และมีประสิทธิภาพ
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            {isLoggedIn ? (
              <button onClick={handleDashboard} className="px-6 py-3 text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700">
                ไปที่แดชบอร์ด <FiChevronRight className="inline ml-2" />
              </button>
            ) : (
              <>
                <button onClick={handleRegister} className="px-6 py-3 text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700">
                  เริ่มต้นใช้งาน <FiChevronRight className="inline ml-2" />
                </button>
                <button onClick={handleLogin} className="px-6 py-3 text-base font-medium rounded-full text-gray-700 border border-gray-300 bg-white hover:bg-gray-50">
                  เข้าสู่ระบบ
                </button>
              </>
            )}
          </div>
        </div>
        <div className="md:w-1/2 mt-10 md:mt-0">
          <img src="https://img.freepik.com/free-vector/inventory-management-abstract-concept-illustration_335657-3842.jpg" alt="ระบบยืม-คืน" className="w-full max-w-md mx-auto" />
        </div>
      </div>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">&copy; 2025 {systemName}. สงวนลิขสิทธิ์.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
