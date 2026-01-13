import React from 'react';
import { FiLogOut, FiX, FiAlertTriangle } from 'react-icons/fi';

const ConfirmLogoutModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      ></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fade-in-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FiAlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">ยืนยันการออกจากระบบ</h3>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="bg-red-100 rounded-full p-3">
                  <FiLogOut className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  คุณต้องการออกจากระบบหรือไม่?
                </p>
                <p className="text-gray-600 text-sm">
                  การออกจากระบบจะทำให้คุณต้องเข้าสู่ระบบอีกครั้งเมื่อต้องการใช้งาน
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 shadow-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <FiLogOut className="w-5 h-5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLogoutModal;
