import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiSearch, FiFilter, FiPlus, FiMinus, FiCalendar, FiInfo, FiX, FiCheckCircle, 
  FiPackage, FiRefreshCw, FiGrid, FiList, FiTag, FiStar, FiShoppingBag, FiCreditCard,
  FiEye, FiXCircle, FiAlertCircle, FiClock, FiMapPin } from 'react-icons/fi';
import { API_URL } from '../../api/api';
import { getTodayString, getCurrentDateTimeLocal, combineDateTimeLocal } from '../../utils';
import { STORAGE_KEYS } from '../../constants';

const DisbursementRequest = () => {
  const location = useLocation();
  // ตัวแปรที่ต้องมีสำหรับการใช้งาน
  const [equipment, setEquipment] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [formData, setFormData] = useState({
    disbursementDate: getTodayString(),
    disbursementTime: '09:00',
    purpose: '',
    location: '',
    locationDetail: ''
  });
  const [errors, setErrors] = useState({});

  // รายการสถานที่
  const locations = [
    'ห้องประชุม',
    'ห้องเรียน',
    'ห้อง Lab',
    'นอกสถานที่ (กรุณาระบุเพิ่มเติม)',
  ];

  // ดึงข้อมูลทั้งหมด
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      // แยกการเรียก API ออกจากกันเพื่อให้สามารถจัดการ error ของแต่ละส่วนได้
      await fetchUser().catch(error => {
        console.error("Error fetching user:", error);
        // ข้อผิดพลาดในการดึงข้อมูลผู้ใช้ไม่ควรกระทบการแสดงผลอุปกรณ์
      });
      
      // ดึงข้อมูลประเภทก่อน เพราะอาจต้องใช้กรองอุปกรณ์
      await fetchEquipmentTypes().catch(error => {
        console.error("Error fetching equipment types:", error);
        toast.error('ไม่สามารถดึงข้อมูลประเภทอุปกรณ์ได้ กำลังใช้ข้อมูลที่มีอยู่');
      });
      
      // ดึงข้อมูลอุปกรณ์ต่อจากนั้น
      await fetchEquipment().catch(error => {
        console.error("Error fetching equipment:", error);
        toast.error('เกิดปัญหาในการโหลดข้อมูลอุปกรณ์');
      });
      
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      // ต้องแน่ใจว่า isLoading ถูกตั้งเป็น false ไม่ว่าจะเกิดอะไรขึ้น
      setIsLoading(false);
    }
  };

  // ดึงข้อมูลประเภทอุปกรณ์เบิกจ่าย
  const fetchEquipmentTypes = async () => {
    try {
      // เรียกใช้ API เฉพาะประเภทอุปกรณ์ที่เป็นเบิกจ่าย
      const response = await axios.get(`${API_URL}/api/equipmentTypes/usage/Disbursement`);
      
      // Backend ส่งกลับมาในรูปแบบ { success: true, data: [...] }
      let typesData = [];
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        typesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // fallback กรณีที่ส่งมาเป็น array โดยตรง
        typesData = response.data;
      } else {
        console.warn('Unexpected equipment types response format:', response.data);
        typesData = [];
      }
      
      if (typesData.length > 0) {
        // เพิ่มตัวเลือก "ทั้งหมด" ลงไปในรายการประเภทอุปกรณ์
        const allTypes = [
          { type_id: 'all', type_name: 'ทั้งหมด', usage_type: 'Disbursement' },
          ...typesData
        ];
        setEquipmentTypes(allTypes);
        setTypeFilter('all');
        setFilterType('all');
      } else {
        console.warn('No equipment types returned');
        setEquipmentTypes([{ type_id: 'all', type_name: 'ทั้งหมด', usage_type: 'Disbursement' }]);
      }
    } catch (error) {
      console.error('❌ Error fetching equipment types:', error);
      toast.error('ไม่สามารถดึงข้อมูลประเภทอุปกรณ์ได้');
      setEquipmentTypes([{ type_id: 'all', type_name: 'ทั้งหมด', usage_type: 'Disbursement' }]);
    }
  };

  // ดึงข้อมูลอุปกรณ์จาก API
  const fetchEquipment = async () => {
    try {
      // เรียกใช้ API ที่กรองเฉพาะอุปกรณ์ประเภทเบิกจ่าย
      const response = await axios.get(`${API_URL}/api/equipment/usage/Disbursement`);
      
      // Backend ส่งกลับมาในรูปแบบ { success: true, data: [...] }
      let equipmentData = [];
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        equipmentData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // fallback กรณีที่ส่งมาเป็น array โดยตรง
        equipmentData = response.data;
      } else {
        console.warn('Unexpected response format:', response.data);
        setEquipment([]);
        return;
      }
      
      // แสดงเป็นรายการรวม ไม่แยกรายชิ้น (แสดงทุกอุปกรณ์ Disbursement)
      const formattedEquipment = equipmentData.map(item => {
        let imageUrl = null;
        if (item.image_path) {
          imageUrl = item.image_path.startsWith('http') 
            ? item.image_path 
            : `${API_URL}${item.image_path}`;
        }
        return {
          id: item.equipment_id,
          name: item.equipment_name,
          model: item.model || '',
          category: item.type_id,
          type_name: item.type_name || 'ไม่ระบุประเภท',
          credit: parseInt(item.credit) || 0,
          total: parseInt(item.quantity) || 0, // จำนวนรวมทั้งหมด
          available: parseInt(item.quantity_available) || 0, // จำนวนที่ยังเบิกได้
          image: imageUrl,
          status: item.status || 'Available',
          usage_type: 'Disbursement'
        };
      });
      setEquipment(formattedEquipment);
    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      toast.error('ไม่สามารถโหลดข้อมูลอุปกรณ์ได้');
      setEquipment([]);
    }
  };

  // ดึงข้อมูลผู้ใช้
  const fetchUser = async () => {
    // โค้ดที่มีอยู่เดิม
  };

  // กรองอุปกรณ์ตามประเภทและคำค้นหา
  const getFilteredAndSortedEquipment = () => {
    if (!equipment || equipment.length === 0) return [];
    
    let filtered = equipment.filter(item => {
      // กรองตามคำค้นหา
      const matchesSearch = searchTerm === '' || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type_name?.toLowerCase().includes(searchTerm.toLowerCase());
      // กรองตามประเภท
      const matchesType = filterType === 'all' || item.category?.toString() === filterType.toString();
      // กรองตามสถานะ (ถ้าเลือก Available ให้แสดงเฉพาะที่ยังเบิกได้)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'Available' ? item.available > 0 : true);
      // แสดงทุกอุปกรณ์ Disbursement เป็นรายการรวม
      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  // แปลงสถานะเป็นภาษาไทย
  const translateStatus = (status) => {
    const statusMap = {
      'Available': { text: 'พร้อมใช้งาน', color: 'green', icon: FiCheckCircle },
      'Reserved': { text: 'ถูกจอง', color: 'yellow', icon: FiClock },
      'Repairing': { text: 'ซ่อมบำรุง', color: 'blue', icon: FiAlertCircle },
      'Damaged': { text: 'ชำรุด', color: 'red', icon: FiXCircle },
      'Lost': { text: 'สูญหาย', color: 'gray', icon: FiXCircle }
    };
    return statusMap[status] || { text: status, color: 'gray', icon: FiAlertCircle };
  };

  const filteredEquipment = getFilteredAndSortedEquipment();

  // เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-select equipment ที่ส่งมาจาก EquipmentBrowser
  useEffect(() => {
    if (location.state?.selectedEquipment && equipment.length > 0) {
      const selectedEq = location.state.selectedEquipment;
      // ตรวจสอบว่าเป็นอุปกรณ์เบิกจ่ายหรือไม่
      const eqType = equipmentTypes.find(type => type.type_id === selectedEq.type_id);
      if (eqType?.usage_type === 'Disbursement') {
        // หา equipment จาก state เพื่อใช้ข้อมูลที่มีรูปภาพ
        const fullEquipment = equipment.find(eq => eq.id === selectedEq.equipment_id);
        
        if (fullEquipment) {
          // ใช้ข้อมูลจาก equipment state ที่มีรูปภาพครบถ้วน
          handleSelectEquipment(fullEquipment);
        } else {
          // fallback กรณีหาไม่เจอ ให้สร้างจากข้อมูลที่ส่งมา
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const imageUrl = selectedEq.image_path 
            ? (selectedEq.image_path.startsWith('http') 
              ? selectedEq.image_path 
              : `${API_URL}${selectedEq.image_path}`)
            : null;
            
          const equipmentItem = {
            id: selectedEq.equipment_id,
            name: selectedEq.equipment_name,
            type: selectedEq.type_name,
            type_name: selectedEq.type_name,
            credit: selectedEq.credit,
            available: selectedEq.quantity || 1,
            usage_type: 'Disbursement',
            image: imageUrl,
            quantity: 1
          };
          handleSelectEquipment(equipmentItem);
        }
      }
      // Clear state เพื่อไม่ให้ auto-select ซ้ำ
      window.history.replaceState({}, document.title);
    }
  }, [location.state, equipment, equipmentTypes]);

  const handleSelectEquipment = (item) => {
    // ตรวจสอบว่าอุปกรณ์มีจำนวนให้เบิกหรือไม่
    if (item.available <= 0) {
      toast.warning(`${item.name} ไม่มีให้เบิก`);
      return;
    }
    
    // ตรวจสอบว่าเป็นอุปกรณ์ประเภทเบิกจ่ายหรือไม่
    if (item.usage_type !== 'Disbursement' && item.usage_type) {
      toast.warning(`${item.name} ไม่ใช่อุปกรณ์ประเภทเบิกจ่าย`);
      return;
    }
    
    // ตรวจสอบว่ามีอุปกรณ์นี้ในรายการที่เลือกแล้วหรือไม่
    const isSelected = selectedEquipment.some(selected => selected.id === item.id);
    
    if (isSelected) {
      // ถ้ามีแล้ว ให้ลบออก
      setSelectedEquipment(prev => prev.filter(selected => selected.id !== item.id));
      toast.info(`นำ ${item.name} ออกจากรายการเบิก`);
    } else {
      // ถ้ายังไม่มี ให้เพิ่มเข้าไป
      setSelectedEquipment(prev => [...prev, { 
        ...item, 
        quantity: 1
      }]);
      toast.success(`เพิ่ม ${item.name} ในรายการเบิก`);
      
      // Scroll ไปที่ส่วนตะกร้าสินค้า
      setTimeout(() => {
        const element = document.getElementById('selected-equipment-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // ซ่อนฟอร์มเมื่อไม่มีรายการที่เลือก
  useEffect(() => {
    if (selectedEquipment.length === 0) {
      setShowForm(false);
    }
  }, [selectedEquipment.length]);

  const handleChangeQuantity = (id, changeAmount) => {
    // ค้นหาอุปกรณ์ที่ต้องการเปลี่ยนจำนวน
    const selectedItem = selectedEquipment.find(e => e.id === id);
    const originalItem = equipment.find(e => e.id === id);
    
    if (!selectedItem || !originalItem) return;
    
    // คำนวณจำนวนใหม่
    const newQuantity = selectedItem.quantity + changeAmount;
    
    // ตรวจสอบว่าจำนวนใหม่ไม่น้อยกว่า 1 และไม่เกินจำนวนที่มี
    if (newQuantity < 1) {
      toast.warning('จำนวนต้องมากกว่าหรือเท่ากับ 1');
      return;
    }
    
    if (newQuantity > originalItem.available) {
      toast.warning(`จำนวนไม่สามารถเกิน ${originalItem.available}`);
      return;
    }
    
    // อัปเดตจำนวน
    setSelectedEquipment(prev => 
      prev.map(selected => 
        selected.id === id 
          ? { 
              ...selected, 
              quantity: newQuantity
            } 
          : selected
      )
    );
  };

  const handleRemoveSelected = (id) => {
    const itemName = selectedEquipment.find(item => item.id === id)?.name || '';
    setSelectedEquipment(prev => prev.filter(item => item.id !== id));
    toast.info(`นำ ${itemName} ออกจากรายการเบิก`);
  };

  const handleDisbursementFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // ลบข้อผิดพลาดเมื่อผู้ใช้แก้ไขข้อมูล
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateDisbursementForm = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const disbursementDate = new Date(formData.disbursementDate);
    
    // ตรวจสอบวันที่เบิก
    if (!formData.disbursementDate) {
      newErrors.disbursementDate = 'กรุณาเลือกวันที่ต้องการเบิก';
    } else if (disbursementDate < today) {
      newErrors.disbursementDate = 'วันที่เบิกต้องไม่เป็นวันที่ผ่านมาแล้ว';
    }
    
    // ตรวจสอบวัตถุประสงค์
    if (!formData.purpose || formData.purpose.trim() === '') {
      newErrors.purpose = 'กรุณาระบุวัตถุประสงค์การเบิก';
    } else if (formData.purpose.length > 500) {
      newErrors.purpose = 'วัตถุประสงค์ต้องไม่เกิน 500 ตัวอักษร';
    }
    
    // ตรวจสอบสถานที่ใช้งาน
    if (!formData.location || formData.location.trim() === '') {
      newErrors.location = 'กรุณาระบุสถานที่ใช้งาน';
    } else if (formData.location.length > 255) {
      newErrors.location = 'สถานที่ใช้งานต้องไม่เกิน 255 ตัวอักษร';
    }
    
    // ตรวจสอบรายละเอียดสถานที่เพิ่มเติม
    if (formData.location.includes('นอกสถานที่')) {
      if (!formData.locationDetail || formData.locationDetail.trim() === '') {
        newErrors.locationDetail = 'กรุณาระบุรายละเอียดสถานที่เพิ่มเติม';
      } else if (formData.locationDetail.length > 500) {
        newErrors.locationDetail = 'รายละเอียดสถานที่ต้องไม่เกิน 500 ตัวอักษร';
      }
    }
    
    // ตรวจสอบจำนวนอุปกรณ์ที่เลือก
    if (!selectedEquipment || selectedEquipment.length === 0) {
      toast.error('กรุณาเลือกอุปกรณ์ที่ต้องการเบิกอย่างน้อย 1 รายการ');
      return false;
    }
    
    // ตรวจสอบจำนวนที่เบิกแต่ละรายการ
    for (const item of selectedEquipment) {
      if (!item.quantity || item.quantity < 1) {
        toast.error(`กรุณาระบุจำนวนที่ต้องการเบิกสำหรับ ${item.name}`);
        return false;
      }
      if (item.quantity > item.available) {
        toast.error(`${item.name} มีจำนวนไม่เพียงพอ (มี ${item.available} ชิ้น)`);
        return false;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEquipment || selectedEquipment.length === 0) {
      toast.error('กรุณาเลือกอุปกรณ์ที่ต้องการเบิก');
      return;
    }
    
    if (!validateDisbursementForm()) {
      toast.error('กรุณาแก้ไขข้อมูลให้ถูกต้อง');
      return;
    }
    
    // รวมวันที่และเวลาเป็น datetime
    const disbursementDateTime = combineDateTimeLocal(
      formData.disbursementDate,
      formData.disbursementTime
    );

    // สร้างข้อมูลสำหรับส่งไป API
    const requestData = {
      disbursement_date: disbursementDateTime,
      purpose: formData.purpose,
      location: formData.location.includes('นอกสถานที่') && formData.locationDetail 
        ? `${formData.location}: ${formData.locationDetail}` 
        : formData.location,
      equipment: selectedEquipment.map(item => ({
        equipment_id: item.id,
        quantity: item.quantity
      }))
    };
    
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      const response = await axios.post(
        `${API_URL}/api/disbursements`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('ส่งคำขอเบิกจ่ายสำเร็จ กรุณารอการอนุมัติ');
        
        // รีเซ็ตข้อมูล
        setSelectedEquipment([]);
        setFormData({
          disbursementDate: getTodayString(),
          disbursementTime: '09:00',
          purpose: '',
          location: '',
          locationDetail: ''
        });
        setShowForm(false);
        
        // รีเฟรชข้อมูลอุปกรณ์
        await fetchEquipment();
      }
    } catch (error) {
      console.error('Error submitting disbursement request:', error);
      const errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEquipment = filteredEquipment.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">เบิก-จ่ายอุปกรณ์</h1>
                  <p className="text-purple-100 mt-1 font-medium">เลือกอุปกรณ์ที่ต้องการเบิกจากระบบ</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiStar className="inline w-4 h-4 mr-1 text-yellow-300" />
                      <span className="text-white font-semibold">สำหรับผู้ใช้งาน</span>
                    </span>
                    <span className="text-purple-100 font-medium">
                      พบ <span className="text-white font-bold">{filteredEquipment.length}</span> รายการ
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                <button
                  onClick={fetchEquipment}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiRefreshCw className="w-5 h-5 text-white" />
                </button>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiFilter className="w-5 h-5 text-white" />
                </button>
                <div className="flex bg-white/20 rounded-xl p-1 border border-white/30">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      viewMode === 'grid' ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <FiGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      viewMode === 'list' ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <FiList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FiFilter className="mr-2" />
                ค้นหาและกรองข้อมูล
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Search */}
                <div>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ, รุ่น..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
                
                {/* Type Filter */}
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">🏷️ ทุกประเภท</option>
                    {equipmentTypes
                      .filter(type => type.type_id !== 'all')
                      .map(type => (
                        <option key={type.type_id} value={type.type_id}>
                          📤 {type.type_name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">🔄 ทุกสถานะ</option>
                    <option value="Available">✅ พร้อมใช้งาน</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sort */}
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="name">เรียงตามชื่อ</option>
                    <option value="available">เรียงตามจำนวน</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-all duration-300"
                  >
                    {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Display */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <FiPackage className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">📦 รายการอุปกรณ์</h2>
                  <p className="text-gray-600 text-sm">อุปกรณ์เบิก-จ่ายที่พร้อมใช้งาน</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : currentEquipment.length === 0 ? (
              <div className="py-20 text-center">
                <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">ไม่พบอุปกรณ์ที่ค้นหา</p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentEquipment.map((item) => {
                      const statusInfo = translateStatus(item.status);
                      const StatusIcon = statusInfo.icon;
                      const isSelected = selectedEquipment.some(selected => selected.id === item.id);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`bg-white border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                            isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                          }`}
                          onClick={() => handleSelectEquipment(item)}
                        >
                          {/* Image */}
                          <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden relative">
                            {item.image ? (
                              <img 
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                              <FiPackage className="w-12 h-12 text-gray-400" />
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-purple-500 rounded-full p-1.5">
                                <FiCheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Equipment Info */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 text-lg truncate">{item.name}</h3>
                            <p className="text-sm text-gray-600 truncate">รุ่น: {item.model || '-'}</p>
                            
                            {/* Type Badge */}
                            <div className="flex items-center">
                              <FiTag className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                {item.type_name}
                              </span>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <StatusIcon className={`w-4 h-4 mr-2 text-${statusInfo.color}-500`} />
                                <span className={`text-sm font-medium text-${statusInfo.color}-600`}>
                                  {statusInfo.text}
                                </span>
                              </div>
                            </div>

                            {/* Available */}
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>จำนวนพร้อมเบิก:</span>
                              <span className="font-medium text-purple-600">{item.available} ชิ้น</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // List View
                  <div className="space-y-4">
                    {currentEquipment.map((item) => {
                      const statusInfo = translateStatus(item.status);
                      const StatusIcon = statusInfo.icon;
                      const isSelected = selectedEquipment.some(selected => selected.id === item.id);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`bg-white border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer ${
                            isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                          }`}
                          onClick={() => handleSelectEquipment(item)}
                        >
                          <div className="flex items-center space-x-6">
                            {/* Image */}
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                              {item.image ? (
                                <img 
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                                <FiPackage className="w-8 h-8 text-gray-400" />
                              </div>
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-1">
                                  <FiCheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Equipment Info */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                                <p className="text-sm text-gray-600">รุ่น: {item.model || '-'}</p>
                              </div>

                              <div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  <FiTag className="w-3 h-3 mr-1" />
                                  {item.type_name}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <StatusIcon className={`w-4 h-4 mr-2 text-${statusInfo.color}-500`} />
                                <span className={`text-sm font-medium text-${statusInfo.color}-600`}>
                                  {statusInfo.text}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  พร้อมเบิก: <span className="font-medium text-purple-600">{item.available}</span> ชิ้น
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-8 space-x-2">
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
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected Equipment & Form */}
        {selectedEquipment.length > 0 && (
          <div id="selected-equipment-section" className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4 text-white">
              <h3 className="text-lg font-black flex items-center">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mr-3">
                  <FiShoppingBag className="w-5 h-5" />
                </div>
                <span>รายการที่เลือก</span>
                <span className="ml-2 px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-sm font-black">
                  {selectedEquipment.length}
                </span>
              </h3>
            </div>
            <div className="p-5">
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {selectedEquipment.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="relative">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-14 h-14 object-cover rounded-lg shadow-sm" 
                            onError={(e) => { 
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }} 
                          />
                        ) : null}
                        <div className={`w-14 h-14 bg-gray-100 rounded-lg shadow-sm flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                          <FiPackage className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.type_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-white rounded-lg px-2 py-1 border border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleChangeQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-purple-500 hover:text-white text-gray-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiMinus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-900 text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleChangeQuantity(item.id, 1)}
                          disabled={item.quantity >= item.available}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-purple-500 hover:text-white text-gray-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">/ {item.available}</span>
                      <button
                        onClick={() => handleRemoveSelected(item.id)}
                        className="w-8 h-8 rounded-md bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all duration-200"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <span className="flex items-center justify-center">
                    <FiCheckCircle className="w-5 h-5 mr-2" />
                    ดำเนินการต่อ
                  </span>
                </button>
              ) : (
                <div className="w-full bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mr-3 shadow-lg">
                      <FiCalendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">ข้อมูลการเบิก</h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="disbursementDate" className="block text-sm font-semibold text-gray-700 mb-2">
                          วันที่ต้องการเบิก
                        </label>
                        <div className="relative">
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                          <input
                            type="date"
                            id="disbursementDate"
                            name="disbursementDate"
                            value={formData.disbursementDate}
                            onChange={handleDisbursementFormChange}
                            className={`w-full pl-10 pr-4 py-2.5 border-2 ${
                              errors.disbursementDate ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-purple-500'
                            } rounded-lg focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 bg-white`}
                            min={getTodayString()}
                          />
                        </div>
                        {errors.disbursementDate && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <FiInfo className="w-3 h-3 mr-1" />
                            {errors.disbursementDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="disbursementTime" className="block text-sm font-semibold text-gray-700 mb-2">
                          เวลาที่ต้องการเบิก
                        </label>
                        <div className="relative">
                          <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                          <input
                            type="time"
                            id="disbursementTime"
                            name="disbursementTime"
                            value={formData.disbursementTime}
                            onChange={handleDisbursementFormChange}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 focus:border-purple-500 rounded-lg focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* แสดงสรุปวันเวลา */}
                    {formData.disbursementDate && formData.disbursementTime && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center text-sm">
                          <FiClock className="text-purple-600 mr-2" />
                          <span className="text-gray-700">
                            วันเวลาเบิก: <strong className="text-purple-700">
                              {new Date(`${formData.disbursementDate}T${formData.disbursementTime}`).toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} น.
                            </strong>
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          💡 ระบบจะบันทึกวันเวลาที่เบิก (ไม่มีค่าปรับในการเบิกจ่าย)
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="purpose" className="block text-sm font-semibold text-gray-700 mb-2">
                        วัตถุประสงค์การเบิก
                      </label>
                      <textarea
                        id="purpose"
                        name="purpose"
                        rows="3"
                        value={formData.purpose}
                        onChange={handleDisbursementFormChange}
                        className={`w-full px-4 py-2.5 border-2 ${
                          errors.purpose ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-purple-500'
                        } rounded-lg focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 bg-white resize-none`}
                        placeholder="ระบุวัตถุประสงค์ในการเบิกอุปกรณ์..."
                      ></textarea>
                      {errors.purpose && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <FiInfo className="w-3 h-3 mr-1" />
                          {errors.purpose}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                        สถานที่ใช้งาน
                      </label>
                      <select
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleDisbursementFormChange}
                        className={`w-full px-4 py-2.5 border-2 ${
                          errors.location ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-purple-500'
                        } rounded-lg focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 bg-white`}
                      >
                        <option value="">เลือกสถานที่</option>
                        {locations.map(location => (
                          <option key={location} value={location}>{location}</option>
                        ))}
                      </select>
                      {errors.location && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <FiInfo className="w-3 h-3 mr-1" />
                          {errors.location}
                        </p>
                      )}
                    </div>
                    
                    {formData.location.includes('นอกสถานที่') && (
                      <div>
                        <label htmlFor="locationDetail" className="block text-sm font-semibold text-gray-700 mb-2">
                          รายละเอียดสถานที่
                        </label>
                        <input
                          type="text"
                          id="locationDetail"
                          name="locationDetail"
                          value={formData.locationDetail}
                          onChange={handleDisbursementFormChange}
                          className={`w-full px-4 py-2.5 border-2 ${
                            errors.locationDetail ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-purple-500'
                          } rounded-lg focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 bg-white`}
                          placeholder="ระบุสถานที่ที่ต้องการใช้งาน..."
                        />
                        {errors.locationDetail && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <FiInfo className="w-3 h-3 mr-1" />
                            {errors.locationDetail}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-6 py-2 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      >
                        ย้อนกลับ
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            กำลังดำเนินการ...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <FiCheckCircle className="w-4 h-4 mr-2" />
                            ส่งคำขอเบิก
                          </span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisbursementRequest;