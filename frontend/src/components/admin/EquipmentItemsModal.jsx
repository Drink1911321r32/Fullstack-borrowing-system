import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiX, FiPlus, FiEdit2, FiTrash2, FiPackage, FiCalendar,
  FiAlertCircle, FiCheck, FiClock, FiHash, FiTool, FiEye,
  FiAlertTriangle, FiInfo, FiActivity, FiPrinter
} from 'react-icons/fi';
import { equipmentItemAPI } from '../../api/api';
import { 
  generateSerialNumber, 
  formatSerialNumberDisplay, 
  getSerialNumberInfo,
  isValidSerialNumber 
} from '../../utils';

const EquipmentItemsModal = ({ equipment, equipmentTypes, isOpen, onClose, onUpdate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showSerialGuide, setShowSerialGuide] = useState(false);
  const [formData, setFormData] = useState({
    serial_number: '',
    item_code: '',
    status: 'Available',
    location: '',
    notes: '',
    condition_note: '',
    purchase_date: '',
    warranty_expiry: ''
  });

  // ตรวจสอบว่าเป็นอุปกรณ์ประเภท Loan (ยืม-คืน) หรือไม่
  // หา usage_type จาก equipmentTypes โดยใช้ type_id
  const currentType = equipmentTypes?.find(t => t.type_id === equipment?.type_id);
  const isLoanType = currentType?.usage_type === 'Loan';

  useEffect(() => {
    if (isOpen && equipment) {
      fetchItems();
    }
  }, [isOpen, equipment]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      
      // ตรวจสอบว่า equipment และ equipment_id มีค่า
      if (!equipment) {
        console.error('❌ Equipment object is null or undefined');
        toast.error('ข้อมูลอุปกรณ์ไม่ถูกต้อง');
        return;
      }
      
      if (!equipment.equipment_id) {
        console.error('❌ Equipment ID is missing:', equipment);
        toast.error('ไม่พบรหัสอุปกรณ์');
        return;
      }
      
      const response = await equipmentItemAPI.getItemsByEquipmentId(equipment.equipment_id);
      setItems(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching items:', error);
      console.error('📄 Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      toast.error('ไม่สามารถดึงข้อมูลรายการได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!formData.serial_number) {
      toast.error('กรุณาระบุหมายเลขซีเรียล');
      return;
    }

    // ตรวจสอบรูปแบบ Serial Number (ต้องเป็นตัวเลข 16 หลัก)
    if (!isValidSerialNumber(formData.serial_number)) {
      toast.error('Serial Number ต้องเป็นตัวเลข 16 หลัก (รูปแบบ: TTTTEEEEEMMMMSSS)');
      return;
    }

    // แสดง Confirmation Modal
    setShowConfirmAdd(true);
  };

  const confirmAddItem = async () => {
    setShowConfirmAdd(false);
    
    try {
      // รวม equipment_id เข้าไปใน formData
      const itemData = {
        ...formData,
        equipment_id: equipment.equipment_id
      };
      
      await equipmentItemAPI.createItem(equipment.equipment_id, itemData);
      toast.success('เพิ่มรายการสำเร็จ');
      setShowAddModal(false);
      resetForm();
      fetchItems();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('❌ Error adding item:', error);
      console.error('📋 Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'ไม่สามารถเพิ่มรายการได้');
    }
  };

  const handleEditItem = async () => {
    if (!formData.serial_number) {
      toast.error('กรุณาระบุหมายเลขซีเรียล');
      return;
    }

    // ตรวจสอบรูปแบบ Serial Number (ต้องเป็นตัวเลข 16 หลัก)
    if (!isValidSerialNumber(formData.serial_number)) {
      toast.error('Serial Number ต้องเป็นตัวเลข 16 หลัก (รูปแบบ: TTTTEEEEEMMMMSSS)');
      return;
    }

    try {
      await equipmentItemAPI.updateItem(selectedItem.item_id, formData);
      toast.success('แก้ไขรายการสำเร็จ');
      setShowEditModal(false);
      resetForm();
      fetchItems();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถแก้ไขรายการได้');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await equipmentItemAPI.deleteItem(itemId);
      toast.success('ลบรายการสำเร็จ');
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchItems();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถลบรายการได้');
    }
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleViewDetail = async (item) => {
    setSelectedItem(item);
    try {
      const response = await equipmentItemAPI.getItemHistory(item.item_id);
      setItemHistory(response.data || []);
      setShowDetailModal(true);
    } catch (error) {
      console.error('❌ Error fetching history:', error);
      console.error('📄 Error details:', error.response?.data);
      setItemHistory([]);
      setShowDetailModal(true);
    }
  };

  const openAddModal = () => {
    resetForm();
    // Auto-generate serial number for new item
    autoGenerateSerialNumber();
    setShowAddModal(true);
  };

  // ฟังก์ชันสร้าง Serial Number อัตโนมัติ
  const autoGenerateSerialNumber = () => {
    if (!equipment) return;
    
    // หาลำดับถัดไปจากจำนวนรายการที่มีอยู่
    const nextSequence = items.length + 1;
    
    // สร้าง Serial Number ใหม่
    const newSerialNumber = generateSerialNumber(
      equipment.type_id,
      equipment.equipment_id,
      equipment.model || '',
      nextSequence
    );
    
    // อัพเดท formData
    setFormData(prev => ({
      ...prev,
      serial_number: newSerialNumber,
      item_code: `ITEM-${equipment.equipment_id}-${String(nextSequence).padStart(3, '0')}`
    }));
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      serial_number: item.serial_number || '',
      item_code: item.item_code || '',
      status: item.status || 'Available',
      location: item.location || '',
      notes: item.notes || '',
      condition_note: item.condition_note || '',
      purchase_date: item.purchase_date || '',
      warranty_expiry: item.warranty_expiry || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      serial_number: '',
      item_code: '',
      status: 'Available',
      location: '',
      notes: '',
      condition_note: '',
      purchase_date: '',
      warranty_expiry: ''
    });
    setSelectedItem(null);
  };

  // ฟังก์ชันปริ้น Serial Number แบบเดี่ยว
  const handlePrintSingle = (item) => {
    const printWindow = window.open('', '_blank');
    const serialInfo = getSerialNumberInfo(item.serial_number);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Serial - ${item.serial_number}</title>
        <style>
          @page {
            size: 80mm 50mm;
            margin: 5mm;
          }
          body {
            font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
            margin: 0;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 40mm;
          }
          .label-container {
            border: 2px solid #000;
            padding: 8px;
            width: 70mm;
            text-align: center;
            background: white;
          }
          .equipment-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 4px;
            border-bottom: 1px solid #333;
            padding-bottom: 4px;
          }
          .model {
            font-size: 11px;
            color: #555;
            margin-bottom: 6px;
          }
          .serial-number {
            font-size: 16px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
            margin: 6px 0;
            padding: 4px;
            background: #f0f0f0;
            border: 1px dashed #666;
          }
          .item-code {
            font-size: 10px;
            color: #666;
            margin-top: 4px;
          }
          .date {
            font-size: 9px;
            color: #888;
            margin-top: 4px;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="equipment-name">${equipment.equipment_name}</div>
          <div class="model">${equipment.model || '-'}</div>
          <div class="serial-number">${formatSerialNumberDisplay(item.serial_number)}</div>
          ${item.item_code ? `<div class="item-code">Item: ${item.item_code}</div>` : ''}
          <div class="date">พิมพ์: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // รอให้โหลดเสร็จแล้วค่อยปริ้น
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredItemsList = items.filter(item => statusFilter === 'all' || item.status === statusFilter);
    if (selectedItems.length === filteredItemsList.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItemsList.map(item => item.item_id));
    }
  };

  const handlePrintSelected = () => {
    if (selectedItems.length === 0) {
      toast.warning('กรุณาเลือกรายการที่ต้องการพิมพ์');
      return;
    }

    const selectedItemsData = items.filter(item => selectedItems.includes(item.item_id));
    printSerialNumbers(selectedItemsData);
  };

  const printSerialNumbers = (itemsToPrint) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>พิมพ์ Serial Numbers</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { margin: 0; }
            }
            body {
              font-family: 'Sarabun', 'TH Sarabun New', Arial, sans-serif;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #4F46E5;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              color: #1F2937;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0;
              color: #6B7280;
              font-size: 14px;
            }
            .equipment-info {
              background: #F3F4F6;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .equipment-info h2 {
              margin: 0 0 10px 0;
              color: #374151;
              font-size: 18px;
            }
            .items-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 12px;
              margin-top: 20px;
            }
            .item-card {
              border: 2px solid #E5E7EB;
              border-radius: 8px;
              padding: 12px;
              page-break-inside: avoid;
            }
            .serial-number {
              font-size: 14px;
              font-weight: bold;
              color: #1F2937;
              margin-bottom: 6px;
              word-break: break-all;
            }
            .item-code {
              font-size: 12px;
              color: #6B7280;
              margin-bottom: 4px;
            }
            .status {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
              margin-top: 6px;
            }
            .status-available { background: #D1FAE5; color: #065F46; }
            .status-borrowed { background: #DBEAFE; color: #1E40AF; }
            .status-maintenance { background: #FEF3C7; color: #92400E; }
            .status-damaged { background: #FEE2E2; color: #991B1B; }
            .status-lost { background: #F3F4F6; color: #374151; }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #E5E7EB;
              text-align: right;
              color: #6B7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>รายการ Serial Numbers</h1>
            <p>อุปกรณ์: ${equipment.equipment_name} (${equipment.model})</p>
            <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <div class="equipment-info">
            <h2>รายการทั้งหมด: ${itemsToPrint.length} ชิ้น</h2>
          </div>

          <div class="items-grid">
            ${itemsToPrint.map(item => {
              const serialInfo = getSerialNumberInfo(item.serial_number);
              const displaySerial = serialInfo?.valid ? serialInfo.formatted : item.serial_number;
              return `
              <div class="item-card">
                <div class="serial-number">📦 ${displaySerial}</div>
                <div class="item-code">รหัส: ${item.item_code || '-'}</div>
                ${serialInfo?.valid ? `<div style="margin-top: 4px; font-size: 11px; color: #6B7280;">${serialInfo.tooltip}</div>` : ''}
                <div class="status status-${item.status.toLowerCase()}">
                  ${item.status === 'Available' ? 'พร้อมใช้งาน' :
                    item.status === 'Borrowed' ? 'ถูกยืม' :
                    item.status === 'Maintenance' ? 'ซ่อมบำรุง' :
                    item.status === 'Damaged' ? 'ชำรุด' : 'สูญหาย'}
                </div>
                ${item.condition_note ? `<div style="margin-top: 8px; font-size: 12px; color: #6B7280;">หมายเหตุ: ${item.condition_note}</div>` : ''}
              </div>
              `;
            }).join('')}
          </div>

          <div class="footer">
            พิมพ์โดย: ระบบจัดการคลังอุปกรณ์
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Available': { bg: 'bg-green-100', text: 'text-green-800', label: 'พร้อมใช้งาน', icon: FiCheck },
      'Borrowed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ถูกยืม', icon: FiClock },
      'Maintenance': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง', icon: FiTool },
      'Damaged': { bg: 'bg-red-100', text: 'text-red-800', label: 'ชำรุด', icon: FiAlertCircle },
      'Lost': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'สูญหาย', icon: FiAlertCircle }
    };
    const config = statusConfig[status] || statusConfig['Available'];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <FiPackage className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">จัดการรายการอุปกรณ์</h3>
              <p className="text-indigo-100 text-sm">{equipment.equipment_name} - {equipment.model}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isLoanType && (
              <button
                onClick={() => setShowSerialGuide(!showSerialGuide)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-300 text-white flex items-center space-x-2"
                title="คำแนะนำ Serial Number"
              >
                <FiInfo className="w-4 h-4" />
                <span>คำแนะนำ</span>
              </button>
            )}
            {isLoanType && (
              <button
                onClick={handlePrintSelected}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-300 text-white flex items-center space-x-2"
                disabled={selectedItems.length === 0}
              >
                <FiPrinter className="w-4 h-4" />
                <span>พิมพ์ ({selectedItems.length})</span>
              </button>
            )}
            {isLoanType && (
              <button
                onClick={openAddModal}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-300 text-white flex items-center space-x-2"
              >
                <FiPlus className="w-4 h-4" />
                <span>เพิ่มรายการ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Serial Number Guide - คำแนะนำ */}
          {showSerialGuide && (
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-300 rounded-xl p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <FiInfo className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">คำแนะนำ Serial Number</h4>
                    <p className="text-sm text-gray-600">รูปแบบตัวเลข 16 หลัก แบ่งเป็น 4 ส่วน</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSerialGuide(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* รูปแบบ Serial Number */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">รูปแบบ: TTTTEEEEEMMMMSSS (16 หลัก)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        T
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">TTTT (4 หลัก)</p>
                        <p className="text-xs text-gray-600">Type ID = รหัสประเภทอุปกรณ์</p>
                        <p className="text-xs text-purple-700 mt-1">
                          เช่น: 0001 = คอมพิวเตอร์, 0014 = Power Supply
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        E
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">EEEEE (5 หลัก)</p>
                        <p className="text-xs text-gray-600">Equipment ID = รหัสอุปกรณ์</p>
                        <p className="text-xs text-blue-700 mt-1">
                          เช่น: 00012 = อุปกรณ์หมายเลข 12
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        M
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">MMMM (4 หลัก)</p>
                        <p className="text-xs text-gray-600">Model Hash = รหัสจากชื่อรุ่น</p>
                        <p className="text-xs text-green-700 mt-1">
                          เช่น: 3085 = hash จาก "PSU Sata 550w"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        S
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">SSS (3 หลัก)</p>
                        <p className="text-xs text-gray-600">Sequence = ลำดับที่</p>
                        <p className="text-xs text-orange-700 mt-1">
                          เช่น: 001 = ชิ้นที่ 1, 045 = ชิ้นที่ 45
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ตัวอย่าง */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">📋 ตัวอย่าง:</p>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600">Serial Number (แบบเต็ม):</p>
                        <code className="text-lg font-mono font-bold text-indigo-900">0014000123085001</code>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-600">แสดงผล (จัดรูป):</p>
                        <code className="text-lg font-mono font-bold text-purple-900">0014-00012-3085-001</code>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-white/70 rounded px-2 py-1 text-center">
                          <p className="text-purple-600 font-semibold">Type: 14</p>
                        </div>
                        <div className="bg-white/70 rounded px-2 py-1 text-center">
                          <p className="text-blue-600 font-semibold">Equip: 12</p>
                        </div>
                        <div className="bg-white/70 rounded px-2 py-1 text-center">
                          <p className="text-green-600 font-semibold">Model: 3085</p>
                        </div>
                        <div className="bg-white/70 rounded px-2 py-1 text-center">
                          <p className="text-orange-600 font-semibold">Seq: 1</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 mt-3 text-center italic">
                        = Power Supply รุ่น "PSU Sata 550w" อุปกรณ์หมายเลข 12 ชิ้นที่ 1
                      </p>
                    </div>
                  </div>
                </div>

                {/* หมายเหตุ */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <div className="flex items-start">
                    <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-xs text-yellow-800">
                      <p className="font-semibold mb-1">💡 หมายเหตุสำคัญ:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Serial Number ต้องเป็น<strong>ตัวเลข 16 หลักเท่านั้น</strong></li>
                        <li>ระบบจะ<strong>สร้างอัตโนมัติ</strong>เมื่อเพิ่มรายการใหม่</li>
                        <li>รุ่น (Model) ที่เหมือนกันจะได้ Model Hash เดียวกัน</li>
                        <li>Serial Number ต้อง<strong>ไม่ซ้ำกัน</strong>ในระบบ</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <div className="mb-4 flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">กรองตามสถานะ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด ({items.length})</option>
              <option value="Available">พร้อมใช้งาน ({items.filter(i => i.status === 'Available').length})</option>
              <option value="Borrowed">ถูกยืม ({items.filter(i => i.status === 'Borrowed').length})</option>
              <option value="Maintenance">ซ่อมบำรุง ({items.filter(i => i.status === 'Maintenance').length})</option>
              <option value="Damaged">ชำรุด ({items.filter(i => i.status === 'Damaged').length})</option>
              <option value="Lost">สูญหาย ({items.filter(i => i.status === 'Lost').length})</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : items.filter(item => statusFilter === 'all' || item.status === statusFilter).length === 0 ? (
            <div className="text-center py-12">
              <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {isLoanType ? (
                <>
                  <p className="text-gray-500">
                    {items.length === 0 ? 'ยังไม่มีรายการอุปกรณ์' : `ไม่พบรายการที่มีสถานะ "${statusFilter === 'all' ? 'ทั้งหมด' : statusFilter}"`}
                  </p>
                  {items.length === 0 && (
                    <button
                      onClick={openAddModal}
                      className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      เพิ่มรายการแรก
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500">
                  อุปกรณ์เบิกจ่ายไม่มีรายการแยกตาม Serial Number<br />
                  จัดการสต็อกตามจำนวนเท่านั้น
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isLoanType && (
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === items.filter(item => statusFilter === 'all' || item.status === statusFilter).length && items.filter(item => statusFilter === 'all' || item.status === statusFilter).length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </th>
                    )}
                    {isLoanType && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial Number
                      </th>
                    )}
                    {isLoanType && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Code
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ซื้อ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การรับประกัน
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.filter(item => statusFilter === 'all' || item.status === statusFilter).map((item) => (
                    <tr key={item.item_id} className="hover:bg-gray-50">
                      {isLoanType && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.item_id)}
                            onChange={() => handleSelectItem(item.item_id)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </td>
                      )}
                      {isLoanType && (
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <FiHash className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-mono font-medium text-gray-900">
                                {formatSerialNumberDisplay(item.serial_number)}
                              </span>
                            </div>
                            {isValidSerialNumber(item.serial_number) && (
                              <span className="text-xs text-gray-500 ml-6" title={getSerialNumberInfo(item.serial_number)?.tooltip}>
                                {getSerialNumberInfo(item.serial_number)?.display.sequenceLabel}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {isLoanType && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.item_code || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isLoanType && (
                            <button
                              onClick={() => handlePrintSingle(item)}
                              className="text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-all duration-200"
                              title="พิมพ์ Serial Number"
                            >
                              <FiPrinter className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200"
                            title="ดูรายละเอียด"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all duration-200"
                            title="แก้ไข"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={item.status === 'Borrowed' ? 'ไม่สามารถลบรายการที่ถูกยืมได้' : 'ลบ'}
                            disabled={item.status === 'Borrowed'}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            รายการทั้งหมด: <span className="font-semibold">{items.length}</span> ชิ้น
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <ItemFormModal
          title="เพิ่มรายการอุปกรณ์"
          formData={formData}
          setFormData={setFormData}
          onSave={handleAddItem}
          onClose={() => { setShowAddModal(false); resetForm(); }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <ItemFormModal
          title="แก้ไขรายการอุปกรณ์"
          formData={formData}
          setFormData={setFormData}
          onSave={handleEditItem}
          onClose={() => { setShowEditModal(false); resetForm(); }}
          isEdit={true}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          history={itemHistory}
          equipment={equipment}
          onClose={() => { setShowDetailModal(false); setSelectedItem(null); setItemHistory([]); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <DeleteConfirmationModal
          item={selectedItem}
          equipment={equipment}
          onConfirm={() => handleDeleteItem(selectedItem.item_id)}
          onClose={() => { setShowDeleteModal(false); setSelectedItem(null); }}
        />
      )}

      {/* Add Confirmation Modal */}
      {showConfirmAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scaleIn">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                  <FiCheck className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">ยืนยันการเพิ่มรายการ</h3>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-4">คุณต้องการเพิ่มรายการอุปกรณ์นี้ใช่หรือไม่?</p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">อุปกรณ์:</span>
                    <span className="text-sm font-semibold text-gray-900">{equipment.equipment_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Serial Number:</span>
                    <span className="text-sm font-mono font-semibold text-gray-900">
                      {formData.serial_number || 'สร้างอัตโนมัติ'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Item Code:</span>
                    <span className="text-sm font-semibold text-gray-900">{formData.item_code || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">สถานะ:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formData.status === 'Available' ? 'พร้อมใช้งาน' :
                       formData.status === 'Borrowed' ? 'ถูกยืม' :
                       formData.status === 'Maintenance' ? 'ซ่อมบำรุง' :
                       formData.status === 'Damaged' ? 'ชำรุด' : 'สูญหาย'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => setShowConfirmAdd(false)}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-all duration-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmAddItem}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <FiCheck className="w-4 h-4" />
                <span>ยืนยันการเพิ่ม</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Item Form Modal Component
const ItemFormModal = ({ title, formData, setFormData, onSave, onClose, isEdit }) => {
  const serialInfo = formData.serial_number ? getSerialNumberInfo(formData.serial_number) : null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="ระบุหมายเลขซีเรียล 16 หลัก (ตัวเลขเท่านั้น)"
              maxLength={16}
              readOnly={isEdit}
              disabled={isEdit}
            />
            {!isEdit && (
              <p className="mt-1 text-xs text-gray-500">
                รูปแบบ: TTTTEEEEEMMMMSSS (16 หลัก) - ระบบสร้างอัตโนมัติเมื่อคลิกบันทึก
              </p>
            )}
            {serialInfo && serialInfo.valid && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-1">✅ ข้อมูล Serial Number:</p>
                <p className="text-xs text-blue-600">แสดงผล: {serialInfo.formatted}</p>
              </div>
            )}
            {formData.serial_number && !serialInfo?.valid && !isEdit && (
              <p className="mt-1 text-xs text-red-600">
                ⚠️ Serial Number ต้องเป็นตัวเลข 16 หลักเท่านั้น
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Code
            </label>
            <input
              type="text"
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="ระบุรหัสอุปกรณ์ (ถ้ามี)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะ
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Available">พร้อมใช้งาน</option>
              <option value="Borrowed">ถูกยืม</option>
              <option value="Maintenance">ซ่อมบำรุง</option>
              <option value="Damaged">ชำรุด</option>
              <option value="Lost">สูญหาย</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ตำแหน่งที่เก็บ
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="ระบุตำแหน่งที่เก็บอุปกรณ์"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุ
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="บันทึกรายละเอียดเพิ่มเติม..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุสภาพ
            </label>
            <textarea
              value={formData.condition_note}
              onChange={(e) => setFormData({ ...formData, condition_note: e.target.value })}
              rows="2"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="บันทึกสภาพอุปกรณ์..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันที่ซื้อ
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันหมดประกัน
              </label>
              <input
                type="date"
                value={formData.warranty_expiry}
                onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-2xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Item Detail Modal Component
const ItemDetailModal = ({ item, history, equipment, onClose }) => {
  const serialInfo = getSerialNumberInfo(item.serial_number);
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Available': { bg: 'bg-green-100', text: 'text-green-800', label: 'พร้อมใช้งาน', icon: FiCheck },
      'Borrowed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ถูกยืม', icon: FiClock },
      'Maintenance': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง', icon: FiTool },
      'Damaged': { bg: 'bg-red-100', text: 'text-red-800', label: 'ชำรุด', icon: FiAlertCircle },
      'Lost': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'สูญหาย', icon: FiAlertCircle }
    };
    const config = statusConfig[status] || statusConfig['Available'];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
              <FiInfo className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">รายละเอียดอุปกรณ์</h3>
              <p className="text-blue-100 text-sm">{equipment.equipment_name} - {equipment.model}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ข้อมูลพื้นฐาน */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5">
            <div className="flex items-center mb-4">
              <FiPackage className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-semibold text-gray-900 text-lg">ข้อมูลพื้นฐาน</h4>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <FiHash className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-600">Serial Number</p>
                </div>
                <p className="font-semibold text-gray-900 text-lg font-mono">
                  {serialInfo?.valid ? serialInfo.formatted : item.serial_number}
                </p>
                {serialInfo?.valid && (
                  <div className="mt-2 text-xs text-gray-500">
                    <div className="grid grid-cols-2 gap-1">
                      <div>{serialInfo.display.typeLabel}</div>
                      <div>{serialInfo.display.equipmentLabel}</div>
                      <div>{serialInfo.display.modelLabel}</div>
                      <div>{serialInfo.display.sequenceLabel}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <FiHash className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-600">Item Code</p>
                </div>
                <p className="font-semibold text-gray-900 text-lg">{item.item_code || '-'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-2">สถานะ</p>
                {getStatusBadge(item.status)}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <FiCalendar className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-600">วันที่ซื้อ</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm col-span-2">
                <div className="flex items-center mb-2">
                  <FiCalendar className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-600">วันหมดประกัน</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </p>
              </div>
            </div>
            {item.condition_note && (
              <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <FiAlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-600">หมายเหตุสภาพ</p>
                </div>
                <p className="text-gray-900">{item.condition_note}</p>
              </div>
            )}
          </div>

          {/* ประวัติการใช้งาน */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-5">
            <div className="flex items-center mb-4">
              <FiActivity className="h-5 w-5 text-indigo-600 mr-2" />
              <h4 className="font-semibold text-gray-900 text-lg">ประวัติการใช้งาน</h4>
              {history.length > 0 && (
                <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {history.length} รายการ
                </span>
              )}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">ยังไม่มีประวัติการใช้งาน</p>
                <p className="text-xs text-gray-400 mt-1">ประวัติจะแสดงเมื่อมีการยืม-คืนอุปกรณ์</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {history.map((h, index) => {
                  
                  const getActionTypeConfig = (actionType) => {
                    const configs = {
                      'pending': {
                        bg: 'bg-orange-50',
                        border: 'border-orange-200',
                        text: 'text-orange-800',
                        label: 'รอการอนุมัติ',
                        icon: FiClock,
                        iconColor: 'text-orange-600'
                      },
                      'borrowed': { 
                        bg: 'bg-blue-50', 
                        border: 'border-blue-200', 
                        text: 'text-blue-800', 
                        label: 'ยืมอุปกรณ์', 
                        icon: FiPackage,
                        iconColor: 'text-blue-600'
                      },
                      'returned': { 
                        bg: 'bg-green-50', 
                        border: 'border-green-200', 
                        text: 'text-green-800', 
                        label: 'คืนอุปกรณ์', 
                        icon: FiCheck,
                        iconColor: 'text-green-600'
                      },
                      'maintenance': { 
                        bg: 'bg-yellow-50', 
                        border: 'border-yellow-200', 
                        text: 'text-yellow-800', 
                        label: 'ส่งซ่อมบำรุง', 
                        icon: FiTool,
                        iconColor: 'text-yellow-600'
                      },
                      'damaged': { 
                        bg: 'bg-red-50', 
                        border: 'border-red-200', 
                        text: 'text-red-800', 
                        label: 'รายงานชำรุด', 
                        icon: FiAlertTriangle,
                        iconColor: 'text-red-600'
                      },
                      'repaired': { 
                        bg: 'bg-purple-50', 
                        border: 'border-purple-200', 
                        text: 'text-purple-800', 
                        label: 'ซ่อมเสร็จแล้ว', 
                        icon: FiTool,
                        iconColor: 'text-purple-600'
                      },
                      'lost': { 
                        bg: 'bg-gray-50', 
                        border: 'border-gray-300', 
                        text: 'text-gray-800', 
                        label: 'สูญหาย', 
                        icon: FiAlertCircle,
                        iconColor: 'text-gray-600'
                      },
                      'found': { 
                        bg: 'bg-teal-50', 
                        border: 'border-teal-200', 
                        text: 'text-teal-800', 
                        label: 'พบแล้ว', 
                        icon: FiCheck,
                        iconColor: 'text-teal-600'
                      }
                    };
                    // Default to borrowed if action_type is not found
                    return configs[actionType] || configs.borrowed;
                  };

                  const actionConfig = getActionTypeConfig(h.action_type);
                  const ActionIcon = actionConfig.icon;

                  return (
                    <div 
                      key={h.transaction_id || index}
                      className={`${actionConfig.bg} rounded-lg border ${actionConfig.border} p-4 shadow-sm hover:shadow-md transition-all duration-200`}
                    >
                      {/* Header - แสดงประเภทการดำเนินการ */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2.5 rounded-full ${actionConfig.bg} border ${actionConfig.border}`}>
                            <ActionIcon className={`w-5 h-5 ${actionConfig.iconColor}`} />
                          </div>
                          <div>
                            <span className={`font-bold text-base ${actionConfig.text}`}>
                              {actionConfig.label}
                            </span>
                            {h.first_name && h.last_name && (
                              <p className="text-sm text-gray-700 mt-1 font-medium">
                                ผู้ยืม: {h.first_name} {h.last_name}
                              </p>
                            )}
                            {h.admin_first_name && h.admin_last_name && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                อนุมัติโดย: {h.admin_first_name} {h.admin_last_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400">
                            Transaction #{h.transaction_id}
                          </span>
                        </div>
                      </div>

                      {/* รายละเอียดการยืม-คืน */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {/* วันที่ยืม */}
                          {(h.borrowed_date || h.borrow_date || h.approval_date) && (
                            <div className="flex items-start space-x-2">
                              <FiCalendar className="w-4 h-4 text-blue-500 mt-0.5" />
                              <div>
                                <span className="text-gray-500 text-xs block">วันที่ยืม</span>
                                <p className="font-semibold text-gray-900">
                                  {new Date(h.borrowed_date || h.borrow_date || h.approval_date).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* วันที่คืน หรือ กำหนดคืน */}
                          {h.returned_date ? (
                            <div className="flex items-start space-x-2">
                              <FiCheck className="w-4 h-4 text-green-500 mt-0.5" />
                              <div>
                                <span className="text-gray-500 text-xs block">วันที่คืน</span>
                                <p className="font-semibold text-green-700">
                                  {new Date(h.returned_date).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          ) : h.expected_return_date && (
                            <div className="flex items-start space-x-2">
                              <FiClock className="w-4 h-4 text-orange-500 mt-0.5" />
                              <div>
                                <span className="text-gray-500 text-xs block">กำหนดคืน</span>
                                <p className="font-semibold text-orange-600">
                                  {new Date(h.expected_return_date).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* จำนวนวันที่ยืม */}
                          {h.days_borrowed !== undefined && h.days_borrowed !== null && (
                            <div className="flex items-start space-x-2 col-span-2">
                              <FiActivity className="w-4 h-4 text-indigo-500 mt-0.5" />
                              <div>
                                <span className="text-gray-500 text-xs block">ระยะเวลายืม</span>
                                <p className="font-semibold text-indigo-700">
                                  {h.days_borrowed} วัน
                                  {h.returned_date && h.expected_return_date && 
                                    new Date(h.returned_date) > new Date(h.expected_return_date) && (
                                      <span className="ml-2 text-xs text-red-600 font-normal">
                                        (เกินกำหนด {Math.ceil((new Date(h.returned_date) - new Date(h.expected_return_date)) / (1000 * 60 * 60 * 24))} วัน)
                                      </span>
                                    )
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          {/* วัตถุประสงค์ */}
                          {h.purpose && (
                            <div className="col-span-2 flex items-start space-x-2">
                              <FiInfo className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-gray-500 text-xs block">วัตถุประสงค์</span>
                                <p className="text-gray-700">{h.purpose}</p>
                              </div>
                            </div>
                          )}

                          {/* สภาพตอนคืน */}
                          {h.condition_on_return && (
                            <div className="col-span-2 flex items-start space-x-2">
                              <FiAlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                              <div>
                                <span className="text-gray-500 text-xs block">สภาพตอนคืน</span>
                                <p className="text-gray-700">{h.condition_on_return}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all duration-300"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ item, equipment, onConfirm, onClose }) => {
  const serialInfo = getSerialNumberInfo(item.serial_number);
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Available': { bg: 'bg-green-100', text: 'text-green-800', label: 'พร้อมใช้งาน', icon: FiCheck },
      'Borrowed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ถูกยืม', icon: FiClock },
      'Maintenance': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ซ่อมบำรุง', icon: FiTool },
      'Damaged': { bg: 'bg-red-100', text: 'text-red-800', label: 'ชำรุด', icon: FiAlertCircle },
      'Lost': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'สูญหาย', icon: FiAlertCircle }
    };
    const config = statusConfig[status] || statusConfig['Available'];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
              <FiAlertTriangle className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">ยืนยันการลบรายการ</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-300"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Warning */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start">
              <FiAlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800 mb-1">
                  ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
                <p className="text-sm text-red-700">
                  คุณกำลังจะลบรายการอุปกรณ์นี้ออกจากระบบอย่างถาวร
                </p>
              </div>
            </div>
          </div>

          {/* Item Info */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-600 mb-4 flex items-center">
              <FiPackage className="mr-2" />
              ข้อมูลรายการที่จะลบ
            </h4>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">อุปกรณ์</p>
                    <h5 className="text-lg font-bold text-gray-900">
                      {equipment.equipment_name}
                    </h5>
                    <p className="text-sm text-gray-600">รุ่น: {equipment.model}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center mb-2">
                    <FiHash className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-xs text-gray-600">Serial Number</p>
                  </div>
                  <p className="font-semibold text-gray-900 font-mono">
                    {serialInfo?.valid ? serialInfo.formatted : item.serial_number}
                  </p>
                  {serialInfo?.valid && (
                    <p className="text-xs text-gray-500 mt-1">{serialInfo.display.sequenceLabel}</p>
                  )}
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center mb-2">
                    <FiHash className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-xs text-gray-600">Item Code</p>
                  </div>
                  <p className="font-semibold text-gray-900">{item.item_code || '-'}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600 mb-2">สถานะ</p>
                {getStatusBadge(item.status)}
              </div>

              {item.condition_note && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-2">หมายเหตุ</p>
                  <p className="text-sm text-gray-900">{item.condition_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-all duration-300"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <FiTrash2 className="w-4 h-4" />
            <span>ยืนยันการลบ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquipmentItemsModal;
