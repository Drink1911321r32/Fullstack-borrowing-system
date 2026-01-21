import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FiClock, FiCheckCircle, FiXCircle, FiCalendar, FiUser, FiPackage,
  FiAlertCircle, FiPlus, FiMinus, FiSend, FiRefreshCw, FiSearch,
  FiFilter, FiEye, FiCreditCard, FiFileText, FiTrash2, FiChevronRight, FiHash,
  FiGrid, FiList, FiTag, FiStar, FiMapPin, FiRepeat
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { STORAGE_KEYS } from '../../constants';
import { equipmentAPI, equipmentTypeAPI, equipmentItemAPI, API_URL, userAPI } from '../../api/api';
import { createBorrowRequest, getUserBorrowings, cancelBorrowing } from '../../api/borrowingService';
import { getTodayString, getCurrentDateTimeLocal, combineDateTimeLocal, formatDateTime } from '../../utils';
import axios from 'axios';

const BorrowEquipment = () => {
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]); // เปลี่ยนเป็นเก็บ items แทน equipment
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [maxBorrowDays, setMaxBorrowDays] = useState(7); // ค่าเริ่มต้น 7 วัน
    const [penaltyType, setPenaltyType] = useState('day'); // ค่าเริ่มต้น รายวัน
  const [requestDetails, setRequestDetails] = useState({
    purpose: '',
    expected_return_date: '',
    expected_return_time: '17:00',
    location: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('equipment_name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Modal states
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedEquipmentForItems, setSelectedEquipmentForItems] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // ฟังก์ชัน refresh ข้อมูล user (เครดิต)
  const refreshUserCredit = async () => {
    try {
      const response = await userAPI.getUserProfile();
      if (response.data && response.data.success) {
        const updatedUser = response.data.data;
        setUserData(updatedUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        console.log('✅ User credit refreshed:', updatedUser.credit);
      }
    } catch (error) {
      console.error('Error refreshing user credit:', error);
    }
  };

  useEffect(() => {
    // Load user data
    const storedUserData = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        setUserData(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    // Refresh user credit เมื่อ component mount
    refreshUserCredit();

    const fetchData = async () => {
      // ดึงค่า max_borrow_days จาก settings
      try {
        const response = await axios.get(`${API_URL}/api/users/settings/public/max_borrow_days`);
        if (response.data && response.data.success) {
          setMaxBorrowDays(Number(response.data.data.setting_value) || 7);
        }
      } catch (error) {
        // Using default max_borrow_days: 7
      }
      // ดึงค่า penalty_type จาก settings (เช่น day/hour)
      try {
        const resPenalty = await fetch(`${API_URL}/api/users/settings/public/penalty_type`);
        if (resPenalty.ok) {
          const data = await resPenalty.json();
          if (data && data.success) {
            setPenaltyType(data.data.setting_value || 'day');
          }
        }
      } catch (error) {
        console.warn('Failed to fetch penalty_type setting, using default:', error);
        // Silently use default 'day'
      }
      
      await fetchEquipmentTypes();
      await fetchLoanableEquipment();
      await fetchBorrowRequests();
    };
    fetchData();
  }, []);

  // Listen for credit changes via storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user_credit_updated' || e.key === STORAGE_KEYS.USER) {
        refreshUserCredit();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab updates
    const handleCustomEvent = () => {
      refreshUserCredit();
    };
    window.addEventListener('userCreditUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userCreditUpdated', handleCustomEvent);
    };
  }, []);

  // Auto-select equipment ที่ส่งมาจาก EquipmentBrowser
  useEffect(() => {
    if (location.state?.selectedEquipment && equipment.length > 0) {
      const selectedEq = location.state.selectedEquipment;
      // เปิด modal เลือก items ทันที
      viewEquipmentItems(selectedEq);
      // Clear state เพื่อไม่ให้ auto-select ซ้ำ
      window.history.replaceState({}, document.title);
    }
  }, [location.state, equipment]);

  const fetchLoanableEquipment = async () => {
    try {
      setLoading(true);
      const response = await equipmentAPI.getAll();
      
      let equipmentData = [];
      if (response && response.success && Array.isArray(response.data)) {
        equipmentData = response.data;
      } else if (Array.isArray(response)) {
        equipmentData = response;
      }

      setEquipment(equipmentData);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipmentTypes = async () => {
    try {
      const response = await equipmentTypeAPI.getAll();
      if (response && response.success && Array.isArray(response.data)) {
        setEquipmentTypes(response.data);
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
    }
  };

  const fetchBorrowRequests = async () => {
    try {
      setLoading(true);
      const response = await getUserBorrowings();
      const data = response.data || response;
      
      const formattedData = Array.isArray(data) ? data.map(item => ({
        ...item,
        id: item.transaction_id || item.id
      })) : [];
      
      setBorrowRequests(formattedData);
    } catch (error) {
      console.error('Error fetching borrow requests:', error);
      setBorrowRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (transactionId) => {
    if (!window.confirm('ต้องการยกเลิกคำขอยืมนี้ใช่หรือไม่?')) {
      return;
    }

    try {
      setLoading(true);
      await cancelBorrowing(transactionId);
      toast.success('ยกเลิกคำขอยืมสำเร็จ');
      await fetchBorrowRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('ไม่สามารถยกเลิกคำขอยืมได้');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEquipment = () => {
    let filtered = equipment.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || item.type_id?.toString() === typeFilter;
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const equipmentType = equipmentTypes.find(type => type.type_id === item.type_id);
      const isLoanType = equipmentType?.usage_type === 'Loan';
      
      // ตรวจสอบว่ามีจำนวนพร้อมให้ยืม (นับจาก equipment_items)
      // ไม่เช็ค status ของอุปกรณ์โดยรวม แต่ให้เช็คว่ามี items พร้อมใช้งานหรือไม่
      const isAvailable = (item.quantity_available || 0) > 0;

      return matchesSearch && matchesType && matchesStatus && isLoanType && isAvailable;
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

  // ดูรายการ Items ของอุปกรณ์
  const viewEquipmentItems = async (equipment) => {
    try {
      setLoadingItems(true);
      setSelectedEquipmentForItems(equipment);
      setShowItemsModal(true);
      
      const response = await equipmentItemAPI.getItemsByEquipmentId(equipment.equipment_id);
      
      // กรองเฉพาะ items ที่ Available
      const availableItems = (response.data || [])
        .filter(item => item.status === 'Available')
        .map(item => ({
          ...item,
          equipment_name: equipment.equipment_name,
          equipment_model: equipment.model,
          equipment_credit: equipment.credit
        }));
      
      setEquipmentItems(availableItems);
    } catch (error) {
      console.error('Error fetching equipment items:', error);
      toast.error('ไม่สามารถโหลดรายการอุปกรณ์ได้');
      setEquipmentItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // เพิ่ม item ลงรถเข็น
  const addItemToCart = (item) => {
    // ตรวจสอบว่า item นี้ถูกเลือกไปแล้วหรือไม่
    const alreadySelected = selectedItems.find(selected => selected.item_id === item.item_id);
    
    if (alreadySelected) {
      toast.info('รายการนี้ถูกเลือกไว้แล้ว');
      return;
    }

    setSelectedItems([...selectedItems, item]);
    toast.success(`เพิ่ม ${item.equipment_name} #${item.serial_number} ลงรถเข็นแล้ว`);
    
    // Scroll ไปที่ตะกร้าสินค้า
    setTimeout(() => {
      const element = document.getElementById('shopping-cart-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // ลบ item จากรถเข็น
  const removeItemFromCart = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.item_id !== itemId));
  };

  // คำนวณเครดิตรวม
  const getTotalCredit = () => {
    return selectedItems.reduce((total, item) => total + parseFloat(item.equipment_credit || 0), 0);
  };

  // ส่งคำขอยืม
  const submitBorrowRequest = async () => {
    // Validation
    if (selectedItems.length === 0) {
      toast.error('กรุณาเลือกอุปกรณ์ที่ต้องการยืม');
      return;
    }

    if (!requestDetails.purpose || requestDetails.purpose.trim() === '') {
      toast.error('กรุณาระบุวัตถุประสงค์การยืม');
      return;
    }

    if (requestDetails.purpose.length > 500) {
      toast.error('วัตถุประสงค์ต้องไม่เกิน 500 ตัวอักษร');
      return;
    }


    if (!requestDetails.expected_return_date) {
      toast.error('กรุณาเลือกวันที่คาดว่าจะคืน');
      return;
    }

    // ตรวจสอบวัน-เวลาคืนต้องมากกว่าวัน-เวลายืม (ปัจจุบัน)
    const now = new Date();
    const returnDateTime = new Date(`${requestDetails.expected_return_date}T${requestDetails.expected_return_time || '17:00'}`);
    if (returnDateTime <= now) {
      toast.error('วันและเวลาคืนต้องมากกว่าวันและเวลายืม');
      return;
    }

    // ตรวจสอบจำนวนวันยืมไม่เกินที่กำหนด
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const returnDate = new Date(requestDetails.expected_return_date);
    returnDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(returnDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > maxBorrowDays) {
      toast.error(`สามารถยืมได้สูงสุด ${maxBorrowDays} วันเท่านั้น`);
      return;
    }

    if (!requestDetails.location || requestDetails.location.trim() === '') {
      toast.error('กรุณาระบุสถานที่ใช้งาน');
      return;
    }

    if (requestDetails.location.length > 255) {
      toast.error('สถานที่ใช้งานต้องไม่เกิน 255 ตัวอักษร');
      return;
    }

    // ตรวจสอบเครดิต
    const totalCredit = getTotalCredit();
    if (userData && totalCredit > userData.credit) {
      toast.error(`เครดิตไม่เพียงพอ (ต้องการ ${totalCredit} แต่มี ${userData.credit})`);
      return;
    }

    try {
      setLoading(true);
       
      // จัดกลุ่ม items ตาม equipment_id
      const equipmentGroups = {};
      selectedItems.forEach(item => {
        if (!equipmentGroups[item.equipment_id]) {
          equipmentGroups[item.equipment_id] = [];
        }
        equipmentGroups[item.equipment_id].push(item.item_id);
      });

      // สร้างข้อมูลสำหรับส่งไป API
      const expectedReturnDateTime = combineDateTimeLocal(
        requestDetails.expected_return_date,
        requestDetails.expected_return_time
      );

      const requestData = {
        borrow_date: getCurrentDateTimeLocal(),
        expected_return_date: expectedReturnDateTime,
        purpose: requestDetails.purpose,
        location: requestDetails.location,
        equipment: Object.keys(equipmentGroups).map(equipment_id => ({
          equipment_id: parseInt(equipment_id),
          item_ids: equipmentGroups[equipment_id] // ส่ง array ของ item_ids
        }))
      };
      
      const response = await createBorrowRequest(requestData);
      
      toast.success(response.message || 'ส่งคำขอยืมอุปกรณ์สำเร็จ');
      
      // Reset form
      setSelectedItems([]);
      setRequestDetails({
        purpose: '',
        expected_return_date: '',
        expected_return_time: '17:00',
        location: ''
      });
      
      await fetchBorrowRequests();
      await fetchLoanableEquipment();
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถส่งคำขอยืมได้');
    } finally {
      setLoading(false);
    }
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

  // Pagination
  const filteredEquipment = getFilteredEquipment();
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEquipment = filteredEquipment.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-gray-50 min-h-screen p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiRepeat className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">ยืม-คืนอุปกรณ์</h1>
                  <p className="text-blue-100 mt-1 font-medium">เลือกอุปกรณ์รายชิ้นพร้อม Serial Number</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiStar className="inline w-4 h-4 mr-1 text-yellow-300" />
                      <span className="text-white font-semibold">สำหรับผู้ใช้งาน</span>
                    </span>
                    <span className="text-blue-100 font-medium">
                      พบ <span className="text-white font-bold">{filteredEquipment.length}</span> รายการ
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                {userData && (
                  <div className="relative group">
                    {/* Horizontal Credit Card Design */}
                    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-[2px] rounded-xl shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-105">
                      <div className="bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-xl rounded-xl px-5 py-3">
                        {/* Decorative Elements */}
                        <div className="absolute top-1 right-2 w-10 h-10 bg-gradient-to-br from-yellow-300/20 to-orange-300/20 rounded-full blur-xl"></div>
                        <div className="absolute bottom-1 left-2 w-6 h-6 bg-gradient-to-br from-pink-300/20 to-purple-300/20 rounded-full blur-lg"></div>
                        
                        <div className="relative flex items-center space-x-4">
                          {/* Icon */}
                          <div className="p-2.5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-lg flex-shrink-0">
                            <FiCreditCard className="w-5 h-5 text-white" />
                          </div>
                          
                          {/* Credit Info */}
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="text-[10px] font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent uppercase tracking-wider mb-0.5">
                                เครดิต
                              </div>
                              <div className="flex items-baseline space-x-1">
                                <span className={`text-2xl font-black bg-gradient-to-r ${
                                  (userData.credit || 0) < 0 
                                    ? 'from-red-600 via-red-500 to-orange-500' 
                                    : 'from-orange-600 via-pink-600 to-purple-600'
                                } bg-clip-text text-transparent`}>
                                  {userData.credit || 0}
                                </span>
                                <span className="text-xs font-semibold text-gray-500">คะแนน</span>
                              </div>
                            </div>

                            {/* Decorative Dots */}
                            <div className="flex flex-col space-y-1 ml-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-400 to-purple-500"></div>
                            </div>
                          </div>

                          {/* Shine Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                      </div>
                    </div>

                    {/* Hover Tooltip */}
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                        <div className="flex items-center space-x-2">
                          <FiStar className="w-3 h-3 text-yellow-400" />
                          <span>เครดิตคงเหลือของคุณ</span>
                        </div>
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={fetchLoanableEquipment}
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
                
                {/* Type Filter */}
                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">🏷️ ทุกประเภท</option>
                    {equipmentTypes
                      .filter(type => type.usage_type === 'Loan')
                      .map(type => (
                        <option key={type.type_id} value={type.type_id}>
                          🔄 {type.type_name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
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
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="equipment_name">เรียงตามชื่อ</option>
                    <option value="credit">เรียงตามเครดิต</option>
                    <option value="quantity">เรียงตามจำนวน</option>
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
                <div className="bg-blue-100 p-3 rounded-xl">
                  <FiPackage className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">📦 รายการอุปกรณ์</h2>
                  <p className="text-gray-600 text-sm">อุปกรณ์ยืม-คืนที่พร้อมใช้งาน</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
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
                      const equipmentType = equipmentTypes.find(type => type.type_id === item.type_id);
                      
                      return (
                        <div key={item.equipment_id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                             onClick={() => viewEquipmentItems(item)}>
                          {/* Image */}
                          <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
                            {item.image_path ? (
                              <img 
                                src={`${API_URL}${item.image_path}`}
                                alt={item.equipment_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiPackage className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Equipment Info */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 text-lg truncate">{item.equipment_name}</h3>
                            <p className="text-sm text-gray-600 truncate">รุ่น: {item.model}</p>
                            
                            {/* Type Badge */}
                            <div className="flex items-center">
                              <FiTag className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                {equipmentType?.type_name}
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

                            {/* Credit & Quantity */}
                            <div className="flex justify-between text-sm text-gray-600">
                              <span className="flex items-center">
                                <FiCreditCard className="w-4 h-4 mr-1" />
                                <span className="font-medium text-indigo-600">{item.credit}</span>
                              </span>
                              <span>จำนวน: <span className="font-medium">{item.quantity || 1}</span></span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                viewEquipmentItems(item);
                              }}
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center mt-2"
                            >
                              <FiEye className="w-4 h-4 mr-2" />
                              เลือกรายการ
                            </button>
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
                      const equipmentType = equipmentTypes.find(type => type.type_id === item.type_id);
                      
                      return (
                        <div key={item.equipment_id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                             onClick={() => viewEquipmentItems(item)}>
                          <div className="flex items-center space-x-6">
                            {/* Image */}
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.image_path ? (
                                <img 
                                  src={`${API_URL}${item.image_path}`}
                                  alt={item.equipment_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/96?text=No+Image';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FiPackage className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Equipment Info */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{item.equipment_name}</h3>
                                <p className="text-sm text-gray-600">รุ่น: {item.model}</p>
                              </div>

                              <div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <FiTag className="w-3 h-3 mr-1" />
                                  {equipmentType?.type_name}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <StatusIcon className={`w-4 h-4 mr-2 text-${statusInfo.color}-500`} />
                                <span className={`text-sm font-medium text-${statusInfo.color}-600`}>
                                  {statusInfo.text}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <FiCreditCard className="w-4 h-4 mr-1" />
                                    <span className="font-medium text-indigo-600">{item.credit}</span>
                                  </span>
                                  <span>จำนวน: <span className="font-medium">{item.quantity || 1}</span></span>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewEquipmentItems(item);
                                  }}
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <FiEye className="w-5 h-5" />
                                </button>
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

        {/* Shopping Cart & Requests - Sidebar */}
        <div id="shopping-cart-section" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shopping Cart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 px-5 py-4 text-white">
              <h3 className="text-lg font-black flex items-center">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mr-3">
                  <FiPackage className="w-5 h-5" />
                </div>
                <span>รายการที่เลือก</span>
                <span className="ml-2 px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-sm font-black">
                  {selectedItems.length}
                </span>
              </h3>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto">
              {selectedItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                    <FiPackage className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">ยังไม่มีรายการที่เลือก</p>
                  <p className="text-xs text-gray-500 mt-1">เลือกอุปกรณ์ที่ต้องการยืม</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.item_id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-green-50/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{item.equipment_name}</h4>
                          <div className="flex items-center space-x-2 text-xs flex-wrap">
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold">
                              #{item.serial_number}
                            </span>
                            <span className="text-gray-600 font-medium truncate">{item.equipment_model}</span>
                          </div>
                          {item.location && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <FiMapPin className="mr-1 w-3 h-3" /> {item.location}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItemFromCart(item.item_id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg ml-2 flex-shrink-0 transition-all"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-lg text-xs font-black">
                          <FiCreditCard className="w-3 h-3 mr-1" />
                          {item.equipment_credit} เครดิต
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t-2 border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl">
                      <span className="text-base font-black text-gray-700">รวมทั้งหมด:</span>
                      <span className="text-2xl font-black text-transparent bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text">
                        {getTotalCredit()} เครดิต
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Request Form */}
            {selectedItems.length > 0 && (
              <div className="border-t border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center mb-4">
                  <FiFileText className="mr-2 w-4 h-4" />
                  รายละเอียดการยืม
                </h3>
                <div className="space-y-3">

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      วัตถุประสงค์ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={requestDetails.purpose}
                      onChange={(e) => setRequestDetails({...requestDetails, purpose: e.target.value})}
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="2"
                      placeholder="ระบุวัตถุประสงค์"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* แสดงวันและเวลายืมแบบบรรทัดเดียว เหมือนในรูป */}
                    <div className="col-span-2 mb-2">
                      <div className="flex items-center text-sm text-purple-700">
                        <FiClock className="mr-2 text-purple-400" />
                        <span className="font-bold">วันเวลายืม:</span>
                        <span className="ml-2 font-semibold text-gray-800">
                          {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="mx-1">เวลา</span>
                        <span className="font-semibold text-gray-800">
                          {('0' + new Date().getHours()).slice(-2)}:{('0' + new Date().getMinutes()).slice(-2)} น.
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        วันที่คืน <span className="text-red-500">*</span>
                        <span className="text-gray-500 text-xs ml-1">(สูงสุด {maxBorrowDays} วัน)</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative w-1/2">
                          <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                          <input
                            type="date"
                            value={requestDetails.expected_return_date}
                            onChange={(e) => setRequestDetails({...requestDetails, expected_return_date: e.target.value})}
                            min={getTodayString()}
                            max={(() => {
                              const today = new Date();
                              today.setDate(today.getDate() + maxBorrowDays);
                              return today.toISOString().split('T')[0];
                            })()}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div className="relative w-1/2">
                          <FiClock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                          <input
                            type="time"
                            value={requestDetails.expected_return_time}
                            onChange={(e) => setRequestDetails({...requestDetails, expected_return_time: e.target.value})}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            step="60"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* แสดงสรุปเวลา */}
                  {/* เงื่อนไขใหม่: แสดงเฉพาะเมื่อ user เลือกวัน หรือ เลือกเวลา(ที่ไม่ใช่ default) */}
                  {(
                    (requestDetails.expected_return_date && requestDetails.expected_return_time) ||
                    (!requestDetails.expected_return_date && requestDetails.expected_return_time && requestDetails.expected_return_time !== '17:00')
                  ) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center text-sm">
                        <FiClock className="text-blue-600 mr-2" />
                        <span className="text-gray-700">
                          {requestDetails.expected_return_date
                            ? (<>
                                ต้องคืนภายใน: <strong className="text-blue-700">
                                  {new Date(`${requestDetails.expected_return_date}T${requestDetails.expected_return_time || '17:00'}`).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} น.
                                </strong>
                              </>)
                            : (<>
                                <span className="text-orange-700 font-semibold">คุณเลือกเปลี่ยนเวลาเป็น {requestDetails.expected_return_time} น.</span>
                                <span className="text-gray-500 ml-2">(วันคืนเป็นวันเดิมตามฟอร์ม)</span>
                              </>)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        💡 ค่าปรับคิดเป็นชั่วโมง (หากคืนล่าช้า)
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      สถานที่ใช้งาน <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={requestDetails.location}
                      onChange={(e) => setRequestDetails({ ...requestDetails, location: e.target.value, custom_location: '' })}
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">เลือกสถานที่</option>
                      <option value="ห้องประชุม">ห้องประชุม</option>
                      <option value="ห้องเรียน">ห้องเรียน</option>
                      <option value="ห้อง Lab">ห้อง Lab</option>
                      <option value="นอกสถานที่">นอกสถานที่</option>
                    </select>
                    {requestDetails.location === 'นอกสถานที่' && (
                      <input
                        type="text"
                        value={requestDetails.custom_location || ''}
                        onChange={e => setRequestDetails({ ...requestDetails, custom_location: e.target.value })}
                        className="mt-2 w-full p-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="กรุณาระบุสถานที่นอกสถานที่"
                        required
                      />
                    )}
                  </div>

                  <button
                    onClick={submitBorrowRequest}
                    disabled={loading || !requestDetails.purpose || !requestDetails.expected_return_date || !requestDetails.location}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
                        กำลังส่ง...
                      </>
                    ) : (
                      <>
                        <FiSend className="w-3.5 h-3.5 mr-2" />
                        ส่งคำขอ
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Requests */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiClock className="mr-2" />
                  คำขอยืมของฉัน
                </h3>
                {borrowRequests.length > 3 && !showAllRequests && (
                  <button
                    onClick={() => setShowAllRequests(true)}
                    className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center"
                  >
                    ดูทั้งหมด ({borrowRequests.length})
                    <FiChevronRight className="ml-1 w-4 h-4" />
                  </button>
                )}
                {showAllRequests && borrowRequests.length > 3 && (
                  <button
                    onClick={() => setShowAllRequests(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ย่อลง
                  </button>
                )}
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {borrowRequests.length === 0 ? (
                <div className="text-center py-6">
                  <FiClock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">ยังไม่มีคำขอ</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(showAllRequests ? borrowRequests : borrowRequests.slice(0, 3)).map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-medium text-gray-900 text-xs truncate flex-1">{request.equipment_name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ml-2 ${
                          request.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          request.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          request.status === 'Borrowed' ? 'bg-blue-100 text-blue-700' :
                          (request.status === 'Returned' || request.status === 'Completed' || request.is_returned === 1) ? 'bg-gray-100 text-gray-700' :
                          request.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {request.status === 'Pending' ? 'รออนุมัติ' :
                           request.status === 'Approved' ? 'อนุมัติ' :
                           request.status === 'Borrowed' ? 'ยืมอยู่' :
                           (request.status === 'Returned' || request.status === 'Completed' || request.is_returned === 1) ? 'คืนแล้ว' :
                           request.status === 'Cancelled' ? 'ยกเลิก' : request.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>📅 {new Date(request.request_date || request.borrow_date || request.created_at).toLocaleString('th-TH', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} → {new Date(request.expected_return_date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short', 
                          day: 'numeric'
                        })}</p>
                        <p>📦 {request.quantity || request.quantity_borrowed} ชิ้น | 📝 {request.purpose}</p>
                        {request.location && <p>📍 {request.location}</p>}
                      </div>
                      
                      {request.status === 'Pending' && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                          >
                            ❌ ยกเลิก
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Equipment Items Modal */}
        {showItemsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiPackage className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedEquipmentForItems?.equipment_name}
                  </h3>
                  <p className="text-blue-100 text-xs">
                    รุ่น: {selectedEquipmentForItems?.model} | {selectedEquipmentForItems?.credit} เครดิต/ชิ้น
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowItemsModal(false);
                  setSelectedEquipmentForItems(null);
                  setEquipmentItems([]);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingItems ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
              ) : equipmentItems.length === 0 ? (
                <div className="py-12 text-center">
                  <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">ไม่มีอุปกรณ์ที่พร้อมให้ยืม</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-600">
                      พบ <span className="font-semibold text-blue-600">{equipmentItems.length}</span> รายการที่พร้อมให้ยืม
                    </p>
                  </div>

                  {equipmentItems.map((item) => {
                    const isSelected = selectedItems.some(selected => selected.item_id === item.item_id);
                    const statusInfo = translateStatus(item.status);
                    
                    return (
                      <div
                        key={item.item_id}
                        className={`border rounded-lg p-3 transition-all ${
                          isSelected 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 mb-1.5 flex-wrap">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold flex items-center">
                                <FiHash className="w-3 h-3 mr-0.5" />
                                {item.serial_number || item.item_id}
                              </span>
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                {statusInfo.text}
                              </span>
                              {isSelected && (
                                <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs font-medium">
                                  ✓ เลือกแล้ว
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              {item.item_code && (
                                <div className="truncate">
                                  <span className="text-gray-500">รหัส:</span>{' '}
                                  <span className="font-medium">{item.item_code}</span>
                                </div>
                              )}
                              {item.location && (
                                <div className="truncate">
                                  <span className="text-gray-500">📍</span>{' '}
                                  <span className="font-medium">{item.location}</span>
                                </div>
                              )}
                              {item.purchase_date && (
                                <div className="truncate">
                                  <span className="text-gray-500">📅</span>{' '}
                                  <span className="font-medium">
                                    {new Date(item.purchase_date).toLocaleDateString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {item.notes && (
                              <div className="mt-1.5 text-xs text-gray-600 truncate">
                                <span className="text-gray-500">📝 หมายเหตุ:</span>{' '}
                                <span>{item.notes}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-2 flex-shrink-0">
                            <button
                              onClick={() => addItemToCart(item)}
                              disabled={isSelected}
                              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                                isSelected
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                              }`}
                            >
                              {isSelected ? '✓' : 'เลือก'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-200 flex justify-between items-center">
              <div className="text-xs text-gray-600">
                เลือกแล้ว {selectedItems.filter(item => 
                  item.equipment_id === selectedEquipmentForItems?.equipment_id
                ).length} รายการ
              </div>
              <button
                onClick={() => {
                  setShowItemsModal(false);
                  setSelectedEquipmentForItems(null);
                  setEquipmentItems([]);
                }}
                className="px-4 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default BorrowEquipment;
