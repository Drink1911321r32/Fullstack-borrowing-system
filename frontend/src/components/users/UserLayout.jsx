import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiBox, FiClock, FiUser, FiLogOut, FiBell, FiPackage, FiBarChart, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmLogoutModal from '../common/ConfirmLogoutModal';
import NotificationBadge from '../common/NotificationBadge';
import { useNotification } from '../../contexts/NotificationContext';
import { STORAGE_KEYS } from '../../constants';

const UserLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) { setIsSidebarOpen(true); } else { setIsSidebarOpen(false); }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) { setIsDropdownOpen(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch (error) { console.error(error); }
    } else { navigate('/login'); }
  }, [navigate]);

  const handleLogout = () => { setIsLogoutModalOpen(true); };
  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('rememberMe');
    toast.success('ออกจากระบบสำเรจ');
    navigate('/login');
  };
  const cancelLogout = () => { setIsLogoutModalOpen(false); };
  const isActive = (path) => location.pathname === path;

  // ฟังก์ชันสำหรับแสดงชื่อหน้าปัจจุบัน
  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      '/user': 'แดชบอร์ด',
      '/user/dashboard': 'แดชบอร์ด',
      '/user/equipment': 'ค้นหาอุปกรณ์',
      '/user/borrow': 'ยืมอุปกรณ์',
      '/user/disbursement': 'คำขอเบิกจ่าย',
      '/user/notifications': 'การแจ้งเตือน',
      '/user/reports': 'รายงาน',
      '/user/history': 'ประวัติการทำรายการ',
      '/user/profile': 'ข้อมูลส่วนตัว'
    };
    return titles[path] || 'ส่วนของผู้ใช้งาน';
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    const subtitles = {
      '/user': 'User Dashboard',
      '/user/dashboard': 'User Dashboard',
      '/user/equipment': 'Equipment Browser',
      '/user/borrow': 'Borrow Equipment',
      '/user/disbursement': 'Disbursement Request',
      '/user/notifications': 'Notifications',
      '/user/reports': 'Reports',
      '/user/history': 'Transaction History',
      '/user/profile': 'User Profile'
    };
    return subtitles[path] || 'User Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {isSidebarOpen && isMobileView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-blue-600 to-blue-800 shadow-2xl transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-blue-500/30">
          <h1 className="text-lg font-bold text-white">ระบบยืม-คืนและเบิกจ่าย</h1>
          {isMobileView && (<button onClick={() => setIsSidebarOpen(false)} className="text-white focus:outline-none"><FiX className="h-6 w-6" /></button>)}
        </div>
        <nav className="mt-6 px-4 flex flex-col space-y-1">
          <Link to="/user/dashboard" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/dashboard') || isActive('/user') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiHome className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">แดชบอร์ด</span></Link>
          <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider">จัดการอุปกรณ์</p></div>
          <Link to="/user/equipment" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/equipment') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiPackage className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">ค้นหาอุปกรณ์</span></Link>
          <Link to="/user/borrow" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/borrow') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiBox className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">ยืมอุปกรณ์</span></Link>
          <Link to="/user/disbursement" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/disbursement') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiSend className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">คำขอเบิกจ่าย</span></Link>
          <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider">การสื่อสารและรายงาน</p></div>
          <Link to="/user/notifications" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/notifications') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiBell className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">การแจ้งเตือน</span>{unreadCount > 0 && (<span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>)}</Link>
          <Link to="/user/reports" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/reports') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiBarChart className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">รายงาน</span></Link>
          <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider">ข้อมูลและการจัดการ</p></div>
          <Link to="/user/history" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/history') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiClock className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">ประวัติการทำรายการ</span></Link>
          <Link to="/user/profile" className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/user/profile') ? 'bg-white text-blue-600 shadow-lg font-semibold' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'}`}><FiUser className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">ข้อมูลส่วนตัว</span></Link>
          <div className="pt-6 pb-2"></div>
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 rounded-xl text-blue-100 hover:bg-red-500/80 hover:text-white transition-all duration-200"><FiLogOut className="h-5 w-5 mr-3 flex-shrink-0" /><span className="truncate">ออกจากระบบ</span></button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gradient-to-r from-white to-blue-50 shadow-md border-b border-blue-100">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              {isMobileView && (<button onClick={() => setIsSidebarOpen(true)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg focus:outline-none transition-all duration-200"><FiMenu className="h-6 w-6" /></button>)}
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg"><FiUser className="h-5 w-5 text-white" /></div>
                <div><h2 className="text-lg font-bold text-gray-800">{getPageTitle()}</h2><p className="text-xs text-gray-500">{getPageSubtitle()}</p></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBadge />
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-blue-100 focus:outline-none transition-all duration-200 group">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-xl transition-all duration-200 overflow-hidden">
                      {user?.profile_image ? (
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${user.profile_image}`}
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ display: user?.profile_image ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                        {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="hidden md:block text-left"><p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{user?.firstName || 'ผู้ใช้งาน'}</p><p className="text-xs text-gray-500">นักศึกษา</p></div>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-100 animate-fade-in-up">
                    <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-semibold text-gray-800">{user?.firstName || 'ผู้ใช้งาน'} {user?.lastName || ''}</p><p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p></div>
                    <Link to="/user/profile" className="flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setIsDropdownOpen(false)}><FiUser className="w-4 h-4" /><span>ข้อมูลส่วนตัว</span></Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"><FiLogOut className="w-4 h-4" /><span>ออกจากระบบ</span></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet /></main>
      </div>
      <ConfirmLogoutModal isOpen={isLogoutModalOpen} onConfirm={confirmLogout} onCancel={cancelLogout} />
    </div>
  );
};

export default UserLayout;
