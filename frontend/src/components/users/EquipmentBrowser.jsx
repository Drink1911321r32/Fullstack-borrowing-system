import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiFilter, FiPackage, FiTag, FiRefreshCw, FiEye, 
  FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiStar,
  FiGrid, FiList, FiMapPin, FiCreditCard, FiShoppingBag, FiRepeat
} from 'react-icons/fi';
import { equipmentAPI, equipmentTypeAPI } from '../../api/api';

const EquipmentBrowser = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [usageTypeFilter, setUsageTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('equipment_name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchEquipment();
    fetchEquipmentTypes();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await equipmentAPI.getAll();
      
      if (response && response.success && Array.isArray(response.data)) {
        setEquipment(response.data);
      } else if (Array.isArray(response)) {
        setEquipment(response);
      } else {
        setEquipment([]);
      }
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
      } else {
        setEquipmentTypes([]);
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
      setEquipmentTypes([]);
    }
  };

  // ฟังก์ชันกรองและเรียงข้อมูล
  const getFilteredAndSortedEquipment = () => {
    let filtered = equipment.filter(item => {
      // กรองอุปกรณ์ที่สูญหายทั้งหมดออก (ไม่แสดงให้ user)
      const allItemsLost = item.usage_type === 'Loan' && 
                           item.actual_quantity > 0 && 
                           item.quantity_lost > 0 && 
                           item.quantity_lost === item.actual_quantity;
      
      if (allItemsLost) {
        return false; // ไม่แสดงอุปกรณ์ที่สูญหายหมดทุกชิ้น
      }

      // ค้นหาตามชื่อ, รุ่น, ประเภท
      const matchesSearch = searchTerm === '' || 
        item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // กรองตามสถานะ (status จาก equipment table ไม่ได้มี 'Lost')
      // สำหรับ Lost ให้ตรวจสอบว่ามี quantity_lost > 0
      let matchesStatus = true;
      if (statusFilter === 'Lost') {
        matchesStatus = item.quantity_lost > 0;
      } else if (statusFilter !== 'all') {
        matchesStatus = item.status === statusFilter;
      }
      
      // กรองตามประเภทอุปกรณ์
      const matchesType = typeFilter === 'all' || item.type_id?.toString() === typeFilter;
      
      // กรองตามประเภทการใช้งาน (ยืม-คืน หรือ เบิก-จ่าย)
      let matchesUsageType = true;
      if (usageTypeFilter !== 'all') {
        const equipmentType = equipmentTypes.find(type => type.type_id === item.type_id);
        matchesUsageType = equipmentType?.usage_type === usageTypeFilter;
      }

      return matchesSearch && matchesStatus && matchesType && matchesUsageType;
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

  // Pagination
  const filteredEquipment = getFilteredAndSortedEquipment();
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEquipment = filteredEquipment.slice(startIndex, startIndex + itemsPerPage);

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

  // ดูรายละเอียดอุปกรณ์
  const viewEquipmentDetails = (item) => {
    setSelectedEquipment(item);
    setIsModalOpen(true);
  };

  // นำทางไปหน้ายืมคืน พร้อมส่งข้อมูลอุปกรณ์
  const goToBorrow = (equipment) => {
    navigate('/user/borrow', { state: { selectedEquipment: equipment } });
  };

  // นำทางไปหน้าเบิกจ่าย พร้อมส่งข้อมูลอุปกรณ์
  const goToDisbursement = (equipment) => {
    navigate('/user/disbursement', { state: { selectedEquipment: equipment } });
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiPackage className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Equipment Browser</h1>
                  <p className="text-blue-100 mt-1 font-medium">เรียกดูอุปกรณ์ในระบบ</p>
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
                {/* ปุ่มไปหน้ายืมคืน */}
                <button
                  onClick={goToBorrow}
                  className="bg-green-500 hover:bg-green-600 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center space-x-2"
                >
                  <FiRepeat className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">ยืม-คืน</span>
                </button>
                
                {/* ปุ่มไปหน้าเบิกจ่าย */}
                <button
                  onClick={goToDisbursement}
                  className="bg-purple-500 hover:bg-purple-600 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center space-x-2"
                >
                  <FiShoppingBag className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">เบิก-จ่าย</span>
                </button>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ, รุ่น, หรือประเภทอุปกรณ์..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
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
                    <option value="Reserved">⏳ ถูกจอง</option>
                    <option value="Repairing">🔧 ซ่อมบำรุง</option>
                    <option value="Damaged">❌ ชำรุด</option>
                    <option value="Lost">🔍 สูญหาย</option>
                  </select>
                </div>
                
                {/* Usage Type Filter */}
                <div>
                  <select
                    value={usageTypeFilter}
                    onChange={(e) => setUsageTypeFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">📦 ทุกประเภทการใช้งาน</option>
                    <option value="Loan">🔄 ยืม-คืน</option>
                    <option value="Disbursement">📤 เบิก-จ่าย</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Filter */}
                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">🏷️ ทุกประเภทอุปกรณ์</option>
                    {equipmentTypes.map(type => (
                      <option key={type.type_id} value={type.type_id}>
                        {type.usage_type === 'Loan' ? '🔄' : '📤'} {type.type_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="equipment_name">เรียงตามชื่อ</option>
                    <option value="credit">เรียงตามเครดิต</option>
                    <option value="status">เรียงตามสถานะ</option>
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
                  <p className="text-gray-600 text-sm">อุปกรณ์ทั้งหมดในระบบ</p>
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
                             onClick={() => viewEquipmentDetails(item)}>
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
                            
                            {/* Type Badge with Usage Type */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center">
                                <FiTag className="w-4 h-4 text-gray-400 mr-1" />
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  equipmentType?.usage_type === 'Loan' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {equipmentType?.type_name}
                                </span>
                              </div>
                              {/* Usage Type Badge */}
                              {equipmentType?.usage_type && (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  equipmentType.usage_type === 'Loan' 
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                                }`}>
                                  {equipmentType.usage_type === 'Loan' ? (
                                    <span className="flex items-center gap-1">
                                      <FiRepeat className="w-3 h-3" />
                                      ยืม-คืน
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <FiShoppingBag className="w-3 h-3" />
                                      เบิก-จ่าย
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <StatusIcon className={`w-4 h-4 mr-2 text-${statusInfo.color}-500`} />
                                <span className={`text-sm font-medium text-${statusInfo.color}-600`}>
                                  {statusInfo.text}
                                </span>
                              </div>
                              <button className="text-blue-500 hover:text-blue-700 transition-colors">
                                <FiEye className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Credit & Quantity */}
                            <div className="flex justify-between text-sm text-gray-600">
                              <span className="flex items-center">
                                <FiCreditCard className="w-4 h-4 mr-1" />
                                <span className="font-medium text-indigo-600">{item.credit}</span>
                              </span>
                              <span>จำนวน: <span className="font-medium">{item.actual_quantity || 0}</span></span>
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
                      const equipmentType = equipmentTypes.find(type => type.type_id === item.type_id);
                      
                      return (
                        <div key={item.equipment_id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                             onClick={() => viewEquipmentDetails(item)}>
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

                              <div className="flex flex-col gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                  equipmentType?.usage_type === 'Loan' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  <FiTag className="w-3 h-3 mr-1" />
                                  {equipmentType?.type_name}
                                </span>
                                {/* Usage Type Badge */}
                                {equipmentType?.usage_type && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                    equipmentType.usage_type === 'Loan' 
                                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                                  }`}>
                                    {equipmentType.usage_type === 'Loan' ? (
                                      <>
                                        <FiRepeat className="w-3 h-3 mr-1" />
                                        ยืม-คืน
                                      </>
                                    ) : (
                                      <>
                                        <FiShoppingBag className="w-3 h-3 mr-1" />
                                        เบิก-จ่าย
                                      </>
                                    )}
                                  </span>
                                )}
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
                                  <span>จำนวน: <span className="font-medium">{item.actual_quantity || 0}</span></span>
                                </div>
                                <button className="text-blue-500 hover:text-blue-700 transition-colors">
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
      </div>

      {/* Equipment Detail Modal */}
      {isModalOpen && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">รายละเอียดอุปกรณ์</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
                >
                  <FiXCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image */}
                <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
                  {selectedEquipment.image_path ? (
                    <img 
                      src={`${API_URL}${selectedEquipment.image_path}`}
                      alt={selectedEquipment.equipment_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiPackage className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedEquipment.equipment_name}</h4>
                    <p className="text-lg text-gray-600">รุ่น: {selectedEquipment.model}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500 block mb-1">ประเภท:</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          equipmentTypes.find(type => type.type_id === selectedEquipment.type_id)?.usage_type === 'Loan' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          <FiTag className="w-4 h-4 mr-2" />
                          {selectedEquipment.type_name}
                        </span>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-500 block mb-1">สถานะ:</span>
                        <div className="flex items-center">
                          {React.createElement(translateStatus(selectedEquipment.status).icon, {
                            className: `w-5 h-5 mr-2 text-${translateStatus(selectedEquipment.status).color}-500`
                          })}
                          <span className={`text-lg font-medium text-${translateStatus(selectedEquipment.status).color}-600`}>
                            {translateStatus(selectedEquipment.status).text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500 block mb-1">เครดิต:</span>
                        <div className="flex items-center">
                          <FiCreditCard className="w-5 h-5 mr-2 text-indigo-500" />
                          <span className="text-2xl font-bold text-indigo-600">{selectedEquipment.credit}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-500 block mb-1">จำนวน:</span>
                        <span className="text-xl font-medium text-gray-900">{selectedEquipment.actual_quantity || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500 block mb-1">รหัสอุปกรณ์:</span>
                    <span className="text-lg font-mono text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                      {selectedEquipment.equipment_id}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-6 border-t border-gray-200">
                    {selectedEquipment.status === 'Available' && (
                      <>
                        {equipmentTypes.find(type => type.type_id === selectedEquipment.type_id)?.usage_type === 'Loan' ? (
                          <button 
                            onClick={() => goToBorrow(selectedEquipment)}
                            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                          >
                            <FiClock className="w-5 h-5 mr-2" />
                            ขอยืมอุปกรณ์
                          </button>
                        ) : (
                          <button 
                            onClick={() => goToDisbursement(selectedEquipment)}
                            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-all duration-300 flex items-center justify-center"
                          >
                            <FiPackage className="w-5 h-5 mr-2" />
                            ขอเบิกอุปกรณ์
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentBrowser;