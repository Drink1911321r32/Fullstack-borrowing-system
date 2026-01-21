import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiSettings, FiSave, FiRefreshCw, FiDollarSign, FiUsers, FiClock,
  FiToggleLeft, FiToggleRight, FiAlertCircle, FiCheckCircle, FiX
} from 'react-icons/fi';
import { getAllSettings, updateSetting } from '../../api/adminService';

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [confirmModal, setConfirmModal] = useState({ show: false, settingKey: null });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getAllSettings();
      if (response.success) {
        setSettings(response.data);
        
        // Initialize edited values
        const initialValues = {};
        response.data.forEach(setting => {
          initialValues[setting.setting_key] = setting.setting_value;
        });
        setEditedValues(initialValues);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key, value) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (key) => {
    // แสดง Confirmation Modal
    setConfirmModal({ show: true, settingKey: key });
  };

  const confirmSave = async () => {
    const key = confirmModal.settingKey;
    setConfirmModal({ show: false, settingKey: null });

    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const response = await updateSetting(key, editedValues[key]);
      if (response.success) {
        toast.success('บันทึกการตั้งค่าสำเร็จ');
        
        // Update local state
        setSettings(prev =>
          prev.map(s =>
            s.setting_key === key
              ? { ...s, setting_value: editedValues[key] }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error(error.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const cancelSave = () => {
    setConfirmModal({ show: false, settingKey: null });
  };

  const getSettingIcon = (key) => {
    switch (key) {
      case 'default_user_credit':
        return <FiDollarSign className="w-5 h-5" />;
      case 'penalty_credit_per_hour':
        return <FiClock className="w-5 h-5" />;
      case 'system_name':
        return <FiSettings className="w-5 h-5" />;
      case 'max_borrow_days':
        return <FiClock className="w-5 h-5" />;
      case 'allow_registration':
        return <FiUsers className="w-5 h-5" />;
      default:
        return <FiSettings className="w-5 h-5" />;
    }
  };

  const getSettingLabel = (setting) => {
    // Dynamic label for penalty_credit_per_hour based on penalty_type
    if (setting.setting_key === 'penalty_credit_per_hour') {
      const penaltyType = editedValues['penalty_type'] || 'hour';
      if (penaltyType === 'day') {
        return 'ค่าปรับต่อวัน (เครดิต)';
      } else {
        return 'ค่าปรับต่อชั่วโมง (เครดิต)';
      }
    }
    return setting.description || setting.setting_key;
  };

  const renderInput = (setting) => {
    const { setting_key, setting_type } = setting;
    const value = editedValues[setting_key] || '';

    // Special case for penalty_type - use dropdown
    if (setting_key === 'penalty_type') {
      return (
        <select
          value={value}
          onChange={(e) => handleValueChange(setting_key, e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
        >
          <option value="day">day (รายวัน)</option>
          <option value="hour">hour (รายชั่วโมง)</option>
        </select>
      );
    }

    switch (setting_type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleValueChange(setting_key, value === 'true' ? 'false' : 'true')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                value === 'true'
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
              }`}
            >
              {value === 'true' ? (
                <>
                  <FiToggleRight className="w-6 h-6" />
                  <span className="font-medium">เปิดใช้งาน</span>
                </>
              ) : (
                <>
                  <FiToggleLeft className="w-6 h-6" />
                  <span className="font-medium">ปิดใช้งาน</span>
                </>
              )}
            </button>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting_key, e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            min="0"
            max={
              setting_key === 'default_user_credit' ? '10000' : 
              setting_key === 'penalty_credit_per_hour' ? '100' :
              undefined
            }
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(setting_key, e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        );
    }
  };

  const hasChanged = (key) => {
    const original = settings.find(s => s.setting_key === key);
    return original && editedValues[key] !== original.setting_value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดการตั้งค่า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 md:p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-2 md:p-3 rounded-xl border border-white/30">
                  <FiSettings className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">ตั้งค่าระบบ</h1>
                  <p className="text-sm md:text-base text-indigo-100 mt-1 font-medium">จัดการการตั้งค่าต่างๆ ของระบบ</p>
                </div>
              </div>
              <button
                onClick={fetchSettings}
                className="bg-white/20 hover:bg-white/30 p-2 md:p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
              >
                <FiRefreshCw className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.setting_key}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                {/* Icon */}
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-2 md:p-3 rounded-xl">
                  {getSettingIcon(setting.setting_key)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">
                        {getSettingLabel(setting)}
                      </h3>
                    </div>
                    {hasChanged(setting.setting_key) && (
                      <span className="flex items-center text-orange-600 text-sm font-medium">
                        <FiAlertCircle className="w-4 h-4 mr-1" />
                        มีการเปลี่ยนแปลง
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
                    {renderInput(setting)}
                    
                    <button
                      onClick={() => handleSave(setting.setting_key)}
                      disabled={!hasChanged(setting.setting_key) || saving[setting.setting_key]}
                      className={`w-full sm:w-auto px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                        hasChanged(setting.setting_key) && !saving[setting.setting_key]
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {saving[setting.setting_key] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>กำลังบันทึก...</span>
                        </>
                      ) : (
                        <>
                          <FiSave className="w-4 h-4" />
                          <span>บันทึก</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 md:mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6">
          <div className="flex items-start space-x-3">
            <FiAlertCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">คำแนะนำ</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>เครดิตเริ่มต้น:</strong> จะใช้เป็นเครดิตสำหรับผู้ใช้ใหม่ที่สมัครสมาชิก</li>
                <li>• <strong>ค่าปรับ:</strong> จำนวนเครดิตที่หักเมื่อคืนช้า (คำนวณตามประเภทที่เลือก: รายวันหรือรายชั่วโมง)</li>
                <li>• <strong>ประเภทการคำนวณค่าปรับ:</strong> เลือก "day" สำหรับคิดค่าปรับรายวัน หรือ "hour" สำหรับคิดค่าปรับรายชั่วโมง</li>
                <li>• <strong>ชื่อระบบ:</strong> แสดงในหน้าหลักและหน้าต่างๆ ของระบบ</li>
                <li>• <strong>จำนวนวันยืมสูงสุด:</strong> กำหนดระยะเวลาการยืมสูงสุด</li>
                <li>• <strong>อนุญาตให้สมัครสมาชิก:</strong> เปิด/ปิดการสมัครสมาชิกใหม่</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmModal.show && (() => {
          const setting = settings.find(s => s.setting_key === confirmModal.settingKey);
          const settingName = setting?.description || confirmModal.settingKey;
          const oldValue = setting?.setting_value;
          const newValue = editedValues[confirmModal.settingKey];
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scaleIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <FiAlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">ยืนยันการบันทึก</h3>
                    </div>
                    <button
                      onClick={cancelSave}
                      className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-700 mb-4">คุณต้องการบันทึกการเปลี่ยนแปลงนี้หรือไม่?</p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">การตั้งค่า</p>
                      <p className="text-gray-900 font-semibold">{settingName}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">ค่าเดิม</p>
                        <div className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                          <p className="text-gray-700 font-medium">
                            {oldValue === 'true' ? 'เปิดใช้งาน' : 
                             oldValue === 'false' ? 'ปิดใช้งาน' : 
                             oldValue}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">ค่าใหม่</p>
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 px-3 py-2 rounded-lg border-2 border-indigo-200">
                          <p className="text-indigo-700 font-bold">
                            {newValue === 'true' ? 'เปิดใช้งาน' : 
                             newValue === 'false' ? 'ปิดใช้งาน' : 
                             newValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        การเปลี่ยนแปลงนี้จะมีผลทันทีหลังจากบันทึก
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 md:px-6 py-4 bg-gray-50 rounded-b-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <button
                    onClick={cancelSave}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmSave}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <FiCheckCircle className="w-5 h-5" />
                    <span>ยืนยันการบันทึก</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SystemSettings;
