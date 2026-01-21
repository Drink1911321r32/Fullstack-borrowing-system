import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiMenu, FiX, FiHome, FiBox, FiUsers, FiSettings, FiLogOut, FiBell, 
  FiPackage, FiBarChart, FiGrid, FiLayers, FiTrendingUp, FiCreditCard,
  FiArchive, FiShoppingCart, FiRepeat, FiUser, FiClock, FiBookOpen,
  FiChevronDown, FiChevronRight
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmLogoutModal from '../common/ConfirmLogoutModal';
import NotificationBadge from '../common/NotificationBadge';
import { useNotification } from '../../contexts/NotificationContext';
import { STORAGE_KEYS } from '../../constants';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('rememberMe');
    toast.success('ออกจากระบบสำเร็จ');
    navigate('/login');
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      '/admin': 'แดชบอร์ด',
      '/admin/dashboard': 'แดชบอร์ด',
      '/admin/users': 'จัดการผู้ใช้งาน',
      '/admin/faculties-majors': 'จัดการคณะและสาขา',
      '/admin/inventory': 'คลังอุปกรณ์',
      '/admin/add-category': 'เพิ่มหมวดหมู่',
      '/admin/add-equipment': 'เพิ่มอุปกรณ์',
      '/admin/borrowing': 'จัดการการยืม-คืน',
      '/admin/return': 'การคืนอุปกรณ์',
      '/admin/disbursement': 'จัดการการเบิกจ่าย',
      '/admin/disbursement-history': 'ประวัติการเบิกจ่าย',
      '/admin/borrowing-history': 'ประวัติการยืม-คืน',
      '/admin/credit-management': 'จัดการเครดิต',
      '/admin/credit-history': 'ประวัติการเปลี่ยนแปลงเครดิต',
      '/admin/notifications': 'การแจ้งเตือน',
      '/admin/reports': 'รายงานและสถิติ',
      '/admin/profile': 'โปรไฟล์',
      '/admin/settings': 'ตั้งค่าระบบ'
    };
    return titles[path] || 'ส่วนของผู้ดูแลระบบ';
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    const subtitles = {
      '/admin': 'Admin Dashboard',
      '/admin/dashboard': 'Admin Dashboard',
      '/admin/users': 'User Management',
      '/admin/faculties-majors': 'Faculties & Majors Management',
      '/admin/inventory': 'Inventory System',
      '/admin/add-category': 'Add Category',
      '/admin/add-equipment': 'Add Equipment',
      '/admin/borrowing': 'Borrowing Management',
      '/admin/return': 'Equipment Return',
      '/admin/disbursement': 'Disbursement Management',
      '/admin/disbursement-history': 'Disbursement History',
      '/admin/borrowing-history': 'Borrowing History',
      '/admin/credit-management': 'Credit Management',
      '/admin/credit-history': 'Credit History',
      '/admin/notifications': 'Notifications',
      '/admin/reports': 'Reports & Statistics',
      '/admin/profile': 'Admin Profile',
      '/admin/settings': 'System Settings'
    };
    return subtitles[path] || 'Admin Dashboard';
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isMenuExpanded = (menuKey) => {
    return expandedMenus[menuKey] || false;
  };

  const menuItems = [
    // Dashboard
    { path: '/admin/dashboard', icon: FiHome, label: 'แดชบอร์ด', type: 'single', color: 'blue' },
    
    // การจัดการธุรกรรม
    { 
      label: 'จัดการธุรกรรม',
      icon: FiBox,
      type: 'group',
      key: 'transactions',
      color: 'green',
      children: [
        { path: '/admin/borrowing', icon: FiBox, label: 'การยืม-คืน' },
        { path: '/admin/return', icon: FiRepeat, label: 'การคืนอุปกรณ์' },
        { path: '/admin/disbursement', icon: FiShoppingCart, label: 'การเบิกจ่าย' }
      ]
    },
    
    // จัดการอุปกรณ์
    { 
      label: 'จัดการอุปกรณ์',
      icon: FiPackage,
      type: 'group',
      key: 'equipment',
      color: 'purple',
      children: [
        { path: '/admin/inventory', icon: FiGrid, label: 'คลังอุปกรณ์' },
        { path: '/admin/add-equipment', icon: FiPackage, label: 'เพิ่มอุปกรณ์' },
        { path: '/admin/add-category', icon: FiLayers, label: 'จัดการหมวดหมู่' }
      ]
    },
    
    // จัดการเครดิต
    { 
      label: 'จัดการเครดิต',
      icon: FiCreditCard,
      type: 'group',
      key: 'credit',
      color: 'yellow',
      children: [
        { path: '/admin/credit-management', icon: FiCreditCard, label: 'จัดการเครดิต' },
        { path: '/admin/credit-history', icon: FiClock, label: 'ประวัติเครดิต' }
      ]
    },
    
    // ประวัติ
    { 
      label: 'ประวัติ',
      icon: FiClock,
      type: 'group',
      key: 'history',
      color: 'orange',
      children: [
        { path: '/admin/borrowing-history', icon: FiBox, label: 'ประวัติการยืม-คืน' },
        { path: '/admin/disbursement-history', icon: FiArchive, label: 'ประวัติการเบิกจ่าย' }
      ]
    },
    
    // จัดการผู้ใช้งาน
    { 
      label: 'จัดการผู้ใช้งาน',
      icon: FiUsers,
      type: 'group',
      key: 'users',
      color: 'pink',
      children: [
        { path: '/admin/users', icon: FiUsers, label: 'จัดการผู้ใช้งาน' },
        { path: '/admin/faculties-majors', icon: FiBookOpen, label: 'จัดการคณะ/สาขา' }
      ]
    },
    
    // รายงานและแจ้งเตือน
    { path: '/admin/notifications', icon: FiBell, label: 'การแจ้งเตือน', type: 'single', color: 'red' },
    { path: '/admin/reports', icon: FiBarChart, label: 'รายงานและสถิติ', type: 'single', color: 'cyan' },
    
    // ตั้งค่า
    { path: '/admin/settings', icon: FiSettings, label: 'ตั้งค่าระบบ', type: 'single', color: 'gray' }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'border-blue-400',
      green: 'border-green-400',
      purple: 'border-purple-400',
      yellow: 'border-yellow-400',
      orange: 'border-orange-400',
      pink: 'border-pink-400',
      red: 'border-red-400',
      cyan: 'border-cyan-400',
      gray: 'border-gray-400'
    };
    return colors[color] || 'border-indigo-400';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay for mobile */}
      {isSidebarOpen && isMobileView && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-64 bg-gradient-to-b from-indigo-600 to-indigo-800 shadow-2xl transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-indigo-500/30">
          <h1 className="text-lg font-bold text-white">ระบบยืม-คืนและเบิกจ่าย</h1>
          {isMobileView && (
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="text-white focus:outline-none"
            >
              <FiX className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <div key={item.path || item.key || index}>
                {item.type === 'single' ? (
                  // Single Menu Item with Color Border
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border-l-4 ${getColorClasses(item.color)} ${
                      isActive(item.path)
                        ? 'bg-white text-indigo-700 shadow-md'
                        : 'text-white hover:bg-indigo-700/50 border-opacity-50'
                    }`}
                    onClick={() => isMobileView && setIsSidebarOpen(false)}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${
                      isActive(item.path) ? 'text-indigo-700' : 'text-indigo-200'
                    }`} />
                    {item.label}
                  </Link>
                ) : (
                  // Group Menu Item with Children and Color Border
                  <div className={`border-l-4 ${getColorClasses(item.color)} rounded-lg overflow-hidden bg-indigo-700/20`}>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 text-white hover:bg-indigo-700/50"
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5 text-indigo-200" />
                        <span className="font-semibold">{item.label}</span>
                      </div>
                      {isMenuExpanded(item.key) ? (
                        <FiChevronDown className="h-4 w-4 text-indigo-200" />
                      ) : (
                        <FiChevronRight className="h-4 w-4 text-indigo-200" />
                      )}
                    </button>
                    
                    {/* Submenu Items */}
                    {isMenuExpanded(item.key) && (
                      <div className="bg-indigo-800/30 pb-2">
                        <div className="ml-6 mr-2 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isActive(child.path)
                                  ? 'bg-white text-indigo-700 shadow-md'
                                  : 'text-white hover:bg-indigo-700/50'
                              }`}
                              onClick={() => isMobileView && setIsSidebarOpen(false)}
                            >
                              <child.icon className={`mr-3 h-4 w-4 ${
                                isActive(child.path) ? 'text-indigo-700' : 'text-indigo-200'
                              }`} />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Separator between menu groups */}
                {index < menuItems.length - 1 && item.type === 'group' && (
                  <div className="my-2 border-t border-indigo-500/20"></div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* User Info in Sidebar (Mobile) */}
        {isMobileView && user && (
          <div className="absolute bottom-0 w-full p-4 border-t border-indigo-500/30">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold">
                  {user.first_name?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-indigo-200 truncate">ผู้ดูแลระบบ</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left: Menu Button & Page Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none lg:hidden"
              >
                <FiMenu className="h-6 w-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{getPageTitle()}</h2>
                <p className="text-xs text-gray-500">{getPageSubtitle()}</p>
              </div>
            </div>

            {/* Right: Notifications & User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationBadge />

              {/* User Dropdown */}
              {user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500">ผู้ดูแลระบบ</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                      {user.first_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border border-gray-200">
                      <Link
                        to="/admin/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        โปรไฟล์
                      </Link>
                      <Link
                        to="/admin/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <FiSettings className="mr-3 h-4 w-4" />
                        ตั้งค่า
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiLogOut className="mr-3 h-4 w-4" />
                        ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </div>
  );
};

export default AdminLayout;
