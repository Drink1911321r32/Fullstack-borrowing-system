import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiClock, FiFileText, FiChevronDown, FiChevronUp, FiFilter, FiCalendar, FiBox, FiClipboard, FiSearch, FiCreditCard, FiRefreshCw, FiCheckCircle, FiXCircle, FiAlertCircle, FiTrendingUp, FiPackage, FiUser, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../hooks';
import { userAPI } from '../../api/api';
import Loading from '../common/Loading';

const UserHistory = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'timeline'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchUserHistory();
  }, []);

  const fetchUserHistory = async () => {
    try {
      setIsLoading(true);
      
      const params = {};
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      const response = await userAPI.getUserHistory(params);
      
      if (response.success) {
        setHistory(response.data.history || []);
        setFilteredHistory(response.data.history || []);
      } else {
        toast.error(response.message || 'ไม่สามารถดึงข้อมูลได้');
        setHistory([]);
        setFilteredHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ');
      setHistory([]);
      setFilteredHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  // กรองข้อมูลตามเงื่อนไข
  useEffect(() => {
    let filtered = [...history];

    // กรองตามคำค้นหา
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [history, searchTerm]);

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusColor = (status, type) => {
    const statusMap = {
      'Approved': 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
      'Completed': 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
      'Cancelled': 'bg-gradient-to-r from-red-400 to-red-600 text-white',
      'Overdue': 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
    };
    return statusMap[status] || 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'Approved': <FiCheckCircle className="w-4 h-4" />,
      'Completed': <FiCheckCircle className="w-4 h-4" />,
      'Cancelled': <FiXCircle className="w-4 h-4" />,
      'Overdue': <FiAlertCircle className="w-4 h-4" />
    };
    return iconMap[status] || <FiClock className="w-4 h-4" />;
  };

  const getStatusText = (status, type) => {
    const statusTextMap = {
      'Approved': type === 'borrow' ? 'กำลังยืม' : 'อนุมัติแล้ว',
      'Completed': type === 'borrow' ? 'คืนแล้ว' : 'เบิกแล้ว',
      'Cancelled': 'ยกเลิก',
      'Overdue': 'เกินกำหนด'
    };
    return statusTextMap[status] || status;
  };

  const getTypeIcon = (type) => {
    return type === 'borrow' ? <FiBox className="h-5 w-5" /> : <FiClipboard className="h-5 w-5" />;
  };

  const getTypeText = (type) => {
    return type === 'borrow' ? 'ยืม-คืน' : 'เบิก-จ่าย';
  };

  const clearFilters = async () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setActiveTab('all');
    
    try {
      setIsLoading(true);
      const response = await userAPI.getUserHistory({});
      
      if (response.success) {
        setHistory(response.data.history || []);
        setFilteredHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('Error clearing filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    // Fetch ใหม่เมื่อเปลี่ยนแท็บ
    try {
      setIsLoading(true);
      
      const params = {};
      if (tab !== 'all') {
        params.type = tab;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      const response = await userAPI.getUserHistory(params);
      
      if (response.success) {
        setHistory(response.data.history || []);
        setFilteredHistory(response.data.history || []);
      } else {
        toast.error(response.message || 'ไม่สามารถดึงข้อมูลได้');
        setHistory([]);
        setFilteredHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ');
      setHistory([]);
      setFilteredHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (newStatusFilter = null) => {
    try {
      setIsLoading(true);
      
      const params = {};
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      if ((newStatusFilter || statusFilter) !== 'all') {
        params.status = newStatusFilter || statusFilter;
      }
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      const response = await userAPI.getUserHistory(params);
      
      if (response.success) {
        setHistory(response.data.history || []);
        setFilteredHistory(response.data.history || []);
        setCurrentPage(1); // Reset to first page
      } else {
        toast.error(response.message || 'ไม่สามารถดึงข้อมูลได้');
        setHistory([]);
        setFilteredHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ');
      setHistory([]);
      setFilteredHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FiClock className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">ประวัติการใช้งาน</h1>
                  <p className="text-indigo-100 mt-1">ติดตามและจัดการประวัติการยืม-คืน และเบิก-จ่ายอุปกรณ์</p>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-4 md:mt-0 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold">{history.length}</div>
                <div className="text-sm text-indigo-100">รายการทั้งหมด</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className={`text-2xl font-bold ${
                  (user?.credit || 0) < 0 ? 'text-red-300' : 'text-white'
                }`}>{user?.credit || 0}</div>
                <div className="text-sm text-indigo-100">เครดิตคงเหลือ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <nav className="flex space-x-2 px-6">
              <button
                onClick={() => handleTabChange('all')}
                className={`py-4 px-6 font-medium text-sm transition-all duration-200 border-b-3 relative ${
                  activeTab === 'all'
                    ? 'text-indigo-600 border-b-4 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <FiFileText className="w-4 h-4" />
                  <span>ทั้งหมด</span>
                </span>
                {activeTab === 'all' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => handleTabChange('borrow')}
                className={`py-4 px-6 font-medium text-sm transition-all duration-200 border-b-3 relative ${
                  activeTab === 'borrow'
                    ? 'text-blue-600 border-b-4 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <FiBox className="w-4 h-4" />
                  <span>ยืม-คืน</span>
                </span>
                {activeTab === 'borrow' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => handleTabChange('disbursement')}
                className={`py-4 px-6 font-medium text-sm transition-all duration-200 border-b-3 relative ${
                  activeTab === 'disbursement'
                    ? 'text-emerald-600 border-b-4 border-emerald-600'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <FiClipboard className="w-4 h-4" />
                  <span>เบิก-จ่าย</span>
                </span>
                {activeTab === 'disbursement' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-full"></div>
                )}
              </button>
            </nav>
          </div>

          {/* Search & Filters */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ค้นหาอุปกรณ์, รหัส, หรือหมายเหตุ..."
                    className="pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setStatusFilter(newStatus);
                    handleFilterChange(newStatus);
                  }}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md font-medium"
                >
                  <option value="all">📋 สถานะทั้งหมด</option>
                  <option value="Approved">✅ อนุมัติแล้ว</option>
                  <option value="Completed">🔄 เสร็จสมบูรณ์</option>
                  <option value="Cancelled">❌ ยกเลิก</option>
                </select>
              </div>

              {/* Date Range & Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                    className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                    className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={clearFilters}
                    className="px-5 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center space-x-2"
                  >
                    <FiXCircle className="w-4 h-4" />
                    <span>ล้าง</span>
                  </button>
                  
                  <button
                    onClick={fetchUserHistory}
                    disabled={isLoading}
                    className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center space-x-2 disabled:opacity-50"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="mt-4 flex items-center justify-end space-x-2">
              <span className="text-sm text-gray-600 font-medium">มุมมอง:</span>
              <div className="bg-gray-100 rounded-xl p-1 flex space-x-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FiPackage className="w-4 h-4 inline mr-1" />
                  การ์ด
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'timeline'
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FiTrendingUp className="w-4 h-4 inline mr-1" />
                  ไทม์ไลน์
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-16 text-center border border-gray-100">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiFileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">ไม่มีประวัติการใช้งาน</h3>
              <p className="text-gray-500 text-lg">
                {searchTerm || statusFilter !== 'all' || dateRange.startDate || dateRange.endDate
                  ? 'ไม่พบประวัติที่ตรงกับเงื่อนไขการค้นหา ลองปรับเงื่อนไขใหม่'
                  : 'คุณยังไม่มีประวัติการยืม-คืน หรือเบิก-จ่ายอุปกรณ์'}
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentItems.map((item) => (
              <div 
                key={`${item.type}-${item.transaction_id}`} 
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group"
              >
                {/* Card Header with Gradient */}
                <div className={`p-6 ${
                  item.type === 'borrow' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                } text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{item.equipment_name}</h3>
                            <p className="text-white/80 text-sm font-medium">รหัส: {item.equipment_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-3">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg ${getStatusColor(item.status, item.type)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1.5">{getStatusText(item.status, item.type)}</span>
                          </span>
                          <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg text-xs font-bold">
                            {getTypeText(item.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-3">
                      <FiCalendar className="text-indigo-600 w-5 h-5" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">วันที่ขอ</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(item.created_at || item.borrow_date).toLocaleDateString('th-TH', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3">
                      <FiCreditCard className="text-purple-600 w-5 h-5" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">เครดิต</p>
                        <p className="text-sm font-bold text-purple-600">{item.credit_used || 0} คะแนน</p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => toggleExpanded(item.transaction_id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
                  >
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <FiFileText className="w-4 h-4 mr-2" />
                      รายละเอียดเพิ่มเติม
                    </span>
                    <div className="flex items-center space-x-2">
                      {expandedItems[item.transaction_id] ? (
                        <FiChevronUp className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      ) : (
                        <FiChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      )}
                    </div>
                  </button>

                  {expandedItems[item.transaction_id] && (
                    <div className="mt-4 space-y-3 animate-fadeIn">
                      {/* Equipment Info */}
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full mr-2"></div>
                          ข้อมูลอุปกรณ์
                        </h4>
                        <div className="space-y-2 text-sm">
                          {item.model && (
                            <div className="p-2 bg-white rounded-lg">
                              <span className="text-gray-600 font-medium block mb-1">รุ่น:</span>
                              <span className="text-gray-900 font-medium break-words">{item.model}</span>
                            </div>
                          )}
                          {item.type === 'borrow' && item.serial_numbers && (
                            <div className="p-2 bg-white rounded-lg">
                              <span className="text-gray-600 font-medium block mb-1">Serial Number:</span>
                              <div className="flex flex-wrap gap-1">
                                {item.serial_numbers.split(',').map((sn, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-xs border border-blue-300"
                                  >
                                    {sn.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-2"></div>
                          ข้อมูลการทำรายการ
                        </h4>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          {item.type === 'borrow' ? (
                            <>
                              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                <span className="text-gray-600 font-medium">วันที่เริ่มยืม:</span>
                                <span className="text-gray-900 font-bold">
                                  {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString('th-TH') : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                <span className="text-gray-600 font-medium">วันที่ต้องคืน:</span>
                                <span className="text-gray-900 font-bold">
                                  {item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString('th-TH') : '-'}
                                </span>
                              </div>
                              {item.actual_return_date && (
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                  <span className="text-gray-600 font-medium">วันที่คืนจริง:</span>
                                  <span className="text-green-700 font-bold">
                                    {new Date(item.actual_return_date).toLocaleDateString('th-TH')}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                <span className="text-gray-600 font-medium">จำนวน:</span>
                                <span className="text-gray-900 font-bold">{item.quantity || item.quantity_borrowed} ชิ้น</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                <span className="text-gray-600 font-medium">จำนวน:</span>
                                <span className="text-gray-900 font-bold">{item.quantity || item.quantity_requested} ชิ้น</span>
                              </div>
                              {item.disbursement_date && (
                                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                  <span className="text-gray-600 font-medium">วันที่เบิก:</span>
                                  <span className="text-gray-900 font-bold">
                                    {new Date(item.disbursement_date).toLocaleDateString('th-TH')}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {item.approver_first_name && (
                            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                              <span className="text-gray-600 font-medium flex items-center">
                                <FiUser className="w-4 h-4 mr-1" />
                                ผู้อนุมัติ:
                              </span>
                              <span className="text-indigo-700 font-bold">
                                {item.approver_first_name} {item.approver_last_name}
                              </span>
                            </div>
                          )}
                          {item.approval_date && (
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                              <span className="text-gray-600 font-medium">วันที่อนุมัติ:</span>
                              <span className="text-gray-900 font-bold">
                                {new Date(item.approval_date).toLocaleDateString('th-TH')}
                              </span>
                            </div>
                          )}
                        </div>
                        {item.status === 'Cancelled' && item.rejection_reason && (
                          <div className="mt-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                            <p className="text-xs text-red-600 font-bold mb-1 flex items-center">
                              <FiXCircle className="w-4 h-4 mr-1.5" />
                              🚫 เหตุผลการไม่อนุมัติ
                            </p>
                            <p className="text-sm text-red-700 font-medium">{item.rejection_reason}</p>
                          </div>
                        )}
                        {(item.notes || item.purpose) && (
                          <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-indigo-500">
                            <p className="text-xs text-gray-500 font-medium mb-1">
                              {item.purpose ? '📝 วัตถุประสงค์' : '💬 หมายเหตุ'}
                            </p>
                            <p className="text-sm text-gray-900 break-words">{item.purpose || item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Timeline View
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200"></div>
              
              <div className="space-y-8">
                {currentItems.map((item, index) => (
                  <div key={`${item.type}-${item.transaction_id}`} className="relative pl-20 group">
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 w-16 h-16 rounded-2xl flex items-center justify-center ${
                      item.type === 'borrow'
                        ? 'bg-gradient-to-br from-blue-400 to-cyan-500'
                        : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                    } text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {getTypeIcon(item.type)}
                    </div>

                    {/* Timeline Content */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{item.equipment_name}</h3>
                          <p className="text-gray-500 text-sm font-medium">รหัส: {item.equipment_code}</p>
                        </div>
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${getStatusColor(item.status, item.type)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-2">{getStatusText(item.status, item.type)}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-3 bg-white rounded-xl p-3 shadow-sm">
                          <FiCalendar className="text-indigo-600 w-5 h-5" />
                          <div>
                            <p className="text-xs text-gray-500">วันที่ขอ</p>
                            <p className="text-sm font-bold text-gray-900">
                              {new Date(item.created_at || item.borrow_date).toLocaleDateString('th-TH', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 bg-white rounded-xl p-3 shadow-sm">
                          <FiCreditCard className="text-purple-600 w-5 h-5" />
                          <div>
                            <p className="text-xs text-gray-500">เครดิต</p>
                            <p className="text-sm font-bold text-purple-600">{item.credit_used || 0} คะแนน</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 bg-white rounded-xl p-3 shadow-sm">
                          <FiBox className="text-blue-600 w-5 h-5" />
                          <div>
                            <p className="text-xs text-gray-500">ประเภท</p>
                            <p className="text-sm font-bold text-gray-900">{getTypeText(item.type)}</p>
                          </div>
                        </div>
                      </div>

                      {item.status === 'Cancelled' && item.rejection_reason && (
                        <div className="mt-4 p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                          <p className="text-xs text-red-600 font-bold mb-1 flex items-center">
                            <FiXCircle className="w-4 h-4 mr-1.5" />
                            🚫 เหตุผลการไม่อนุมัติ
                          </p>
                          <p className="text-sm text-red-700 font-medium">{item.rejection_reason}</p>
                        </div>
                      )}
                      {(item.notes || item.purpose) && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-l-4 border-indigo-500">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {item.purpose ? '📝 วัตถุประสงค์' : '💬 หมายเหตุ'}
                          </p>
                          <p className="text-sm text-gray-700 break-words">{item.purpose || item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <FiBox className="w-8 h-8 opacity-80" />
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {history.filter(item => item.type === 'borrow').length}
                  </div>
                  <div className="text-sm text-blue-100 font-medium">ครั้งการยืม</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-blue-100">การยืม-คืนอุปกรณ์ทั้งหมด</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <FiClipboard className="w-8 h-8 opacity-80" />
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {history.filter(item => item.type === 'disbursement').length}
                  </div>
                  <div className="text-sm text-emerald-100 font-medium">ครั้งการเบิก</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-emerald-100">การเบิก-จ่ายอุปกรณ์ทั้งหมด</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <FiCreditCard className="w-8 h-8 opacity-80" />
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {history
                      .filter(item => item.status === 'Approved' || item.status === 'Borrowed' || item.status === 'Returned' || item.status === 'Disbursed')
                      .reduce((sum, item) => sum + (item.credit_used || 0), 0)}
                  </div>
                  <div className="text-sm text-purple-100 font-medium">เครดิตที่ใช้</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-purple-100">เครดิตที่ใช้ไป (เฉพาะรายการที่อนุมัติ)</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <FiTrendingUp className="w-8 h-8 opacity-80" />
                <div className="text-right">
                  <div className="text-3xl font-bold">{user?.credit || 0}</div>
                  <div className="text-sm text-indigo-100 font-medium">เครดิตคงเหลือ</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-indigo-100">เครดิตที่สามารถใช้ได้</p>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredHistory.length > 0 && totalPages > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page Info */}
              <div className="text-sm text-gray-600">
                แสดง <span className="font-semibold text-indigo-600">{startIndex + 1}</span> ถึง{' '}
                <span className="font-semibold text-indigo-600">{Math.min(endIndex, filteredHistory.length)}</span> จาก{' '}
                <span className="font-semibold text-indigo-600">{filteredHistory.length}</span> รายการ
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  ก่อนหน้า
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserHistory;