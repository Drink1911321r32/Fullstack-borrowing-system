import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  FiUser, FiMail, FiLock, FiEdit2, FiSave, FiCreditCard, FiCalendar, 
  FiShield, FiAward, FiStar, FiTrendingUp, FiX, FiCheck, FiEye, FiEyeOff,
  FiCamera, FiTrash2, FiUpload, FiAlertTriangle
} from 'react-icons/fi';
import { useAuth } from '../../hooks';
import { userAPI } from '../../api/api';
import { STORAGE_KEYS } from '../../constants';

const UserProfile = () => {
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
    student_code: '',
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
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await userAPI.getUserProfile();
      if (response.success) {
        const user = response.data;
        setUserData(user);
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          student_code: user.student_code || '',
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
    
    // ลบข้อผิดพลาดเมื่อผู้ใช้แก้ไขข้อมูล
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // ตรวจสอบรหัสผ่านเฉพาะเมื่อผู้ใช้ต้องการเปลี่ยนรหัสผ่าน
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
      
      // ตรวจสอบว่ามีการเปลี่ยนรหัสผ่านหรือไม่
      if (!formData.new_password) {
        toast.error('กรุณากรอกรหัสผ่านใหม่ที่ต้องการเปลี่ยน');
        setIsLoading(false);
        return;
      }

      // เตรียมข้อมูลรหัสผ่านที่จะส่ง
      const updateData = {
        current_password: formData.current_password,
        new_password: formData.new_password
      };
      
      const response = await userAPI.updateProfile(updateData);
      
      if (response.success) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
        setIsEditing(false);
        
        // รีเซ็ตฟิลด์รหัสผ่าน
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
      }
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('เกิดข้อผิดพลาดในการอัพเดทโปรไฟล์');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // ตรวจสอบขนาดไฟล์ (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      const response = await userAPI.uploadProfileImage(file);
      
      if (response.success) {
        setUserData(response.data);
        toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
        
        // อัพเดทข้อมูลใน localStorage
        const updatedUserData = {
          ...currentUser,
          profile_image: response.data.profile_image
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUserData));
      }
    } catch (error) {
      console.error('Upload image error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
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
      const response = await userAPI.deleteProfileImage();
      
      if (response.success) {
        setUserData(response.data);
        toast.success('ลบรูปโปรไฟล์สำเร็จ');
        
        // อัพเดทข้อมูลใน localStorage
        const updatedUserData = {
          ...currentUser,
          profile_image: null
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUserData));
      }
    } catch (error) {
      console.error('Delete image error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบรูปภาพ');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (isLoading && !userData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header Section - Compact */}
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
                    <FiUser className="w-8 h-8" />
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
                    {userData?.role === 'admin' ? 'Admin' : 'User'}
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

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className={`rounded-xl shadow-md p-4 text-white ${
            (userData?.credit || 0) < 0 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : 'bg-gradient-to-br from-green-500 to-green-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiCreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-xs font-semibold ${
              (userData?.credit || 0) < 0 ? 'text-red-100' : 'text-green-100'
            }`}>เครดิตคงเหลือ</p>
            <p className="text-2xl font-bold mt-1">{userData?.credit || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiCalendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-blue-100">สมาชิกเมื่อ</p>
            <p className="text-sm font-bold mt-1">
              {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('th-TH', { 
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : 'ไม่ระบุ'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiAward className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-purple-100">สถานะบัญชี</p>
            <p className="text-lg font-bold mt-1">ใช้งานปกติ</p>
          </div>
        </div>        {/* Main Content - Compact */}
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg mr-2">
                      <FiUser className="text-white w-4 h-4" />
                    </div>
                    <label className="text-xs font-semibold text-blue-900">ชื่อ</label>
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
                
                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center mb-2">
                    <div className="p-1.5 bg-green-500 rounded-lg mr-2">
                      <FiMail className="text-white w-4 h-4" />
                    </div>
                    <label className="text-xs font-semibold text-green-900">อีเมล</label>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{userData?.email || 'ไม่ระบุ'}</p>
                </div>

                {userData?.student_code && (
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 bg-orange-500 rounded-lg mr-2">
                        <FiUser className="text-white w-4 h-4" />
                      </div>
                      <label className="text-xs font-semibold text-orange-900">รหัสนักศึกษา</label>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{userData.student_code}</p>
                  </div>
                )}
              </div>
              
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-xl border border-indigo-200 mt-4">
                <h3 className="font-bold text-indigo-900 mb-3 text-sm flex items-center gap-2">
                  <FiShield className="w-4 h-4" />
                  ข้อมูลบัญชี
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-lg">
                      <FiShield className="text-white w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-indigo-600 font-semibold">บทบาท</p>
                      <p className="text-gray-900 font-bold">
                        {userData?.role === 'admin' 
                          ? 'ผู้ดูแลระบบ' 
                          : userData?.member_type === 'student' 
                          ? 'นักศึกษา' 
                          : userData?.member_type === 'teacher' 
                          ? 'อาจารย์' 
                          : userData?.member_type === 'staff'
                          ? 'เจ้าหน้าที่'
                          : 'ผู้ใช้งาน'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <FiCalendar className="text-white w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-purple-600 font-semibold">วันที่สมัครสมาชิก</p>
                      <p className="text-gray-900 font-bold">
                        {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'ไม่ระบุ'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                    <FiEdit2 className="text-white w-6 h-6" />
                  </div>
                  แก้ไขข้อมูลส่วนตัว
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FiUser className="text-indigo-600" />
                      ชื่อ
                    </label>
                    <input
                      type="text"
                      value={userData?.first_name || ''}
                      readOnly
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FiUser className="text-purple-600" />
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      value={userData?.last_name || ''}
                      readOnly
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <FiMail className="text-green-600" />
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={userData?.email || ''}
                    readOnly
                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
                  />
                </div>

                {userData?.student_code && (
                  <div className="mt-4">
                    <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FiUser className="text-orange-600" />
                      รหัสนักศึกษา
                    </label>
                    <input
                      type="text"
                      value={userData.student_code}
                      readOnly
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
                    />
                  </div>
                )}

                {/* ข้อความแจ้งเตือน */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>หากต้องการแก้ไขข้อมูลส่วนตัว กรุณาติดต่อเจ้าหน้าที่</span>
                  </p>
                </div>
              </div>
              
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                    <FiLock className="text-white w-5 h-5" />
                  </div>
                  เปลี่ยนรหัสผ่าน
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FiLock className="text-orange-600" />
                      รหัสผ่านปัจจุบัน *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        name="current_password"
                        value={formData.current_password}
                        onChange={handleChange}
                        className={`w-full p-4 pr-12 border-2 rounded-2xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 font-medium ${
                          errors.current_password ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-orange-300'
                        }`}
                        placeholder="กรอกรหัสผ่านปัจจุบัน"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword.current ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.current_password && (
                      <p className="text-red-600 text-sm mt-2 font-semibold flex items-center gap-1">
                        <FiX className="w-4 h-4" />
                        {errors.current_password}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <FiLock className="text-blue-600" />
                        รหัสผ่านใหม่ *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? "text" : "password"}
                          name="new_password"
                          value={formData.new_password}
                          onChange={handleChange}
                          className={`w-full p-4 pr-12 border-2 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 font-medium ${
                            errors.new_password ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                          placeholder="กรอกรหัสผ่านใหม่"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword.new ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.new_password && (
                        <p className="text-red-600 text-sm mt-2 font-semibold flex items-center gap-1">
                          <FiX className="w-4 h-4" />
                          {errors.new_password}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <FiLock className="text-purple-600" />
                        ยืนยันรหัสผ่านใหม่ *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? "text" : "password"}
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          className={`w-full p-4 pr-12 border-2 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200 font-medium ${
                            errors.confirm_password ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                          }`}
                          placeholder="ยืนยันรหัสผ่านใหม่"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword.confirm ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-red-600 text-sm mt-2 font-semibold flex items-center gap-1">
                          <FiX className="w-4 h-4" />
                          {errors.confirm_password}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-8 border-t-2 border-gray-200">
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
                  className="px-6 py-3 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 disabled:opacity-50 font-semibold shadow-md transition-all duration-200 flex items-center gap-2"
                  disabled={isLoading}
                >
                  <FiX className="w-5 h-5" />
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 font-semibold shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-5 h-5" />
                      บันทึกการเปลี่ยนแปลง
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

export default UserProfile;