import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiEdit, FiTrash2, FiSearch, FiFilter, FiPlus, FiCheck, FiX, FiPackage, 
  FiRefreshCw, FiDownload, FiSettings, FiTag, FiStar, FiAlertCircle,
  FiTool, FiCpu, FiPlusCircle, FiMonitor, FiPrinter, FiCamera, FiHeadphones,
  FiMic, FiSpeaker, FiWifi, FiHardDrive, FiBook, FiClipboard, FiLayers,
  FiGrid, FiBox, FiShoppingCart, FiTrendingUp, FiActivity, FiEye, FiList
} from 'react-icons/fi';
import { equipmentTypeAPI, equipmentAPI } from '../../api/api';

const AddCategory = () => {
  const [categoryName, setCategoryName] = useState('');
  const [usageType, setUsageType] = useState('Loan');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsageType, setEditUsageType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUsageType, setFilterUsageType] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // States สำหรับ Confirmation Modals
  const [showAddConfirmModal, setShowAddConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [pendingAddData, setPendingAddData] = useState(null);
  const [pendingDeleteData, setPendingDeleteData] = useState(null);
  
  // States สำหรับจัดการอุปกรณ์
  const [equipments, setEquipments] = useState([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [equipmentCounts, setEquipmentCounts] = useState({});

  // โหลดหมวดหมู่ทั้งหมดเมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    fetchCategories();
    fetchAllEquipments();
  }, []);

  // ดึงข้อมูลอุปกรณ์ทั้งหมดเพื่อนับจำนวน
  const fetchAllEquipments = async () => {
    try {
      const response = await equipmentAPI.getAll();
      if (response && response.success && Array.isArray(response.data)) {
        setEquipments(response.data);
        
        // นับจำนวนอุปกรณ์ในแต่ละหมวดหมู่
        const counts = {};
        response.data.forEach(equipment => {
          const typeId = equipment.type_id;
          counts[typeId] = (counts[typeId] || 0) + 1;
        });
        setEquipmentCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching equipments:', error);
    }
  };

  // ดึงข้อมูลหมวดหมู่ทั้งหมด
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await equipmentTypeAPI.getAll();
      
      if (response && response.success && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        console.warn('Invalid categories response:', response);
        setCategories([]);
        toast.error('ไม่สามารถดึงข้อมูลประเภทอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  // เพิ่มหมวดหมู่ใหม่ - แสดง Modal ยืนยันก่อน
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      toast.error('กรุณากรอกชื่อประเภทอุปกรณ์');
      return;
    }
    
    // ตรวจสอบชื่อซ้ำก่อนส่งไป backend
    const existingCategory = categories.find(
      cat => cat.type_name.toLowerCase() === categoryName.trim().toLowerCase()
    );
    
    if (existingCategory) {
      const usageTypeText = existingCategory.usage_type === 'Loan' ? 'ยืม-คืน' : 'เบิกจ่าย';
      toast.error(`ชื่อประเภท "${categoryName.trim()}" มีอยู่แล้วในประเภท${usageTypeText}`);
      return;
    }
    
    // เก็บข้อมูลที่จะเพิ่มและแสดง Modal ยืนยัน
    setPendingAddData({
      type_name: categoryName.trim(),
      usage_type: usageType
    });
    setShowAddConfirmModal(true);
  };

  // ฟังก์ชันเพิ่มจริงหลังยืนยัน
  const confirmAdd = async () => {
    try {
      setLoading(true);
      setShowAddConfirmModal(false);
      
      const response = await equipmentTypeAPI.create(pendingAddData);
      
      if (response && response.success) {
        toast.success('เพิ่มประเภทอุปกรณ์สำเร็จ');
        setCategoryName('');
        setUsageType('Loan');
        setPendingAddData(null);
        await fetchCategories();
      } else {
        toast.error(response?.message || 'ไม่สามารถเพิ่มประเภทอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มประเภทอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  // ยกเลิกการเพิ่ม
  const cancelAdd = () => {
    setShowAddConfirmModal(false);
    setPendingAddData(null);
  };

  // ลบประเภทอุปกรณ์ - แสดง Modal ยืนยันก่อน
  const handleDelete = (id, name) => {
    setPendingDeleteData({ id, name });
    setShowDeleteConfirmModal(true);
  };

  // ฟังก์ชันลบจริงหลังยืนยัน
  const confirmDelete = async () => {
    const deletingId = pendingDeleteData.id;
    const deletingName = pendingDeleteData.name;
    
    setShowDeleteConfirmModal(false);
    setPendingDeleteData(null);
    setLoading(true);
    
    try {
      const response = await equipmentTypeAPI.delete(deletingId);
      
      if (response.success) {
        await fetchCategories();
        toast.success(`ลบประเภทอุปกรณ์ "${deletingName}" สำเร็จ`);
      } else {
        toast.error(response.message || 'ไม่สามารถลบประเภทอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Unexpected error in confirmDelete:', error);
    } finally {
      setLoading(false);
    }
  };

  // ยกเลิกการลบ
  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setPendingDeleteData(null);
  };

  // เริ่มการแก้ไขประเภทอุปกรณ์
  const startEditing = (category) => {
    setEditingId(category.type_id);
    setEditName(category.type_name);
    setEditUsageType(category.usage_type || 'Loan');
  };

  // ยกเลิกการแก้ไข
  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditUsageType('');
  };

  // บันทึกการแก้ไขประเภทอุปกรณ์
  const handleUpdate = async (id) => {
    if (!editName.trim()) {
      toast.error('กรุณากรอกชื่อประเภทอุปกรณ์');
      return;
    }
    
    try {
      setLoading(true);
      // ส่งเฉพาะชื่อ ไม่ส่ง usage_type เพราะไม่อนุญาตให้เปลี่ยน
      const response = await equipmentTypeAPI.update(id, editName);
      
      toast.success('อัปเดตประเภทอุปกรณ์สำเร็จ');
      cancelEditing();
      await fetchCategories(); // รอให้ fetch เสร็จก่อน
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.message || error.message || 'ไม่สามารถอัปเดตประเภทอุปกรณ์ได้');
    } finally {
      setLoading(false);
    }
  };

  // กรองประเภทตามคำค้นหาและประเภทการใช้งาน
  const filteredCategories = Array.isArray(categories) ? categories.filter(category => {
    const matchesSearch = category.type_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUsageType = filterUsageType === 'all' || category.usage_type === filterUsageType;
    
    return matchesSearch && matchesUsageType;
  }) : [];

  // Pagination logic
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUsageType]);

  // แปลงค่า usage_type เป็นภาษาไทย
  const getUsageTypeText = (type) => {
    return type === 'Loan' ? 'ยืม-คืน' : 'เบิกจ่าย';
  };

  // เปิด Modal แสดงรายการอุปกรณ์ในหมวดหมู่
  const handleViewEquipments = (category) => {
    setSelectedCategory(category);
    setShowEquipmentModal(true);
  };

  // ปิด Modal
  const handleCloseEquipmentModal = () => {
    setShowEquipmentModal(false);
    setSelectedCategory(null);
  };

  // กรองอุปกรณ์ตามหมวดหมู่
  const getEquipmentsByCategory = (typeId) => {
    return equipments.filter(equipment => equipment.type_id === typeId);
  };

  // ฟังก์ชันเลือกไอคอนตามชื่อประเภท
  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    
    // คอมพิวเตอร์และอุปกรณ์
    if (name.includes('คอมพิวเตอร์') || name.includes('computer') || name.includes('pc')) {
      return FiMonitor;
    }
    if (name.includes('cpu') || name.includes('ซีพียู') || name.includes('โปรเซสเซอร์')) {
      return FiCpu;
    }
    if (name.includes('ฮาร์ดดิสก์') || name.includes('hard') || name.includes('ssd') || name.includes('storage')) {
      return FiHardDrive;
    }
    
    // อุปกรณ์สำนักงาน
    if (name.includes('ปริ้นเตอร์') || name.includes('printer') || name.includes('เครื่องพิมพ์')) {
      return FiPrinter;
    }
    if (name.includes('เอกสาร') || name.includes('document') || name.includes('กระดาษ')) {
      return FiClipboard;
    }
    if (name.includes('หนังสือ') || name.includes('book') || name.includes('ตำรา')) {
      return FiBook;
    }
    
    // อุปกรณ์เสียงและภาพ
    if (name.includes('กล้อง') || name.includes('camera')) {
      return FiCamera;
    }
    if (name.includes('หูฟัง') || name.includes('headphone') || name.includes('earphone')) {
      return FiHeadphones;
    }
    if (name.includes('ไมค์') || name.includes('mic') || name.includes('microphone')) {
      return FiMic;
    }
    if (name.includes('ลำโพง') || name.includes('speaker')) {
      return FiSpeaker;
    }
    
    // อุปกรณ์เครือข่าย
    if (name.includes('wifi') || name.includes('router') || name.includes('switch') || name.includes('network')) {
      return FiWifi;
    }
    
    // เครื่องมือและอุปกรณ์
    if (name.includes('เครื่องมือ') || name.includes('tool') || name.includes('อุปกรณ์ซ่อม')) {
      return FiTool;
    }
    if (name.includes('อุปกรณ์กีฬา') || name.includes('sport')) {
      return FiActivity;
    }
    
    // หมวดหมู่ทั่วไป
    if (name.includes('อุปกรณ์') || name.includes('equipment')) {
      return FiPackage;
    }
    if (name.includes('อะไหล่') || name.includes('spare')) {
      return FiLayers;
    }
    if (name.includes('สินค้า') || name.includes('product')) {
      return FiShoppingCart;
    }
    
    // ค่าเริ่มต้น
    return FiTag;
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="pb-6">
        {/* ส่วนหัวที่ปรับปรุงใหม่ */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-purple-700 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                <FiTag className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Category Management</h1>
                <p className="text-purple-100 mt-1 font-medium">จัดการประเภทอุปกรณ์ระดับมืออาชีพ</p>
                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                    <FiStar className="inline w-4 h-4 mr-1 text-yellow-300" />
                    <span className="text-white font-semibold">Senior Level System</span>
                  </span>
                  <span className="text-purple-100 font-medium">
                    Total: <span className="text-white font-bold">{categories.length}</span> ประเภท
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              <button
                onClick={() => { setIsRefreshing(true); fetchCategories(); setTimeout(() => setIsRefreshing(false), 1000); }}
                className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                disabled={isRefreshing}
              >
                <FiRefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30">
                <FiDownload className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* แบบฟอร์มเพิ่มประเภทอุปกรณ์ที่ปรับปรุงใหม่ */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-xl">
                <FiPlusCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">➕ เพิ่มประเภทอุปกรณ์ใหม่</h2>
                <p className="text-gray-600 text-sm">สร้างประเภทอุปกรณ์เข้าสู่ระบบ</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ชื่อประเภทอุปกรณ์ */}
                <div>
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อประเภทอุปกรณ์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    placeholder="กรอกชื่อประเภทอุปกรณ์"
                    required
                  />
                </div>

                {/* ประเภทการใช้งาน */}
                <div>
                  <label htmlFor="usageType" className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทการใช้งาน <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="usageType"
                    value={usageType}
                    onChange={(e) => setUsageType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    required
                  >
                    <option value="Loan">🔄 ยืม-คืน</option>
                    <option value="Disbursement">📤 เบิกจ่าย</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 flex items-center transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังเพิ่ม...
                    </>
                  ) : (
                    <>
                      <FiPlusCircle className="mr-2" /> 
                      เพิ่มประเภทอุปกรณ์
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* รายการประเภทอุปกรณ์ที่ปรับปรุงใหม่ */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <FiTag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">📊 รายการประเภทอุปกรณ์ทั้งหมด</h2>
                  <p className="text-gray-600 text-sm">จัดการและติดตามประเภทอุปกรณ์ในระบบ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search และ Filter Section - ย้ายมาไว้ในตาราง */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 ค้นหาประเภทอุปกรณ์
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อประเภทอุปกรณ์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
              
              {/* Usage Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏷️ กรองตามประเภทการใช้งาน
                </label>
                <select
                  value={filterUsageType}
                  onChange={(e) => setFilterUsageType(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="all">🔄 ทุกประเภท</option>
                  <option value="Loan">🔄 ยืม-คืน</option>
                  <option value="Disbursement">📤 เบิกจ่าย</option>
                </select>
              </div>
            </div>
            
            {/* แสดงผลการค้นหา */}
            {(searchTerm || filterUsageType !== 'all') && (
              <div className="mt-4 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
                <span className="text-sm text-purple-700">
                  <FiFilter className="inline w-4 h-4 mr-1" />
                  พบ <span className="font-bold">{filteredCategories.length}</span> รายการ
                  {searchTerm && ` จากการค้นหา "${searchTerm}"`}
                  {filterUsageType !== 'all' && ` ประเภท: ${filterUsageType === 'Loan' ? 'ยืม-คืน' : 'เบิกจ่าย'}`}
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterUsageType('all');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center"
                >
                  <FiX className="w-4 h-4 mr-1" />
                  ล้างตัวกรอง
                </button>
              </div>
            )}
          </div>

          <div className="p-8">
            
            {loading && !editingId ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-10 text-center">
                <FiTag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">ยังไม่มีข้อมูลประเภทอุปกรณ์ในระบบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        🏷️ ชื่อประเภท
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        📝 ประเภทการใช้งาน
                      </th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        📦 จำนวนอุปกรณ์
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ⚙️ จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {currentItems.map((category) => (
                      <tr key={category.type_id} 
                          className={`hover:bg-gray-50 transition-colors duration-200 ${
                            editingId === category.type_id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                          }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === category.type_id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="ชื่อประเภทอุปกรณ์"
                            />
                          ) : (
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                  {React.createElement(getCategoryIcon(category.type_name), {
                                    className: "h-5 w-5 text-purple-600"
                                  })}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{category.type_name}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === category.type_id ? (
                            <div className="relative">
                              <select
                                value={editUsageType}
                                disabled={true}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-500"
                                title="ไม่สามารถเปลี่ยนประเภทการใช้งานได้หลังจากสร้างแล้ว"
                              >
                                <option value="Loan">ยืม-คืน</option>
                                <option value="Disbursement">เบิกจ่าย</option>
                              </select>
                              <div className="mt-1 text-xs text-gray-500 flex items-center">
                                <FiAlertCircle className="w-3 h-3 mr-1" />
                                ไม่สามารถเปลี่ยนได้
                              </div>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              category.usage_type === 'Loan' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {category.usage_type === 'Loan' ? '🔄' : '📤'} {getUsageTypeText(category.usage_type)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700">
                              {equipmentCounts[category.type_id] || 0} ชิ้น
                            </span>
                            {(equipmentCounts[category.type_id] || 0) > 0 && (
                              <button
                                onClick={() => handleViewEquipments(category)}
                                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all duration-300"
                                title="ดูรายการอุปกรณ์"
                              >
                                <FiEye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {editingId === category.type_id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUpdate(category.type_id)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-all duration-300"
                                disabled={loading}
                                title="บันทึก"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-300"
                                title="ยกเลิก"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEditing(category)}
                                disabled={editingId !== null}
                                className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="แก้ไข"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(category.type_id, category.type_name)}
                                disabled={editingId !== null}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="ลบ"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredCategories.length > 0 && totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  แสดง {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCategories.length)} จาก {filteredCategories.length} รายการ
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ก่อนหน้า
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // แสดงเฉพาะหน้าใกล้เคียง
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                              currentPage === pageNumber
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return <span key={pageNumber} className="px-2 text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal ยืนยันการเพิ่มประเภทอุปกรณ์ */}
      {showAddConfirmModal && pendingAddData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-4">
                <FiAlertCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการเพิ่มประเภทอุปกรณ์</h3>
              <p className="text-gray-600">คุณต้องการเพิ่มประเภทอุปกรณ์ใหม่ใช่หรือไม่?</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">ชื่อประเภท:</span>
                  <span className="text-gray-900 font-semibold">{pendingAddData.type_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">ประเภทการใช้งาน:</span>
                  <span className={`font-semibold ${
                    pendingAddData.usage_type === 'Loan' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {pendingAddData.usage_type === 'Loan' ? '🔄 ยืม-คืน' : '📤 เบิกจ่าย'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelAdd}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmAdd}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังเพิ่ม...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" />
                    ยืนยัน
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบประเภทอุปกรณ์ */}
      {showDeleteConfirmModal && pendingDeleteData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <FiTrash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบประเภทอุปกรณ์</h3>
              <p className="text-gray-600">คุณแน่ใจหรือไม่ว่าต้องการลบประเภทอุปกรณ์นี้?</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center mb-2">
                <FiAlertCircle className="text-red-600 mr-2" />
                <span className="text-red-800 font-medium">คำเตือน</span>
              </div>
              <p className="text-red-700 text-sm mb-3">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ชื่อประเภท:</span>
                  <span className="text-gray-900 font-bold">{pendingDeleteData.name}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="mr-2" />
                    ยืนยันการลบ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แสดงรายการอุปกรณ์ในหมวดหมู่ */}
      {showEquipmentModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FiList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">รายการอุปกรณ์</h3>
                    <p className="text-purple-100 text-sm">หมวดหมู่: {selectedCategory.type_name}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEquipmentModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {(() => {
                const categoryEquipments = getEquipmentsByCategory(selectedCategory.type_id);
                
                if (categoryEquipments.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">ไม่มีอุปกรณ์ในหมวดหมู่นี้</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <FiPackage className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">จำนวนอุปกรณ์ทั้งหมด</p>
                            <p className="text-2xl font-bold text-purple-700">{categoryEquipments.length} ชิ้น</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                          selectedCategory.usage_type === 'Loan' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedCategory.usage_type === 'Loan' ? '🔄 ยืม-คืน' : '📤 เบิกจ่าย'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryEquipments.map((equipment) => (
                        <div
                          key={equipment.equipment_id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-purple-300"
                        >
                          <div className="flex items-start space-x-4">
                            {equipment.image_url ? (
                              <img
                                src={`http://localhost:5000${equipment.image_url}`}
                                alt={equipment.equipment_name}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%239ca3af"%3E📦%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                                <FiPackage className="w-10 h-10 text-purple-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate mb-1">
                                {equipment.equipment_name}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                รหัส: <span className="font-mono text-purple-600">{equipment.model}</span>
                              </p>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`px-2 py-1 rounded-full font-medium ${
                                  equipment.quantity > 10 ? 'bg-green-100 text-green-700' :
                                  equipment.quantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  คงเหลือ: {equipment.quantity}
                                </span>
                                <span className="text-purple-600 font-bold">
                                  {equipment.credit} เครดิต
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleCloseEquipmentModal}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced CSS Animation สำหรับ Notification และ Effects */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
        
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .notification-animation {
          animation: fadeIn 0.3s ease-out forwards, fadeOut 0.3s ease-in forwards 4.7s;
        }
        
        .slide-in-up {
          animation: slideInUp 0.4s ease-out forwards;
        }
        
        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .loading-pulse {
          animation: pulse 2s infinite;
        }
        
        .glass-effect {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .button-3d {
          transition: all 0.2s ease;
          transform: translateY(0);
        }
        
        .button-3d:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .button-3d:active {
          transform: translateY(0);
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}; 

export default AddCategory;