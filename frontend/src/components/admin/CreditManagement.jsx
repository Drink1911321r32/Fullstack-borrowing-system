import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiCreditCard, FiUsers, FiDollarSign, FiTrendingUp, FiTrendingDown, 
  FiSearch, FiFilter, FiEdit, FiPlus, FiMinus, FiRefreshCw, FiDownload,
  FiAlertCircle, FiCheckCircle, FiClock, FiUser, FiX, FiCheck
} from 'react-icons/fi';
import { STORAGE_KEYS } from '../../constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminCreditManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [creditAction, setCreditAction] = useState({
    type: 'add', // add, deduct, reset
    amount: 0,
    reason: '',
    note: ''
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCredits: 0,
    averageCredit: 0,
    lowCreditUsers: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      // เรียก API จริงเพื่อดึงข้อมูล users
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      }

      const result = await response.json();
      
      // แปลงข้อมูลจาก API ให้ตรงกับ format ที่ใช้ใน component
      const transformedUsers = result.data.map(user => ({
        id: user.user_id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email,
        profile_image: user.profile_image,
        credit: user.credit !== null && user.credit !== undefined ? parseFloat(user.credit) : 100,
        initial_credit: 100,
        role: user.role,
        borrowed_items: parseInt(user.active_borrowings) || 0,
        pending_return: parseInt(user.active_borrowings) || 0,
        total_borrowed: parseInt(user.total_borrowings) || 0,
        on_time_return: parseInt(user.on_time_return) || 0,
        late_return: parseInt(user.late_return) || 0,
        last_activity: user.last_activity || user.updated_at || user.created_at,
        created_at: user.created_at
      }));

      setUsers(transformedUsers);
      
      // คำนวณสถิติ
      const totalCredits = transformedUsers.reduce((sum, user) => sum + user.credit, 0);
      const lowCreditCount = transformedUsers.filter(user => user.credit < 30).length;
      
      setStats({
        totalUsers: transformedUsers.length,
        totalCredits: totalCredits,
        averageCredit: transformedUsers.length > 0 ? Math.round(totalCredits / transformedUsers.length) : 0,
        lowCreditUsers: lowCreditCount
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openCreditModal = (user, type) => {
    setSelectedUser(user);
    setCreditAction({
      type: type,
      amount: 0,
      reason: '',
      note: ''
    });
    setIsModalOpen(true);
  };

  const closeCreditModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setCreditAction({
      type: 'add',
      amount: 0,
      reason: '',
      note: ''
    });
  };

  const handleCreditChange = () => {
    if (creditAction.type !== 'reset' && (!creditAction.amount || creditAction.amount <= 0)) {
      toast.error('กรุณาระบุจำนวนเครดิต');
      return;
    }

    if (!creditAction.reason) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }

    // แสดง confirmation modal
    setShowConfirmModal(true);
  };

  const confirmCreditChange = async () => {
    try {
      setShowConfirmModal(false);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      // เรียกใช้ API ใหม่สำหรับจัดการเครดิตโดย admin
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: creditAction.type, // 'add', 'deduct', 'reset'
          amount: parseFloat(creditAction.amount || 0),
          reason: creditAction.reason,
          note: creditAction.note
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'ไม่สามารถอัพเดตเครดิตได้');
      }

      // ใช้ค่าจาก API response
      const newCredit = result.data.new_credit;

      // อัพเดต state ใน frontend
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, credit: newCredit }
          : user
      );
      setUsers(updatedUsers);

      // คำนวณสถิติใหม่
      const totalCredits = updatedUsers.reduce((sum, user) => sum + user.credit, 0);
      const lowCreditCount = updatedUsers.filter(user => user.credit < 30).length;
      
      setStats({
        totalUsers: updatedUsers.length,
        totalCredits: totalCredits,
        averageCredit: updatedUsers.length > 0 ? Math.round(totalCredits / updatedUsers.length) : 0,
        lowCreditUsers: lowCreditCount
      });

      toast.success(result.message || `${creditAction.type === 'add' ? 'เพิ่ม' : creditAction.type === 'deduct' ? 'หัก' : 'รีเซ็ต'}เครดิตสำเร็จ`);
      closeCreditModal();
      
    } catch (error) {
      console.error('Error updating credit:', error);
      toast.error(error.message || 'ไม่สามารถอัพเดตเครดิตได้');
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmModal(false);
  };

  const getCreditStatusColor = (credit, initialCredit) => {
    const percentage = (credit / initialCredit) * 100;
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditBadgeColor = (credit, initialCredit) => {
    const percentage = (credit / initialCredit) * 100;
    if (percentage >= 70) return 'bg-green-100 text-green-800';
    if (percentage >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiCreditCard className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">จัดการเครดิตผู้ใช้</h1>
                  <p className="text-indigo-100 mt-1 font-medium">ควบคุมและจัดการเครดิตของผู้ใช้ในระบบ</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                <button
                  onClick={fetchUsers}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiRefreshCw className="w-5 h-5 text-white" />
                </button>
                <button className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30">
                  <FiDownload className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-3xl font-bold text-indigo-600">{stats.totalUsers}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-xl">
                <FiUsers className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">เครดิตรวม</p>
                <p className="text-3xl font-bold text-green-600 whitespace-nowrap">
                  {stats.totalCredits.toFixed(2)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <FiDollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">เครดิตต่ำ</p>
                <p className="text-3xl font-bold text-red-600 whitespace-nowrap">
                  {stats.lowCreditUsers}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <FiAlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">น้อยกว่า 30 เครดิต</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ค้นหาผู้ใช้ (ชื่อ, อีเมล)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">👥 รายชื่อผู้ใช้และเครดิต</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center">
                <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">ไม่พบผู้ใช้</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ผู้ใช้</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">เครดิตปัจจุบัน</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">กำลังยืม</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">สถิติการยืม</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">กิจกรรมล่าสุด</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentItems.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="bg-gradient-to-br from-indigo-100 to-purple-100 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
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
                                  e.target.nextSibling.classList.remove('hidden');
                                  e.target.nextSibling.classList.add('flex');
                                }}
                              />
                            ) : null}
                            <div className={`${user.profile_image ? 'hidden' : 'flex'} w-full h-full items-center justify-center text-indigo-600`}>
                              <FiUser className="w-6 h-6" />
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className={`text-2xl font-bold whitespace-nowrap ${getCreditStatusColor(user.credit, user.initial_credit)}`}>
                            {parseFloat(user.credit).toFixed(2)}
                          </p>
                          <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (user.credit / user.initial_credit) * 100 >= 70 ? 'bg-green-500' :
                                (user.credit / user.initial_credit) * 100 >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, (user.credit / user.initial_credit) * 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                            {((user.credit / user.initial_credit) * 100).toFixed(0)}% จาก {user.initial_credit}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">{user.borrowed_items}</p>
                          <p className="text-xs text-gray-500">รายการ</p>
                          <p className="text-sm text-yellow-600 font-medium mt-1">
                            รอคืน: {user.pending_return}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">
                            ทั้งหมด: <span className="font-medium">{user.total_borrowed}</span>
                          </p>
                          <p className="text-green-600">
                            ตรงเวลา: <span className="font-medium">{user.on_time_return}</span>
                          </p>
                          <p className="text-red-600">
                            ล่าช้า: <span className="font-medium">{user.late_return}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {new Date(user.last_activity).toLocaleDateString('th-TH')}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openCreditModal(user, 'add')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="เพิ่มเครดิต"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openCreditModal(user, 'deduct')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="หักเครดิต"
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openCreditModal(user, 'reset')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="รีเซ็ตเครดิต"
                          >
                            <FiRefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredUsers.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-6">
              <div className="text-sm text-gray-600">
                แสดง {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} จาก {filteredUsers.length} รายการ
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ก่อนหน้า
                </button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            currentPage === pageNumber
                              ? 'bg-indigo-600 text-white shadow-lg'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return <span key={pageNumber} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credit Action Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className={`px-6 py-4 border-b border-gray-200 ${
              creditAction.type === 'add' ? 'bg-green-50' :
              creditAction.type === 'deduct' ? 'bg-red-50' : 'bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  {creditAction.type === 'add' ? '➕ เพิ่มเครดิต' :
                   creditAction.type === 'deduct' ? '➖ หักเครดิต' : '🔄 รีเซ็ตเครดิต'}
                </h3>
                <button
                  onClick={closeCreditModal}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-white/50 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600">ผู้ใช้:</p>
                <p className="font-semibold text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <p className="text-sm text-gray-600">เครดิตปัจจุบัน:</p>
                  <p className={`text-xl font-bold ${getCreditStatusColor(selectedUser.credit, selectedUser.initial_credit)}`}>
                    {parseFloat(selectedUser.credit).toFixed(2)}
                  </p>
                </div>
              </div>

              {creditAction.type !== 'reset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวนเครดิต <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={creditAction.amount}
                    onChange={(e) => setCreditAction({...creditAction, amount: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="ระบุจำนวนเครดิต (เช่น 10.50)"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เหตุผล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={creditAction.reason}
                  onChange={(e) => setCreditAction({...creditAction, reason: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder={
                    creditAction.type === 'add' ? 'เช่น: โบนัสการคืนตรงเวลา' :
                    creditAction.type === 'deduct' ? 'เช่น: ค่าปรับคืนล่าช้า' :
                    'เช่น: รีเซ็ตเครดิตต้นปี'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเหตุ (ถ้ามี)
                </label>
                <textarea
                  value={creditAction.note}
                  onChange={(e) => setCreditAction({...creditAction, note: e.target.value})}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>

              {creditAction.type !== 'reset' && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">เครดิตหลังจากการเปลี่ยนแปลง:</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {creditAction.type === 'add' 
                      ? (parseFloat(selectedUser.credit) + parseFloat(creditAction.amount || 0)).toFixed(2)
                      : Math.max(0, parseFloat(selectedUser.credit) - parseFloat(creditAction.amount || 0)).toFixed(2)
                    }
                  </p>
                </div>
              )}

              {creditAction.type === 'reset' && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">เครดิตจะถูกรีเซ็ตเป็น:</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedUser.initial_credit}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={closeCreditModal}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreditChange}
                className={`px-4 py-2 rounded-xl text-white transition-all flex items-center ${
                  creditAction.type === 'add' ? 'bg-green-600 hover:bg-green-700' :
                  creditAction.type === 'deduct' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FiCheck className="w-4 h-4 mr-2" />
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all">
            <div className={`px-6 py-4 border-b border-gray-200 rounded-t-2xl ${
              creditAction.type === 'add' ? 'bg-gradient-to-r from-green-500 to-green-600' :
              creditAction.type === 'deduct' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
              'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}>
              <h3 className="text-xl font-bold text-white flex items-center">
                {creditAction.type === 'add' && <FiPlus className="mr-2" />}
                {creditAction.type === 'deduct' && <FiMinus className="mr-2" />}
                {creditAction.type === 'reset' && <FiRefreshCw className="mr-2" />}
                ยืนยันการเปลี่ยนแปลงเครดิต
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center mb-2">
                  <FiAlertCircle className="text-orange-600 mr-2" />
                  <span className="text-orange-800 font-medium">กรุณาตรวจสอบข้อมูล</span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">ผู้ใช้:</span>
                    <span className="text-gray-900 font-bold">{selectedUser.first_name} {selectedUser.last_name}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                    <span className="text-gray-600 text-sm">อีเมล:</span>
                    <span className="text-gray-900">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                    <span className="text-gray-600 text-sm">เครดิตปัจจุบัน:</span>
                    <span className="text-gray-900 font-bold text-lg">{parseFloat(selectedUser.credit).toFixed(2)}</span>
                  </div>
                  {creditAction.type !== 'reset' && (
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <span className="text-gray-600 text-sm">จำนวนทเปลี่ยน:</span>
                      <span className={`font-bold text-lg ${
                        creditAction.type === 'add' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {creditAction.type === 'add' ? '+' : '-'}{parseFloat(creditAction.amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                    <span className="text-gray-600 text-sm font-medium">เครดิตหลังการเปลี่ยน:</span>
                    <span className="text-blue-600 font-bold text-xl">
                      {creditAction.type === 'reset' 
                        ? selectedUser.initial_credit
                        : creditAction.type === 'add' 
                          ? (parseFloat(selectedUser.credit) + parseFloat(creditAction.amount || 0)).toFixed(2)
                          : Math.max(0, parseFloat(selectedUser.credit) - parseFloat(creditAction.amount || 0)).toFixed(2)
                      }
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <span className="text-gray-600 text-sm">เหตุผล:</span>
                    <p className="text-gray-900 font-medium mt-1">{creditAction.reason}</p>
                  </div>
                  {creditAction.note && (
                    <div className="border-t border-gray-100 pt-2">
                      <span className="text-gray-600 text-sm">หมายเหตุ:</span>
                      <p className="text-gray-900 mt-1">{creditAction.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={cancelConfirmation}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmCreditChange}
                className={`px-5 py-2.5 rounded-xl text-white transition-all font-medium flex items-center ${
                  creditAction.type === 'add' ? 'bg-green-600 hover:bg-green-700' :
                  creditAction.type === 'deduct' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FiCheck className="w-4 h-4 mr-2" />
                ยืนยันการเปลี่ยนแปลง
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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl px-6 py-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <FiUser className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">รูปโปรไฟล์</h3>
                  {selectedImage.name && (
                    <p className="text-indigo-100 text-sm">{selectedImage.name}</p>
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
  );
};

export default AdminCreditManagement;
