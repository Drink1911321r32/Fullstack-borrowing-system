import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiCheckCircle, FiXCircle, FiClock, FiFilter, FiSearch, 
  FiRefreshCw, FiUser, FiCalendar, FiAlertTriangle, FiEye, FiDownload,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-8 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4 mb-6 lg:mb-0">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl border border-white/30 shadow-lg">
                  <FiFileText className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
                    จัดการคำขอเบิกวัสดุ
                  </h1>
                  <p className="text-blue-100 text-lg font-medium">
                    อนุมัติและจัดการคำขอเบิกวัสดุสิ้นเปลือง
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchDisbursements}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-3 rounded-xl transition-all duration-300 border border-white/30 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <FiRefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-white font-medium">รีเฟรช</span>
                </button>
                <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-3 rounded-xl transition-all duration-300 border border-white/30 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <FiDownload className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">ส่งออก</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">ทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <FiTrendingUp className="w-3 h-3 mr-1" />
                  <span>รายการทั้งหมด</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-14 h-14 rounded-2xl flex items-center justify-center shadow-md">
                <FiBox className="w-7 h-7 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-yellow-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">รออนุมัติ</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                <div className="flex items-center mt-2 text-xs text-yellow-600">
                  <FiClock className="w-3 h-3 mr-1" />
                  <span>ต้องดำเนินการ</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 w-14 h-14 rounded-2xl flex items-center justify-center shadow-md">
                <FiClock className="w-7 h-7 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">อนุมัติแล้ว</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                <div className="flex items-center mt-2 text-xs text-green-600">
                  <FiCheckCircle className="w-3 h-3 mr-1" />
                  <span>สำเร็จ</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-200 w-14 h-14 rounded-2xl flex items-center justify-center shadow-md">
                <FiCheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">ปฏิเสธ</p>
                <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
                <div className="flex items-center mt-2 text-xs text-red-600">
                  <FiXCircle className="w-3 h-3 mr-1" />
                  <span>ไม่อนุมัติ</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-100 to-red-200 w-14 h-14 rounded-2xl flex items-center justify-center shadow-md">
                <FiXCircle className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative group">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล, หรืออุปกรณ์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3.5 w-full border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="relative group">
              <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-12 pr-4 py-3.5 w-full border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-gray-50 focus:bg-white cursor-pointer"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="Pending">รออนุมัติ</option>
                <option value="Approved">อนุมัติแล้ว</option>
                <option value="Cancelled">ปฏิเสธ</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 flex items-center justify-center bg-gray-50 rounded-xl px-4 border-2 border-gray-200">
              <FiActivity className="w-4 h-4 mr-2 text-blue-500" />
              <span className="font-medium">แสดง {filteredDisbursements.length} รายการ</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {filteredDisbursements.length === 0 ? (
            <div className="p-20 text-center">
              <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">ไม่มีรายการคำขอเบิก</p>
              <p className="text-gray-400 text-sm mt-2">ลองเปลี่ยนตัวกรองหรือค้นหาด้วยคำอื่น</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDisbursements.map((item) => (
                <div 
                  key={item.transaction_id} 
                  className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* แสดงรูปโปรไฟล์ของ user */}
                      {item.profile_image ? (
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md group-hover:shadow-lg transition-shadow">
                          <img 
                            src={`http://localhost:5000${item.profile_image}`} 
                            alt={`${item.first_name} ${item.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"><svg class="text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                          <FiUser className="text-white w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {item.first_name} {item.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{item.email}</p>
                      </div>
                    </div>

                    <div className="flex-1 px-4">
                      <div className="flex items-start space-x-3">
                        {/* แสดงรูปภาพอุปกรณ์ */}
                        {item.image_path ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0">
                            <img 
                              src={`http://localhost:5000${item.image_path}`} 
                              alt={item.equipment_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FiPackage className="w-6 h-6 text-blue-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.equipment_name}</p>
                          <p className="text-xs text-gray-500">จำนวน: {item.quantity_requested || item.quantity_borrowed} ชิ้น</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <FiCalendar className="w-4 h-4 mr-2" />
                        {new Date(item.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>

                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {getStatusText(item.status)}
                      </span>

                      <div className="flex gap-2">
                        {item.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedDisbursement(item);
                                setShowApproveModal(true);
                              }}
                              className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200 border border-green-200 hover:border-green-300 hover:shadow-md"
                              title="อนุมัติ"
                            >
                              <FiCheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDisbursement(item);
                                setShowRejectModal(true);
                              }}
                              className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-md"
                              title="ปฏิเสธ"
                            >
                              <FiXCircle className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setSelectedDisbursement(item)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:shadow-md"
                            title="ดูรายละเอียด"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.purpose && (
                    <div className="mt-4 pl-16">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">วัตถุประสงค์:</p>
                        <p className="text-sm text-gray-700">{item.purpose}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showApproveModal && selectedDisbursement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center">
                <FiCheckCircle className="w-6 h-6 mr-2" />
                อนุมัติคำขอเบิก
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold text-gray-900">อุปกรณ์:</span> {selectedDisbursement.equipment_name}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold text-gray-900">จำนวน:</span> {selectedDisbursement.quantity_requested || selectedDisbursement.quantity_borrowed} ชิ้น
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">ผู้ขอ:</span> {selectedDisbursement.first_name} {selectedDisbursement.last_name}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หมายเหตุ (ถ้ามี)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  placeholder="เพิ่มหมายเหตุ..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedDisbursement(null);
                    setNotes('');
                  }}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-5 h-5 mr-2" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-5 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center">
                <FiAlertTriangle className="w-6 h-6 mr-2" />
                ปฏิเสธคำขอเบิก
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold text-gray-900">อุปกรณ์:</span> {selectedDisbursement.equipment_name}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">ผู้ขอ:</span> {selectedDisbursement.first_name} {selectedDisbursement.last_name}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="กรุณาระบุเหตุผล..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDisbursement(null);
                    setNotes('');
                  }}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !notes.trim()}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <FiXCircle className="w-5 h-5 mr-2" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-5 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <FiFileText className="w-6 h-6 mr-2" />
                  รายละเอียดคำขอเบิก
                </h3>
                <button
                  onClick={() => setSelectedDisbursement(null)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <FiXCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiUser className="w-5 h-5 mr-2 text-blue-600" />
                  ข้อมูลผู้ขอเบิก
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ชื่อ-นามสกุล</p>
                    <p className="font-medium text-gray-900">{selectedDisbursement.first_name} {selectedDisbursement.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">อีเมล</p>
                    <p className="font-medium text-gray-900">{selectedDisbursement.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiPackage className="w-5 h-5 mr-2 text-green-600" />
                  ข้อมูลอุปกรณ์
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">อุปกรณ์</p>
                    <p className="font-medium text-gray-900">{selectedDisbursement.equipment_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">จำนวน</p>
                    <p className="font-medium text-gray-900">{selectedDisbursement.quantity_requested || selectedDisbursement.quantity_borrowed} ชิ้น</p>
                  </div>
                  {selectedDisbursement.purpose && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">วัตถุประสงค์</p>
                      <p className="font-medium text-gray-900">{selectedDisbursement.purpose}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">สถานะ</p>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(selectedDisbursement.status)}`}>
                    {getStatusIcon(selectedDisbursement.status)}
                    {getStatusText(selectedDisbursement.status)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">วันที่ขอ</p>
                  <p className="font-medium text-gray-900 flex items-center">
                    <FiCalendar className="w-4 h-4 mr-2 text-blue-500" />
                    {new Date(selectedDisbursement.created_at).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {selectedDisbursement.notes && (
                <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                  <p className="text-xs text-gray-500 mb-2">หมายเหตุ</p>
                  <p className="font-medium text-gray-900">{selectedDisbursement.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="w-full px-5 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 font-medium shadow-lg hover:shadow-xl transition-all"
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
