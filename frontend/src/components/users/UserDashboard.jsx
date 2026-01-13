import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiBox, FiClipboard, FiClock, FiAlertCircle, FiChevronRight, 
  FiCheckCircle, FiPackage
} from 'react-icons/fi';
import { borrowingAPI, disbursementAPI } from '../../api/api';
import { toast } from 'react-toastify';
import { STORAGE_KEYS } from '../../constants';

const UserDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [upcomingReturns, setUpcomingReturns] = useState([]);
  const [activeDisbursements, setActiveDisbursements] = useState([]);
  const [stats, setStats] = useState({
    totalBorrowed: 0,
    totalDisbursed: 0,
    pendingReturns: 0,
    totalPendingRequests: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // ฟังก์ชันสำหรับจัดรูปแบบวันที่และเวลา
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return '-';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}.${minutes}`;
    } catch (e) {
      return '-';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543;
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '-';
    }
  };

  useEffect(() => {
    const storedUserData = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        setUserData(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // ดึงข้อมูลการยืม-คืน
      const borrowingResponse = await borrowingAPI.getUserBorrowings();
      
      // ดึงข้อมูลการเบิกจ่าย
      const disbursementResponse = await disbursementAPI.getUserDisbursements();
      
      if (borrowingResponse.success) {
        const borrowings = borrowingResponse.data || [];
        
        // กรองรายการที่ approved/borrowed และยังไม่คืน
        const approved = borrowings.filter(b => 
          (b.status === 'Approved' || b.status === 'Borrowed') && !b.is_returned
        );
        
        // กรองรายการ pending
        const pending = borrowings.filter(b => b.status === 'Pending');
        
        setActiveLoans(approved);
        setPendingRequests(pending);
        
        // คำนวณรายการที่ใกล้ครบกำหนด
        const upcoming = approved.map(loan => {
          const returnDate = new Date(loan.expected_return_date);
          const today = new Date();
          const daysLeft = Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24));
          
          return {
            id: loan.transaction_id,
            itemName: loan.equipment_name || 'ไม่ระบุชื่อ',
            returnDate: new Date(loan.expected_return_date).toLocaleDateString('th-TH'),
            daysLeft: daysLeft
          };
        }).filter(item => item.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft);
        
        setUpcomingReturns(upcoming);
        
        // นับสถิติการยืม
        const totalBorrowed = borrowings.filter(b => 
          b.status === 'Approved' || 
          b.status === 'Borrowed' || 
          b.status === 'Returned' || 
          b.status === 'Completed' || 
          b.is_returned === 1
        ).length;
        
        setStats(prev => ({
          ...prev,
          totalBorrowed: totalBorrowed,
          pendingReturns: approved.length,
          totalPendingRequests: pending.length
        }));
      }
      
      if (disbursementResponse.success) {
        const disbursements = disbursementResponse.data || [];
        
        // กรองรายการที่ approved
        const approvedDisbursements = disbursements.filter(d => 
          d.status === 'Approved'
        );
        
        setActiveDisbursements(approvedDisbursements);
        
        // นับสถิติการเบิก
        const totalDisbursed = disbursements.filter(d => 
          d.status === 'Approved' || d.status === 'Completed'
        ).length;
        
        setStats(prev => ({
          ...prev,
          totalDisbursed: totalDisbursed
        }));
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">
            สวัสดี, {userData?.first_name || 'ผู้ใช้งาน'}! 👋
          </h1>
          <p className="text-indigo-100 text-sm">
            {new Date().toLocaleDateString('th-TH', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ยืมอุปกรณ์ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalBorrowed}</p>
                <p className="text-xs text-gray-400 mt-1">รายการ</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <FiBox className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">เบิกวัสดุทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalDisbursed}</p>
                <p className="text-xs text-gray-400 mt-1">รายการ</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                <FiClipboard className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">รอการคืน</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pendingReturns}</p>
                <p className="text-xs text-gray-400 mt-1">รายการ</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md">
                <FiClock className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Active Loans */}
          <div className="bg-white rounded-xl shadow-lg lg:col-span-2 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-indigo-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                  <FiBox className="mr-2 text-indigo-600" />
                  รายการที่ยืมอยู่
                </h2>
                <Link to="/user/history" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center group">
                  ดูทั้งหมด
                  <FiChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="p-5">
              {activeLoans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">รายการ</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">จำนวน</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">วันที่ยืม</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">กำหนดคืน</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">คืนเมื่อ</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeLoans.slice(0, 5).map((loan) => (
                        <tr key={loan.transaction_id} className="hover:bg-indigo-50 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">
                            {loan.equipment_name || 'ไม่ระบุชื่อ'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {loan.quantity_borrowed - (loan.total_returned || 0)} ชิ้น
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDateTime(loan.borrow_datetime || loan.borrow_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDateTime(loan.expected_return_datetime || loan.expected_return_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {loan.actual_return_datetime || loan.actual_return_date ? (
                              <span className="text-green-600 font-medium">
                                {formatDateTime(loan.actual_return_datetime || loan.actual_return_date)}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {loan.status === 'Approved' ? 'อนุมัติแล้ว' : 'กำลังยืม'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                    <FiPackage className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4 font-medium">ไม่มีรายการที่ยืมอยู่ในขณะนี้</p>
                  <Link to="/user/borrow" className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all">
                    <FiBox className="mr-2" />
                    ยืมอุปกรณ์
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Returns */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-orange-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <FiClock className="mr-2 text-orange-600" />
                ใกล้ครบกำหนด
              </h2>
            </div>
            <div className="p-5">
              {upcomingReturns.length > 0 ? (
                <div className="space-y-3">
                  {upcomingReturns.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                        item.daysLeft <= 3 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{item.itemName}</h3>
                      <p className="text-xs text-gray-600 mb-2 flex items-center">
                        <FiClock className="mr-1 w-3 h-3" />
                        {item.returnDate}
                      </p>
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        item.daysLeft <= 3 ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                      }`}>
                        <FiAlertCircle className="mr-1 w-3 h-3" />
                        {item.daysLeft === 0 ? 'ครบกำหนดวันนี้' : item.daysLeft === 1 ? 'เหลือ 1 วัน' : `เหลือ ${item.daysLeft} วัน`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                    <FiCheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">ไม่มีรายการที่ใกล้ครบกำหนด</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/user/borrow"
            className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl p-6 transition-all hover:scale-105"
          >
            <div className="relative z-10 flex items-center justify-between text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg mr-4 group-hover:bg-white/30 transition-colors">
                  <FiBox className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">ยืมอุปกรณ์</h3>
                  <p className="text-sm text-indigo-100">ค้นหาและยืมอุปกรณ์</p>
                </div>
              </div>
              <FiChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"></div>
          </Link>
          
          <Link 
            to="/user/disbursement"
            className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-teal-600 rounded-xl shadow-lg hover:shadow-xl p-6 transition-all hover:scale-105"
          >
            <div className="relative z-10 flex items-center justify-between text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg mr-4 group-hover:bg-white/30 transition-colors">
                  <FiClipboard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">เบิกวัสดุ</h3>
                  <p className="text-sm text-green-100">เบิกวัสดุสำนักงาน</p>
                </div>
              </div>
              <FiChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"></div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
