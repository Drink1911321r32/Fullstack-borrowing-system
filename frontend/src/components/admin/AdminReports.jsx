import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FiBarChart, FiTrendingUp, FiDownload, FiCalendar, FiFilter,
  FiRefreshCw, FiUsers, FiPackage, FiActivity, FiAlertTriangle,
  FiCheckCircle, FiClock, FiDollarSign, FiPieChart, FiFileText,
  FiMail, FiMapPin, FiSettings, FiShare2, FiEye, FiPrinter
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getReportsStats } from '../../api/adminService';
import { downloadAdminReportPDF, downloadAdminReportExcel, downloadFile } from '../../api/reportService';

const AdminReports = () => {
  const [loading, setLoading] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('preset'); // 'preset' or 'custom'
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportType, setReportType] = useState('overview');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [trendPeriod, setTrendPeriod] = useState('daily'); // daily, monthly, yearly
  const [disbursementPeriod, setDisbursementPeriod] = useState('daily'); // daily, monthly, yearly
  const [disbursementUsagePeriod, setDisbursementUsagePeriod] = useState('all'); // all, daily, monthly, yearly
  const [disbursementSort, setDisbursementSort] = useState('desc'); // desc = มากสุด, asc = น้อยสุด
  const [equipmentSort, setEquipmentSort] = useState('desc'); // desc = มากสุด, asc = น้อยสุด
  const [equipmentPeriod, setEquipmentPeriod] = useState('all'); // all, daily, monthly, yearly
  const [creditPeriod, setCreditPeriod] = useState('monthly'); // daily, monthly, yearly
  const [rawCreditData, setRawCreditData] = useState([]); // เก็บข้อมูล credit ดิบไว้
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalBorrowings: 0,
      activeBorrowings: 0,
      overdueBorrowings: 0,
      totalUsers: 0,
      totalEquipment: 0,
      equipmentUtilization: 0,
      averageBorrowDays: 0,
      creditUsage: 0
    },
    borrowingTrends: [],
    disbursementTrends: [],
    disbursementUsage: [],
    equipmentUsage: [],
    userActivity: [],
    creditAnalysis: [],
    topEquipment: []
  });

  // Fetch data only when dateRange, reportType, equipmentPeriod, or disbursementUsagePeriod changes
  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType, equipmentPeriod, disbursementUsagePeriod, dateRangeType, customStartDate, customEndDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // ตรวจสอบว่าถ้าเป็น custom date ต้องมีวันที่ครบ
      if (dateRangeType === 'custom' && (!customStartDate || !customEndDate)) {
        setLoading(false);
        return;
      }
      
      // ดึงข้อมูล credit แบบรายวันเสมอ แล้ว aggregate ฝั่ง frontend
      const response = await getReportsStats(
        dateRangeType === 'custom' ? null : dateRange, 
        equipmentPeriod, 
        'daily', 
        disbursementUsagePeriod,
        dateRangeType === 'custom' ? customStartDate : null,
        dateRangeType === 'custom' ? customEndDate : null
      );
      if (response.success) {
        // เก็บข้อมูล credit ดิบไว้
        setRawCreditData(response.data.creditAnalysis || []);
        
        // Debug: ดูข้อมูล equipmentUsage ที่ได้รับจาก API
        console.log('📊 API Response - equipmentUsage:', response.data.equipmentUsage);
        
        // อัปเดต dashboard data โดยไม่รวม creditAnalysis ที่จะถูก process แยก
        setDashboardData({
          ...response.data,
          creditAnalysis: response.data.creditAnalysis || []
        });
        
        // Debug: ดูข้อมูลหลัง setState
        console.log('📦 DashboardData.equipmentUsage after setState:', response.data.equipmentUsage);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลรายงานได้');
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน');
    } finally {
      setLoading(false);
    }
  };

  // Chart colors
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const exportReport = async () => {
    try {
      setLoading(true);
      
      // ตรวจสอบว่าถ้าเป็น custom date ต้องมีวันที่ครบ
      if (dateRangeType === 'custom' && (!customStartDate || !customEndDate)) {
        toast.error('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
        setLoading(false);
        return;
      }
      
      const dateLabel = dateRangeType === 'custom' 
        ? `${customStartDate}_to_${customEndDate}` 
        : dateRange;
      
      if (exportFormat === 'pdf') {
        toast.info('กำลังสร้างรายงาน PDF...');
        const blob = await downloadAdminReportPDF(
          dateRangeType === 'custom' ? null : dateRange,
          dateRangeType === 'custom' ? customStartDate : null,
          dateRangeType === 'custom' ? customEndDate : null
        );
        const filename = `admin-report-${dateLabel}-${new Date().getTime()}.pdf`;
        downloadFile(blob, filename);
        toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
      } else if (exportFormat === 'excel') {
        toast.info('กำลังสร้างรายงาน Excel...');
        const blob = await downloadAdminReportExcel(
          dateRangeType === 'custom' ? null : dateRange,
          dateRangeType === 'custom' ? customStartDate : null,
          dateRangeType === 'custom' ? customEndDate : null
        );
        const filename = `admin-report-${dateLabel}-${new Date().getTime()}.xlsx`;
        downloadFile(blob, filename);
        toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('ไม่สามารถดาวน์โหลดรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  // Aggregate borrowing trends data based on selected period
  const getAggregatedTrends = () => {
    if (!dashboardData.borrowingTrends || dashboardData.borrowingTrends.length === 0) {
      return [];
    }

    const trends = dashboardData.borrowingTrends;

    if (trendPeriod === 'daily') {
      return trends;
    }

    const aggregated = {};

    trends.forEach(item => {
      const date = new Date(item.date);
      let key;

      if (trendPeriod === 'monthly') {
        // Group by month (YYYY-MM)
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (trendPeriod === 'yearly') {
        // Group by year (YYYY)
        key = String(date.getFullYear());
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          date: key,
          borrowings: 0,
          returns: 0,
          overdue: 0
        };
      }

      aggregated[key].borrowings += item.borrowings || 0;
      aggregated[key].returns += item.returns || 0;
      aggregated[key].overdue += item.overdue || 0;
    });

    return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Aggregate credit data ฝั่ง frontend (จากข้อมูลรายวัน)
  const getAggregatedCreditData = () => {
    if (!rawCreditData || rawCreditData.length === 0) {
      return [];
    }

    // ถ้าเป็น daily ใช้ข้อมูลดิบเลย
    if (creditPeriod === 'daily') {
      return rawCreditData;
    }

    const aggregated = {};

    rawCreditData.forEach(item => {
      // แปลง period ให้เป็นรูปแบบ YYYY-MM-DD
      let periodStr = item.period;
      if (typeof periodStr === 'object' && periodStr !== null) {
        periodStr = new Date(periodStr).toISOString().split('T')[0];
      } else if (typeof periodStr === 'string' && periodStr.includes('T')) {
        periodStr = periodStr.split('T')[0];
      }

      // Parse date จาก string
      const [year, month, day] = periodStr.split('-');
      let key;

      if (creditPeriod === 'monthly') {
        // Group by month (YYYY-MM)
        key = `${year}-${month}`;
      } else if (creditPeriod === 'yearly') {
        // Group by year (YYYY)
        key = year;
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          period: key,
          earned: 0,
          spent: 0,
          balance: 0,
          latestDate: periodStr
        };
      }

      aggregated[key].earned += item.earned || 0;
      aggregated[key].spent += item.spent || 0;
      
      // ใช้ balance จากวันล่าสุดในช่วงนั้น
      if (periodStr >= aggregated[key].latestDate) {
        aggregated[key].balance = item.balance || 0;
        aggregated[key].latestDate = periodStr;
      }
    });

    // Sort และลบ field ที่ใช้ภายใน
    return Object.values(aggregated)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(({ latestDate, ...rest }) => rest);
  };

  // Aggregate disbursement trends data based on selected period
  const getAggregatedDisbursements = () => {
    if (!dashboardData.disbursementTrends || dashboardData.disbursementTrends.length === 0) {
      return [];
    }

    const trends = dashboardData.disbursementTrends;

    if (disbursementPeriod === 'daily') {
      return trends;
    }

    const aggregated = {};

    trends.forEach(item => {
      const date = new Date(item.date);
      let key;

      if (disbursementPeriod === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (disbursementPeriod === 'yearly') {
        key = String(date.getFullYear());
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          date: key,
          total: 0,
          pending: 0,
          approved: 0,
          completed: 0
        };
      }

      aggregated[key].total += item.total || 0;
      aggregated[key].pending += item.pending || 0;
      aggregated[key].approved += item.approved || 0;
      aggregated[key].completed += item.completed || 0;
    });

    return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Format disbursement date label based on period
  const formatDisbursementDateLabel = (value) => {
    if (disbursementPeriod === 'daily') {
      return new Date(value).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
    } else if (disbursementPeriod === 'monthly') {
      const [year, month] = value.split('-');
      return new Date(year, month - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
    } else if (disbursementPeriod === 'yearly') {
      return value;
    }
    return value;
  };

  // Format disbursement tooltip label based on period
  const formatDisbursementTooltipLabel = (value) => {
    if (disbursementPeriod === 'daily') {
      return new Date(value).toLocaleDateString('th-TH');
    } else if (disbursementPeriod === 'monthly') {
      const [year, month] = value.split('-');
      return new Date(year, month - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    } else if (disbursementPeriod === 'yearly') {
      return `ปี ${value}`;
    }
    return value;
  };

  // Format date label based on period
  const formatDateLabel = (value) => {
    if (trendPeriod === 'daily') {
      return new Date(value).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
    } else if (trendPeriod === 'monthly') {
      const [year, month] = value.split('-');
      return new Date(year, month - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
    } else if (trendPeriod === 'yearly') {
      return value;
    }
    return value;
  };

  // Format tooltip label based on period
  const formatTooltipLabel = (value) => {
    if (trendPeriod === 'daily') {
      return new Date(value).toLocaleDateString('th-TH');
    } else if (trendPeriod === 'monthly') {
      const [year, month] = value.split('-');
      return new Date(year, month - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    } else if (trendPeriod === 'yearly') {
      return `ปี ${value}`;
    }
    return value;
  };

  // Format credit period label (for X-axis)
  const formatCreditPeriodLabel = (value) => {
    if (!value) return '';
    
    try {
      if (creditPeriod === 'daily') {
        // รายวัน: 6 ธ.ค.
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }).replace(' พ.ศ. ', ' ');
      } else if (creditPeriod === 'monthly') {
        // รายเดือน: ธ.ค. 2568
        const [year, month] = value.split('-');
        if (!year || !month) return value;
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        if (isNaN(date.getTime())) return value;
        const formatted = date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
        return formatted.replace(' พ.ศ. ', ' ');
      } else if (creditPeriod === 'yearly') {
        // รายปี: 2568
        const buddhistYear = parseInt(value) + 543;
        if (isNaN(buddhistYear)) return value;
        return buddhistYear.toString();
      }
    } catch (error) {
      console.error('Error formatting credit period label:', error, value);
    }
    return value;
  };

  // Get filtered and sorted equipment usage data
  const getFilteredEquipmentUsage = () => {
    if (!dashboardData.equipmentUsage || dashboardData.equipmentUsage.length === 0) {
      return [];
    }

    let filtered = [...dashboardData.equipmentUsage];
    
    // Debug: ดูข้อมูลก่อน filter
    console.log('🔍 Equipment Usage before filter:', filtered);
    
    // Sort by count
    if (equipmentSort === 'desc') {
      filtered.sort((a, b) => b.count - a.count);
    } else {
      filtered.sort((a, b) => a.count - b.count);
    }
    
    console.log('✅ Equipment Usage after filter:', filtered);
    
    return filtered;
  };

  // Get filtered and sorted disbursement usage data
  const getFilteredDisbursementUsage = () => {
    if (!dashboardData.disbursementUsage || dashboardData.disbursementUsage.length === 0) {
      return [];
    }

    let filtered = [...dashboardData.disbursementUsage];
    
    // Sort by count
    if (disbursementSort === 'desc') {
      filtered.sort((a, b) => b.count - a.count);
    } else {
      filtered.sort((a, b) => a.count - b.count);
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg font-medium">กำลังโหลดข้อมูลรายงาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiBarChart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">รายงานและสถิติ</h1>
                  <p className="text-emerald-100 mt-1 font-medium">วิเคราะห์ข้อมูลการใช้งานระบบ</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiActivity className="inline w-4 h-4 mr-1 text-green-300" />
                      <span className="text-white font-semibold">การยืมทั้งหมด: {dashboardData.overview.totalBorrowings}</span>
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiUsers className="inline w-4 h-4 mr-1 text-blue-300" />
                      <span className="text-white font-semibold">ผู้ใช้: {dashboardData.overview.totalUsers}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-3 lg:space-y-0 lg:space-x-3 mt-4 lg:mt-0">
                <div className="flex items-center space-x-2">
                  <label className="text-white text-sm font-medium">ประเภท:</label>
                  <select
                    value={dateRangeType}
                    onChange={(e) => {
                      setDateRangeType(e.target.value);
                      if (e.target.value === 'preset') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }
                    }}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 text-sm"
                  >
                    <option value="preset" className="text-gray-800">ช่วงเวลาที่กำหนด</option>
                    <option value="custom" className="text-gray-800">กำหนดเอง</option>
                  </select>
                </div>
                
                {dateRangeType === 'preset' ? (
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50"
                  >
                    <option value="7days" className="text-gray-800">7 วันล่าสุด</option>
                    <option value="30days" className="text-gray-800">30 วันล่าสุด</option>
                    <option value="3months" className="text-gray-800">3 เดือนล่าสุด</option>
                    <option value="1year" className="text-gray-800">1 ปีล่าสุด</option>
                  </select>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 text-sm"
                      placeholder="เริ่มต้น"
                    />
                    <span className="text-white text-sm">ถึง</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      min={customStartDate}
                      className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 text-sm"
                      placeholder="สิ้นสุด"
                    />
                  </div>
                )}
                
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50"
                >
                  <option value="pdf" className="text-gray-800">PDF</option>
                  <option value="excel" className="text-gray-800">Excel</option>
                </select>
                <button
                  onClick={fetchReportData}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiRefreshCw className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={exportReport}
                  disabled={loading}
                  className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiDownload className="w-4 h-4 text-white" />
                  <span className="text-white">ส่งออก</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">การยืมทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalBorrowings}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <FiActivity className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">การเบิกจ่าย</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalDisbursements || 0}</p>
                <p className="text-sm text-orange-600 mt-1">
                  <FiPackage className="inline w-4 h-4 mr-1" />
                  รายการทั้งหมด
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <FiPackage className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เกินกำหนด</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.overdueBorrowings}</p>
                {dashboardData.overview.overdueBorrowings > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    <FiAlertTriangle className="inline w-4 h-4 mr-1" />
                    ต้องติดตาม
                  </p>
                )}
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <FiAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Borrowing Trends */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">แนวโน้มการยืม-คืน</h2>
                <p className="text-gray-600 text-sm">การยืมและการคืนรายวัน</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={trendPeriod}
                  onChange={(e) => setTrendPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="daily">รายวัน</option>
                  <option value="monthly">รายเดือน</option>
                  <option value="yearly">รายปี</option>
                </select>
                <FiBarChart className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getAggregatedTrends()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={formatDateLabel}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  labelFormatter={formatTooltipLabel}
                />
                <Legend />
                <Bar 
                  dataKey="borrowings" 
                  fill="#3b82f6" 
                  name="การยืม"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="returns" 
                  fill="#10b981" 
                  name="การคืน"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="overdue" 
                  fill="#ef4444" 
                  name="เกินกำหนด"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Equipment Usage */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">การใช้งานตามประเภท</h2>
                <p className="text-gray-600 text-sm">10 อันดับประเภทที่ถูกยืม (ตั้งแต่ 1 ธ.ค. 2025)</p>
              </div>
              <FiPieChart className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <select
                value={equipmentSort}
                onChange={(e) => setEquipmentSort(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="desc">มากสุด → น้อยสุด</option>
                <option value="asc">น้อยสุด → มากสุด</option>
              </select>
              <select
                value={equipmentPeriod}
                onChange={(e) => setEquipmentPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="daily">รายวัน</option>
                <option value="monthly">รายเดือน</option>
                <option value="yearly">รายปี</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getFilteredEquipmentUsage()}
                  cx="50%"
                  cy="50%"
                  labelLine
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ payload }) => `${parseFloat(payload.percentage || 0).toFixed(1)}%`}
                >
                  {getFilteredEquipmentUsage().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    maxWidth: '350px',
                    padding: '12px'
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-900 mb-2">{data.category}</p>
                          <p className="text-sm text-gray-700 mb-2">
                            ยืมทั้งหมด: <span className="font-semibold">{data.count} ครั้ง</span> ({data.percentage}%)
                          </p>
                          {data.topEquipments && data.topEquipments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-600 mb-1">10 อันดับอุปกรณ์ยอดนิยม:</p>
                              <div className="max-h-48 overflow-y-auto">
                                {data.topEquipments.map((eq, idx) => (
                                  <div key={idx} className="flex justify-between text-xs text-gray-600 py-1">
                                    <span className="truncate mr-2">{idx + 1}. {eq.name}</span>
                                    <span className="font-semibold text-blue-600">{eq.borrowCount} ครั้ง</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => entry.payload.category}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disbursement Usage by Type */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">การเบิกจ่ายตามประเภท</h2>
              <p className="text-gray-600 text-sm">10 อันดับประเภทที่ถูกเบิกจ่าย (ตั้งแต่ 1 ธ.ค. 2025)</p>
            </div>
            <FiPackage className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <select
              value={disbursementSort}
              onChange={(e) => setDisbursementSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="desc">มากสุด → น้อยสุด</option>
              <option value="asc">น้อยสุด → มากสุด</option>
            </select>
            <select
              value={disbursementUsagePeriod}
              onChange={(e) => setDisbursementUsagePeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="daily">รายวัน</option>
              <option value="monthly">รายเดือน</option>
              <option value="yearly">รายปี</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getFilteredDisbursementUsage()}
                cx="50%"
                cy="50%"
                labelLine
                outerRadius={90}
                fill="#8884d8"
                dataKey="count"
                label={({ payload }) => `${parseFloat(payload.percentage || 0).toFixed(1)}%`}
              >
                {getFilteredDisbursementUsage().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  maxWidth: '350px',
                  padding: '12px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                        <p className="font-bold text-gray-900 mb-2">{data.category}</p>
                        <p className="text-sm text-gray-700 mb-2">
                          เบิกทั้งหมด: <span className="font-semibold">{data.count} ครั้ง</span> ({data.percentage}%)
                        </p>
                        <p className="text-sm text-gray-700 mb-2">
                          จำนวน: <span className="font-semibold">{data.totalQuantity || 0} ชิ้น</span>
                        </p>
                        {data.topEquipments && data.topEquipments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1">10 อันดับอุปกรณ์ที่เบิกบ่อย:</p>
                            <div className="max-h-48 overflow-y-auto">
                              {data.topEquipments.map((eq, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-gray-600 py-1">
                                  <span className="truncate mr-2">{idx + 1}. {eq.name}</span>
                                  <span className="font-semibold text-purple-600">{eq.disbursementCount} ครั้ง ({eq.totalQuantity} ชิ้น)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => entry.payload.category}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity & Credit Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Faculty & Major Borrowing Activity */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">การยืมแยกตามคณะและสาขา</h2>
                <p className="text-gray-600 text-sm">คณะและสาขาที่มีการยืมมากที่สุด (Top 10)</p>
              </div>
              <FiUsers className="w-6 h-6 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="department" 
                  stroke="#6b7280"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => {
                    if (name === 'users') return [value, 'จำนวนนักศึกษา'];
                    if (name === 'borrowings') return [value, 'จำนวนการยืม'];
                    return [value, name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    if (value === 'users') return 'จำนวนนักศึกษา';
                    if (value === 'borrowings') return 'จำนวนการยืม';
                    return value;
                  }}
                />
                <Bar dataKey="users" fill="#3b82f6" name="users" radius={[4, 4, 0, 0]} />
                <Bar dataKey="borrowings" fill="#10b981" name="borrowings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Credit Analysis */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">การใช้เครดิต</h2>
                <p className="text-gray-600 text-sm">การได้รับและใช้เครดิต (ตั้งแต่ 1 ธ.ค. 2025)</p>
              </div>
              <FiDollarSign className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <select
                value={creditPeriod}
                onChange={(e) => setCreditPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="daily">รายวัน</option>
                <option value="monthly">รายเดือน</option>
                <option value="yearly">รายปี</option>
              </select>
            </div>
            {dashboardData.creditAnalysis && dashboardData.creditAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAggregatedCreditData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickFormatter={formatCreditPeriodLabel}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="balance"
                    fill="#f59e0b"
                    name="เครดิตคงเหลือ"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="earned"
                    fill="#10b981"
                    name="ได้รับเครดิต"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="spent"
                    fill="#ef4444"
                    name="ใช้เครดิต"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <FiDollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">ยังไม่มีข้อมูลการใช้เครดิต</p>
                  <p className="text-sm mt-2">ข้อมูลจะแสดงเมื่อมีการทำธุรกรรมเครดิต</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Equipment - Full Width */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">อุปกรณ์ยอดนิยม</h2>
                  <p className="text-gray-600 text-sm">อุปกรณ์ที่ถูกยืมมากที่สุด</p>
                </div>
                <FiPackage className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.topEquipment.map((equipment, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 flex-1 min-w-0 pr-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md flex-shrink-0 ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm break-words leading-relaxed">{equipment.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-blue-600">{equipment.borrowCount}</p>
                      <p className="text-xs text-gray-500">ครั้ง</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;