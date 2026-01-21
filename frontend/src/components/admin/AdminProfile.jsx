import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  FiUser, FiMail, FiLock, FiEdit2, FiSave, FiCalendar, 
  FiShield, FiX, FiCheck, FiEye, FiEyeOff, FiCamera, FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../../hooks';
import { getAdminProfile, updateAdminProfile, uploadAdminProfileImage, deleteAdminProfileImage } from '../../api/adminService';
import { STORAGE_KEYS } from '../../constants';

const AdminProfile = () => {
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setIsLoading(true);
      const response = await getAdminProfile();
      if (response.success) {
        const user = response.data;
        setUserData(user);
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
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
    
    if (formData.new_password) {
      if (!formData.current_password) {
        newErrors.current_password = 'กรุณากรอกรหัสผ่านปัจจุบัน';
      }
      
      if (formData.new_password.length < 6) {
        newErrors.new_password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      }
      
      if (formData.new_password !== formData.confirm_password) {
        newErrors.confirm_password = 'รหัสผ่านไม่ตรงกัน';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('กรุณาแก้ไขข้อมูลให้ถูกต้อง');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      };
      
      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }
      
      const response = await updateAdminProfile(updateData);
      
      if (response.success) {
        setUserData(response.data);
        
        const updatedUserData = {
          ...currentUser,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUserData));
        
        toast.success('อัพเดทโปรไฟล์สำเร็จ');
        setIsEditing(false);
        
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัพเดทโปรไฟล์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      const response = await uploadAdminProfileImage(file);
      
      if (response.success) {
        setUserData(response.data);
        toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
        
        const updatedUserData = {
          ...currentUser,
          profile_image: response.data.profile_image
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUserData));
        
        // รีโหลดหน้าเพื่ออัปเดตรูปใน layout
        window.location.reload();
      }
    } catch (error) {
      console.error('Upload image error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm('คุณต้องการลบรูปโปรไฟล์ใช่หรือไม่?')) {
      return;
    }

    try {
      setIsUploadingImage(true);
      const response = await deleteAdminProfileImage();
      
      if (response.success) {
        setUserData(response.data);
        toast.success('ลบรูปโปรไฟล์สำเร็จ');
        
        const updatedUserData = {
          ...currentUser,
          profile_image: null
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUserData));
        
        // รีโหลดหน้าเพื่ออัปเดตรูปใน layout
        window.location.reload();
      }
    } catch (error) {
      console.error('Delete image error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลบรูปภาพ');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (isLoading && !userData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <p className="text-gray-700 font-bold text-lg">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30 overflow-hidden">
                  {userData?.profile_image ? (
                    <img 
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${userData.profile_image}`}
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{ display: userData?.profile_image ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                    <FiShield className="w-8 h-8" />
                  </div>
                </div>
                
                {/* ไอคอนสถานะ Online */}
                <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <FiCheck className="w-2.5 h-2.5 text-white" />
                </div>
                
                {/* ปุ่มอัปโหลดรูป */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors border-2 border-indigo-600 opacity-0 group-hover:opacity-100 transform duration-200"
                  title="เปลี่ยนรูปโปรไฟล์"
                >
                  <FiCamera className="w-3.5 h-3.5 text-indigo-600" />
                </button>
                
                {/* ปุ่มลบรูป */}
                {userData?.profile_image && (
                  <button
                    onClick={handleDeleteImage}
                    disabled={isUploadingImage}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors border-2 border-white opacity-0 group-hover:opacity-100 transform duration-200"
                    title="ลบรูปโปรไฟล์"
                  >
                    <FiTrash2 className="w-3 h-3 text-white" />
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {userData?.first_name} {userData?.last_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-indigo-100 text-sm">
                  <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <FiMail className="w-3 h-3" />
                    {userData?.email}
                  </span>
                  <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <FiShield className="w-3 h-3" />
                    ผู้ดูแลระบบ
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-xl font-semibold shadow-md transition-all duration-200 flex items-center gap-2 text-sm ${
                isEditing 
                  ? 'bg-white/20 backdrop-blur-sm hover:bg-white/30' 
                  : 'bg-white text-indigo-600 hover:shadow-lg'
              }`}
              disabled={isLoading}
            >
              {isEditing ? (
                <>
                  <FiX className="w-4 h-4" /> ยกเลิก
                </>
              ) : (
                <>
                  <FiEdit2 className="w-4 h-4" /> แก้ไข
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiShield className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-indigo-100">สิทธิ์การใช้งาน</p>
            <p className="text-2xl font-bold mt-1">Administrator</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiCalendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-purple-100">สมาชิกเมื่อ</p>
            <p className="text-sm font-bold mt-1">
              {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('th-TH', { 
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : 'ไม่ระบุ'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="p-4">
            {!isEditing ? (
              // Display Mode
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <FiUser className="text-white w-4 h-4" />
                  </div>
                  ข้อมูลส่วนตัว
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 bg-indigo-500 rounded-lg mr-2">
                        <FiUser className="text-white w-4 h-4" />
                      </div>
                      <label className="text-xs font-semibold text-indigo-900">ชื่อ</label>
                    </div>
                    <p className="text-base font-bold text-gray-900">{userData?.first_name || 'ไม่ระบุ'}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 bg-purple-500 rounded-lg mr-2">
                        <FiUser className="text-white w-4 h-4" />
                      </div>
                      <label className="text-xs font-semibold text-purple-900">นามสกุล</label>
                    </div>
                    <p className="text-base font-bold text-gray-900">{userData?.last_name || 'ไม่ระบุ'}</p>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-red-50 p-4 rounded-xl border border-pink-200 md:col-span-2">
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 bg-pink-500 rounded-lg mr-2">
                        <FiMail className="text-white w-4 h-4" />
                      </div>
                      <label className="text-xs font-semibold text-pink-900">อีเมล</label>
                    </div>
                    <p className="text-base font-bold text-gray-900">{userData?.email || 'ไม่ระบุ'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <FiEdit2 className="text-white w-4 h-4" />
                  </div>
                  แก้ไขข้อมูลส่วนตัว
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ชื่อ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                        errors.first_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="กรอกชื่อ"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                        errors.last_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="กรอกนามสกุล"
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      อีเมล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="กรอกอีเมล"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Change Password Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                      <FiLock className="text-white w-4 h-4" />
                    </div>
                    เปลี่ยนรหัสผ่าน (ถ้าต้องการ)
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        รหัสผ่านปัจจุบัน
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? 'text' : 'password'}
                          name="current_password"
                          value={formData.current_password}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                            errors.current_password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="กรอกรหัสผ่านปัจจุบัน"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword.current ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {errors.current_password && (
                        <p className="text-red-500 text-xs mt-1">{errors.current_password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        รหัสผ่านใหม่
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? 'text' : 'password'}
                          name="new_password"
                          value={formData.new_password}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                            errors.new_password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="กรอกรหัสผ่านใหม่"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword.new ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {errors.new_password && (
                        <p className="text-red-500 text-xs mt-1">{errors.new_password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? 'text' : 'password'}
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                            errors.confirm_password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="ยืนยันรหัสผ่านใหม่"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        first_name: userData?.first_name || '',
                        last_name: userData?.last_name || '',
                        email: userData?.email || '',
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                      });
                      setErrors({});
                    }}
                    className="px-6 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    disabled={isLoading}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
