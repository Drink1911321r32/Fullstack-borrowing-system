import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiUsers, FiBox, FiCreditCard, FiActivity,
  FiServer, FiAlertCircle, FiCheckCircle, FiBarChart,
  FiPackage, FiShoppingBag, FiArrowUp, FiArrowDown, FiRefreshCw,
  FiCalendar, FiBell, FiStar, FiZap, FiTrendingUp, FiClock, FiEye
} from 'react-icons/fi';
import { getDashboardStats } from '../../api/adminService';
import { getLocalDateString } from '../../utils';
import { STORAGE_KEYS } from '../../constants';
import Loading from '../common/Loading';

const StatCard = ({ title, value, icon: Icon, gradient, trend, trendValue, subtitle, delay = 0 }) => (
  <div
    className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 transform hover:-translate-y-2 ${gradient} animate-fadeInUp`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-all duration-300 group">
          <Icon className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse ${trend === 'up' ? 'bg-green-400/40 backdrop-blur-sm' : 'bg-red-400/40 backdrop-blur-sm'
            }`}>
            {trend === 'up' ? <FiArrowUp className="w-4 h-4 animate-bounce" /> : <FiArrowDown className="w-4 h-4 animate-bounce" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-white/90 mb-2 tracking-wide uppercase">{title}</p>
      <p className="text-4xl font-black mb-3 tracking-tight">{value}</p>
      {subtitle && <p className="text-sm text-white/80 font-medium">{subtitle}</p>}
    </div>
    <div className="absolute top-0 right-0 -mt-6 -mr-6 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
    <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
  </div>
);

const ActivityChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end justify-between space-x-3 h-48">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center group">
          <div className="relative w-full">
            <div
              className="w-full bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-400 rounded-t-2xl transition-all duration-700 hover:from-indigo-700 hover:via-indigo-600 hover:to-indigo-500 shadow-lg group-hover:shadow-2xl cursor-pointer transform group-hover:scale-105"
              style={{
                height: `${(item.value / maxValue) * 180}px`,
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xl">
                  {item.value}
                </div>
              </div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-700 mt-3 group-hover:text-indigo-600 transition-colors">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const RecentActivity = ({ activities }) => (
  <div className="space-y-2">
    {activities.slice(0, 4).map((activity, index) => (
      <div
        key={index}
        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${activity.color} mr-3 flex-shrink-0`}>
            <activity.icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{activity.user}</p>
            <p className="text-xs text-gray-500 truncate">{activity.action}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${activity.statusColor}`}>
            {activity.status}
          </span>
          <span className="text-xs text-gray-400 hidden sm:block">{activity.time}</span>
        </div>
      </div>
    ))}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: {},
    equipment: {
      total_equipment: 0,
      total_equipment_types: 0,
      total_quantity: 0,
      loan_quantity: 0,
      disbursement_quantity: 0,
      available_quantity: 0,
      available_loan_quantity: 0,
      available_disbursement_quantity: 0,
      borrowed_quantity: 0,
      maintenance_quantity: 0,
      damaged_quantity: 0
    },
    borrowings: {},
    disbursements: {},
    recentActivities: [],
    weeklyStats: []
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // เชื่อมต่อ SSE สำหรับ real-time updates
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!token) {
      console.warn('⚠️ No token found, skipping SSE connection');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    let eventSource = null;

    const connectSSE = () => {
      try {
        // SSE ไม่รองรับ custom headers ต้องส่ง token ผ่าน query string
        eventSource = new EventSource(`${API_URL}/api/admin/dashboard/stream?token=${token}`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'connected') {
            } else if (data.type === 'stats-update') {
              // อัพเดต stats ทันทีเมื่อได้รับข้อมูลใหม่
              setStats(prevStats => ({
                ...prevStats,
                users: data.data.users || prevStats.users,
                equipment: data.data.equipment || prevStats.equipment,
                borrowings: data.data.borrowings || prevStats.borrowings,
                disbursements: data.data.disbursements || prevStats.disbursements
              }));
              setLastUpdated(new Date());
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.warn('⚠️ Dashboard SSE disconnected, will retry...', error.type);
          eventSource?.close();

          // Reconnect after 5 seconds
          setTimeout(() => {
            connectSSE();
          }, 5000);
        };
      } catch (error) {
        console.error('Error creating Dashboard EventSource:', error);
      }
    };

    connectSSE();

    // Cleanup
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();

      if (response && response.success && response.data) {
        // Map only the correct structure for stats
        setStats(prev => ({
          ...prev,
          ...response.data,
          equipment: response.data.equipment || prev.equipment,
          users: response.data.users || prev.users,
          borrowings: response.data.borrowings || prev.borrowings,
          disbursements: response.data.disbursements || prev.disbursements
        }));
        setLastUpdated(new Date());
      } else {
        console.warn('⚠️ Invalid response format:', response);
        toast.warning('ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.dismiss(); // Dismiss all previous toasts
    toast.info('กำลังรีเฟรชข้อมูล...');
    fetchDashboardData();
  };

  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'กำลังโหลด...';

    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffSecs < 60) return `อัพเดตเมื่อ ${diffSecs} วินาทีที่แล้ว`;
    if (diffMins < 60) return `อัพเดตเมื่อ ${diffMins} นาทีที่แล้ว`;
    return `อัพเดตเมื่อ ${lastUpdated.toLocaleTimeString('th-TH')}`;
  };

  // แปลง weeklyStats ให้เป็นรูปแบบที่ใช้แสดงผล
  const getWeeklyChartData = () => {
    const daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      const dateStr = getLocalDateString(date);

      const statForDay = stats.weeklyStats.find(s => s.date === dateStr);
      last7Days.push({
        label: dayName,
        value: statForDay ? statForDay.count : 0
      });
    }

    return last7Days;
  };

  // แปลง recentActivities ให้เป็นรูปแบบที่ใช้แสดงผล
  const getFormattedActivities = () => {
    return stats.recentActivities.map(activity => {
      const transactionTypeMap = {
        'borrow': 'ยืม',
        'disbursement': 'เบิก',
        'return': 'คืน'
      };

      const statusColorMap = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'approved': 'bg-blue-100 text-blue-800',
        'active': 'bg-green-100 text-green-800',
        'returned': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800',
        'overdue': 'bg-red-100 text-red-800'
      };

      const iconMap = {
        'borrow': FiBox,
        'disbursement': FiPackage,
        'return': FiCheckCircle
      };

      const colorMap = {
        'borrow': 'bg-gradient-to-br from-blue-500 to-blue-600',
        'disbursement': 'bg-gradient-to-br from-green-500 to-green-600',
        'return': 'bg-gradient-to-br from-purple-500 to-purple-600'
      };

      const statusMap = {
        'pending': 'รออนุมัติ',
        'approved': 'อนุมัติ',
        'active': 'กำลังยืม',
        'returned': 'คืนแล้ว',
        'completed': 'สำเร็จ',
        'rejected': 'ไม่อนุมัติ',
        'overdue': 'เกินกำหนด'
      };

      const timeAgo = (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        return `${diffDays} วันที่แล้ว`;
      };

      return {
        user: `${activity.first_name || ''} ${activity.last_name || ''}`.trim() || 'ไม่ระบุชื่อ',
        action: `${transactionTypeMap[activity.transaction_type] || activity.transaction_type} ${activity.equipment_name || 'อุปกรณ์'}${activity.quantity > 1 ? ` (${activity.quantity} ชิ้น)` : ''}`,
        status: statusMap[activity.status] || activity.status,
        statusColor: statusColorMap[activity.status] || 'bg-gray-100 text-gray-800',
        time: timeAgo(activity.created_at),
        icon: iconMap[activity.transaction_type] || FiActivity,
        color: colorMap[activity.transaction_type] || 'bg-gradient-to-br from-gray-500 to-gray-600'
      };
    });
  };

  if (loading) {
    return <Loading />;
  }

  const weeklyData = getWeeklyChartData();
  const recentActivities = getFormattedActivities();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 animate-fadeIn">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
        .header-decoration {
          position: relative;
          z-index: 0;
          overflow: visible;
        }
        .header-decoration::before {
          content: '';
          position: absolute;
          top: -4rem;
          right: -4rem;
          width: 16rem;
          height: 16rem;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.1);
          filter: blur(3rem);
          pointer-events: none;
          z-index: -1;
        }
        .header-decoration::after {
          content: '';
          position: absolute;
          bottom: -4rem;
          left: -4rem;
          width: 20rem;
          height: 20rem;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.1);
          filter: blur(2rem);
          pointer-events: none;
          z-index: -1;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="header-decoration relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-5xl font-black mb-3 tracking-tight">
                แดชบอร์ดผู้ดูแลระบบ ✨
              </h1>
              <p className="text-indigo-100 text-lg font-medium flex items-center">
                <FiCalendar className="mr-2" />
                {currentTime.toLocaleDateString('th-TH', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                <span className="mx-3">•</span>
                <FiClock className="mr-2" />
                {currentTime.toLocaleTimeString('th-TH')}
              </p>
              <p className="text-indigo-200 text-sm font-medium mt-2 flex items-center">
                <FiRefreshCw className="mr-2 w-4 h-4" />
                {getLastUpdatedText()}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/30 flex items-center shadow-xl hover:shadow-2xl transition-all duration-300 group border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <FiRefreshCw className={`mr-2 h-5 w-5 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span className="font-bold whitespace-nowrap">{loading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
            </button>
          </div>
        </div>

        {/* สถิติภาพรวม */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="ผู้ใช้งาน"
            value={stats.users.total_users || 0}
            icon={FiUsers}
            gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
            subtitle={`Admin: ${stats.users.total_admins || 0} | User: ${stats.users.total_regular_users || 0}`}
            delay={0}
          />
          <StatCard
            title="จำนวนอุปกรณ์ทั้งหมด"
            value={(stats.equipment.loan_quantity || 0) + (stats.equipment.disbursement_quantity || 0)}
            icon={FiPackage}
            gradient="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700"
            subtitle={`ประเภทยืม-คืน: ${(stats.equipment.loan_quantity || 0).toLocaleString()} ชิ้น | ประเภทเบิก-จ่าย: ${(stats.equipment.disbursement_quantity || 0).toLocaleString()} ชิ้น`}
            delay={100}
          />
          <StatCard
            title="อุปกรณ์พร้อมใช้งาน"
            value={(stats.equipment.available_loan_quantity || 0) + (stats.equipment.available_disbursement_quantity || 0)}
            icon={FiCheckCircle}
            gradient="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700"
            subtitle={`ประเภทยืม-คืน: ${(stats.equipment.available_loan_quantity || 0).toLocaleString()} ชิ้น | ประเภทเบิก-จ่าย: ${(stats.equipment.available_disbursement_quantity || 0).toLocaleString()} ชิ้น`}
            delay={200}
          />
          <StatCard
            title="เกินกำหนด"
            value={stats.borrowings.overdue_borrowings || 0}
            icon={FiAlertCircle}
            gradient="bg-gradient-to-br from-red-500 via-red-600 to-red-700"
            subtitle="ต้องติดตาม"
            delay={300}
          />
        </div>

        {/* สถิติการใช้งาน */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="ถูกยืม"
            value={stats.equipment.borrowed_quantity || 0}
            icon={FiBox}
            gradient="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700"
            subtitle="ชิ้นอุปกรณ์ที่ถูกยืม"
            delay={0}
          />
          <StatCard
            title="รายการยืม-คืน"
            value={stats.borrowings.active_borrowings || 0}
            icon={FiActivity}
            gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
            subtitle={`คืนแล้ว: ${stats.borrowings.returned_borrowings || 0}`}
            delay={100}
          />
          <StatCard
            title="การเบิกทั้งหมด"
            value={stats.disbursements.total_disbursements || 0}
            icon={FiShoppingBag}
            gradient="bg-gradient-to-br from-green-500 via-green-600 to-green-700"
            subtitle={`รออนุมัติ: ${stats.disbursements.pending_disbursements || 0}`}
            delay={200}
          />
          <StatCard
            title="รายการทั้งหมด"
            value={(stats.borrowings.total_borrowings || 0) + (stats.disbursements.total_disbursements || 0)}
            icon={FiActivity}
            gradient="bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700"
            subtitle="ยืม + เบิก"
            delay={300}
          />
        </div>

        {/* Activity Chart Full Width */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h3 className="text-2xl font-black text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-3">
                <FiBarChart className="text-white w-6 h-6" />
              </div>
              กิจกรรมรายสัปดาห์
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-sm text-gray-600 font-medium">จำนวนรายการ</span>
              </div>
            </div>
          </div>
          <ActivityChart data={weeklyData} />
          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl">
              <p className="text-sm text-gray-600 font-semibold">รวมทั้งหมด</p>
              <p className="text-2xl font-black text-indigo-600">
                {weeklyData.length > 0
                  ? weeklyData.reduce((sum, d) => sum + d.value, 0)
                  : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">7 วันที่ผ่านมา</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-2xl">
              <p className="text-sm text-gray-600 font-semibold">เฉลี่ยต่อวัน</p>
              <p className="text-2xl font-black text-green-600">
                {weeklyData.length > 0
                  ? (weeklyData.reduce((sum, d) => sum + d.value, 0) / weeklyData.length).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">รายการ/วัน</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-50 p-4 rounded-2xl">
              <p className="text-sm text-gray-600 font-semibold">สูงสุด</p>
              <p className="text-2xl font-black text-orange-600">
                {weeklyData.length > 0
                  ? Math.max(...weeklyData.map(d => d.value))
                  : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">วันที่มีกิจกรรมสูงสุด</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="text-2xl font-black text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-3">
                <FiActivity className="text-white w-6 h-6" />
              </div>
              กิจกรรมล่าสุด
            </h3>
            <button
              onClick={() => navigate('/admin/borrowing')}
              className="flex items-center text-indigo-600 hover:text-indigo-700 font-semibold group px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
            >
              <FiEye className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              ดูทั้งหมด
            </button>
          </div>
          {recentActivities.length > 0 ? (
            <RecentActivity activities={recentActivities} />
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-6 bg-gray-100 rounded-full mb-4">
                <FiActivity className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">ยังไม่มีกิจกรรมในขณะนี้</p>
              <p className="text-gray-400 text-sm mt-2">กิจกรรมการยืม-คืนจะแสดงที่นี่</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/borrowing')}
            className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          >
            <div className="relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl inline-flex mb-3 group-hover:bg-white/30 transition-all">
                <FiBox className="h-6 w-6" />
              </div>
              <div className="text-lg font-black mb-1">การยืม-คืน</div>
              <div className="text-xs text-purple-100 font-medium">จัดการรายการยืมคืน</div>
            </div>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </button>

          <button
            onClick={() => navigate('/admin/disbursement')}
            className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          >
            <div className="relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl inline-flex mb-3 group-hover:bg-white/30 transition-all">
                <FiShoppingBag className="h-6 w-6" />
              </div>
              <div className="text-lg font-black mb-1">การเบิก</div>
              <div className="text-xs text-green-100 font-medium">อนุมัติการเบิก</div>
            </div>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </button>

          <button
            onClick={() => navigate('/admin/inventory')}
            className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          >
            <div className="relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl inline-flex mb-3 group-hover:bg-white/30 transition-all">
                <FiPackage className="h-6 w-6" />
              </div>
              <div className="text-lg font-black mb-1">คลังอุปกรณ์</div>
              <div className="text-xs text-blue-100 font-medium">จัดการอุปกรณ์</div>
            </div>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          >
            <div className="relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl inline-flex mb-3 group-hover:bg-white/30 transition-all">
                <FiUsers className="h-6 w-6" />
              </div>
              <div className="text-lg font-black mb-1">ผู้ใช้งาน</div>
              <div className="text-xs text-orange-100 font-medium">จัดการผู้ใช้</div>
            </div>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
