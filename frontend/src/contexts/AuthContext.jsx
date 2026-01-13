import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '../hooks';
import Loading from '../components/common/Loading';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const authData = useAuthHook();
  
  // แสดง loading spinner ระหว่างตรวจสอบ authentication
  if (authData.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
};
