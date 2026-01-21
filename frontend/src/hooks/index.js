import { useState, useEffect } from 'react';
import { userAPI } from '../api/api';
import { STORAGE_KEYS } from '../constants';

// ฟังก์ชันตรวจสอบ token expiry
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // แปลงเป็น milliseconds
    const now = Date.now();
    
    // ตรวจสอบว่า token จะหมดอายุใน 5 นาที
    return now >= expiry - (5 * 60 * 1000);
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

// Custom hook สำหรับจัดการ Authentication ด้วย JWT
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skipValidation, setSkipValidation] = useState(false);

  // ตรวจสอบ token เมื่อ component mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      
      if (storedToken && storedUser) {
        // ตรวจสอบว่า token หมดอายุหรือไม่
        if (isTokenExpired(storedToken)) {
          console.warn('⚠️ Token expired, clearing auth data');
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          setIsLoading(false);
          return;
        }
        
        try {
          // ตั้งค่า token และ user จาก localStorage
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // ข้าม validation ถ้าเพิ่ง login
          if (!skipValidation) {
            // ตรวจสอบว่า token ยังใช้งานได้โดยการเรียก API
            try {
              await userAPI.getUserProfile();
            } catch (validationError) {
              console.warn('⚠️ Token validation failed:', validationError);
              // ถ้า token หมดอายุ ให้ logout
              throw validationError;
            }
          }
        } catch (error) {
          console.warn('❌ Auth initialization error:', error);
          // ล้าง auth data ถ้าเกิดข้อผิดพลาด
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
      setSkipValidation(false);
    };

    initializeAuth();
  }, [token, skipValidation]);

  // ตรวจสอบ token expiry ทุก 5 นาที
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      if (isTokenExpired(token)) {
        console.warn('⚠️ Token expired during session, logging out');
        logout();
      }
    };

    // ตรวจสอบทันทีและทุก 5 นาที
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [token]);

  const login = (userData, authToken) => {
    // บันทึก token, user data และเวลา login
    localStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem('token_timestamp', Date.now().toString());
    
    setSkipValidation(true); // ข้าม validation เมื่อ login ใหม่
    setToken(authToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      // ส่งคำขอ logout ไปยัง server (สำหรับ JWT นี่เป็นการแจ้งเตือนเท่านั้น)
      await userAPI.logout();
    } catch (error) {
      console.warn('⚠️ Server logout failed:', error);
    } finally {
      // ลบข้อมูลทั้งหมดจาก localStorage
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem('token_timestamp');
      setToken(null);
      setUser(null);
    }
  };

  const isAuthenticated = () => {
    return !!(token && user);
  };

  const isAdmin = () => {
    return user?.user_type === 'admin' || user?.role === 'admin';
  };

  const isMember = () => {
    return user?.user_type === 'member';
  };

  const getMemberType = () => {
    return user?.member_type; // 'student', 'teacher', 'staff'
  };

  const refreshUserData = async () => {
    try {
      const response = await userAPI.getUserProfile();
      if (response.data && response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isMember,
    getMemberType,
    refreshUserData
  };
};

// Custom hook สำหรับ API calls
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callApi = async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
      setLoading(false);
      throw err;
    }
  };

  return { loading, error, callApi, setError };
};

// Custom hook สำหรับ Local Storage
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Custom hook สำหรับ Form validation
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    // ล้าง error เมื่อผู้ใช้เริ่มพิมพ์
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const validate = () => {
    const newErrors = {};

    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = values[field];

      for (const rule of rules) {
        if (!rule.test(value)) {
          newErrors[field] = rule.message;
          break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};

// ===== Export New Modular Hooks =====
// Admin Hooks
export { useEquipmentItems } from './admin/useEquipmentItems';
export { useInventory } from './admin/useInventory';
export { useBorrowingManagement } from './admin/useBorrowingManagement';
export { useEquipmentForm } from './admin/useEquipmentForm';

// User Hooks
export { useBorrowEquipment } from './user/useBorrowEquipment';