import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiFilter, FiSearch,
  FiDownload, FiUser, FiClock, FiRefreshCw, FiCalendar, FiTag,
  FiActivity, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getAllCreditHistory } from '../../api/adminService';
import { API_URL } from '../../api/api';

const AdminCreditHistory = () => {
  const [creditHistory, setCreditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      
      const historyResponse = await getAllCreditHistory({ limit: 1000 });

      if (historyResponse.success) {
        setCreditHistory(historyResponse.data);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      if (showLoading) {
        toast.error('เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh ทุก 10 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false); // refresh แบบไม่แสดง loading
    }, 10000); // 10 วินาที

    return () => clearInterval(interval);
  }, [fetchData]);

  const handleManualRefresh = () => {
    fetchData(false);
    toast.success('รีเฟรชข้อมูลแล้ว');
  };

  const getProfileImageUrl = (profileImage) => {
    if (!profileImage) {
      return null;
    }
    const url = `${API_URL}${profileImage}`;
    return url;
  };

  const getTransactionTypeLabel = (type) => {
    const types = {
      'borrow': 'ยืมอุปกรณ์',
      'return': 'คืนอุปกรณ์',
      'penalty': 'ค่าปรับ',
      'adjustment': 'ปรับเครดิต',
      'refund': 'คืนเครดิต'
    };
    return types[type] || type;
  };

  const getReferenceTypeLabel = (type) => {
    const types = {
      'borrowing': 'การยืม',
      'disbursement': 'การเบิกจ่าย',
      'manual': 'ปรับโดย Admin'
    };
    return types[type] || type;
  };

  const getTransactionColor = (amount) => {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const filteredHistory = creditHistory.filter(transaction => {
    const matchesType = !filterType || transaction.transaction_type === filterType;
    const matchesSearch = !searchTerm || 
      transaction.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = () => {
    const headers = ['วันที่', 'ผู้ใช้', 'ประเภท', 'จำนวน', 'ยอดคงเหลือ', 'รายละเอียด', 'ผู้ดำเนินการ'];
    const csvData = filteredHistory.map(transaction => [
      formatDate(transaction.created_at),
      `${transaction.first_name} ${transaction.last_name}`,
      getTransactionTypeLabel(transaction.transaction_type),
      transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount,
      transaction.balance_after,
      transaction.description || '-',
      transaction.creator_first_name ? `${transaction.creator_first_name} ${transaction.creator_last_name}` : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `credit_history_${new Date().getTime()}.csv`;
    link.click();
    
    toast.success('ส่งออกข้อมูลสำเร็จ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
              <FiActivity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">ประวัติการเปลี่ยนแปลงเครดิต</h1>
              <p className="text-indigo-100 text-sm">
                ติดตามและตรวจสอบการเปลี่ยนแปลงเครดิตของผู้ใช้ทั้งหมดในระบบ
              </p>
              <p className="text-indigo-200 text-xs mt-1 flex items-center gap-2">
                <FiClock className="w-3 h-3" />
                อัพเดทล่าสุด: {lastUpdate.toLocaleTimeString('th-TH')} • อัพเดทอัตโนมัติทุก 10 วินาที
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className={`flex items-center px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FiRefreshCw className={`mr-2 w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium">{refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={filteredHistory.length === 0}
              className="flex items-center px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <FiDownload className="mr-2 w-4 h-4" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">รายการทั้งหมด</p>
              <p className="text-3xl font-bold text-blue-700">{creditHistory.length}</p>
              <p className="text-xs text-blue-500 mt-1">ทั้งหมดในระบบ</p>
            </div>
            <div className="bg-blue-500 bg-opacity-20 p-4 rounded-xl">
              <FiDollarSign className="text-4xl text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">เพิ่มเครดิต</p>
              <p className="text-3xl font-bold text-green-700">
                {creditHistory.filter(t => t.amount > 0).length}
              </p>
              <p className="text-xs text-green-500 mt-1">รายการเติมเครดิต</p>
            </div>
            <div className="bg-green-500 bg-opacity-20 p-4 rounded-xl">
              <FiTrendingUp className="text-4xl text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 mb-1">หักเครดิต</p>
              <p className="text-3xl font-bold text-red-700">
                {creditHistory.filter(t => t.amount < 0).length}
              </p>
              <p className="text-xs text-red-500 mt-1">รายการหักเครดิต</p>
            </div>
            <div className="bg-red-500 bg-opacity-20 p-4 rounded-xl">
              <FiTrendingDown className="text-4xl text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">ปรับโดย Admin</p>
              <p className="text-3xl font-bold text-purple-700">
                {creditHistory.filter(t => t.created_by_admin !== null).length}
              </p>
              <p className="text-xs text-purple-500 mt-1">ดำเนินการด้วยตนเอง</p>
            </div>
            <div className="bg-purple-500 bg-opacity-20 p-4 rounded-xl">
              <FiUser className="text-4xl text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FiFilter className="text-indigo-600 w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">ตัวกรองและค้นหา</h3>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <FiFilter className="mr-2" />
              {showFilters ? 'ซ่อน' : 'แสดง'}ตัวกรอง
            </button>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <FiSearch className="mr-2 text-indigo-600" />
                ค้นหา
              </label>
              <div className="relative group">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ชื่อผู้ใช้, อีเมล, รายละเอียด..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <FiTag className="mr-2 text-indigo-600" />
                ประเภทรายการ
              </label>
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white cursor-pointer appearance-none"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="borrow">ยืมอุปกรณ์</option>
                  <option value="return">คืนอุปกรณ์</option>
                  <option value="penalty">ค่าปรับ</option>
                  <option value="adjustment">ปรับเครดิต</option>
                  <option value="refund">คืนเครดิต</option>
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {(searchTerm || filterType) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-gray-600">
                  พบ <span className="font-bold text-indigo-600">{filteredHistory.length}</span> รายการที่ตรงกับเงื่อนไข
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('');
                    setCurrentPage(1);
                  }}
                  className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  <FiAlertCircle className="mr-2" />
                  ล้างตัวกรอง
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credit History Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="text-indigo-600" />
                    <span>วันที่/เวลา</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <FiUser className="text-indigo-600" />
                    <span>ผู้ใช้</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <FiTag className="text-indigo-600" />
                    <span>ประเภท</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <FiTrendingUp className="text-indigo-600" />
                    <span>จำนวน</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <FiDollarSign className="text-indigo-600" />
                    <span>ยอดคงเหลือ</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  รายละเอียด
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <FiCheckCircle className="text-indigo-600" />
                    <span>ผู้ดำเนินการ</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentItems.length > 0 ? (
                currentItems.map((transaction) => (
                  <tr 
                    key={transaction.transaction_id} 
                    className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                          <FiClock className="text-indigo-600 w-4 h-4" />
                        </div>
                        <span className="font-medium">{formatDate(transaction.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {transaction.profile_image ? (
                          <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                            <img
                              src={getProfileImageUrl(transaction.profile_image)}
                              alt={`${transaction.first_name} ${transaction.last_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white">
                            <FiUser className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {transaction.first_name} {transaction.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{transaction.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-sm">
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                          {getReferenceTypeLabel(transaction.reference_type)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`flex items-center space-x-2 ${getTransactionColor(transaction.amount)}`}>
                        <div className={`p-2 rounded-lg ${
                          transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.amount > 0 ? (
                            <FiTrendingUp className="w-4 h-4" />
                          ) : (
                            <FiTrendingDown className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-lg font-bold">
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`inline-flex items-center px-4 py-2 rounded-xl font-bold text-sm shadow-sm ${
                        transaction.amount > 0 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border border-green-300' 
                          : 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 border border-red-300'
                      }`}>
                        <FiDollarSign className="mr-1" />
                        {transaction.balance_after} คะแนน
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-gray-700 max-w-xs">
                        <p className="line-clamp-2">
                          {transaction.description || <span className="text-gray-400 italic">ไม่มีรายละเอียด</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {transaction.created_by_admin && transaction.creator_first_name ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-400">
                            {transaction.creator_profile_image ? (
                              <img
                                src={getProfileImageUrl(transaction.creator_profile_image)}
                                alt={`${transaction.creator_first_name} ${transaction.creator_last_name}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-white ${transaction.creator_profile_image ? 'hidden' : 'flex'}`}>
                              <FiUser className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              {transaction.creator_first_name} {transaction.creator_last_name}
                            </div>
                            <div className="text-xs text-gray-500">Admin</div>
                          </div>
                        </div>
                      ) : transaction.created_by_admin ? (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white">
                            <FiUser className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Admin</div>
                            <div className="text-xs text-gray-500">ID: {transaction.created_by_admin}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-400">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <FiActivity className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm italic">ระบบอัตโนมัติ</div>
                            <div className="text-xs text-gray-400">System</div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="bg-gray-100 p-6 rounded-full mb-4">
                        <FiDollarSign className="w-16 h-16" />
                      </div>
                      <p className="text-xl font-semibold text-gray-600 mb-2">ไม่พบประวัติการเปลี่ยนแปลงเครดิต</p>
                      <p className="text-sm text-gray-500">ลองปรับเปลี่ยนตัวกรองหรือเพิ่มข้อมูลใหม่</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-4">
            <div className="text-sm font-medium text-gray-700">
              แสดง <span className="text-indigo-600 font-bold">{indexOfFirstItem + 1}</span> ถึง{' '}
              <span className="text-indigo-600 font-bold">{Math.min(indexOfLastItem, filteredHistory.length)}</span>{' '}
              จากทั้งหมด <span className="text-indigo-600 font-bold">{filteredHistory.length}</span> รายการ
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl bg-white hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-gray-700 hover:text-indigo-600"
              >
                ← ก่อนหน้า
              </button>
              
              <div className="hidden sm:flex space-x-2">
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (currentPage <= 3) {
                    pageNum = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = currentPage - 2 + idx;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 border-2 rounded-xl font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-lg transform scale-110'
                          : 'bg-white border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <div className="sm:hidden">
                <span className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl font-bold text-gray-700">
                  {currentPage} / {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl bg-white hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-gray-700 hover:text-indigo-600"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreditHistory;
