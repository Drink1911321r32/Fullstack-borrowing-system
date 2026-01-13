// API Interceptors สำหรับจัดการ request และ response
import axios from 'axios';
import { toast } from 'react-toastify';
import { STORAGE_KEYS } from '../constants';

export const setupInterceptors = (API) => {
  // Request interceptor - เพิ่ม token ในทุก request
  API.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - จัดการ error response
  API.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      const { response } = error;

      if (response) {
        switch (response.status) {
          case 401:
            // Token หมดอายุหรือไม่ถูกต้อง
            // ตรวจสอบว่าอยู่หน้า login หรือไม่ ถ้าใช่ก็ไม่ต้อง redirect
            const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
            
            if (!isLoginPage) {
              localStorage.removeItem(STORAGE_KEYS.TOKEN);
              localStorage.removeItem(STORAGE_KEYS.USER);
              toast.error('กรุณาเข้าสู่ระบบใหม่');
              window.location.href = '/login';
            }
            // ถ้าอยู่ในหน้า login ให้ component จัดการ error เอง
            break;
          
          case 403:
            toast.error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
            break;
          
          case 404:
            // toast.error('ไม่พบข้อมูลที่ร้องขอ'); // ปิดแจ้งเตือนนี้เพื่อไม่ให้ซ้ำซ้อน
            break;
          
          case 422:
            // Validation errors
            if (response.data.errors) {
              Object.values(response.data.errors).forEach(error => {
                toast.error(error[0]);
              });
            } else {
              toast.error('ข้อมูลไม่ถูกต้อง');
            }
            break;
          
          case 500:
            toast.error('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง');
            break;
          
          case 400:
            // ไม่แสดง toast ที่นี่ ให้ component จัดการเอง
            // เพราะบางครั้งต้องการ custom message
            break;
          
          default:
            // เฉพาะ error ที่ไม่ได้จัดการข้างต้น
            if (response.status >= 500) {
              toast.error(response.data?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
            }
        }
      } else {
        // Network error
        toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      }

      return Promise.reject(error);
    }
  );

  return API;
};