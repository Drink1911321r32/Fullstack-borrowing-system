import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// นำเข้าคอมโพเนนต์พื้นฐาน
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';
import About from './components/About';
import Contact from './components/Contact';

// นำเข้าคอมโพเนนต์ Admin
import Dashboard from './components/admin/Dashboard';
import AdminLayout from './components/admin/AdminLayout';
import AddCategory from './components/admin/AddCategory';
import AddEquipment from './components/admin/AddEquipment';
import InventorySystem from './components/admin/InventorySystem';
import AdminUsers from './components/admin/AdminUsers';
import BorrowingManagement from './components/admin/BorrowingManagement';
import DisbursementManagement from './components/admin/DisbursementManagement';
import AdminNotifications from './components/admin/AdminNotifications';
import AdminReports from './components/admin/AdminReports';
import AdminCreditManagement from './components/admin/CreditManagement';
import AdminCreditHistory from './components/admin/AdminCreditHistory';
import DisbursementHistory from './components/admin/DisbursementHistory';
import BorrowingHistory from './components/admin/BorrowingHistory';
import EquipmentReturn from './components/admin/EquipmentReturn';
import AdminProfile from './components/admin/AdminProfile';
import SystemSettings from './components/admin/SystemSettings';
import FacultyMajorManagement from './components/admin/FacultyMajorManagement';

// นำเข้าคอมโพเนนต์ User
import UserLayout from './components/users/UserLayout';
import UserDashboard from './components/users/UserDashboard';
import UserRequisition from './components/users/UserRequisition';
import UserHistory from './components/users/UserHistory';
import UserProfile from './components/users/UserProfile';
import BorrowEquipment from './components/users/BorrowEquipment';
import EquipmentBrowser from './components/users/EquipmentBrowser';
import DisbursementRequest from './components/users/DisbursementRequest';
import Notifications from './components/users/Notifications';
import UserReports from './components/users/UserReports';

// นำเข้าคอมโพเนนต์สำหรับ Error Handling
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          <Routes>
            {/* หน้าหลักจะเปลี่ยนเส้นทางไปยังหน้า Welcome */}
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            
            {/* หน้าสาธารณะที่ทุกคนเข้าถึงได้ */}
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* หน้า Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="faculties-majors" element={<FacultyMajorManagement />} />
              <Route path="borrowing" element={<BorrowingManagement />} />
              <Route path="return" element={<EquipmentReturn />} />
              <Route path="disbursement" element={<DisbursementManagement />} />
              <Route path="disbursement-history" element={<DisbursementHistory />} />
              <Route path="borrowing-history" element={<BorrowingHistory />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="inventory" element={<InventorySystem />} />
              <Route path="add-category" element={<AddCategory />} />
              <Route path="add-equipment" element={<AddEquipment />} />
              <Route path="credit-management" element={<AdminCreditManagement />} />
              <Route path="credit-history" element={<AdminCreditHistory />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* หน้า User */}
            <Route path="/user" element={
              <ProtectedRoute allowedRoles={['member']}>
                <UserLayout />
              </ProtectedRoute>
            }>
              <Route index element={<UserDashboard />} />
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="equipment" element={<EquipmentBrowser />} />
              <Route path="borrow" element={<BorrowEquipment />} />
              <Route path="disbursement" element={<DisbursementRequest />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="reports" element={<UserReports />} />
              <Route path="history" element={<UserHistory />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="requisition" element={<UserRequisition />} />
            </Route>

            {/* หน้า 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-indigo-600">404</h1>
                  <p className="text-2xl font-medium text-gray-600 mt-4">ไม่พบหน้าที่คุณต้องการ</p>
                  <div className="mt-8">
                    <a href="/welcome" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                      กลับสู่หน้าหลัก
                    </a>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </div>
        <ToastContainer 
          position="top-right" 
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ zIndex: 9999 }}
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;