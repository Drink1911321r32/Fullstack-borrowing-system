import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiCpu, FiPlusCircle, FiTrash2, FiEdit, FiCheck, FiX, FiImage, FiUpload, 
  FiSearch, FiFilter, FiRefreshCw, FiDownload, FiEye, FiSettings,
  FiPackage, FiTool, FiAlertCircle, FiStar
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { equipmentAPI, equipmentTypeAPI } from '../../api/api';
import { ConfirmModal } from '../common/Modal';
import { STORAGE_KEYS } from '../../constants';
import { generateSerialNumber } from '../../utils';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AddEquipment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [equipment, setEquipment] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [groupedTypes, setGroupedTypes] = useState([]); // State ใหม่สำหรับจัดกลุ่มประเภทอุปกรณ์
  const [newEquipment, setNewEquipment] = useState({
    equipment_name: '',
    model: '',
    type_id: '',
    status: 'Available',  // เปลี่ยนจาก 'available' เป็น 'Available'
    credit: 0,
    quantity: 1, // เพิ่มฟิลด์ quantity พร้อมค่าเริ่มต้นเป็น 1
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState('equipment_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEquipmentItems, setSelectedEquipmentItems] = useState(null);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);
  const [pendingEquipmentData, setPendingEquipmentData] = useState(null);
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [pendingEditData, setPendingEditData] = useState(null);

  // ฟังก์ชันสำหรับตรวจสอบว่า type_id ที่เลือกเป็นประเภท Loan หรือ Disbursement
  const getSelectedTypeUsage = (typeId) => {
    if (!typeId) return null;
    const selectedType = equipmentTypes.find(type => type.type_id === parseInt(typeId));
    return selectedType ? selectedType.usage_type : null;
  };

  // ฟังก์ชันสำหรับตรวจสอบว่าอุปกรณ์ชิ้นนี้เป็นประเภท Loan หรือไม่
  const isLoanType = (item) => {
    return getSelectedTypeUsage(item.type_id) === 'Loan';
  };

  // โหลดข้อมูลเมื่อ component mount
  useEffect(() => {
    fetchEquipment();
    fetchEquipmentTypes();
  }, []);

  // เช็คว่ามีข้อมูลจาก Inventory มาแก้ไขหรือไม่
  useEffect(() => {
    if (location.state?.editEquipment) {
      const equipmentData = location.state.editEquipment;
      setEditingEquipment(equipmentData);
      
      if (equipmentData.image_path) {
        setImagePreview({
          type: 'server',
          url: equipmentData.image_path.startsWith('http') 
            ? equipmentData.image_path 
            : `${API_URL}${equipmentData.image_path}`
        });
      }
    }
  }, [location.state]);


  // ฟังก์ชันสำหรับดึงข้อมูลประเภทอุปกรณ์
  const fetchEquipmentTypes = async () => {
    try {
      const response = await equipmentTypeAPI.getAll();
      
      if (response && response.success && Array.isArray(response.data)) {
        setEquipmentTypes(response.data);
        
        // จัดกลุ่มประเภทอุปกรณ์ตาม usage_type
        const loanTypes = response.data.filter(type => type.usage_type === 'Loan');
        const disbursementTypes = response.data.filter(type => type.usage_type === 'Disbursement');
        
        // จัดรูปแบบข้อมูลเพื่อแสดงในหน้า UI
        const formattedTypes = [
          { header: 'ประเภทอุปกรณ์ยืม-คืน', items: loanTypes },
          { header: 'ประเภทอุปกรณ์เบิก-จ่าย', items: disbursementTypes }
        ];
        
        setGroupedTypes(formattedTypes); // เก็บข้อมูลที่จัดกลุ่มแล้วไว้แสดงผล
      } else {
        console.warn('Invalid equipment types response:', response);
        setEquipmentTypes([]);
        setGroupedTypes([]);
        toast.error('ไม่สามารถดึงข้อมูลประเภทอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
      setEquipmentTypes([]);
      setGroupedTypes([]);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์');
    }
  };

  // ดึงข้อมูลอุปกรณ์
  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const response = await equipmentAPI.getAll();
      
      // ตรวจสอบรูปแบบ response
      if (response && response.success && Array.isArray(response.data)) {
        setEquipment(response.data);
      } else if (Array.isArray(response)) {
        setEquipment(response);
      } else if (response && Array.isArray(response.data)) {
        setEquipment(response.data);
      } else {
        console.warn('Invalid equipment response:', response);
        setEquipment([]);
        toast.error('ไม่สามารถดึงข้อมูลอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์');
      setEquipment([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ตรวจสอบฟอร์ม
  const validateForm = (data) => {
    const errors = {};
    if (!data.equipment_name) errors.equipment_name = 'กรุณาระบุชื่ออุปกรณ์';
    if (!data.model) errors.model = 'กรุณาระบุรุ่น/โมเดล';
    if (!data.type_id) errors.type_id = 'กรุณาเลือกประเภทอุปกรณ์';
    
    // ตรวจสอบรูปภาพ - บังคับให้มีรูปเสมอ
    if (!data.image && !data.image_path) {
      errors.image = 'กรุณาเลือกรูปภาพอุปกรณ์';
    }
    
    // ตรวจสอบเครดิตเฉพาะกรณีที่เป็นประเภท Loan เท่านั้น
    const usageType = getSelectedTypeUsage(data.type_id);
    if (usageType === 'Loan') {
      if (data.credit === undefined || data.credit === null || data.credit < 0) {
        errors.credit = 'เครดิตต้องมากกว่าหรือเท่ากับ 0';
      }
    }
    
    if (!data.quantity || data.quantity < 1) errors.quantity = 'จำนวนต้องมากกว่าหรือเท่ากับ 1'; // เพิ่มการตรวจสอบ quantity
    return errors;
  };

  // อัพเดตค่าในฟอร์ม
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // สำหรับการแก้ไขข้อมูลที่มีอยู่แล้ว
    if (editingEquipment) {
      let processedValue = value;
      
      // แปลงค่าตามประเภทข้อมูล
      if (name === 'credit') {
        processedValue = parseInt(value, 10) || 0;
      } else if (name === 'quantity') {
        // สำหรับ quantity แปลงเป็นตัวเลขและเก็บกลับเป็น string ที่ไม่มี leading zero
        const numValue = parseInt(value, 10);
        processedValue = isNaN(numValue) || numValue < 1 ? 1 : numValue;
      } else if (name === 'type_id') {
        processedValue = parseInt(value, 10) || '';
        
        // เมื่อเปลี่ยนประเภทอุปกรณ์ ให้รีเซ็ต credit ถ้าไม่ใช่ Loan
        const usageType = getSelectedTypeUsage(processedValue);
        if (usageType === 'Disbursement') {
          setEditingEquipment({
            ...editingEquipment,
            [name]: processedValue,
            credit: 0
          });
          if (errors[name]) {
            setErrors({
              ...errors,
              [name]: '',
              credit: ''
            });
          }
          return;
        }
      }
      // สำหรับค่า status ไม่ต้องแปลง เก็บเป็น string ตามที่รับมา
    
      const updatedEquipment = {
        ...editingEquipment,
        [name]: processedValue
      };
      
      setEditingEquipment(updatedEquipment);
    } else {
      // สำหรับการเพิ่มข้อมูลใหม่
      let processedValue = value;
      
      if (name === 'credit') {
        processedValue = parseInt(value, 10) || 0;
      } else if (name === 'quantity') {
        // สำหรับ quantity แปลงเป็นตัวเลขและเก็บกลับเป็น string ที่ไม่มี leading zero
        const numValue = parseInt(value, 10);
        processedValue = isNaN(numValue) || numValue < 1 ? 1 : numValue;
      } else if (name === 'type_id') {
        processedValue = parseInt(value, 10) || '';
        
        // เมื่อเปลี่ยนประเภทอุปกรณ์ ให้รีเซ็ต credit ถ้าไม่ใช่ Loan
        const usageType = getSelectedTypeUsage(processedValue);
        if (usageType === 'Disbursement') {
          setNewEquipment({
            ...newEquipment,
            [name]: processedValue,
            credit: 0
          });
          if (errors[name]) {
            setErrors({
              ...errors,
              [name]: '',
              credit: ''
            });
          }
          return;
        }
      }
      
      setNewEquipment({
        ...newEquipment,
        [name]: processedValue
      });
    }
    
    // ล้าง error เมื่อมีการพิมพ์
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // จัดการอัพโหลดรูปภาพ
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // ตรวจสอบว่าไฟล์ที่อัพโหลดเป็นรูปภาพหรือไม่
    if (!file.type.match('image.*')) {
      toast.error('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }
    
    // บันทึกไฟล์ลงใน state
    if (editingEquipment) {
      setEditingEquipment({
        ...editingEquipment,
        image: file
      });
    } else {
      setNewEquipment({
        ...newEquipment,
        image: file
      });
    }
    
    // สร้างและแสดงตัวอย่างรูปภาพโดยใช้ FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      // เก็บเป็น object เพื่อบอกว่าเป็นรูปใหม่ที่อัพโหลด
      setImagePreview({
        type: 'file',
        file: file
      });
    };
    reader.onerror = () => {
      toast.error('ไม่สามารถแสดงตัวอย่างรูปภาพได้');
    };
    reader.readAsDataURL(file);
  };

  // เพิ่มอุปกรณ์ใหม่
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm(newEquipment);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    // เก็บข้อมูลและแสดง confirmation modal
    setPendingEquipmentData(newEquipment);
    setShowConfirmAdd(true);
  };

  // ฟังก์ชันสำหรับเพิ่มอุปกรณ์จริงหลังจากยืนยัน
  const confirmAddEquipment = async () => {
    setShowConfirmAdd(false);
    setIsLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const equipmentData = pendingEquipmentData || newEquipment;
      
      // ตรวจสอบว่าค่า status เป็นค่าที่ถูกต้องตาม ENUM ในฐานข้อมูล
      const validStatusValues = ['Available', 'Repairing', 'Damaged', 'Lost'];
      const statusToSend = validStatusValues.includes(equipmentData.status) 
        ? equipmentData.status 
        : 'Available';

      // สร้าง FormData สำหรับการอัพโหลดไฟล์
      const formData = new FormData();
      formData.append('equipment_name', equipmentData.equipment_name);
      formData.append('model', equipmentData.model);
      formData.append('type_id', equipmentData.type_id);
      formData.append('status', statusToSend); // ใช้ตัวแปร statusToSend ที่กำหนดไว้ด้านบน
      formData.append('credit', equipmentData.credit);
      formData.append('quantity', equipmentData.quantity || 1);
      if (equipmentData.image) {
        formData.append('image', equipmentData.image);
      }
      
      // API call สำหรับการเพิ่มอุปกรณ์
      const response = await axios.post(`${API_URL}/api/equipment`, formData, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.success) {
        toast.success('เพิ่มอุปกรณ์สำเร็จ');
        
        // รีเซ็ตฟอร์ม
        setNewEquipment({
          equipment_name: '',
          model: '',
          type_id: '',
          status: 'Available',  // เปลี่ยนจาก 'available' เป็น 'Available'
          credit: 0,
          quantity: 1, // รีเซ็ต quantity เป็นค่าเริ่มต้น
          image: null
        });
        setImagePreview(null);
        setPendingEquipmentData(null);
        fetchEquipment();
      }
    } catch (error) {
      console.error('Error adding equipment:', error);
      const errorMsg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์';
      toast.error(errorMsg);
      setPendingEquipmentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // เริ่มการแก้ไขอุปกรณ์
  const startEditing = (item) => {
    // ตรวจสอบค่า status และใช้ค่าเริ่มต้นถ้าไม่มีค่า
    const statusValue = item.status || 'Available';
    
    setEditingEquipment({
      equipment_id: item.equipment_id,
      equipment_name: item.equipment_name,
      model: item.model,
      type_id: item.type_id,
      status: statusValue,
      credit: item.credit,
      quantity: item.quantity || 1,   
      image: null,
      image_path: item.image_path
    });
    
    // กำหนด imagePreview ให้แสดงผลรูปภาพจาก backend
    // เก็บเป็น object เพื่อบอกว่าเป็นรูปจาก server
    if (item.image_path) {
      setImagePreview({
        type: 'server',
        url: item.image_path.startsWith('http') 
          ? item.image_path 
          : `${API_URL}${item.image_path}`
      });
    } else {
      setImagePreview(null);
    }
    
    setErrors({});
  };

  // ยกเลิกการแก้ไข
  const cancelEditing = () => {
    setEditingEquipment(null);
    setImagePreview(null);
    setErrors({});
  };

  // บันทึกการแก้ไข
  const saveEditing = async () => {
    const formErrors = validateForm(editingEquipment);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    // เก็บข้อศูลและแสดง confirmation modal
    setPendingEditData(editingEquipment);
    setShowConfirmEdit(true);
  };

  // ฟังก์ชันสำหรับบันทึกการแก้ไขจริงหลังยืนยัน
  const confirmEditEquipment = async () => {
    setShowConfirmEdit(false);
    setIsLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const editData = pendingEditData || editingEquipment;
      
      // ตรวจสอบว่าค่า status เป็นค่าที่ถูกต้องตาม ENUM ในฐานข้อมูล
      const validStatusValues = ['Available', 'Repairing', 'Damaged', 'Lost'];
      const statusToSend = validStatusValues.includes(editData.status) 
        ? editData.status 
        : 'Available';

      // สร้างข้อมูลสำหรับการอัพเดต
      const updateData = {
        equipment_name: editData.equipment_name,
        model: editData.model,
        type_id: editData.type_id,
        status: statusToSend,
        credit: editData.credit,
        quantity: editData.quantity || 1 // เพิ่ม quantity
      };
      
      // ถ้ามีรูปภาพ ให้ส่งด้วย FormData
      if (editData.image) {
        const formData = new FormData();
        formData.append('equipment_name', editData.equipment_name);
        formData.append('model', editData.model);
        formData.append('type_id', editData.type_id);
        formData.append('status', statusToSend);
        formData.append('credit', editData.credit);
        formData.append('quantity', editData.quantity || 1); // เพิ่ม quantity
        formData.append('image', editData.image);
        
        const response = await axios.put(
          `${API_URL}/api/equipment/${editData.equipment_id}`, 
          formData, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        if (response.data && response.data.success) {
          toast.success('อัพเดตอุปกรณ์สำเร็จ');
          
          setTimeout(() => {
            fetchEquipment();
            setEditingEquipment(null);
            setImagePreview(null);
            setPendingEditData(null);
          }, 500);
        } else {
          toast.error(response.data?.message || 'ไม่สามารถอัพเดตอุปกรณ์ได้');
        }
      } else {
        // ส่งข้อมูลแบบ JSON ถ้าไม่มีรูปภาพ
        const response = await axios.put(
          `${API_URL}/api/equipment/${editData.equipment_id}`, 
          updateData, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data && response.data.success) {
          toast.success('อัพเดตอุปกรณ์สำเร็จ');
          
          setTimeout(() => {
            fetchEquipment();
            setEditingEquipment(null);
            setImagePreview(null);
            setPendingEditData(null);
          }, 500);
        } else {
          toast.error(response.data?.message || 'ไม่สามารถอัพเดตอุปกรณ์ได้');
        }
      }
    } catch (error) {
      console.error('Error updating equipment:', error);
      if (error.response) {
        // Error response detail
      }
      const errorMsg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัพเดตอุปกรณ์';
      toast.error(errorMsg);
      setPendingEditData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ลบอุปกรณ์
  const openDeleteModal = (item) => {
    setEquipmentToDelete(item);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setEquipmentToDelete(null);
  };

  const confirmDelete = async () => {
    if (!equipmentToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      // API call สำหรับการลบอุปกรณ์
      const response = await axios.delete(`${API_URL}/api/equipment/${equipmentToDelete.equipment_id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.data && response.data.success) {
        toast.success('ลบอุปกรณ์สำเร็จ');
        fetchEquipment();
        closeDeleteModal();
      } else {
        toast.error(response.data?.message || 'ไม่สามารถลบอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบอุปกรณ์');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      // API call สำหรับการลบอุปกรณ์
      const response = await axios.delete(`${API_URL}/api/equipment/${id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.data && response.data.success) {
        toast.success('ลบอุปกรณ์สำเร็จ');
        fetchEquipment();
      } else {
        toast.error(response.data?.message || 'ไม่สามารถลบอุปกรณ์ได้');
      }
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบอุปกรณ์');
    } finally {
      setIsLoading(false);
    }
  };

  // แสดงรูปภาพตัวอย่างขนาดใหญ่
  const openPreviewModal = (imagePath) => {
    if (!imagePath) {
      return;
    }
    
    try {
      // สร้าง URL ที่ถูกต้องสำหรับรูปภาพ
      const fullImageUrl = `${API_URL}${imagePath}`;
      
      setPreviewImage(fullImageUrl);
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('Error in openPreviewModal:', error);
      toast.error('ไม่สามารถแสดงรูปภาพขนาดใหญ่ได้');
    }
  };

  // แสดงรายละเอียดแต่ละชิ้นของอุปกรณ์
  const openItemsModal = async (equipment) => {
    try {
      // สร้างข้อมูลจำลองสำหรับแต่ละชิ้น (ในอนาคตจะดึงจาก API)
      // ใช้ serial number รูปแบบใหม่: TTTTEEEEEMMMMSSS (16 หลัก ตัวเลขล้วน)
      const items = [];
      for (let i = 1; i <= (equipment.quantity || 1); i++) {
        items.push({
          item_number: i,
          serial_number: generateSerialNumber(
            equipment.type_id,
            equipment.equipment_id,
            equipment.model || '',
            i
          ),
          status: equipment.status,
          condition: 'ปกติ',
          last_maintenance: '-',
          current_borrower: null,
          notes: ''
        });
      }
      
      setSelectedEquipmentItems({
        equipment: equipment,
        items: items
      });
      setIsItemsModalOpen(true);
    } catch (error) {
      console.error('Error opening items modal:', error);
      toast.error('ไม่สามารถดึงข้อมูลรายชิ้นได้');
    }
  };

  // ฟังก์ชันสำหรับ Filter, Sort และ Pagination
  const getFilteredAndSortedEquipment = () => {
    let filtered = equipment.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.type_name && item.type_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type_id.toString() === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
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

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // แปลงสถานะเป็นภาษาไทย
  const translateStatus = (status) => {
    const statusMap = {
      'Available': 'พร้อมใช้งาน',
      'Repairing': 'อยู่ระหว่างซ่อมบำรุง',
      'Damaged': 'ชำรุด',
      'Lost': 'สูญหาย'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="pb-6">
        {/* ส่วนหัวที่ปรับปรุงใหม่ */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                <FiPackage className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Equipment Management</h1>
                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <span className="text-indigo-200">
                    Total: {equipment.length} รายการ
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              <button
                onClick={() => { setIsRefreshing(true); fetchEquipment(); fetchEquipmentTypes(); setTimeout(() => setIsRefreshing(false), 1000); }}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm"
                disabled={isRefreshing}
              >
                <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm">
                <FiDownload className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm"
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search และ Filter Section */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FiSearch className="mr-2" />
                ค้นหาและกรองข้อมูล
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ, รุ่น, หรือประเภทอุปกรณ์..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
                
                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">🔄 ทุกสถานะ</option>
                    <option value="Available">✅ พร้อมใช้งาน</option>
                    <option value="Repairing">🔧 ซ่อมบำรุง</option>
                    <option value="Damaged">❌ ชำรุด</option>
                    <option value="Lost">🔍 สูญหาย</option>
                  </select>
                </div>
                
                {/* Type Filter */}
                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">📦 ทุกประเภท</option>
                    {equipmentTypes.map(type => (
                      <option key={type.type_id} value={type.type_id}>
                        {type.usage_type === 'Loan' ? '🔄' : '📤'} {type.type_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Notifications shown via toast, remove inline message blocks */}

        {/* แบบฟอร์มเพิ่มอุปกรณ์ที่ปรับปรุงใหม่ */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${
                  editingEquipment 
                    ? 'bg-amber-100 text-amber-600' 
                    : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {editingEquipment ? <FiEdit className="w-6 h-6" /> : <FiPlusCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingEquipment ? '✏️ แก้ไขอุปกรณ์' : '➕ เพิ่มอุปกรณ์ใหม่'}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {editingEquipment ? 'อัพเดตข้อมูลอุปกรณ์' : 'เพิ่มอุปกรณ์เข้าสู่ระบบ'}
                  </p>
                </div>
              </div>
              {editingEquipment && (
                <button
                  onClick={cancelEditing}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-all duration-300"
                >
                  <FiX className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ชื่ออุปกรณ์ */}
                <div>
                  <label htmlFor="equipment_name" className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="equipment_name"
                    name="equipment_name"
                    value={editingEquipment ? editingEquipment.equipment_name : newEquipment.equipment_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.equipment_name ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="ระบุชื่ออุปกรณ์"
                  />
                  {errors.equipment_name && <p className="mt-1 text-sm text-red-500">{errors.equipment_name}</p>}
                </div>

                {/* รุ่น/โมเดล */}
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                    รุ่น/โมเดล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={editingEquipment ? editingEquipment.model : newEquipment.model}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.model ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="ระบุรุ่นหรือโมเดล"
                  />
                  {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
                </div>

                {/* ประเภทอุปกรณ์ */}
                <div>
                  <label htmlFor="type_id" className="block text-sm font-semibold text-gray-700 mb-2">
                    ประเภทอุปกรณ์ <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type_id"
                    name="type_id"
                    value={editingEquipment ? editingEquipment.type_id : newEquipment.type_id}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${
                      errors.type_id 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-700 font-medium shadow-sm hover:border-indigo-300 cursor-pointer`}
                  >
                    <option value="" className="text-gray-400">📋 -- กรุณาเลือกประเภทอุปกรณ์ --</option>
                    {Array.isArray(groupedTypes) && groupedTypes.map((group, index) => (
                      <optgroup 
                        key={index} 
                        label={group.header}
                        className="font-bold text-gray-800 bg-gray-100"
                      >
                        {Array.isArray(group.items) && group.items.map(type => (
                          <option 
                            key={type.type_id} 
                            value={type.type_id}
                            className="py-2 pl-4 text-gray-700 font-normal"
                          >
                            {type.usage_type === 'Loan' ? '🔄' : '📤'} {type.type_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.type_id && (
                    <div className="mt-2 flex items-center text-sm text-red-600">
                      <FiAlertCircle className="mr-1 flex-shrink-0" />
                      <span>{errors.type_id}</span>
                    </div>
                  )}
                  {(editingEquipment?.type_id || newEquipment.type_id) && (
                    <p className="mt-2 text-xs text-gray-500 flex items-center">
                      <FiPackage className="mr-1" />
                      ประเภท: {getSelectedTypeUsage(editingEquipment ? editingEquipment.type_id : newEquipment.type_id) === 'Loan' ? 'ยืม-คืน' : 'เบิก-จ่าย'}
                    </p>
                  )}
                </div>

                {/* สถานะ */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    สถานะ
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={editingEquipment ? editingEquipment.status : newEquipment.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Available">พร้อมใช้งาน</option>
                  </select>
                  {/* Debug output */}
                  {editingEquipment && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current status: {editingEquipment.status}
                    </p>
                  )}
                </div>

                {/* เครดิต - แสดงเฉพาะประเภทยืม-คืน */}
                {getSelectedTypeUsage(editingEquipment ? editingEquipment.type_id : newEquipment.type_id) === 'Loan' && (
                  <div>
                    <label htmlFor="credit" className="block text-sm font-medium text-gray-700 mb-1">
                      เครดิต <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="credit"
                      name="credit"
                      value={editingEquipment ? editingEquipment.credit : newEquipment.credit}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border ${errors.credit ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="ระบุเครดิต"
                    />
                    {errors.credit && <p className="mt-1 text-sm text-red-500">{errors.credit}</p>}
                  </div>
                )}

                {/* จำนวน */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    จำนวน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="quantity"
                    name="quantity"
                    value={editingEquipment ? editingEquipment.quantity : newEquipment.quantity}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.quantity ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="ระบุจำนวน"
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                </div>

                {/* รูปภาพ */}
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    รูปภาพ <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className={`flex flex-col items-center justify-center px-4 py-2 bg-white rounded-md border cursor-pointer hover:bg-indigo-50 transition duration-300 ${
                      errors.image ? 'border-red-300 text-red-600' : 'border-indigo-300 text-indigo-600'
                    }`}>
                      <div className="flex items-center">
                        <FiUpload className="mr-2" />
                        <span>เลือกรูปภาพ</span>
                      </div>
                      <input
                        type="file"
                        id="image"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {imagePreview && (
                      <div className="ml-4 relative">
                        <img
                          src={
                            imagePreview.type === 'file'
                              ? URL.createObjectURL(imagePreview.file)
                              : imagePreview.url
                          }
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-md"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/100?text=Error+Loading';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            if (editingEquipment) {
                              setEditingEquipment({ ...editingEquipment, image: null });
                            } else {
                              setNewEquipment({ ...newEquipment, image: null });
                            }
                          }}
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {errors.image && <p className="mt-1 text-sm text-red-500">{errors.image}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {editingEquipment ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={saveEditing}
                      disabled={isLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center disabled:opacity-50"
                    >
                      {isLoading ? 'กำลังบันทึก...' : (
                        <>
                          <FiCheck className="mr-2" />
                          บันทึกการแก้ไข
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center disabled:opacity-50"
                  >
                    {isLoading ? 'กำลังเพิ่ม...' : (
                      <>
                        <FiPlusCircle className="mr-2" />
                        เพิ่มอุปกรณ์
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>

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

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
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

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        .preview-image {
          width: 100%;
          height: auto;
          max-height: 150px;
          object-fit: contain;
          border-radius: 8px;
          transition: transform 0.3s ease;
        }
        
        .preview-image:hover {
          transform: scale(1.05);
        }
        
        .glass-effect {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

      {/* Confirmation Modal สำหรับเพิ่มอุปกรณ์ */}
      <ConfirmModal
        isOpen={showConfirmAdd}
        onClose={() => {
          setShowConfirmAdd(false);
          setPendingEquipmentData(null);
        }}
        onConfirm={confirmAddEquipment}
        title="ยืนยันการเพิ่มอุปกรณ์"
        message={`คุณต้องการเพิ่มอุปกรณ์ "${pendingEquipmentData?.equipment_name || ''}" จำนวน ${pendingEquipmentData?.quantity || 1} ชิ้น ใช่หรือไม่?`}
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        type="info"
      />

      {/* Confirmation Modal สำหรับแก้ไขอุปกรณ์ */}
      <ConfirmModal
        isOpen={showConfirmEdit}
        onClose={() => {
          setShowConfirmEdit(false);
          setPendingEditData(null);
        }}
        onConfirm={confirmEditEquipment}
        title="ยืนยันการแก้ไขอุปกรณ์"
        message={`คุณต้องการแก้ไขอุปกรณ์ "${pendingEditData?.equipment_name || ''}" ใช่หรือไม่?`}
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        type="warning"
      />
    </div>
  );
};

export default AddEquipment;