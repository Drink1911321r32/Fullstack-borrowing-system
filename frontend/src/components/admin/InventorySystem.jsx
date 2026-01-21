import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { STORAGE_KEYS } from '../../constants';
import {
  FiBox,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiAlertCircle,
  FiPackage,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiImage,
  FiX,
  FiUpload,
  FiSave,
  FiTool
} from 'react-icons/fi';
import { equipmentAPI, equipmentTypeAPI, equipmentItemAPI } from '../../api/api';
import { downloadInventoryExcel, downloadFile } from '../../api/reportService';
import Modal from '../common/Modal';
import EquipmentItemsModal from './EquipmentItemsModal';

// คอมโพเนนต์สำหรับแสดงการ์ดสรุปข้อมูลคลัง
const InventorySummaryCard = ({ title, value, icon, bgColor, textColor, trend, subtitle }) => (
  <div className={`p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm ${bgColor} border border-gray-200`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`p-2 sm:p-2.5 md:p-3 rounded-full ${textColor} bg-opacity-20`}>
          {icon}
        </div>
        <div className="ml-2 sm:ml-3 md:ml-4">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-lg sm:text-xl md:text-2xl font-semibold ${textColor}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 sm:mt-1">{subtitle}</p>}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center ${trend.type === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          <span className="text-sm font-medium">{trend.value}</span>
          {trend.type === 'up' ? (
            <FiTrendingUp className="w-4 h-4 ml-1" />
          ) : (
            <FiTrendingDown className="w-4 h-4 ml-1" />
          )}
        </div>
      )}
    </div>
  </div>
);

// คอมโพเนนต์สำหรับตารางอุปกรณ์
const EquipmentTable = ({ equipment, equipmentItems, equipmentTypes, onEdit, onDelete, onRefresh, statusFilter: parentStatusFilter, onStatusChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ใช้ statusFilter จาก parent โดยตรง
  const statusFilter = parentStatusFilter || 'all';

  // ตรวจสอบว่าควรแสดงข้อมูลจาก equipment_items หรือไม่
  // แสดง items เมื่อกรองตามสถานะเฉพาะ (ไม่ใช่ 'all')
  const shouldShowItems = statusFilter !== 'all';

  // เลือกข้อมูลที่จะแสดง
  const dataToDisplay = shouldShowItems ? equipmentItems : equipment;

  const handleImageClick = (imagePath, equipmentName) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    setPreviewImage({ url: `${API_URL}${imagePath}`, name: equipmentName });
    setIsPreviewOpen(true);
  };

  // ฟังก์ชันตรวจสอบว่าเป็นประเภท Loan หรือไม่
  const isLoanType = (item) => {
    if (!item.type_id || !Array.isArray(equipmentTypes)) return false;
    const type = equipmentTypes.find(t => t.type_id === item.type_id);
    return type ? type.usage_type === 'Loan' : false;
  };

  // กรองข้อมูลตามเงื่อนไข
  const filteredEquipment = Array.isArray(dataToDisplay) ? dataToDisplay.filter(item => {
    const matchesSearch =
      item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // รองรับทั้ง 'Repairing' และ 'Maintenance' เป็นสถานะเดียวกัน
    let matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    if (statusFilter === 'Repairing' || statusFilter === 'Maintenance') {
      matchesStatus = item.status === 'Repairing' || item.status === 'Maintenance';
    }
    const matchesType = typeFilter === 'all' || item.type_id === parseInt(typeFilter);

    return matchesSearch && matchesStatus && matchesType;
  }) : [];

  // คำนวณข้อมูลสำหรับ Pagination
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Available': { bg: 'bg-green-100', text: 'text-green-800', label: 'พร้อมใช้งาน' },
      'Reserved': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ถูกจอง' },
      'Maintenance': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง' },
      'Repairing': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง' },
      'Damaged': { bg: 'bg-red-100', text: 'text-red-800', label: 'ชำรุด' },
      'Lost': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'สูญหาย' }
    };

    const config = statusConfig[status] || statusConfig['Available'];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTypeName = (typeId) => {
    if (!Array.isArray(equipmentTypes)) return 'ไม่ระบุ';
    const type = equipmentTypes.find(t => t.type_id === typeId);
    return type ? type.type_name : 'ไม่ระบุ';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium text-gray-800 flex items-center">
            <FiPackage className="mr-2 text-blue-600" />
            จัดการคลังอุปกรณ์
          </h3>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50"
            >
              <FiRefreshCw className="h-4 w-4 mr-1" />
              รีเฟรช
            </button>
            <button
              onClick={async () => {
                try {
                  toast.info('กำลังสร้างไฟล์ Excel...');
                  const blob = await downloadInventoryExcel();
                  const filename = `คลังอุปกรณ์_${new Date().toLocaleDateString('th-TH')}.xlsx`;
                  downloadFile(blob, filename);
                  toast.success('ส่งออกข้อมูลสำเร็จ');
                } catch (error) {
                  console.error('Error exporting inventory:', error);
                  toast.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50"
            >
              <FiDownload className="h-4 w-4 mr-1" />
              ส่งออก
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="ชื่ออุปกรณ์ หรือรุ่น..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                const newStatus = e.target.value;
                if (onStatusChange) {
                  onStatusChange(newStatus);
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="Available">พร้อมใช้งาน</option>
              <option value="Borrowed">ถูกยืม</option>
              <option value="Repairing">อยู่ระหว่างซ่อมบำรุง</option>
              <option value="Damaged">ชำรุด</option>
              <option value="Lost">สูญหาย</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              {Array.isArray(equipmentTypes) && equipmentTypes.map((type) => (
                <option key={type.type_id} value={type.type_id}>
                  {type.type_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                if (onStatusChange) {
                  onStatusChange('all');
                }
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
            >
              <FiFilter className="h-4 w-4 mr-1" />
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
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
                ประเภท
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ระบบ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {shouldShowItems ? 'รหัสอุปกรณ์' : 'จำนวน'}
              </th>
              {shouldShowItems && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ประวัติการใช้งาน
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {shouldShowItems ? 'หมายเหตุ' : 'เครดิต'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                การดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEquipment.length === 0 ? (
              <tr>
                <td colSpan={shouldShowItems ? 9 : 8} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <FiBox className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-gray-500">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไขการค้นหา</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={shouldShowItems ? item.item_id : item.equipment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.image_path ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.image_path}`}
                        alt={item.equipment_name}
                        className="h-12 w-12 rounded-lg object-cover border border-gray-200 cursor-pointer hover:border-indigo-400 transition-all duration-300 hover:scale-110"
                        onClick={() => handleImageClick(item.image_path, item.equipment_name)}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/48?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                        <FiImage className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.equipment_name}
                        {shouldShowItems && item.serial_number && (
                          <span className="ml-2 text-xs text-gray-500">({item.serial_number})</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.model}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getTypeName(item.type_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${isLoanType(item)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                      }`}>
                      {isLoanType(item) ? '🔄 ยืม-คืน' : '📤 เบิก-จ่าย'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  {!shouldShowItems ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.quantity || 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.credit} เครดิต
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.item_code || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-blue-600">ยืม:</span>
                            <span className="text-xs text-gray-700">{item.total_borrowed || 0} ครั้ง</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-green-600">คืน:</span>
                            <span className="text-xs text-gray-700">{item.total_returned || 0} ครั้ง</span>
                          </div>
                          {item.last_action_type && (
                            <div className="text-xs text-gray-500 mt-1">
                              ล่าสุด: {item.last_action_type === 'borrowed' ? '🔵 ยืม' : item.last_action_type === 'returned' ? '🟢 คืน' : item.last_action_type}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {item.condition_note || '-'}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!shouldShowItems ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="แก้ไข"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="text-red-600 hover:text-red-900"
                          title="ลบ"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                        {isLoanType(item) && (
                          <button
                            onClick={() => {
                              if (window.handleManageItems) {
                                window.handleManageItems(item);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="จัดการรายการแต่ละชิ้น"
                          >
                            <FiPackage className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onDelete(item)}
                          className="text-red-600 hover:text-red-900"
                          title="ลบรายการชิ้นนี้"
                          disabled={item.status === 'Borrowed'}
                        >
                          <FiTrash2 className={`h-4 w-4 ${item.status === 'Borrowed' ? 'opacity-30 cursor-not-allowed' : ''}`} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredEquipment.length > itemsPerPage && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              แสดง {indexOfFirstItem + 1} ถึง {Math.min(indexOfLastItem, filteredEquipment.length)} จากทั้งหมด {filteredEquipment.length} รายการ
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded-md text-sm ${currentPage === page
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {isPreviewOpen && previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl transform transition-all animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <FiImage className="h-6 w-6 text-white" />
                <h3 className="text-xl font-bold text-white">{previewImage.name}</h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 bg-gray-50">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[70vh] mx-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// คอมโพเนนต์สำหรับตารางรายการแต่ละชิ้น
const ItemsTable = ({ items, equipmentTypes, onRefresh, statusFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // กรองข้อมูลตามเงื่อนไข
  const filteredItems = Array.isArray(items) ? items.filter(item => {
    const matchesSearch =
      item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // ถ้าเลือกสถานะเฉพาะ ให้กรองตามสถานะนั้น
    // รองรับทั้ง 'Repairing' และ 'Maintenance' เป็นสถานะเดียวกัน
    let matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    if (statusFilter === 'Repairing' || statusFilter === 'Maintenance') {
      matchesStatus = item.status === 'Repairing' || item.status === 'Maintenance';
    }

    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Available': { bg: 'bg-green-100', text: 'text-green-800', label: 'พร้อมใช้งาน' },
      'Borrowed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ถูกยืม' },
      'Reserved': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ถูกจอง' },
      'Maintenance': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง' },
      'Repairing': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง' },
      'Damaged': { bg: 'bg-red-100', text: 'text-red-800', label: 'ชำรุด' },
      'Lost': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'สูญหาย' }
    };

    const config = statusConfig[status] || statusConfig['Available'];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Search and Filter */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา Serial Number, Item Code, ชื่ออุปกรณ์..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
            >
              <FiFilter className="h-4 w-4 mr-1" />
              ล้างการค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่ออุปกรณ์</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รุ่น</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  ไม่พบข้อมูลที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.item_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.serial_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.item_code || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.equipment_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.model}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.condition_note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          แสดง {filteredItems.length} รายการจากทั้งหมด {items.length} รายการ
        </p>
      </div>
    </div>
  );
};

const InventorySystem = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // สถานะที่เลือก
  const [cardActiveFilter, setCardActiveFilter] = useState('all'); // สถานะการ์ดที่ active

  // ฟังก์ชันตรวจสอบว่า type_id เป็นประเภท Loan หรือไม่
  const isLoanTypeById = (typeId) => {
    if (!typeId || !Array.isArray(equipmentTypes)) return false;
    const type = equipmentTypes.find(t => t.type_id === parseInt(typeId));
    return type ? type.usage_type === 'Loan' : false;
  };

  // สถิติสรุป
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    totalLoan: 0,        // จำนวนอุปกรณ์ประเภทยืม-คืน
    totalDisbursement: 0, // จำนวนอุปกรณ์ประเภทเบิก-จ่าย
    available: 0,
    availableLoan: 0,     // จำนวนพร้อมใช้งานประเภทยืม-คืน
    availableDisbursement: 0, // จำนวนพร้อมใช้งานประเภทเบิก-จ่าย
    borrowed: 0,
    damaged: 0,
    lost: 0,
    repairing: 0,
    unavailable: 0,
    totalValue: 0
  });

  useEffect(() => {
    fetchData();

    // Setup SSE connection for real-time inventory updates
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      console.warn('⚠️ No token found, skipping SSE connection');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const eventSource = new EventSource(`${API_URL}/api/equipment-items/stream?token=${token}`);

    eventSource.onopen = () => {
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'inventory-updated') {
          // Refresh inventory data
          fetchEquipment();
          fetchAllItems();
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE error:', error);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  // อัปเดตสถิติเมื่อ equipmentItems หรือ equipmentTypes เปลี่ยน
  useEffect(() => {
    if (equipmentItems.length > 0) {
      calculateStatsFromItems();
    }
  }, [equipmentItems, equipmentTypes]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchEquipment(),
        fetchEquipmentTypes(),
        fetchAllItems()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllItems = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_URL}/api/equipment-items/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEquipmentItems(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching all items:', error);
      setEquipmentItems([]);
    }
  };

  const fetchEquipment = async () => {
    try {
      const response = await equipmentAPI.getAll();

      // ตรวจสอบรูปแบบ response หลายแบบ
      let equipmentData = [];
      if (response && response.success && Array.isArray(response.data)) {
        equipmentData = response.data;
      } else if (Array.isArray(response)) {
        equipmentData = response;
      } else if (response && Array.isArray(response.data)) {
        equipmentData = response.data;
      }

      setEquipment(equipmentData);
      // ไม่เรียก calculateStats() ที่นี่ เพราะจะใช้ calculateStatsFromItems() แทน
    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์');
      setEquipment([]);
    }
  };

  const fetchEquipmentTypes = async () => {
    try {
      const response = await equipmentTypeAPI.getAll();

      if (response && response.success && Array.isArray(response.data)) {
        setEquipmentTypes(response.data);
      } else {
        console.warn('Invalid equipment types response:', response);
        setEquipmentTypes([]); // ฟอลแบ็คเป็น array ว่าง
        toast.error('ไม่สามารถดึงข้อมูลประเภทอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
      setEquipmentTypes([]); // ฟอลแบ็คเป็น array ว่าง
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์');
    }
  };




  // คำนวณสถิติจาก equipment_items (รายการอุปกรณ์แต่ละชิ้น)
  const calculateStatsFromItems = () => {
    if (!Array.isArray(equipmentItems)) {
      console.warn('calculateStatsFromItems called with non-array data');
      return;
    }

    // 1. นับจำนวนอุปกรณ์ประเภท Loan (ยืม-คืน) จาก equipment_items
    const totalLoanItems = equipmentItems.length;
    const availableLoanItems = equipmentItems.filter(item => item.status === 'Available').length;
    const borrowedItems = equipmentItems.filter(item => item.status === 'Borrowed').length;
    const damagedItems = equipmentItems.filter(item => item.status === 'Damaged').length;
    const lostItems = equipmentItems.filter(item => item.status === 'Lost').length;
    const repairingItems = equipmentItems.filter(item => item.status === 'Repairing' || item.status === 'Maintenance').length;
    const unavailableItems = damagedItems + lostItems + repairingItems;

    // 2. นับจำนวนอุปกรณ์ประเภท Disbursement (เบิก-จ่าย) จาก equipment.quantity
    let totalDisbursementItems = 0;
    let availableDisbursementItems = 0;

    if (Array.isArray(equipment) && Array.isArray(equipmentTypes)) {
      equipment.forEach(eq => {
        // หาประเภทของอุปกรณ์
        const type = equipmentTypes.find(t => t.type_id === eq.type_id);
        // ถ้าเป็นประเภท Disbursement ให้นับจาก quantity
        if (type && type.usage_type === 'Disbursement') {
          const total = parseInt(eq.quantity) || 0;
          const available = parseInt(eq.quantity_available) || total; // ใช้ quantity_available ถ้ามี ไม่งั้นใช้ quantity

          totalDisbursementItems += total;
          availableDisbursementItems += available;
        }
      });
    }

    // 3. คำนวณมูลค่า - ใช้ credit ที่มาจาก backend โดยตรง
    let totalValue = 0;
    equipmentItems.forEach(item => {
      // เช็คว่าเป็นประเภท Loan และมี credit
      if (item.usage_type === 'Loan' && item.credit) {
        const creditValue = parseFloat(item.credit) || 0;
        totalValue += creditValue;
      }
    });

    // 4. สร้าง stats object
    const stats = {
      total: totalLoanItems + totalDisbursementItems,           // รวมทั้งหมด
      totalLoan: totalLoanItems,                                 // ยืม-คืน
      totalDisbursement: totalDisbursementItems,                 // เบิก-จ่าย
      available: availableLoanItems + availableDisbursementItems, // พร้อมใช้งาน (รวมทั้ง 2 ประเภท)
      availableLoan: availableLoanItems,                         // พร้อมใช้งานประเภทยืม-คืน
      availableDisbursement: availableDisbursementItems,         // พร้อมใช้งานประเภทเบิก-จ่าย
      borrowed: borrowedItems,
      damaged: damagedItems,
      lost: lostItems,
      repairing: repairingItems,
      unavailable: unavailableItems,
      totalValue: totalValue
    };

    setInventoryStats(stats);
  };

  const handleEdit = (equipment) => {
    setSelectedEquipment(equipment);
    setEditFormData({
      equipment_id: equipment.equipment_id,
      equipment_name: equipment.equipment_name,
      model: equipment.model,
      type_id: equipment.type_id,
      status: equipment.status || 'Available',
      credit: equipment.credit || 0,
      quantity: equipment.quantity || 1,
      image: null
    });

    if (equipment.image_path) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      setEditImagePreview({
        type: 'server',
        url: `${API_URL}${equipment.image_path}`
      });
    } else {
      setEditImagePreview(null);
    }

    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'credit') {
      processedValue = parseInt(value, 10) || 0;
    } else if (name === 'quantity') {
      const numValue = parseInt(value, 10);
      processedValue = isNaN(numValue) || numValue < 1 ? 1 : numValue;
    } else if (name === 'type_id') {
      processedValue = parseInt(value, 10) || '';

      // เมื่อเปลี่ยนประเภทอุปกรณ์ ให้รีเซ็ต credit ถ้าไม่ใช่ Loan
      if (!isLoanTypeById(processedValue)) {
        setEditFormData({
          ...editFormData,
          [name]: processedValue,
          credit: 0
        });
        if (editErrors[name]) {
          setEditErrors({ ...editErrors, [name]: '' });
        }
        return;
      }
    }

    setEditFormData({
      ...editFormData,
      [name]: processedValue
    });

    if (editErrors[name]) {
      setEditErrors({ ...editErrors, [name]: '' });
    }
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      toast.error('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }

    setEditFormData({
      ...editFormData,
      image: file
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview({ type: 'file', file: file });
    };
    reader.readAsDataURL(file);
  };

  const validateEditForm = (data) => {
    const errors = {};

    // ตรวจสอบชื่ออุปกรณ์
    if (!data.equipment_name || data.equipment_name.trim() === '') {
      errors.equipment_name = 'กรุณาระบุชื่ออุปกรณ์';
    } else if (data.equipment_name.length > 255) {
      errors.equipment_name = 'ชื่ออุปกรณ์ต้องไม่เกิน 255 ตัวอักษร';
    }

    // ตรวจสอบรุ่น/โมเดล
    if (!data.model || data.model.trim() === '') {
      errors.model = 'กรุณาระบุรุ่น/โมเดล';
    } else if (data.model.length > 255) {
      errors.model = 'รุ่น/โมเดลต้องไม่เกิน 255 ตัวอักษร';
    }

    // ตรวจสอบประเภทอุปกรณ์
    if (!data.type_id) {
      errors.type_id = 'กรุณาเลือกประเภทอุปกรณ์';
    }

    // ตรวจสอบจำนวน (สำหรับแก้ไข - ไม่สามารถลดจำนวนได้ถ้ามีการยืมอยู่)
    if (!data.quantity || data.quantity < 1) {
      errors.quantity = 'จำนวนต้องมากกว่าหรือเท่ากับ 1';
    } else if (data.quantity > 10000) {
      errors.quantity = 'จำนวนต้องไม่เกิน 10,000';
    }

    // ตรวจสอบ credit
    if (data.credit !== undefined && data.credit !== null) {
      if (data.credit < 0) {
        errors.credit = 'เครดิตต้องไม่ติดลบ';
      } else if (data.credit > 1000) {
        errors.credit = 'เครดิตต้องไม่เกิน 1,000';
      }
    }

    return errors;
  };

  const handleSaveEdit = async () => {
    const formErrors = validateEditForm(editFormData);
    if (Object.keys(formErrors).length > 0) {
      setEditErrors(formErrors);
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      if (editFormData.image) {
        // ส่งด้วย FormData ถ้ามีรูปภาพใหม่
        const formData = new FormData();
        formData.append('equipment_name', editFormData.equipment_name);
        formData.append('model', editFormData.model);
        formData.append('type_id', editFormData.type_id);
        formData.append('status', editFormData.status);
        formData.append('credit', editFormData.credit);
        formData.append('quantity', editFormData.quantity);
        formData.append('image', editFormData.image);

        const response = await fetch(`${API_URL}/api/equipment/${editFormData.equipment_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success(data.message || 'แก้ไขอุปกรณ์สำเร็จ');
          setShowEditModal(false);
          fetchEquipment();
        } else {
          toast.error(data.message || 'ไม่สามารถแก้ไขอุปกรณ์ได้');
        }
      } else {
        // ส่งด้วย JSON ถ้าไม่มีรูปภาพใหม่
        const response = await equipmentAPI.update(editFormData.equipment_id, {
          equipment_name: editFormData.equipment_name,
          model: editFormData.model,
          type_id: editFormData.type_id,
          status: editFormData.status,
          credit: editFormData.credit,
          quantity: editFormData.quantity
        });

        toast.success(response.message || 'แก้ไขอุปกรณ์สำเร็จ');
        setShowEditModal(false);
        fetchEquipment();
      }
    } catch (error) {
      console.error('Error updating equipment:', error);
      const errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขอุปกรณ์';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (equipment) => {
    setSelectedEquipment(equipment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedEquipment) return;

    try {
      const response = await equipmentAPI.delete(selectedEquipment.equipment_id);
      toast.success(response.message || 'ลบอุปกรณ์สำเร็จ');
      setShowDeleteModal(false);
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      const errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบอุปกรณ์';
      toast.error(errorMessage);
    }
  };

  const confirmDeleteItem = async () => {
    if (!selectedEquipment) return;

    try {
      // ลบเฉพาะรายการชิ้นนี้ (item_id) - ใช้ API service
      const response = await equipmentItemAPI.deleteItem(selectedEquipment.item_id);

      toast.success(response.message || 'ลบรายการสำเร็จ');
      setShowDeleteModal(false);
      fetchEquipment();
      fetchAllItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบรายการ';
      toast.error(errorMessage);
    }
  };

  const handleManageItems = (equipment) => {
    // เพิ่ม usage_type จาก equipmentTypes
    const type = equipmentTypes.find(t => t.type_id === equipment.type_id);
    const equipmentWithType = {
      ...equipment,
      usage_type: type?.usage_type
    };

    setSelectedEquipment(equipmentWithType);
    setShowItemsModal(true);
  };

  // ทำให้ฟังก์ชันเป็น global เพื่อให้ EquipmentTable สามารถเรียกใช้ได้
  useEffect(() => {
    window.handleManageItems = handleManageItems;
    return () => {
      delete window.handleManageItems;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ระบบจัดการคลังอุปกรณ์</h1>
          <p className="text-gray-600">จัดการและติดตามอุปกรณ์ในคลัง</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/add-equipment')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <FiPlus className="mr-2" />
            เพิ่มอุปกรณ์
          </button>
        </div>
      </div>


      {/* สถิติสรุป */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <InventorySummaryCard
          title="อุปกรณ์ทั้งหมด"
          value={inventoryStats.total}
          icon={<FiBox className="h-6 w-6" />}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
          subtitle={`ยืม-คืน: ${inventoryStats.totalLoan} | เบิก-จ่าย: ${inventoryStats.totalDisbursement}`}
          onClick={() => {
            setStatusFilter('all');
            setCardActiveFilter('all');
          }}
          isActive={cardActiveFilter === 'all'}
        />
        <InventorySummaryCard
          title="พร้อมใช้งาน"
          value={inventoryStats.available}
          icon={<FiPackage className="h-6 w-6" />}
          bgColor="bg-green-50"
          textColor="text-green-600"
          subtitle={`ยืม-คืน: ${inventoryStats.availableLoan} | เบิก-จ่าย: ${inventoryStats.availableDisbursement}`}
          onClick={() => {
            setStatusFilter('Available');
            setCardActiveFilter('Available');
          }}
          isActive={cardActiveFilter === 'Available'}
        />
        <InventorySummaryCard
          title="ติดยืม"
          value={inventoryStats.borrowed}
          icon={<FiBox className="h-6 w-6" />}
          bgColor="bg-purple-50"
          textColor="text-purple-600"
          onClick={() => {
            setStatusFilter('Borrowed');
            setCardActiveFilter('Borrowed');
          }}
          isActive={cardActiveFilter === 'Borrowed'}
        />
        <InventorySummaryCard
          title="ชำรุด"
          value={inventoryStats.damaged}
          icon={<FiAlertTriangle className="h-6 w-6" />}
          bgColor="bg-red-50"
          textColor="text-red-600"
          onClick={() => {
            setStatusFilter('Damaged');
            setCardActiveFilter('Damaged');
          }}
          isActive={cardActiveFilter === 'Damaged'}
        />
        <InventorySummaryCard
          title="สูญหาย"
          value={inventoryStats.lost}
          icon={<FiAlertCircle className="h-6 w-6" />}
          bgColor="bg-gray-50"
          textColor="text-gray-600"
          onClick={() => {
            setStatusFilter('Lost');
            setCardActiveFilter('Lost');
          }}
          isActive={cardActiveFilter === 'Lost'}
        />
        <InventorySummaryCard
          title="ซ่อมบำรุง"
          value={inventoryStats.repairing}
          icon={<FiTool className="h-6 w-6" />}
          bgColor="bg-yellow-50"
          textColor="text-yellow-600"
          onClick={() => {
            setStatusFilter('Repairing');
            setCardActiveFilter('Repairing');
          }}
          isActive={cardActiveFilter === 'Repairing'}
        />
      </div>

      {/* ตารางอุปกรณ์ */}
      <EquipmentTable
        equipment={equipment}
        equipmentItems={equipmentItems}
        equipmentTypes={equipmentTypes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchData}
        statusFilter={statusFilter}
        onStatusChange={(newStatus) => {
          setStatusFilter(newStatus);
          setCardActiveFilter(null); // Clear card highlight เมื่อเปลี่ยนจาก dropdown
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <FiAlertTriangle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">ยืนยันการลบอุปกรณ์</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Warning */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <FiAlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </p>
                    <p className="text-sm text-red-700">
                      {selectedEquipment.item_id
                        ? 'คุณกำลังจะลบรายการชิ้นนี้ออกจากระบบอย่างถาวร'
                        : 'คุณกำลังจะลบอุปกรณ์ออกจากระบบอย่างถาวร'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Equipment Info */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-5 mb-6">
                <h4 className="text-sm font-semibold text-gray-600 mb-4 flex items-center">
                  <FiPackage className="mr-2" />
                  {selectedEquipment.item_id ? 'ข้อมูลรายการที่จะลบ' : 'ข้อมูลอุปกรณ์ที่จะลบ'}
                </h4>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4 pb-4 border-b border-gray-300">
                    {selectedEquipment.image_path ? (
                      <img
                        className="h-20 w-20 rounded-xl object-cover border-2 border-gray-300 shadow-md"
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${selectedEquipment.image_path}`}
                        alt={selectedEquipment.equipment_name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-gray-300">
                        <FiImage className="text-gray-500 w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h5 className="text-lg font-bold text-gray-900 mb-1">
                        {selectedEquipment.equipment_name}
                        {selectedEquipment.serial_number && (
                          <span className="ml-2 text-sm text-gray-500">({selectedEquipment.serial_number})</span>
                        )}
                      </h5>
                      <p className="text-sm text-gray-600">
                        รุ่น: {selectedEquipment.model}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedEquipment.item_id
                          ? `Item ID: ${selectedEquipment.item_id}${selectedEquipment.item_code ? ` | รหัส: ${selectedEquipment.item_code}` : ''}`
                          : `Equipment ID: ${selectedEquipment.equipment_id}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedEquipment.item_id ? (
                      <>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">สถานะ</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedEquipment.status}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">หมายเหตุ</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedEquipment.condition_note || '-'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">จำนวน</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedEquipment.quantity || 1} ชิ้น
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">เครดิต</p>
                          <p className="text-sm font-semibold text-indigo-600">
                            {selectedEquipment.credit} เครดิต
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-all duration-300"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (selectedEquipment.item_id) {
                      confirmDeleteItem();
                    } else {
                      confirmDelete();
                    }
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span>ยืนยันการลบ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEquipment && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl transform transition-all animate-scaleIn max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <FiEdit2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">แก้ไขอุปกรณ์</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
                disabled={isSaving}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Body - Edit Form */}
            <div className="p-6 space-y-5">
              {/* Equipment Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="equipment_name"
                  value={editFormData.equipment_name}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${editErrors.equipment_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="ระบุชื่ออุปกรณ์"
                  disabled={isSaving}
                />
                {editErrors.equipment_name && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.equipment_name}</p>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รุ่น/โมเดล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="model"
                  value={editFormData.model}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${editErrors.model ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="ระบุรุ่นหรือโมเดล"
                  disabled={isSaving}
                />
                {editErrors.model && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.model}</p>
                )}
              </div>

              {/* Equipment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทอุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <select
                  name="type_id"
                  value={editFormData.type_id}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${editErrors.type_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  disabled={isSaving}
                >
                  <option value="">เลือกประเภทอุปกรณ์</option>
                  <optgroup label="📦 ยืม (Loan)">
                    {equipmentTypes
                      .filter(t => t.usage_type === 'Loan')
                      .map((type) => (
                        <option key={type.type_id} value={type.type_id}>
                          {type.type_name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="📋 เบิก (Disbursement)">
                    {equipmentTypes
                      .filter(t => t.usage_type === 'Disbursement')
                      .map((type) => (
                        <option key={type.type_id} value={type.type_id}>
                          {type.type_name}
                        </option>
                      ))}
                  </optgroup>
                </select>
                {editErrors.type_id && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.type_id}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สถานะ <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isSaving}
                >
                  <option value="Available">พร้อมใช้งาน</option>
                </select>
              </div>

              {/* Credit (only for Loan types) */}
              {isLoanTypeById(editFormData.type_id) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เครดิต <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="credit"
                    value={editFormData.credit}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="ระบุเครดิตที่ต้องใช้"
                    min="0"
                    disabled={isSaving}
                  />
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จำนวน <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={editFormData.quantity}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${editErrors.quantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="ระบุจำนวนอุปกรณ์"
                  min="1"
                  disabled={isSaving}
                />
                {editErrors.quantity && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.quantity}</p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รูปภาพอุปกรณ์
                </label>
                <div className="space-y-3">
                  {/* Current/Preview Image */}
                  {editImagePreview && (
                    <div className="flex items-center space-x-4">
                      <img
                        src={
                          editImagePreview.type === 'server'
                            ? editImagePreview.url
                            : URL.createObjectURL(editImagePreview.file)
                        }
                        alt="Preview"
                        className="h-24 w-24 rounded-lg object-cover border-2 border-gray-300"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">
                          {editImagePreview.type === 'server' ? 'รูปภาพปัจจุบัน' : 'รูปภาพใหม่'}
                        </p>
                        {editImagePreview.type === 'file' && (
                          <p className="text-xs text-gray-500 mt-1">
                            {editImagePreview.file.name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload Input */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-500">
                    อัพโหลดรูปภาพใหม่เพื่อเปลี่ยนรูปปัจจุบัน หรือเว้นว่างไว้เพื่อใช้รูปเดิม
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-all duration-300"
                  disabled={isSaving}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Items Management Modal */}
      {showItemsModal && selectedEquipment && (
        <EquipmentItemsModal
          equipment={selectedEquipment}
          equipmentTypes={equipmentTypes}
          isOpen={showItemsModal}
          onClose={() => {
            setShowItemsModal(false);
            setSelectedEquipment(null);
          }}
          onUpdate={fetchEquipment}
        />
      )}
    </div>
  );
};

export default InventorySystem;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out;
  }
`;
document.head.appendChild(style);