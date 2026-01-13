import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
// เพิ่มการ import ไอคอนที่ใช้ทั้งหมด
import { FiSearch, FiFilter, FiPlus, FiMinus, FiCalendar, FiInfo, FiX, FiCheckCircle } from 'react-icons/fi';
import { API_URL } from '../../api/api';
import { getTodayString } from '../../utils';
import { STORAGE_KEYS } from '../../constants';

const UserRequisition = () => {
  const navigate = useNavigate();
  // ตัวแปรที่ต้องมีสำหรับการใช้งาน
  const [materials, setMaterials] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // เพิ่มตัวแปรสำหรับการกรองประเภท
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayString(), // กำหนดค่าเริ่มต้นเป็นวันที่ปัจจุบัน
    department: '',
    purpose: ''
  });
  const [errors, setErrors] = useState({});
  const [userData, setUserData] = useState(null);

  // รายการหมวดหมู่วัสดุ
  const categories = [
    { id: 'all', name: 'ทั้งหมด' },
    { id: 'stationery', name: 'เครื่องเขียน' },
    { id: 'paper', name: 'กระดาษ' },
    { id: 'ink', name: 'หมึกพิมพ์' },
    { id: 'cleaning', name: 'อุปกรณ์ทำความสะอาด' },
    { id: 'other', name: 'อื่นๆ' }
  ];

  // รายการแผนก
  const departments = [
    'แผนกบุคคล',
    'แผนกการเงิน',
    'แผนกการตลาด',
    'แผนกไอที',
    'แผนกผลิต',
    'แผนกขาย',
    'อื่นๆ'
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
      await fetchMaterialTypes().catch(error => { // เปลี่ยนจาก fetchEquipmentTypes เป็น fetchMaterialTypes
        console.error("Error fetching material types:", error);
        toast.error('ไม่สามารถดึงข้อมูลประเภทวัสดุได้ กำลังใช้ข้อมูลที่มีอยู่');
      });
      
      // ดึงข้อมูลอุปกรณ์ต่อจากนั้น
      await fetchMaterials().catch(error => { // เปลี่ยนจาก fetchEquipment เป็น fetchMaterials
        console.error("Error fetching materials:", error);
        toast.error('เกิดปัญหาในการโหลดข้อมูลวัสดุ');
      });
      
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      // ต้องแน่ใจว่า isLoading ถูกตั้งเป็น false ไม่ว่าจะเกิดอะไรขึ้น
      setIsLoading(false);
    }
  };

  // ดึงข้อมูลประเภทวัสดุจาก API
  const fetchMaterialTypes = async () => {
    try {
      // เรียกใช้ API เฉพาะประเภทอุปกรณ์ที่เป็นเบิกจ่าย
      const response = await axios.get(`${API_URL}/api/equipmentTypes/usage/Disbursement`);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        setMaterialTypes(response.data);
        
        // ตั้งค่าตัวกรองเริ่มต้นเป็น 'all'
        setTypeFilter('all');
      } else {
        // ถ้าไม่มีข้อมูล ให้ลองใช้ API ทั่วไปแทน
        const fallbackResponse = await axios.get(`${API_URL}/api/equipmentTypes`);
        
        // กรองเฉพาะประเภทอุปกรณ์เบิกจ่าย หรือถ้าไม่มี usage_type ให้แสดงทั้งหมด
        const disbursementTypes = fallbackResponse.data.filter(type => 
          type.usage_type === 'Disbursement' || !type.usage_type
        );
        
        setMaterialTypes(disbursementTypes);
        
        // ตั้งค่าตัวกรองเริ่มต้นเป็น 'all'
        setTypeFilter('all');
      }
    } catch (error) {
      console.error('Error fetching material types:', error);
      
      // ถ้ามีข้อผิดพลาดให้ใช้ API ทั่วไปแทน
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/equipmentTypes`);
        
        setMaterialTypes(fallbackResponse.data);
        setTypeFilter('all');
      } catch (fallbackError) {
        console.error('Error fetching material types (fallback):', fallbackError);
        setMaterialTypes([]);
        toast.error('ไม่สามารถดึงข้อมูลประเภทวัสดุได้');
      }
    }
  };

  // ดึงข้อมูลวัสดุจาก API
  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      
      // เปลี่ยนเป็นเรียก API ที่กรองเฉพาะอุปกรณ์ประเภทเบิก-จ่าย
      const response = await axios.get(`${API_URL}/api/equipment/usage/Disbursement`, {
        timeout: 8000
      }).catch(async error => {
        // ถ้า API เฉพาะไม่สำเร็จ ให้ใช้ API ทั่วไปแล้วกรองเอง
        const fallbackResponse = await axios.get(`${API_URL}/api/equipment`);
        
        // ตรวจสอบว่าได้รับข้อมูลในรูปแบบที่ถูกต้อง
        if (Array.isArray(fallbackResponse.data)) {
          // กรองเฉพาะประเภทเบิก-จ่าย
          return {
            data: fallbackResponse.data.filter(item => {
              if (item.usage_type === 'Disbursement') return true;
              
              // กรณีที่ไม่มี usage_type แต่มี type_id ให้ตรวจสอบจาก materialTypes
              if (item.type_id && materialTypes.some(
                type => type.type_id === item.type_id && type.usage_type === 'Disbursement'
              )) return true;
              
              return false;
            })
          };
        }
        
        throw new Error("Fallback data is not valid");
      });
      
      // ถ้าไม่มีข้อมูล หรือไม่ใช่ array
      if (!response || !Array.isArray(response.data)) {
        console.warn('Response data is not an array:', response);
        setMaterials([]);
        return;
      }
      
      // แปลงข้อมูล
      const formattedMaterials = response.data.map(item => ({
        id: item.equipment_id,
        name: item.equipment_name,
        model: item.model || '',
        category: item.type_id,
        type_name: item.type_name || 'ไม่ระบุประเภท',
        available: parseInt(item.quantity_available) || 0,
        inStock: parseInt(item.quantity_available) || 0,
        unit: 'ชิ้น',
        image: item.image_path
          ? item.image_path.startsWith('http')
            ? item.image_path
            : `${API_URL}${item.image_path}`
          : 'https://placehold.co/100x100/e2e8f0/475569?text=No+Image',
        credit: parseFloat(item.credit) || 0,
        status: item.status || 'Available',
        usage_type: 'Disbursement'
      }));
      
      setMaterials(formattedMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      // กรณีล้มเหลวทั้งหมด ให้ตั้งค่าเป็น array ว่าง
      setMaterials([]);
      throw error; // โยน error ให้ fetchAllData จัดการต่อ
    } finally {
      setIsLoading(false);
    }
  };

  // ดึงข้อมูลผู้ใช้ - แก้ไขให้ใช้ localStorage แทนการเรียก API
  const fetchUser = async () => {
    try {
      // ดึงข้อมูลผู้ใช้จาก localStorage แทนการเรียก API
      const userDataStr = localStorage.getItem(STORAGE_KEYS.USER);
      if (!userDataStr) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ โปรดเข้าสู่ระบบใหม่');
      }
      
      const userData = JSON.parse(userDataStr);
      
      // เก็บข้อมูลผู้ใช้ใน state
      setUserData(userData);
      
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('ไม่สามารถดึงข้อมูลผู้ใช้ได้ โปรดเข้าสู่ระบบใหม่');
      return null;
    }
  };

  // กรองวัสดุตามประเภท
  const filteredMaterials = useMemo(() => {
    if (!materials || materials.length === 0) return [];
    
    // กรองตามคำค้นหา
    let filtered = materials;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // กรองตามประเภทจาก filterCategory (หมวดหมู่วัสดุ)
    if (filterCategory !== 'all') {
      // ในกรณีที่คุณมีการกำหนด category ID ที่ตรงกับ filterCategory
      // ตัวอย่างเช่น อุปกรณ์ที่มี category = 'stationery'
      filtered = filtered.filter(item => {
        // หากมีการเชื่อมโยงกับหมวดหมู่แล้ว ให้ใช้เงื่อนไขนี้
        // ถ้ายังไม่มี ให้แสดงทั้งหมดหรือกำหนดเงื่อนไขตามความเหมาะสม
        return true; // ปรับตามโครงสร้างข้อมูลจริง
      });
    }
    
    // กรองตามประเภทอุปกรณ์ (type_id)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.category?.toString() === typeFilter);
    }
    
    // กรองเฉพาะที่มีจำนวนให้เบิก และเป็นประเภทเบิกจ่าย
    filtered = filtered.filter(item => {
      // หาข้อมูลประเภทวัสดุจาก materialTypes
      const matchedType = materialTypes.find(type => type.type_id === item.category);
      
      // ตรวจสอบ usage_type ของประเภทวัสดุ (ถ้ามี)
      const isDisbursementType = matchedType 
        ? matchedType.usage_type === 'Disbursement' || !matchedType.usage_type
        : true;
      
      // กรองเฉพาะที่มีจำนวนให้เบิก และเป็นประเภทเบิกจ่าย
      return item.available > 0 && item.status === 'Available' && isDisbursementType;
    });
    
    return filtered;
  }, [materials, searchTerm, filterCategory, typeFilter, materialTypes]);

  // ฟังก์ชันการเปลี่ยนตัวกรอง
  const handleFilterChange = (e) => {
    setTypeFilter(e.target.value);
  };

  const handleSelectMaterial = (item) => {
    // ตรวจสอบว่ามีวัสดุนี้ในรายการที่เลือกแล้วหรือไม่
    const isSelected = selectedMaterials.some(selected => selected.id === item.id);

    if (isSelected) {
      // ถ้ามีแล้ว ให้ลบออก
      setSelectedMaterials(prev => prev.filter(selected => selected.id !== item.id));
      toast.info(`นำ ${item.name} ออกจากรายการเบิก`);
    } else {
      // ถ้ายังไม่มี ให้เพิ่มเข้าไป
      setSelectedMaterials(prev => [...prev, { ...item, quantity: 1 }]);
      toast.success(`เพิ่ม ${item.name} ในรายการเบิก`);
    }
  };

  const handleChangeQuantity = (id, changeAmount) => {
    // ค้นหาวัสดุที่ต้องการเปลี่ยนจำนวน
    const selectedItem = selectedMaterials.find(e => e.id === id);
    const originalItem = materials.find(e => e.id === id);

    if (!selectedItem || !originalItem) return;

    // คำนวณจำนวนใหม่
    const newQuantity = selectedItem.quantity + changeAmount;

    // ตรวจสอบว่าจำนวนใหม่ไม่น้อยกว่า 1 และไม่เกินจำนวนที่มี
    if (newQuantity < 1) {
      toast.warning('จำนวนต้องมากกว่าหรือเท่ากับ 1');
      return;
    }

    if (newQuantity > originalItem.inStock) {
      toast.warning(`จำนวนไม่สามารถเกิน ${originalItem.inStock}`);
      return;
    }

    // อัปเดตจำนวน
    setSelectedMaterials(prev =>
      prev.map(selected =>
        selected.id === id
          ? { ...selected, quantity: newQuantity }
          : selected
      )
    );
  };

  const handleRemoveSelected = (id) => {
    const itemName = selectedMaterials.find(item => item.id === id)?.name || '';
    setSelectedMaterials(prev => prev.filter(item => item.id !== id));
    toast.info(`นำ ${itemName} ออกจากรายการเบิก`);
  };

  const handleFormChange = (e) => {
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'กรุณาเลือกวันที่';
    }

    if (!formData.department) {
      newErrors.department = 'กรุณาเลือกแผนก';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'กรุณาระบุวัตถุประสงค์การเบิก';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedMaterials.length === 0) {
      toast.error('กรุณาเลือกวัสดุที่ต้องการเบิก');
      return;
    }

    if (!validateForm()) {
      toast.error('กรุณาแก้ไขข้อมูลให้ถูกต้อง');
      return;
    }

    // สร้างข้อมูลสำหรับส่งไป API
    const requestData = {
      requisition_date: formData.date,
      department: formData.department,
      purpose: formData.purpose,
      materials: selectedMaterials.map(item => ({
        equipment_id: item.id,
        quantity: item.quantity
      }))
    };

    // ส่งข้อมูลไปยัง API
    setIsLoading(true);

    try {
      // จำลองการส่งข้อมูลสำเร็จ (ในกรณีที่ยังไม่มี API จริง)
      setTimeout(() => {
        // รีเซ็ตข้อกูล
        setSelectedMaterials([]);
        setFormData({
          date: getTodayString(),
          department: '',
          purpose: ''
        });
        setShowForm(false);
        toast.success('ส่งคำขอเบิกวัสดุสำเร็จ กรุณารอการอนุมัติ');
        setIsLoading(false);
        navigate('/user/disbursement');
      }, 1500);

      // หากมี API จริง สามารถใช้โค้ดนี้แทน
      /*
      const response = await axios.post(`${API_URL}/api/requisitions`, requestData);

      // รีเซ็ตข้อมูล
      setSelectedMaterials([]);
      setFormData({
        date: getTodayString(),
        department: '',
        purpose: ''
      });
      setShowForm(false);
      toast.success('ส่งคำขอเบิกวัสดุสำเร็จ กรุณารอการอนุมัติ');
      navigate('/user/disbursement');
      */

    } catch (error) {
      console.error('Error submitting requisition:', error);

      // แสดงข้อความผิดพลาดที่เหมาะสม
      if (error.response) {
        // ถ้ามีการตอบกลับจากเซิร์ฟเวอร์
        toast.error(`เกิดข้อผิดพลาด: ${error.response.data.message || 'ไม่สามารถส่งคำขอได้'}`);
      } else {
        toast.error('เกิดข้อผิดพลาดในการส่งคำขอ โปรดลองอีกครั้งในภายหลัง');
      }
      
      setIsLoading(false);
    }
  };

  // ดึงข้อมูลอุปกรณ์ - สำหรับ UserRequisition
  const fetchEquipment = async () => {
    try {
      // ไม่ต้อง setIsLoading(true) ซ้ำ เพราะได้ทำใน fetchAllData แล้ว
      
      // ลองเรียกใช้ API ที่กรองเฉพาะอุปกรณ์ประเภทยืม-คืน
      const response = await axios.get(`${API_URL}/api/equipment/usage/Loan`, {
        timeout: 8000
      }).catch(async error => {
        // ถ้า API เฉพาะไม่สำเร็จ ให้ใช้ API ทั่วไปแล้วกรองเอง
        const fallbackResponse = await axios.get(`${API_URL}/api/equipment`);
        
        // ตรวจสอบว่าได้รับข้อมูลในรูปแบบที่ถูกต้อง
        if (Array.isArray(fallbackResponse.data)) {
          // กรองเฉพาะประเภทยืม-คืน
          return {
            data: fallbackResponse.data.filter(item => {
              if (item.usage_type === 'Loan') return true;
              
              // กรณีที่ไม่มี usage_type แต่มี type_id ให้ตรวจสอบจาก equipmentTypes
              if (item.type_id && equipmentTypes.some(
                type => type.type_id === item.type_id && type.usage_type === 'Loan'
              )) return true;
              
              return false;
            })
          };
        }
        
        throw new Error("Fallback data is not valid");
      });
      
      // ถ้าไม่มีข้อมูล หรือไม่ใช่ array
      if (!response || !Array.isArray(response.data)) {
        console.warn('Response data is not an array:', response);
        setEquipment([]);
        return;
      }
      
      // แปลงข้อมูล
      const formattedEquipment = response.data.map(item => ({
        id: item.equipment_id,
        name: item.equipment_name,
        model: item.model || '',
        category: item.type_id,
        type_name: item.type_name || 'ไม่ระบุประเภท',
        available: parseInt(item.quantity_available) || 0,
        image: item.image_path 
          ? item.image_path.startsWith('http') 
            ? item.image_path 
            : `${API_URL}${item.image_path}`
          : 'https://placehold.co/100x100/e2e8f0/475569?text=No+Image',
        credit: parseFloat(item.credit) || 0,
        status: item.status || 'Available',
        usage_type: 'Loan'
      }));
      
      setEquipment(formattedEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      // กรณีล้มเหลวทั้งหมด ให้ตั้งค่าเป็น array ว่าง
      setEquipment([]);
      throw error; // โยน error ให้ fetchAllData จัดการต่อ
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">เบิกวัสดุ</h1>
        <p className="text-gray-600">
          เลือกวัสดุที่ต้องการเบิก กรอกข้อมูลการเบิก และส่งคำขอเพื่อรับการอนุมัติ
        </p>
      </div>

      {/* วัสดุที่เลือก */}
      {selectedMaterials.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">วัสดุที่เลือก</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวน</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedMaterials.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 flex items-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded-md mr-3"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100/e2e8f0/475569?text=No+Image';
                        }}
                      />
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleChangeQuantity(item.id, -1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                          disabled={item.quantity <= 1}
                        >
                          <FiMinus className="h-4 w-4" />
                        </button>
                        <span className="mx-3 w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleChangeQuantity(item.id, 1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                          disabled={item.quantity >= item.inStock}
                        >
                          <FiPlus className="h-4 w-4" />
                        </button>
                        <span className="ml-2 text-gray-500">/ {item.inStock} {item.unit || 'ชิ้น'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      <button
                        onClick={() => handleRemoveSelected(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiX className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                ดำเนินการต่อ
              </button>
            ) : (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ข้อมูลการเบิก</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                        วันที่เบิก
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          value={formData.date}
                          onChange={handleFormChange}
                          className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.date ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          min={getTodayString()}
                        />
                      </div>
                      {errors.date && (
                        <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                        แผนก
                      </label>
                      <select
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleFormChange}
                        className={`appearance-none block w-full px-3 py-2 border ${errors.department ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      >
                        <option value="">-- เลือกแผนก --</option>
                        {departments.map((dept, index) => (
                          <option key={index} value={dept}>{dept}</option>
                        ))}
                      </select>
                      {errors.department && (
                        <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                      วัตถุประสงค์
                    </label>
                    <textarea
                      id="purpose"
                      name="purpose"
                      rows="3"
                      value={formData.purpose}
                      onChange={handleFormChange}
                      className={`appearance-none block w-full px-3 py-2 border ${errors.purpose ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="ระบุวัตถุประสงค์ในการเบิกวัสดุ"
                    ></textarea>
                    {errors.purpose && (
                      <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          กำลังดำเนินการ...
                        </>
                      ) : (
                        'ส่งคำขอเบิก'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ส่วนค้นหาและกรอง */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาวัสดุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="w-full md:w-1/3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={typeFilter}
                onChange={handleFilterChange}
                className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="all">ทั้งหมด</option>
                {Array.isArray(materialTypes) && materialTypes.map(type => (
                  <option key={type.type_id} value={type.type_id.toString()}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* รายการวัสดุ */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">รายการวัสดุประเภทเบิก-จ่าย</h2>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-12">
            <FiInfo className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">ไม่พบวัสดุ</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || typeFilter !== 'all' 
                ? 'ไม่พบวัสดุที่ตรงกับเงื่อนไขการค้นหา' 
                : 'ไม่มีวัสดุในระบบ'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setIsLoading(true);
                fetchAllData(); // อย่าลืมว่า fetchAllData จะจัดการ setIsLoading(false) ให้เอง
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              รีเซ็ตการค้นหา
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMaterials.map(item => {
              const isSelected = selectedMaterials.some(selected => selected.id === item.id);

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200'}`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-center mb-4 h-32">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100/e2e8f0/475569?text=No+Image';
                        }}
                      />
                    </div>
                    <h3 className="text-gray-900 font-medium text-lg mb-1">{item.name}</h3>
                    <p className="text-gray-500 text-sm mb-3">
                      ประเภท: {item.type_name}
                    </p>
                    <div className="mb-1">
                      <span className="text-sm inline-block px-2 py-1 rounded-full bg-green-100 text-green-800">
                        เบิก-จ่าย
                      </span>
                    </div>
                    <div className="flex items-center">
                      {item.inStock > 0 ? (
                        <div className="flex items-center text-green-600">
                          <FiCheckCircle className="mr-1" />
                          <span>มีให้เบิก {item.inStock} {item.unit || 'ชิ้น'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <FiX className="mr-1" />
                          <span>ไม่มีให้เบิก</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => handleSelectMaterial(item)}
                        className={`w-full py-2 px-3 text-sm rounded-md ${isSelected
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-500'
                            : 'bg-white text-indigo-600 border border-indigo-500 hover:bg-indigo-50'
                          }`}
                        disabled={item.inStock <= 0}
                      >
                        {isSelected ? 'ยกเลิกการเลือก' : 'เลือก'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRequisition;
