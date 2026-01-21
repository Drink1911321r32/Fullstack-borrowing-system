import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlusCircle, FiX, FiImage, FiUpload, FiPackage, FiArrowLeft
} from 'react-icons/fi';
import { equipmentAPI, equipmentTypeAPI } from '../../api/api';
import { STORAGE_KEYS } from '../../constants';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AddEquipmentForm = () => {
  const navigate = useNavigate();
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [groupedTypes, setGroupedTypes] = useState([]);
  const [newEquipment, setNewEquipment] = useState({
    equipment_name: '',
    model: '',
    type_id: '',
    status: 'Available',
    credit: 0,
    quantity: 1,
    purchase_date: '',
    warranty_expiry: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchEquipmentTypes();
  }, []);

  const getSelectedTypeUsage = (typeId) => {
    if (!typeId) return null;
    const selectedType = equipmentTypes.find(type => type.type_id === parseInt(typeId));
    return selectedType ? selectedType.usage_type : null;
  };

  const fetchEquipmentTypes = async () => {
    try {
      const response = await equipmentTypeAPI.getAll();
      if (response && response.success && Array.isArray(response.data)) {
        setEquipmentTypes(response.data);
        const loanTypes = response.data.filter(type => type.usage_type === 'Loan');
        const disbursementTypes = response.data.filter(type => type.usage_type === 'Disbursement');
        setGroupedTypes([
          { header: 'ประเภทอุปกรณ์ยืม-คืน', items: loanTypes },
          { header: 'ประเภทอุปกรณ์เบิก-จ่าย', items: disbursementTypes }
        ]);
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลประเภทอุปกรณ์');
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.equipment_name) errors.equipment_name = 'กรุณาระบุชื่ออุปกรณ์';
    if (!data.model) errors.model = 'กรุณาระบุรุ่น/โมเดล';
    if (!data.type_id) errors.type_id = 'กรุณาเลือกประเภทอุปกรณ์';
    
    const usageType = getSelectedTypeUsage(data.type_id);
    if (usageType === 'Loan') {
      if (data.credit === undefined || data.credit === null || data.credit < 0) {
        errors.credit = 'เครดิตต้องมากกว่าหรือเท่ากับ 0';
      }
    }
    
    if (!data.quantity || data.quantity < 1) errors.quantity = 'จำนวนต้องมากกว่าหรือเท่ากับ 1';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'credit') {
      processedValue = parseInt(value, 10) || 0;
    } else if (name === 'quantity') {
      const numValue = parseInt(value, 10);
      processedValue = isNaN(numValue) || numValue < 1 ? 1 : numValue;
    } else if (name === 'type_id') {
      processedValue = parseInt(value, 10) || '';
      const usageType = getSelectedTypeUsage(processedValue);
      if (usageType === 'Disbursement') {
        setNewEquipment({
          ...newEquipment,
          [name]: processedValue,
          credit: 0
        });
        if (errors[name]) {
          setErrors({ ...errors, [name]: '', credit: '' });
        }
        return;
      }
    }
    
    setNewEquipment({
      ...newEquipment,
      [name]: processedValue
    });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      toast.error('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }
    
    setNewEquipment({
      ...newEquipment,
      image: file
    });
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview({ type: 'file', file: file });
    };
    reader.onerror = () => {
      toast.error('ไม่สามารถแสดงตัวอย่างรูปภาพได้');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm(newEquipment);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const validStatusValues = ['Available', 'Repairing', 'Damaged', 'Lost', 'Reserved'];
      const statusToSend = validStatusValues.includes(newEquipment.status) 
        ? newEquipment.status 
        : 'Available';

      const formData = new FormData();
      formData.append('equipment_name', newEquipment.equipment_name);
      formData.append('model', newEquipment.model);
      formData.append('type_id', newEquipment.type_id);
      formData.append('status', statusToSend);
      formData.append('credit', newEquipment.credit);
      formData.append('quantity', newEquipment.quantity || 1);
      if (newEquipment.purchase_date) {
        formData.append('purchase_date', newEquipment.purchase_date);
      }
      if (newEquipment.warranty_expiry) {
        formData.append('warranty_expiry', newEquipment.warranty_expiry);
      }
      if (newEquipment.image) {
        formData.append('image', newEquipment.image);
      }
      
      const response = await axios.post(`${API_URL}/api/equipment`, formData, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data) {
        toast.success('เพิ่มอุปกรณ์สำเร็จ');
        setNewEquipment({
          equipment_name: '',
          model: '',
          type_id: '',
          status: 'Available',
          credit: 0,
          quantity: 1,
          image: null
        });
        setImagePreview(null);
        setTimeout(() => navigate('/admin/inventory'), 1000);
      }
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/inventory')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            กลับไปหน้าคลังอุปกรณ์
          </button>
          
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                <FiPackage className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">เพิ่มอุปกรณ์ใหม่</h1>
                <p className="text-indigo-100 mt-1">เพิ่มอุปกรณ์เข้าสู่ระบบคลัง</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ชื่ออุปกรณ์ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="equipment_name"
                    value={newEquipment.equipment_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border ${errors.equipment_name ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="ระบุชื่ออุปกรณ์"
                  />
                  {errors.equipment_name && <p className="mt-1 text-sm text-red-500">{errors.equipment_name}</p>}
                </div>

                {/* รุ่น/โมเดล */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รุ่น/โมเดล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={newEquipment.model}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border ${errors.model ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="ระบุรุ่นหรือโมเดล"
                  />
                  {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
                </div>

                {/* ประเภทอุปกรณ์ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภท <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type_id"
                    value={newEquipment.type_id}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border ${errors.type_id ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    <option value="">เลือกประเภทอุปกรณ์</option>
                    {groupedTypes.map((group, index) => (
                      <optgroup key={index} label={group.header}>
                        {group.items.map(type => (
                          <option key={type.type_id} value={type.type_id}>
                            {type.type_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.type_id && <p className="mt-1 text-sm text-red-500">{errors.type_id}</p>}
                </div>

                {/* สถานะ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    สถานะ
                  </label>
                  <select
                    name="status"
                    value={newEquipment.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Available">พร้อมใช้งาน</option>
                    <option value="Reserved">ถูกจอง</option>
                    <option value="Repairing">อยู่ระหว่างซ่อมบำรุง</option>
                    <option value="Damaged">ชำรุด</option>
                    <option value="Lost">สูญหาย</option>
                  </select>
                </div>

                {/* เครดิต */}
                {getSelectedTypeUsage(newEquipment.type_id) === 'Loan' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เครดิต <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="credit"
                      min="0"
                      value={newEquipment.credit}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border ${errors.credit ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="ระบุเครดิต"
                    />
                    {errors.credit && <p className="mt-1 text-sm text-red-500">{errors.credit}</p>}
                  </div>
                )}

                {/* จำนวน */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={newEquipment.quantity}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border ${errors.quantity ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="ระบุจำนวน"
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                </div>

                {/* วันที่ซื้อ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    วันที่ซื้อ
                  </label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={newEquipment.purchase_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* วันหมดประกัน */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    วันหมดประกัน
                  </label>
                  <input
                    type="date"
                    name="warranty_expiry"
                    value={newEquipment.warranty_expiry}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* รูปภาพ */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รูปภาพ
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex flex-col items-center justify-center px-6 py-3 bg-white text-indigo-600 rounded-lg border-2 border-indigo-300 border-dashed cursor-pointer hover:bg-indigo-50 transition duration-300">
                      <div className="flex items-center">
                        <FiUpload className="mr-2" />
                        <span>เลือกรูปภาพ</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={URL.createObjectURL(imagePreview.file)}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setNewEquipment({ ...newEquipment, image: null });
                          }}
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/inventory')}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-all duration-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>กำลังเพิ่ม...</span>
                    </>
                  ) : (
                    <>
                      <FiPlusCircle className="w-5 h-5" />
                      <span>เพิ่มอุปกรณ์</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEquipmentForm;
