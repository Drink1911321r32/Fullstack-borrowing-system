import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiShield } from 'react-icons/fi';
import { getAllSettings } from '../../api/adminService';

const UserFormModal = ({ isOpen, onClose, onSubmit, user = null, isLoading = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    member_type: 'student', // student, teacher, staff
    student_code: '', // เฉพาะ student
    credit: 100
  });

  const [errors, setErrors] = useState({});
  const [defaultCredit, setDefaultCredit] = useState(100);

  // ดึงค่าเครดิตเริ่มต้นจาก settings
  useEffect(() => {
    const fetchDefaultCredit = async () => {
      try {
        const response = await getAllSettings();
        if (response.success) {
          const creditSetting = response.data.find(
            setting => setting.setting_key === 'default_user_credit'
          );
          if (creditSetting) {
            const credit = Number(creditSetting.setting_value) || 100;
            setDefaultCredit(credit);
          }
        }
      } catch (error) {
        console.error('Error fetching default credit:', error);
        // ใช้ค่า default 100 ถ้าเกิดข้อผิดพลาด
      }
    };
    
    fetchDefaultCredit();
  }, []);

  useEffect(() => {
    if (user) {
      // แก้ไขผู้ใช้
      setFormData({
        email: user.email || '',
        password: '', // ไม่แสดงรหัสผ่านเดิม
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        member_type: user.member_type || 'student',
        student_code: user.student_code || '',
        credit: user.credit || defaultCredit
      });
    } else {
      // สร้างผู้ใช้ใหม่ - ใช้ค่าเครดิตเริ่มต้นจาก settings
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        member_type: 'student',
        student_code: '',
        credit: defaultCredit
      });
    }
    setErrors({});
  }, [user, isOpen, defaultCredit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // ลบ error ของ field ที่กำลังแก้ไข
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

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'กรุณากรอกชื่อ';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'กรุณากรอกนามสกุล';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'กรุณากรอกอีเมล';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    // ตรวจสอบรหัสนักศึกษา (เฉพาะ student)
    if (formData.member_type === 'student' && formData.student_code) {
      const studentCodePattern = /^\d{11}-\d{1}$/;
      if (!studentCodePattern.test(formData.student_code)) {
        newErrors.student_code = 'รูปแบบรหัสนักศึกษาไม่ถูกต้อง (11 หลัก-1 หลัก)';
      }
    }

    if (!user) {
      // สำหรับสร้างผู้ใช้ใหม่
      if (!formData.password) {
        newErrors.password = 'กรุณากรอกรหัสผ่าน';
      } else if (formData.password.length < 6) {
        newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // ส่งข้อมูลไป (แปลงเป็น snake_case ตามที่ backend ต้องการ)
    const submitData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      member_type: formData.member_type,
      credit: formData.credit
    };
    
    // เพิ่ม student_code เฉพาะ student
    if (formData.member_type === 'student' && formData.student_code) {
      submitData.student_code = formData.student_code;
    }
    
    // เพิ่ม password เฉพาะกรณีสร้างใหม่หรือมีการเปลี่ยน
    if (!user || formData.password) {
      submitData.password = formData.password;
    }

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6 text-white rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black">
                {user ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </h2>
              <p className="text-indigo-100 text-sm mt-1 font-medium">
                {user ? `แก้ไขข้อมูลของ ${user.first_name} ${user.last_name}` : 'กรอกข้อมูลผู้ใช้ใหม่ให้ครบถ้วน'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-white hover:text-gray-200 text-3xl font-bold transition-colors disabled:opacity-50"
            >
              <FiX className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ชื่อ */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.first_name ? 'border-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="กรอกชื่อ"
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600 font-medium">{errors.first_name}</p>
              )}
            </div>

            {/* นามสกุล */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.last_name ? 'border-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="กรอกนามสกุล"
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600 font-medium">{errors.last_name}</p>
              )}
            </div>

            {/* อีเมล */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FiMail className="inline mr-2" />
                อีเมล <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="example@university.ac.th"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 font-medium">{errors.email}</p>
              )}
            </div>

            {/* รหัสผ่าน */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                รหัสผ่าน {!user && <span className="text-red-500">*</span>}
                {user && <span className="text-gray-500 text-xs font-normal ml-2">(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder={user ? 'กรอกรหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)' : 'กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)'}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 font-medium">{errors.password}</p>
              )}
            </div>

            {/* บทบาท */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FiShield className="inline mr-2" />
                ประเภทผู้ใช้
              </label>
              <select
                name="member_type"
                value={formData.member_type}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="student">นักเรียน</option>
                <option value="teacher">อาจารย์</option>
                <option value="staff">เจ้าหน้าที่</option>
              </select>
            </div>

            {/* รหัสนักศึกษา - แสดงเฉพาะ student */}
            {formData.member_type === 'student' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  รหัสนักศึกษา
                  <span className="text-gray-500 text-xs font-normal ml-2">(11 หลัก-1 หลัก)</span>
                </label>
                <input
                  type="text"
                  name="student_code"
                  value={formData.student_code}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    errors.student_code ? 'border-red-500' : 'border-gray-300'
                  } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  placeholder="12345678901-2"
                />
                {errors.student_code && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{errors.student_code}</p>
                )}
              </div>
            )}

            {/* เครดิต */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {user ? 'เครดิตปัจจุบัน' : 'เครดิตเริ่มต้น'}
                <span className="text-gray-500 text-xs font-normal ml-2">(ไม่สามารถแก้ไขได้)</span>
              </label>
              <input
                type="number"
                name="credit"
                value={formData.credit}
                onChange={handleChange}
                disabled={true}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-100 cursor-not-allowed"
                placeholder={defaultCredit.toString()}
              />
              {user ? (
                <p className="mt-1 text-sm text-amber-600 font-medium flex items-center">
                  <FiShield className="inline mr-1 w-4 h-4" />
                  ใช้ระบบจัดการเครดิตเพื่อเปลี่ยนแปลงเครดิต
                </p>
              ) : (
                <p className="mt-1 text-sm text-blue-600 font-medium flex items-center">
                  <FiShield className="inline mr-1 w-4 h-4" />
                  ระบบจะกำหนดเครดิตเริ่มต้น {defaultCredit} เครดิตให้อัตโนมัติ
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>{user ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มผู้ใช้'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
