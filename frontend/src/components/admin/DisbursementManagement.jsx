import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiCheckCircle, FiXCircle, FiClock, FiFilter, FiSearch, 
  FiRefreshCw, FiUser, FiCalendar, FiAlertTriangle, FiEye,
  FiActivity, FiTrendingUp, FiFileText, FiBox
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { 
  getAllDisbursements, 
  approveDisbursement, 
  rejectDisbursement 
} from '../../api/disbursementService';
import Loading from '../common/Loading';

const DisbursementManagement = () => {
  const [disbursements, setDisbursements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDisbursement, setSelectedDisbursement] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchDisbursements();
  }, [filterStatus]);

  const fetchDisbursements = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const result = await getAllDisbursements(params);
      
      if (result.success) {
        setDisbursements(result.data);
      }
    } catch (error) {
      console.error('Error fetching disbursements:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDisbursement) return;

    try {
      setLoading(true);
      const result = await approveDisbursement(selectedDisbursement.transaction_id, notes);
      
      if (result.success) {
        toast.success('อนุมัติคำขอสำเร็จ');
        setShowApproveModal(false);
        setSelectedDisbursement(null);
        setNotes('');
        fetchDisbursements();
      }
    } catch (error) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDisbursement) return;
    if (!notes.trim()) {
      toast.error('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    try {
      setLoading(true);
      const result = await rejectDisbursement(selectedDisbursement.transaction_id, notes);
      
      if (result.success) {
        toast.success('ปฏิเสธคำขอสำเร็จ');
        setShowRejectModal(false);
        setSelectedDisbursement(null);
        setNotes('');
        fetchDisbursements();
      }
    } catch (error) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200',
      'Approved': 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200',
      'Cancelled': 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200',
      'Disbursed': 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pending': <FiClock className="w-4 h-4" />,
      'Approved': <FiCheckCircle className="w-4 h-4" />,
      'Cancelled': <FiXCircle className="w-4 h-4" />,
      'Disbursed': <FiPackage className="w-4 h-4" />
    };
    return icons[status] || <FiClock className="w-4 h-4" />;
  };

  const getStatusText = (status) => {
    const text = {
      'Pending': 'รออนุมัติ',
      'Approved': 'อนุมัติแล้ว',
      'Cancelled': 'ปฏิเสธ',
      'Disbursed': 'เบิกแล้ว'
    };
    return text[status] || status;
  };

  const filteredDisbursements = disbursements.filter(item => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        item.equipment_name?.toLowerCase().includes(search) ||
        item.first_name?.toLowerCase().includes(search) ||
        item.last_name?.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading && disbursements.length === 0) {
    return <Loading />;
  }

  const stats = {
    total: disbursements.length,
    pending: disbursements.filter(d => d.status === 'Pending').length,
    approved: disbursements.filter(d => d.status === 'Approved').length,
    cancelled: disbursements.filter(d => d.status === 'Cancelled').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section - ทำให้กระชับ */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
                  <FiFileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">จัดการคำขอเบิกวัสดุ</h1>
                  <p className="text-blue-100 text-sm">อนุมัติและจัดการคำขอเบิกวัสดุสิ้นเปลือง</p>
                </div>
              </div>
              <button
                onClick={fetchDisbursements}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
              >
                <FiRefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                <span className="text-white text-sm font-medium">รีเฟรช</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - ทำให้กระชับและเรียงแนวนอน */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <FiBox className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-yellow-200 p-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">รออนุมัติ</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <FiClock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-green-200 p-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">อนุมัติแล้ว</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-red-200 p-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">ปฏิเสธ</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <div className="bg-red-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <FiXCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter - ทำให้กระชับ */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล, หรืออุปกรณ์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="Pending">รออนุมัติ</option>
                <option value="Approved">อนุมัติแล้ว</option>
                <option value="Cancelled">ปฏิเสธ</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 flex items-center justify-center bg-gray-50 rounded-lg px-3 border border-gray-300">
              <FiActivity className="w-4 h-4 mr-2 text-blue-500" />
              <span className="font-medium">แสดง {filteredDisbursements.length} รายการ</span>
            </div>
          </div>
        </div>

        {/* Table Layout - แสดงแบบตาราง กระชับ */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {filteredDisbursements.length === 0 ? (
            <div className="p-12 text-center">
              <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">ไม่มีรายการคำขอเบิก</p>
              <p className="text-gray-400 text-sm mt-1">ลองเปลี่ยนตัวกรองหรือค้นหาด้วยคำอื่น</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ผู้ขอเบิก
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      อุปกรณ์
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      จำนวน
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      วัตถุประสงค์
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      วันที่ขอ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      การจัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDisbursements.map((item) => (
                    <tr 
                      key={item.transaction_id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      {/* ผู้ขอเบิก */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {item.profile_image ? (
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-gray-200">
                              <img 
                                src={`http://localhost:5000${item.profile_image}`} 
                                alt={`${item.first_name} ${item.last_name}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"><svg class="text-white w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                              <FiUser className="text-white w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.first_name} {item.last_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{item.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* อุปกรณ์ */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {item.image_path ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <img 
                                src={`http://localhost:5000${item.image_path}`} 
                                alt={item.equipment_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="%23ddd"/%3E%3C/svg%3E';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <FiPackage className="w-4 h-4 text-blue-500" />
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.equipment_name}
                          </p>
                        </div>
                      </td>

                      {/* จำนวน */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold">
                          {item.quantity_requested || item.quantity_borrowed}
                        </span>
                      </td>

                      {/* วัตถุประสงค์ */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">
                          {item.purpose || '-'}
                        </p>
                      </td>

                      {/* วันที่ขอ */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <p className="text-sm text-gray-900 font-medium">
                            {new Date(item.created_at).toLocaleDateString('th-TH', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </td>

                      {/* สถานะ */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {getStatusText(item.status)}
                        </span>
                      </td>

                      {/* การจัดการ */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedDisbursement(item);
                                  setShowApproveModal(true);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-green-200"
                                title="อนุมัติ"
                              >
                                <FiCheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDisbursement(item);
                                  setShowRejectModal(true);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-200"
                                title="ปฏิเสธ"
                              >
                                <FiXCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedDisbursement(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-blue-200"
                              title="ดูรายละเอียด"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showApproveModal && selectedDisbursement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FiCheckCircle className="w-5 h-5 mr-2" />
                อนุมัติคำขอเบิก
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 space-y-1.5">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">อุปกรณ์:</span> {selectedDisbursement.equipment_name}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">จำนวน:</span> {selectedDisbursement.quantity_requested || selectedDisbursement.quantity_borrowed} ชิ้น
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">ผู้ขอ:</span> {selectedDisbursement.first_name} {selectedDisbursement.last_name}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  หมายเหตุ (ถ้ามี)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="เพิ่มหมายเหตุ..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedDisbursement(null);
                    setNotes('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all disabled:opacity-50 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4 mr-2" />
                      อนุมัติ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedDisbursement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FiAlertTriangle className="w-5 h-5 mr-2" />
                ปฏิเสธคำขอเบิก
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 space-y-1.5">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">อุปกรณ์:</span> {selectedDisbursement.equipment_name}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">ผู้ขอ:</span> {selectedDisbursement.first_name} {selectedDisbursement.last_name}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  placeholder="กรุณาระบุเหตุผล..."
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDisbursement(null);
                    setNotes('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all disabled:opacity-50 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !notes.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <FiXCircle className="w-4 h-4 mr-2" />
                      ปฏิเสธ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDisbursement && !showApproveModal && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <FiFileText className="w-5 h-5 mr-2" />
                  รายละเอียดคำขอเบิก
                </h3>
                <button
                  onClick={() => setSelectedDisbursement(null)}
                  className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-all"
                >
                  <FiXCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                  <FiUser className="w-4 h-4 mr-2 text-blue-600" />
                  ข้อมูลผู้ขอเบิก
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ชื่อ-นามสกุล</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedDisbursement.first_name} {selectedDisbursement.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">อีเมล</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedDisbursement.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                  <FiPackage className="w-4 h-4 mr-2 text-green-600" />
                  ข้อมูลอุปกรณ์
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">อุปกรณ์</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedDisbursement.equipment_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">จำนวน</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedDisbursement.quantity_requested || selectedDisbursement.quantity_borrowed} ชิ้น</p>
                  </div>
                  {selectedDisbursement.purpose && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">วัตถุประสงค์</p>
                      <p className="font-medium text-gray-900 text-sm">{selectedDisbursement.purpose}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">สถานะ</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(selectedDisbursement.status)}`}>
                    {getStatusIcon(selectedDisbursement.status)}
                    {getStatusText(selectedDisbursement.status)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">วันที่ขอ</p>
                  <p className="font-medium text-gray-900 flex items-center text-sm">
                    <FiCalendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    {new Date(selectedDisbursement.created_at).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {selectedDisbursement.notes && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                  <p className="text-xs text-gray-500 mb-1.5">หมายเหตุ</p>
                  <p className="font-medium text-gray-900 text-sm">{selectedDisbursement.notes}</p>
                </div>
              )}
            </div>

            <div className="p-5 bg-gray-50 rounded-b-xl border-t border-gray-200">
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 font-medium shadow-md hover:shadow-lg transition-all text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisbursementManagement;
