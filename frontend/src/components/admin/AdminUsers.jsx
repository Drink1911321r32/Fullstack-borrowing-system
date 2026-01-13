import React, { useState, useEffect } from 'react';
import { 
  FiUsers, FiUser, FiSearch, FiEdit3, FiTrash2, FiPlus,
  FiMail, FiPhone, FiMapPin, FiCalendar, FiActivity, FiRefreshCw,
  FiEye, FiShield, FiClock, FiCheckCircle, FiXCircle, FiFilter, FiPause, FiPlay, FiAlertCircle, FiX
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../api/adminService';
import UserFormModal from './UserFormModal';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // States สำหรับ Confirmation Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [pendingSuspendUser, setPendingSuspendUser] = useState(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [pendingActivateUser, setPendingActivateUser] = useState(null);
  const [pendingUpdateData, setPendingUpdateData] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Sync selectedUser กับ users state เมื่อ users เปลี่ยน
  useEffect(() => {
    if (selectedUser && users.length > 0) {
      const updatedUser = users.find(u => u.user_id === selectedUser.user_id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(selectedUser)) {
        setSelectedUser(updatedUser);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllUsers();
      if (response.success) {
        // กรองเฉพาะ user (ไม่รวม admin) เพื่อความแน่ใจ
        const usersOnly = response.data.filter(user => user.role === 'user');
        setUsers(usersOnly);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      setActionLoading(true);
      const response = await adminService.createUser(userData);
      if (response.success) {
        toast.success('เพิ่มผู้ใช้สำเร็จ');
        setShowEditModal(false);
        fetchUsers(); // โหลดข้อมูลใหม่
      } else {
        toast.error(response.message || 'ไม่สามารถเพิ่มผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (userData) => {
    // เก็บข้อมูลไว้และแสดง confirmation modal
    setPendingUpdateData(userData);
    setShowUpdateConfirmModal(true);
  };

  const confirmUpdate = async () => {
    try {
      setActionLoading(true);
      setShowUpdateConfirmModal(false);
      
      const response = await adminService.updateUser(editingUser.user_id, pendingUpdateData);
      if (response.success) {
        toast.success('แก้ไขข้อมูลผู้ใช้สำเร็จ');
        setShowEditModal(false);
        setEditingUser(null);
        setPendingUpdateData(null);
        fetchUsers(); // useEffect จะ sync selectedUser อัตโนมัติ
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelUpdate = () => {
    setShowUpdateConfirmModal(false);
    setPendingUpdateData(null);
  };

  const handleSuspendUser = (user) => {
    setPendingSuspendUser(user);
    setShowSuspendModal(true);
  };

  const confirmSuspend = async () => {
    try {
      setActionLoading(true);
      setShowSuspendModal(false);
      
      const response = await adminService.suspendUser(pendingSuspendUser.user_id, 'ระงับโดยผู้ดูแลระบบ');
      if (response.success) {
        toast.success('ระงับผู้ใช้สำเร็จ');
        setPendingSuspendUser(null);
        fetchUsers(); // useEffect จะ sync selectedUser อัตโนมัติ
      } else {
        toast.error(response.message || 'ไม่สามารถระงับผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการระงับผู้ใช้');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelSuspend = () => {
    setShowSuspendModal(false);
    setPendingSuspendUser(null);
  };

  // (ลบฟังก์ชันนี้ออก เพราะมีเวอร์ชันใหม่ด้านล่าง)

  const confirmActivate = async () => {
    try {
      setActionLoading(true);
      setShowActivateModal(false);
      
      const response = await adminService.activateUser(pendingActivateUser.user_id);
      if (response.success) {
        toast.success('เปิดใช้งานผู้ใช้สำเร็จ');
        setPendingActivateUser(null);
        fetchUsers(); // useEffect จะ sync selectedUser อัตโนมัติ
      } else {
        toast.error(response.message || 'ไม่สามารถเปิดใช้งานผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเปิดใช้งานผู้ใช้');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelActivate = () => {
    setShowActivateModal(false);
    setPendingActivateUser(null);
  };

  const handleDeleteUser = (user) => {
    setPendingDeleteUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setActionLoading(true);
      setShowDeleteModal(false);
      
      const response = await adminService.deleteUser(pendingDeleteUser.user_id);
      if (response.success) {
        toast.success(response.message || 'ลบผู้ใช้สำเร็จ');
        setPendingDeleteUser(null);
        fetchUsers();
        // ปิด detail modal ถ้าเปิดอยู่
        if (selectedUser?.user_id === pendingDeleteUser.user_id) {
          setSelectedUser(null);
          setShowUserModal(false);
        }
      } else {
        toast.error(response.message || 'ไม่สามารถลบผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPendingDeleteUser(null);
  };

  // ปรับให้ปิดใช้งานต้องยืนยันก่อน (modal)
  const handleToggleStatus = (user) => {
    if (user.status === 'active') {
      // ถ้าจะปิดใช้งาน ให้ใช้ modal เดิมของ suspend
      handleSuspendUser(user);
    } else {
      // ถ้าจะเปิดใช้งาน ให้เรียก API ทันที
      handleActivateUser(user);
    }
  };

  // ฟังก์ชันเปิดใช้งานใหม่ (activate)
  const handleActivateUser = async (user) => {
    try {
      setActionLoading(true);
      const response = await adminService.toggleUserStatus(user.user_id);
      if (response.success) {
        toast.success(response.message);
        fetchUsers();
      } else {
        toast.error(response.message || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleAddClick = () => {
    setEditingUser(null);
    setShowEditModal(true);
  };

  const getFilteredUsers = () => {
    let filtered = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.first_name && user.first_name.toLowerCase().includes(query)) ||
        (user.last_name && user.last_name.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query))
      );
    }
    
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const filteredUsers = getFilteredUsers();
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const getStatusInfo = (status) => {
    const statusMap = {
      'active': { 
        text: 'ใช้งานได้', 
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: FiCheckCircle
      },
      'suspended': { 
        text: 'ระงับการใช้งาน', 
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        icon: FiXCircle
      },
      'pending': { 
        text: 'รอการอนุมัติ', 
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: FiClock
      }
    };
    return statusMap[status] || statusMap['active'];
  };

  const getRoleInfo = (role) => {
    const roleMap = {
      'user': { text: 'ผู้ใช้', color: 'blue' },
      'admin': { text: 'ผู้ดูแลระบบ', color: 'indigo' }
    };
    return roleMap[role] || roleMap['user'];
  };

  const getStats = () => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const suspended = users.filter(u => u.status === 'suspended').length;
    
    return { total, active, suspended };
  };

  const stats = getStats();

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiUsers className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">จัดการผู้ใช้</h1>
                  <p className="text-blue-100 mt-1 font-medium">จัดการข้อมูลผู้ใช้งานในระบบ</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiUsers className="inline w-4 h-4 mr-1 text-white" />
                      <span className="text-white font-semibold">ทั้งหมด: {stats.total} คน</span>
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiCheckCircle className="inline w-4 h-4 mr-1 text-green-300" />
                      <span className="text-white font-semibold">ใช้งานได้: {stats.active}</span>
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiXCircle className="inline w-4 h-4 mr-1 text-red-300" />
                      <span className="text-white font-semibold">ระงับ: {stats.suspended}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                <button
                  onClick={fetchUsers}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiRefreshCw className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleAddClick}
                  className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center space-x-2"
                >
                  <FiPlus className="w-4 h-4 text-white" />
                  <span className="text-white">เพิ่มผู้ใช้</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-xl">
                <FiUsers className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ใช้งานได้</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <FiCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ระงับการใช้งาน</p>
                <p className="text-3xl font-bold text-red-600">{stats.suspended}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <FiXCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="relative flex-1 max-w-xl">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ค้นหาผู้ใช้..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
              <div className="text-sm text-gray-600">
                แสดง {currentUsers.length} จาก {filteredUsers.length} รายการ
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : currentUsers.length === 0 ? (
            <div className="p-20 text-center">
              <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">ไม่พบข้อมูลผู้ใช้</p>
            </div>
          ) : (
            <div className="space-y-0">
              {currentUsers.map((user) => {
                const statusInfo = getStatusInfo(user.status);
                const roleInfo = getRoleInfo(user.role);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={user.user_id} className="border-b border-gray-100 last:border-b-0 p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div 
                              className="bg-gradient-to-br from-blue-100 to-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                              onClick={() => {
                                if (user.profile_image) {
                                  setSelectedImage({
                                    url: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${user.profile_image}`,
                                    name: `${user.first_name} ${user.last_name}`
                                  });
                                  setShowImageModal(true);
                                }
                              }}
                            >
                              {user.profile_image ? (
                                <img 
                                  src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${user.profile_image}`}
                                  alt={`${user.first_name} ${user.last_name}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div style={{ display: user.profile_image ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                                <FiUser className="w-6 h-6 text-blue-600" />
                              </div>
                            </div>
                            {user.status === 'active' && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{user.first_name} {user.last_name}</h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                <StatusIcon className="w-4 h-4 mr-1" />
                                {statusInfo.text}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${roleInfo.color}-100 text-${roleInfo.color}-800`}>
                                {roleInfo.text}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <p className="flex items-center mb-1">
                                  <FiUser className="w-4 h-4 mr-2" />
                                  ID: {user.user_id}
                                </p>
                                <p className="flex items-center mb-1">
                                  <FiMail className="w-4 h-4 mr-2" />
                                  {user.email}
                                </p>
                                <p className="flex items-center">
                                  <FiCalendar className="w-4 h-4 mr-2" />
                                  สมัครเมื่อ: {new Date(user.created_at).toLocaleDateString('th-TH')}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm mb-1">
                                  <span className="font-medium">เครดิต:</span> {user.credit || 0}
                                </p>
                                <p className="text-sm mb-1">
                                  <span className="font-medium">ยืมทั้งหมด:</span>
                                  <span className="ml-2 font-semibold">{user.total_transactions || 0}</span>
                                  <span className="ml-1 text-gray-500">รายการ</span>
                                  <span className="ml-3 font-semibold">{user.total_items || 0}</span>
                                  <span className="ml-1 text-gray-500">ชิ้น</span>
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">กำลังยืม:</span>
                                  <span className="ml-2 font-semibold">{user.active_transactions || 0}</span>
                                  <span className="ml-1 text-gray-500">รายการ</span>
                                  <span className="ml-3 font-semibold">{user.active_items || 0}</span>
                                  <span className="ml-1 text-gray-500">ชิ้น</span>
                                  {user.overdue_items > 0 && (
                                    <span className="ml-2 text-red-600 font-semibold">(เกิน {user.overdue_items} ชิ้น)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <FiEye className="w-4 h-4" />
                          <span>ดูรายละเอียด</span>
                        </button>
                        
                        <button
                          onClick={() => handleEditClick(user)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <FiEdit3 className="w-4 h-4" />
                          <span>แก้ไข</span>
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                            user.status === 'active'
                              ? 'text-orange-600 hover:bg-orange-100'
                              : 'text-green-600 hover:bg-green-100'
                          }`}
                          disabled={actionLoading}
                        >
                          {user.status === 'active' ? (
                            <>
                              <FiPause className="w-4 h-4" />
                              <span>ปิดใช้งาน</span>
                            </>
                          ) : (
                            <>
                              <FiPlay className="w-4 h-4" />
                              <span>เปิดใช้งาน</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  แสดง {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredUsers.length)} จาก {filteredUsers.length} รายการ
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Detail Modal - สวยงามยิ่งขึ้น */}
        {selectedUser && !showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6 text-white rounded-t-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl border-2 border-white/30 overflow-hidden cursor-pointer hover:bg-white/30 transition-all"
                      onClick={() => {
                        if (selectedUser.profile_image) {
                          setSelectedImage({
                            url: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedUser.profile_image}`,
                            name: `${selectedUser.first_name} ${selectedUser.last_name}`
                          });
                          setShowImageModal(true);
                        }
                      }}
                    >
                      {selectedUser.profile_image ? (
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedUser.profile_image}`}
                          alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                          className="w-10 h-10 object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <FiUser 
                        className="w-10 h-10 text-white" 
                        style={{ display: selectedUser.profile_image ? 'none' : 'block' }}
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">รายละเอียดผู้ใช้</h2>
                      <p className="text-blue-100 text-lg font-medium mt-1">{selectedUser.first_name} {selectedUser.last_name}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        {(() => {
                          const statusInfo = getStatusInfo(selectedUser.status);
                          const StatusIcon = statusInfo.icon;
                          return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.textColor} border-2 border-white/30`}>
                              <StatusIcon className="w-4 h-4 mr-1" />
                              {statusInfo.text}
                            </span>
                          );
                        })()}
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border-2 border-white/30`}>
                          <FiShield className="w-4 h-4 mr-1" />
                          {getRoleInfo(selectedUser.role).text}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-300 backdrop-blur-sm border border-white/30"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* ข้อมูลส่วนตัว */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-600 p-2 rounded-xl">
                        <FiUser className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 ml-3">ข้อมูลส่วนตัว</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center text-gray-600 mb-1">
                          <FiUser className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium">ชื่อ-นามสกุล</span>
                        </div>
                        <p className="text-gray-900 font-semibold ml-6">{selectedUser.first_name} {selectedUser.last_name}</p>
                      </div>
                      
                      {selectedUser.student_code && (
                        <div className="bg-white rounded-xl p-4 border border-blue-100">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FiShield className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="text-sm font-medium">รหัสนักศึกษา</span>
                          </div>
                          <p className="text-gray-900 font-semibold ml-6">{selectedUser.student_code}</p>
                        </div>
                      )}
                      
                      <div className="bg-white rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center text-gray-600 mb-1">
                          <FiMail className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium">อีเมล</span>
                        </div>
                        <p className="text-gray-900 font-semibold ml-6 break-all">{selectedUser.email}</p>
                      </div>
                      
                      {selectedUser.member_type && (
                        <div className="bg-white rounded-xl p-4 border border-blue-100">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FiUsers className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="text-sm font-medium">ประเภทสมาชิก</span>
                          </div>
                          <p className="text-gray-900 font-semibold ml-6">
                            {selectedUser.member_type === 'student' ? 'นักเรียน' : 
                             selectedUser.member_type === 'teacher' ? 'อาจารย์' : 
                             selectedUser.member_type === 'staff' ? 'เจ้าหน้าที่' : selectedUser.member_type}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-white rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center text-gray-600 mb-1">
                          <FiShield className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium">บทบาท</span>
                        </div>
                        <p className="text-gray-900 font-semibold ml-6">{getRoleInfo(selectedUser.role).text}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* สถิติการใช้งาน */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-purple-600 p-2 rounded-xl">
                        <FiActivity className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 ml-3">สถิติการใช้งาน</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-600">
                            <div className="bg-yellow-100 p-2 rounded-lg">
                              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium ml-2">เครดิตคงเหลือ</span>
                          </div>
                          <span className="text-xl font-bold text-yellow-600">{selectedUser.credit || 0}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-600">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <FiActivity className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium ml-2">การยืมทั้งหมด</span>
                          </div>
                          <span className="text-xl font-bold text-blue-600">
                            <span className="font-semibold">{selectedUser.total_transactions || 0}</span>
                            <span className="ml-2 text-sm text-gray-500">รายการ</span>
                            <span className="ml-3 font-semibold">{selectedUser.total_items || 0}</span>
                            <span className="ml-1 text-sm text-gray-500">ชิ้น</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-600">
                            <div className="bg-green-100 p-2 rounded-lg">
                              <FiCheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium ml-2">กำลังยืม</span>
                          </div>
                          <span className="text-xl font-bold text-green-600">
                            <span className="font-semibold">{selectedUser.active_transactions || 0}</span>
                            <span className="ml-2 text-sm text-gray-500">รายการ</span>
                            <span className="ml-3 font-semibold">{selectedUser.active_items || 0}</span>
                            <span className="ml-1 text-sm text-gray-500">ชิ้น</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-600">
                            <div className={`${(selectedUser.overdue_count || 0) > 0 ? 'bg-red-100' : 'bg-gray-100'} p-2 rounded-lg`}>
                              <FiAlertCircle className={`w-4 h-4 ${(selectedUser.overdue_count || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                            </div>
                            <span className="text-sm font-medium ml-2">เกินกำหนด</span>
                          </div>
                            <span className={`text-xl font-bold ${(selectedUser.overdue_items || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {selectedUser.overdue_items || 0} <span className="text-sm text-gray-500">ชิ้น</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* ข้อมูลวันที่ */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="bg-gray-600 p-2 rounded-xl">
                      <FiCalendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 ml-3">ข้อมูลการสมัครและอัปเดต</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center text-gray-600 mb-2">
                        <FiCalendar className="w-4 h-4 mr-2 text-green-600" />
                        <span className="text-sm font-medium">วันที่สมัคร</span>
                      </div>
                      <p className="text-gray-900 font-semibold ml-6">
                        {new Date(selectedUser.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center text-gray-600 mb-2">
                        <FiClock className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="text-sm font-medium">อัปเดตล่าสุด</span>
                      </div>
                      <p className="text-gray-900 font-semibold ml-6">
                        {new Date(selectedUser.updated_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      handleEditClick(selectedUser);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl"
                  >
                    <FiEdit3 className="w-4 h-4" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Form Modal - สำหรับเพิ่ม/แก้ไขผู้ใช้ */}
        <UserFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          user={editingUser}
          isLoading={actionLoading}
        />

        {/* Modal ยืนยันการระงับผู้ใช้ */}
        {showSuspendModal && pendingSuspendUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
                  <FiPause className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการระงับผู้ใช้</h3>
                <p className="text-gray-600">คุณต้องการระงับการใช้งานของผู้ใช้นี้ใช่หรือไม่?</p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-2">
                  <FiAlertCircle className="text-orange-600 mr-2" />
                  <span className="text-orange-800 font-medium">คำเตือน</span>
                </div>
                <p className="text-orange-700 text-sm mb-3">ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง</p>
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ชื่อ:</span>
                      <span className="text-gray-900 font-bold">{pendingSuspendUser.first_name} {pendingSuspendUser.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">อีเมล:</span>
                      <span className="text-gray-900">{pendingSuspendUser.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={cancelSuspend}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  disabled={actionLoading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmSuspend}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังระงับ...
                    </>
                  ) : (
                    <>
                      <FiPause className="mr-2" />
                      ยืนยันระงับ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ยืนยันการลบผู้ใช้ */}
        {showDeleteModal && pendingDeleteUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <FiTrash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบผู้ใช้</h3>
                <p className="text-gray-600">คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?</p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-2">
                  <FiAlertCircle className="text-red-600 mr-2" />
                  <span className="text-red-800 font-medium">คำเตือน</span>
                </div>
                <p className="text-red-700 text-sm mb-3">
                  การลบผู้ใช้จะเป็นการ<strong>ลบถาวร</strong> และไม่สามารถกู้คืนได้<br/>
                  หากต้องการเก็บข้อมูลไว้ กรุณาใช้ปุ่ม "<strong>ปิดใช้งาน</strong>" แทน
                </p>
                <div className="bg-white rounded-lg p-3 border border-red-300">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ชื่อ:</span>
                      <span className="text-gray-900 font-bold">{pendingDeleteUser.first_name} {pendingDeleteUser.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">อีเมล:</span>
                      <span className="text-gray-900">{pendingDeleteUser.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">เครดิต:</span>
                      <span className="text-gray-900">{pendingDeleteUser.credit || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  disabled={actionLoading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังลบ...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" />
                      ยืนยันการลบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ยืนยันการเปิดใช้งานผู้ใช้ */}
        {showActivateModal && pendingActivateUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <FiPlay className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการเปิดใช้งานผู้ใช้</h3>
                <p className="text-gray-600">คุณต้องการเปิดใช้งานผู้ใช้นี้ใช่หรือไม่?</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-2">
                  <FiCheckCircle className="text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">ข้อมูล</span>
                </div>
                <p className="text-green-700 text-sm mb-3">ผู้ใช้จะสามารถเข้าสู่ระบบและใช้งานได้อีกครั้ง</p>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ชื่อ:</span>
                      <span className="text-gray-900 font-bold">{pendingActivateUser.first_name} {pendingActivateUser.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">อีเมล:</span>
                      <span className="text-gray-900">{pendingActivateUser.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={cancelActivate}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  disabled={actionLoading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmActivate}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังเปิดใช้งาน...
                    </>
                  ) : (
                    <>
                      <FiPlay className="mr-2" />
                      ยืนยันเปิดใช้งาน
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ยืนยันการแก้ไขข้อมูลผู้ใช้ */}
        {showUpdateConfirmModal && editingUser && pendingUpdateData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                  <FiEdit3 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการแก้ไขข้อมูล</h3>
                <p className="text-gray-600">คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-2">
                  <FiAlertCircle className="text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">ข้อมูลที่จะแก้ไข</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600 text-sm">ชื่อ-นามสกุล:</span>
                      <span className="text-gray-900 font-bold">{pendingUpdateData.first_name} {pendingUpdateData.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-gray-600 text-sm">อีเมล:</span>
                      <span className="text-gray-900">{pendingUpdateData.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-gray-600 text-sm">เครดิต:</span>
                      <span className="text-gray-900 font-bold">{pendingUpdateData.credit}</span>
                    </div>
                    {pendingUpdateData.password && (
                      <div className="flex justify-between items-center py-1 border-t border-gray-100">
                        <span className="text-gray-600 text-sm">รหัสผ่าน:</span>
                        <span className="text-orange-600 font-medium">จะเปลี่ยนรหัสผ่านใหม่</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={cancelUpdate}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  disabled={actionLoading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmUpdate}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="mr-2" />
                      ยืนยันการแก้ไข
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn"
            onClick={() => {
              setShowImageModal(false);
              setSelectedImage(null);
            }}
          >
            <div 
              className="relative max-w-5xl w-full transform transition-all duration-300 ease-out scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-3xl px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                    <FiUser className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">รูปโปรไฟล์</h3>
                    {selectedImage.name && (
                      <p className="text-blue-100 text-sm">{selectedImage.name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowImageModal(false);
                    setSelectedImage(null);
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200 hover:rotate-90"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Image Container */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-b-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-4 shadow-inner">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name || 'Profile Image'}
                    className="max-w-full max-h-[70vh] object-contain mx-auto rounded-xl shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
