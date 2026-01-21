import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiPackage, FiUser, FiCalendar, FiClock, FiFilter, FiSearch, 
  FiRefreshCw, FiDownload, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiEye, FiImage
} from 'react-icons/fi';
import { disbursementAPI } from '../../api/api';
import { STORAGE_KEYS } from '../../constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DisbursementHistory = () => {
  const [disbursements, setDisbursements] = useState([]);
  const [filteredDisbursements, setFilteredDisbursements] = useState([]);
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
    disbursed: 0,
    rejected: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchDisbursements();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    filterDisbursements();
  }, [searchTerm, statusFilter, disbursements]);

  const fetchDisbursements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_URL}/api/disbursements`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลการเบิกจ่ายได้');
      }

      const result = await response.json();
      setDisbursements(result.data || []);

    } catch (error) {
      console.error('Error fetching disbursements:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการเบิกจ่ายได้');
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
      if (result.success && result.data && result.data.disbursements) {
        const d = result.data.disbursements;
        const approvedCount = d.approved_disbursements || 0;
        const completedCount = d.completed_disbursements || 0;
        const cancelledCount = d.cancelled_disbursements || 0;
        const rejectedCount = d.rejected_disbursements || 0;
        const pendingCount = d.pending_disbursements || 0;
        setStats({
          total: d.total_disbursements || 0,
          pending: pendingCount,
          approved: approvedCount,
          disbursed: completedCount,
          rejected: rejectedCount,
          cancelled: cancelledCount
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // ไม่แสดง error เพราะไม่ critical
    }
  };

  const filterDisbursements = () => {
    let filtered = [...disbursements];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    setFilteredDisbursements(filtered);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FiClock, label: 'รออนุมัติ' },
      'Approved': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FiCheckCircle, label: 'อนุมัติแล้ว' },
      'Disbursed': { bg: 'bg-green-100', text: 'text-green-800', icon: FiCheckCircle, label: 'เบิกแล้ว' },
      'Rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: FiXCircle, label: 'ปฏิเสธ' },
      'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FiXCircle, label: 'ยกเลิก' }
    };

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
  const currentItems = filteredDisbursements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDisbursements.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ประวัติการเบิกจ่าย</h1>
          <p className="text-gray-600">แสดงประวัติการเบิกจ่ายอุปกรณ์ทั้งหมดในระบบ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FiPackage className="text-indigo-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">รออนุมัติ</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <FiClock className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">อนุมัติแล้ว</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
              <FiCheckCircle className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">เบิกแล้ว</p>
                <p className="text-2xl font-bold text-gray-900">{stats.disbursed}</p>
              </div>
              <FiCheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ปฏิเสธ</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
              <FiXCircle className="text-red-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ยกเลิก</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              </div>
              <FiXCircle className="text-gray-500" size={32} />
            </div>
          </div>
        </div>

        {/* Filters - Mobile Responsive */}
        <div className="bg-white rounded-lg shadow mb-4 sm:mb-6 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <FiSearch className="inline mr-1 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                ค้นหา
              </label>
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <FiFilter className="inline mr-1 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                สถานะ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="Approved">อนุมัติแล้ว/เบิกแล้ว</option>
                <option value="Cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-3 sm:mt-4">
            <button
              onClick={fetchDisbursements}
              disabled={loading}
              className="flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-1 sm:mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
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
              <p className="text-gray-600">ไม่พบข้อมูลการเบิกจ่าย</p>
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
                        ผู้เบิก
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จำนวน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่เบิก
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
                    {currentItems.map((disbursement) => (
                      <tr key={disbursement.transaction_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {disbursement.image_path ? (
                            <img
                              src={disbursement.image_path.startsWith('http') ? disbursement.image_path : `${API_URL}${disbursement.image_path}`}
                              alt={disbursement.equipment_name}
                              className="h-12 w-12 rounded-lg object-cover cursor-pointer hover:opacity-75 transition"
                              onClick={() => handleImageClick(disbursement.image_path)}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <FiPackage className="text-gray-400" size={24} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {disbursement.equipment_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {disbursement.model && `${disbursement.model} • `}
                            {disbursement.type_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {disbursement.profile_image ? (
                              <img
                                src={disbursement.profile_image.startsWith('http') ? disbursement.profile_image : `${API_URL}${disbursement.profile_image}`}
                                alt={`${disbursement.first_name} ${disbursement.last_name}`}
                                className="h-8 w-8 rounded-full mr-3"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                <FiUser className="text-indigo-600" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {disbursement.first_name} {disbursement.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {disbursement.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {disbursement.quantity_requested || disbursement.quantity_disbursed} ชิ้น
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(disbursement.disbursement_date).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            ขอเมื่อ: {new Date(disbursement.created_at).toLocaleDateString('th-TH', {
                              year: '2-digit',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(disbursement.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {disbursement.purpose || '-'}
                          </div>
                          {disbursement.notes && (
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {disbursement.notes}
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
                          {Math.min(indexOfLastItem, filteredDisbursements.length)}
                        </span>{' '}
                        จาก <span className="font-medium">{filteredDisbursements.length}</span> รายการ
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

export default DisbursementHistory;
