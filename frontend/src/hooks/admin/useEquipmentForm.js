import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { equipmentAPI } from '../../api/api';

/**
 * Custom Hook สำหรับ Add Equipment Form
 */
export const useEquipmentForm = (initialData = null) => {
  const [formData, setFormData] = useState({
    equipment_name: '',
    description: '',
    type_id: '',
    quantity: 0,
    model: '',
    manufacturer: '',
    location: '',
    image: null
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        equipment_name: initialData.equipment_name || '',
        description: initialData.description || '',
        type_id: initialData.type_id || '',
        quantity: initialData.quantity || 0,
        model: initialData.model || '',
        manufacturer: initialData.manufacturer || '',
        location: initialData.location || '',
        image: null
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.equipment_name?.trim()) newErrors.equipment_name = 'กรุณาระบุชื่ออุปกรณ์';
    if (!formData.type_id) newErrors.type_id = 'กรุณาเลือกประเภทอุปกรณ์';
    if (formData.quantity < 0) newErrors.quantity = 'จำนวนต้องไม่น้อยกว่า 0';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async (equipmentId = null) => {
    if (!validateForm()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return false;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (equipmentId) {
        await equipmentAPI.updateEquipment(equipmentId, formDataToSend);
        toast.success('แก้ไขอุปกรณ์สำเร็จ');
      } else {
        await equipmentAPI.createEquipment(formDataToSend);
        toast.success('เพิ่มอุปกรณ์สำเร็จ');
      }
      return true;
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    submitting,
    handleChange,
    handleFileChange,
    submitForm,
    setFormData
  };
};
