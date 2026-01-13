import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import Loading from './Loading';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // ตรวจสอบทั้ง role และ user_type (backend ส่งมาเป็น user_type)
  const userRole = user?.role || user?.user_type;

  // ถ้ายังกำลัง loading ให้แสดง loading spinner
  if (isLoading) {
    return <Loading />;
  }

  // ถ้ายังไม่ได้ล็อกอิน ให้ redirect ไปหน้า login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงหน้านี้หรือไม่
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // ถ้าเป็น admin ให้ไปหน้า admin, ถ้าเป็น member ให้ไปหน้า user
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/user/dashboard" replace />;
    }
  }

  // ถ้าผ่านการตรวจสอบทั้งหมด ให้แสดงคอมโพเนนต์ลูก
  return children;
};

export default ProtectedRoute;