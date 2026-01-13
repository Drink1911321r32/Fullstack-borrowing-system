import React, { useEffect, useState } from 'react';
import { FiX, FiAlertCircle, FiInfo, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = ''
}) => {
  // ปิด modal เมื่อกดปุ่ม Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // ป้องกันการ scroll ของ body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // กำหนดขนาดของ modal
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div 
        className={`
          bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} 
          max-h-[90vh] flex flex-col ${className}
          transform transition-all duration-300 animate-scaleIn
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors hover:rotate-90 transform duration-300"
              >
                <FiX size={24} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'ยืนยันการดำเนินการ',
  message = 'คุณแน่ใจที่จะดำเนินการนี้หรือไม่?',
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'danger', // 'danger', 'warning', 'info', 'success'
  isLoading = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleConfirm = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onConfirm();
      setIsAnimating(false);
    }, 200);
  };

  const typeStyles = {
    danger: {
      gradient: 'from-red-500 to-pink-600',
      confirmButton: 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/50',
      iconBg: 'bg-gradient-to-br from-red-100 to-pink-100',
      iconColor: 'text-red-600',
      ringColor: 'focus:ring-red-500',
      glowColor: 'shadow-red-500/20',
      icon: (
        <FiAlertCircle className="w-8 h-8" />
      )
    },
    warning: {
      gradient: 'from-amber-500 to-orange-600',
      confirmButton: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/50',
      iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100',
      iconColor: 'text-amber-600',
      ringColor: 'focus:ring-amber-500',
      glowColor: 'shadow-amber-500/20',
      icon: (
        <FiAlertTriangle className="w-8 h-8" />
      )
    },
    info: {
      gradient: 'from-blue-500 to-cyan-600',
      confirmButton: 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/50',
      iconBg: 'bg-gradient-to-br from-blue-100 to-cyan-100',
      iconColor: 'text-blue-600',
      ringColor: 'focus:ring-blue-500',
      glowColor: 'shadow-blue-500/20',
      icon: (
        <FiInfo className="w-8 h-8" />
      )
    },
    success: {
      gradient: 'from-emerald-500 to-teal-600',
      confirmButton: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/50',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-600',
      ringColor: 'focus:ring-emerald-500',
      glowColor: 'shadow-emerald-500/20',
      icon: (
        <FiCheckCircle className="w-8 h-8" />
      )
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className={`
          bg-white rounded-3xl shadow-2xl w-full max-w-md
          transform transition-all duration-500 animate-scaleIn
          ${typeStyles[type].glowColor} shadow-2xl
          ${isAnimating ? 'scale-95' : 'scale-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative header gradient */}
        <div className={`h-2 rounded-t-3xl bg-gradient-to-r ${typeStyles[type].gradient}`} />
        
        <div className="p-8">
          {/* Icon with animation */}
          <div className="relative">
            <div className={`
              w-20 h-20 mx-auto ${typeStyles[type].iconBg} rounded-full 
              flex items-center justify-center
              transform transition-all duration-500
              hover:scale-110 hover:rotate-12
              ${typeStyles[type].iconColor}
            `}>
              {typeStyles[type].icon}
            </div>
            {/* Pulse effect */}
            <div className={`
              absolute inset-0 w-20 h-20 mx-auto rounded-full 
              ${typeStyles[type].iconBg} opacity-75
              animate-ping
            `} style={{ animationDuration: '2s' }} />
          </div>
          
          {/* Title */}
          <h3 className="mt-6 text-2xl font-bold text-gray-900 text-center">
            {title}
          </h3>
          
          {/* Message */}
          <p className="mt-3 text-base text-gray-600 text-center leading-relaxed">
            {message}
          </p>
          
          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`
                flex-1 px-6 py-3.5 text-white text-base font-semibold rounded-xl
                transform transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-offset-2
                ${typeStyles[type].confirmButton}
                ${typeStyles[type].ringColor}
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังดำเนินการ...
                </>
              ) : (
                confirmText
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="
                flex-1 px-6 py-3.5 text-gray-700 text-base font-semibold rounded-xl
                bg-gray-100 hover:bg-gray-200
                transform transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-offset-2
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;