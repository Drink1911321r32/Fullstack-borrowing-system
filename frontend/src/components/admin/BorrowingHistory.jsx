import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiPackage, FiUser, FiCalendar, FiClock, FiFilter, FiSearch, 
  FiRefreshCw, FiDownload, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiEye, FiImage, FiBox
} from 'react-icons/fi';
import { STORAGE_KEYS } from '../../constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BorrowingHistory = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [filteredBorrowings, setFilteredBorrowings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    borrowed: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchBorrowings();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    filterBorrowings();
  }, [searchTerm, statusFilter, borrowings]);

  const fetchBorrowings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_URL}/api/borrowing`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลการยืม-คืนได้');
      }

      const result = await response.json();
      setBorrowings(result.data || []);

    } catch (error) {
      console.error('Error fetching borrowings:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการยืม-คืนได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลสถิติได้');
      }

      const result = await response.json();
      if (result.success && result.data && result.data.borrowings) {
        const b = result.data.borrowings;
        setStats({
          total: b.total_borrowings || 0,
          pending: b.pending_borrowings || 0,
          approved: b.approved_borrowings || 0,
          borrowed: b.active_borrowings || 0,
          completed: b.returned_borrowings || 0,
          rejected: b.rejected_borrowings || 0,
          cancelled: b.cancelled_borrowings || 0,
          overdue: b.overdue_borrowings || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // ไม่แสดง error เพราะไม่ critical
    }
  };

  const filterBorrowings = () => {
    let filtered = [...borrowings];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'Completed') {
        filtered = filtered.filter(b => b.is_returned === 1 || b.display_status === 'Completed');
      } else if (statusFilter === 'Overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(b => {
          if (b.status !== 'Approved' && b.status !== 'Borrowed') return false;
          if (b.quantity_remaining <= 0) return false;
          const expectedDate = new Date(b.expected_return_date);
          expectedDate.setHours(0, 0, 0, 0);
          return expectedDate < today;
        });
      } else {
        filtered = filtered.filter(b => b.status === statusFilter);
      }
    }

    setFilteredBorrowings(filtered);
    setCurrentPage(1);
  };

  const getStatusBadge = (borrowing) => {
    // เช็คว่าเกินกำหนดหรือไม่
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expectedDate = new Date(borrowing.expected_return_date);
    expectedDate.setHours(0, 0, 0, 0);
    const isOverdue = expectedDate < today && (borrowing.status === 'Approved' || borrowing.status === 'Borrowed') && borrowing.quantity_remaining > 0;

    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <FiAlertCircle className="mr-1" size={14} />
          เกินกำหนด
        </span>
      );
    }

    const statusConfig = {
      'Pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FiClock, label: 'รออนุมัติ' },
      'Approved': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FiCheckCircle, label: 'อนุมัติแล้ว' },
      'Borrowed': { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: FiBox, label: 'กำลังยืม' },
      'Completed': { bg: 'bg-green-100', text: 'text-green-800', icon: FiCheckCircle, label: 'คืนแล้ว' },
      'Rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: FiXCircle, label: 'ปฏิเสธ' },
      'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FiXCircle, label: 'ยกเลิก' }
    };

    const status = borrowing.is_returned === 1 || borrowing.display_status === 'Completed' ? 'Completed' : borrowing.status;
    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="mr-1" size={14} />
        {config.label}
      </span>
    );
  };

  const handleImageClick = (imagePath) => {
    if (imagePath) {
      const fullPath = imagePath.startsWith('http') ? imagePath : `${API_URL}${imagePath}`;
      setSelectedImage(fullPath);
      setShowImageModal(true);
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBorrowings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBorrowings.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ประวัติการยืม-คืน</h1>
          <p className="text-sm sm:text-base text-gray-600">แสดงประวัติการยืม-คืนอุปกรณ์ทั้งหมดในระบบ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">ทั้งหมด</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FiPackage className="text-indigo-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">รออนุมัติ</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <FiClock className="text-yellow-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">อนุมัติแล้ว</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.approved}</p>
              </div>
              <FiCheckCircle className="text-blue-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">กำลังยืม</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.borrowed}</p>
              </div>
              <FiBox className="text-indigo-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">คืนแล้ว</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <FiCheckCircle className="text-green-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">เกินกำหนด</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
              <FiAlertCircle className="text-red-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">ปฏิเสธ</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
              <FiXCircle className="text-red-500" size={20} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">ยกเลิก</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.cancelled}</p>
              </div>
              <FiXCircle className="text-gray-500" size={24} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiSearch className="inline mr-2" />
                ค้นหา
              </label>
              <input
                type="text"
                placeholder="ค้นหาอุปกรณ์, ชื่อผู้ยืม, อีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiFilter className="inline mr-2" />
                สถานะ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="Pending">รออนุมัติ</option>
                <option value="Approved">อนุมัติแล้ว</option>
                <option value="Borrowed">กำลังยืม</option>
                <option value="Completed">คืนแล้ว</option>
                <option value="Overdue">เกินกำหนด</option>
                <option value="Rejected">ปฏิเสธ</option>
                <option value="Cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={fetchBorrowings}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12">
              <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">ไม่พบข้อมูลการยืม-คืน</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        รูปภาพ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        อุปกรณ์
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้ยืม
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จำนวน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่ยืม
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่ต้องคืน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วัตถุประสงค์
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((borrowing) => (
                      <tr key={borrowing.transaction_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {borrowing.image_path ? (
                            <img
                              src={borrowing.image_path.startsWith('http') ? borrowing.image_path : `${API_URL}${borrowing.image_path}`}
                              alt={borrowing.equipment_name}
                              className="h-12 w-12 rounded-lg object-cover cursor-pointer hover:opacity-75 transition"
                              onClick={() => handleImageClick(borrowing.image_path)}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <FiPackage className="text-gray-400" size={24} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {borrowing.equipment_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {borrowing.model && `${borrowing.model} • `}
                            {borrowing.type_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {borrowing.profile_image ? (
                              <img
                                src={borrowing.profile_image.startsWith('http') ? borrowing.profile_image : `${API_URL}${borrowing.profile_image}`}
                                alt={`${borrowing.first_name} ${borrowing.last_name}`}
                                className="h-8 w-8 rounded-full mr-3"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                <FiUser className="text-indigo-600" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {borrowing.first_name} {borrowing.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {borrowing.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {borrowing.quantity_borrowed} ชิ้น
                          </div>
                          {borrowing.quantity_remaining > 0 && borrowing.quantity_remaining < borrowing.quantity_borrowed && (
                            <div className="text-xs text-orange-600">
                              เหลือ {borrowing.quantity_remaining} ชิ้น
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(borrowing.borrow_date).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(borrowing.borrow_date).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(borrowing.expected_return_date).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(borrowing.expected_return_date).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(borrowing)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {borrowing.purpose || '-'}
                          </div>
                          {borrowing.location && (
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              สถานที่: {borrowing.location}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      ถัดไป
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        แสดง <span className="font-medium">{indexOfFirstItem + 1}</span> ถึง{' '}
                        <span className="font-medium">
                          {Math.min(indexOfLastItem, filteredBorrowings.length)}
                        </span>{' '}
                        จาก <span className="font-medium">{filteredBorrowings.length}</span> รายการ
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ก่อนหน้า
                        </button>
                        {[...Array(totalPages)].map((_, index) => (
                          <button
                            key={index + 1}
                            onClick={() => paginate(index + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === index + 1
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ถัดไป
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <FiXCircle size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowingHistory;
