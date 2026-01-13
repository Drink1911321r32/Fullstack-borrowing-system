import React, { useState, useEffect } from 'react';
import { 
  FiBarChart, FiPieChart, FiTrendingUp, FiCalendar, FiDownload,
  FiFilter, FiRefreshCw, FiClock, FiPackage, FiCreditCard,
  FiTarget, FiActivity, FiUsers, FiAward, FiFileText,
  FiChevronDown, FiChevronUp, FiEye, FiArrowUp, FiArrowDown, FiCheckCircle
} from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
         BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { getUserReports } from '../../api/userService';
import { downloadUserReportPDF, downloadUserReportExcel, downloadFile } from '../../api/reportService';
import { toast } from 'react-toastify';

const UserReports = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('preset'); // 'preset' or 'custom'
  const [dateRange, setDateRange] = useState('all'); // เริ่มต้นด้วย 'all'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [creditPeriod, setCreditPeriod] = useState('monthly');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [reportData, setReportData] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    borrowing: true,
    credit: true,
    disbursement: true,
    performance: false
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange, creditPeriod, dateRangeType, customStartDate, customEndDate]);

  const fetchReportData = async () => {
    try {
      // ใช้ initialLoading เฉพาะครั้งแรก, ครั้งต่อไปใช้ refreshing
      if (initialLoading) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // สร้าง params ตามประเภทของ date range
      let params = { creditPeriod };
      
      if (dateRangeType === 'custom') {
        if (!customStartDate || !customEndDate) {
          return; // ไม่ fetch ถ้ายังไม่ได้เลือกวันที่ครบ
        }
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        params.dateRange = dateRange;
      }
      
      const response = await getUserReports(params.dateRange, params.creditPeriod, params.startDate, params.endDate);
      
      if (response.success) {
        setReportData(response.data);
      } else {
        toast.error(response.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
      }
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportReport = async () => {
    try {
      setRefreshing(true);
      
      // สร้าง params ตามประเภทของ date range
      let params = {};
      
      if (dateRangeType === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast.error('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
          setRefreshing(false);
          return;
        }
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        params.dateRange = dateRange;
      }
      
      if (exportFormat === 'pdf') {
        toast.info('กำลังสร้างรายงาน PDF...');
        const blob = await downloadUserReportPDF(params.dateRange, params.startDate, params.endDate);
        const dateLabel = dateRangeType === 'custom' 
          ? `${customStartDate}_to_${customEndDate}` 
          : dateRange;
        const filename = `user-report-${dateLabel}-${new Date().getTime()}.pdf`;
        downloadFile(blob, filename);
        toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
      } else if (exportFormat === 'excel') {
        toast.info('กำลังสร้างรายงาน Excel...');
        const blob = await downloadUserReportExcel(params.dateRange, params.startDate, params.endDate);
        const dateLabel = dateRangeType === 'custom' 
          ? `${customStartDate}_to_${customEndDate}` 
          : dateRange;
        const filename = `user-report-${dateLabel}-${new Date().getTime()}.xlsx`;
        downloadFile(blob, filename);
        toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('ไม่สามารถดาวน์โหลดรายงานได้');
    } finally {
      setRefreshing(false);
    }
  };

  const calculateChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiBarChart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">รายงานผลการใช้งาน</h1>
                  <p className="text-indigo-100 mt-1 font-medium">วิเคราะห์และติดตามการใช้งานระบบของคุณ</p>
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
                    className="bg-white/20 text-white border border-white/30 rounded-xl px-3 py-2 backdrop-blur-sm focus:ring-2 focus:ring-white/50 text-sm"
                  >
                    <option value="preset" className="text-gray-900">ช่วงเวลาที่กำหนด</option>
                    <option value="custom" className="text-gray-900">กำหนดเอง</option>
                  </select>
                </div>
                
                {dateRangeType === 'preset' ? (
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-xl px-4 py-2 backdrop-blur-sm focus:ring-2 focus:ring-white/50"
                  >
                    <option value="all" className="text-gray-900">ทั้งหมด (ตั้งแต่เริ่มต้น)</option>
                    <option value="7days" className="text-gray-900">7 วันที่ผ่านมา</option>
                    <option value="1month" className="text-gray-900">1 เดือนที่ผ่านมา</option>
                    <option value="3months" className="text-gray-900">3 เดือนที่ผ่านมา</option>
                    <option value="6months" className="text-gray-900">6 เดือนที่ผ่านมา</option>
                    <option value="1year" className="text-gray-900">1 ปีที่ผ่านมา</option>
                  </select>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white/20 text-white border border-white/30 rounded-xl px-3 py-2 backdrop-blur-sm focus:ring-2 focus:ring-white/50 text-sm"
                      placeholder="เริ่มต้น"
                    />
                    <span className="text-white">ถึง</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      min={customStartDate}
                      className="bg-white/20 text-white border border-white/30 rounded-xl px-3 py-2 backdrop-blur-sm focus:ring-2 focus:ring-white/50 text-sm"
                      placeholder="สิ้นสุด"
                    />
                  </div>
                )}
                
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="bg-white/20 text-white border border-white/30 rounded-xl px-4 py-2 backdrop-blur-sm focus:ring-2 focus:ring-white/50"
                >
                  <option value="pdf" className="text-gray-900">PDF</option>
                  <option value="excel" className="text-gray-900">Excel</option>
                </select>
                <button
                  onClick={exportReport}
                  disabled={refreshing}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiDownload className="w-4 h-4 text-white" />
                  <span className="text-white">ส่งออก</span>
                </button>
                <button
                  onClick={fetchReportData}
                  disabled={refreshing}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {initialLoading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-3 text-gray-600">กำลังโหลดรายงาน...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200 cursor-pointer"
                onClick={() => toggleSection('overview')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 p-3 rounded-xl">
                      <FiTarget className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">📊 ภาพรวมการใช้งาน</h2>
                      <p className="text-gray-600 text-sm">สถิติการใช้งานระบบโดยรวม</p>
                    </div>
                  </div>
                  {expandedSections.overview ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {expandedSections.overview && (
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">การยืมทั้งหมด</p>
                          <p className="text-3xl font-bold text-blue-700">{reportData.overview?.total_borrowings || 0}</p>
                        </div>
                        <div className="bg-blue-200 p-3 rounded-xl">
                          <FiPackage className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <FiArrowUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600 font-medium">+12%</span>
                        <span className="text-gray-600 ml-1">จากเดือนก่อน</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">คืนตรงเวลา</p>
                          <p className="text-3xl font-bold text-green-700">{reportData.overview?.on_time_returns || 0}</p>
                        </div>
                        <div className="bg-green-200 p-3 rounded-xl">
                          <FiClock className="w-8 h-8 text-green-600" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <span className="text-green-600 font-medium">
                          {((reportData.overview?.on_time_returns || 0) / (reportData.overview?.total_borrowings || 1) * 100).toFixed(1)}%
                        </span>
                        <span className="text-gray-600 ml-1">ของการยืมทั้งหมด</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">เครดิตปัจจุบัน</p>
                          <p className="text-3xl font-bold text-purple-700">{reportData.overview?.current_credit || 0}</p>
                        </div>
                        <div className="bg-purple-200 p-3 rounded-xl">
                          <FiCreditCard className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <span className="text-purple-600 font-medium">
                          {reportData.overview?.total_credit_used || 0} ใช้ไปแล้ว
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Borrowing Trends */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200 cursor-pointer"
                onClick={() => toggleSection('borrowing')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <FiTrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">📈 แนวโน้มการยืม-คืน</h2>
                      <p className="text-gray-600 text-sm">กราฟแสดงพฤติกรรมการใช้งานตามเวลา</p>
                    </div>
                  </div>
                  {expandedSections.borrowing ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {expandedSections.borrowing && (
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Borrowing Trend Bar Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">การยืม-คืนรายเดือน</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.borrowing_trends || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="borrowings" fill="#8884d8" name="การยืม" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="returns" fill="#82ca9d" name="การคืน" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="late" fill="#ff7c7c" name="คืนล่าช้า" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Equipment Categories Pie Chart */}
                    <div className="flex flex-col items-center">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">หมวดหมู่ที่ยืมบ่อย</h3>
                      <div className="w-full max-w-lg">
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <Pie
                              data={reportData.equipment_categories || []}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              outerRadius="65%"
                              innerRadius="45%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {(reportData.equipment_categories || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200 max-w-xs">
                                    <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
                                    <p className="text-sm text-gray-600">ยืม: {payload[0].value} ครั้ง ({(payload[0].payload.percent * 100).toFixed(1)}%)</p>
                                    {payload[0].payload.equipments && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        อุปกรณ์: {payload[0].payload.equipments}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Legend 
                              verticalAlign="bottom" 
                              height={60}
                              wrapperStyle={{ paddingTop: '10px' }}
                              formatter={(value, entry) => {
                                const percent = entry.payload.percent ? (entry.payload.percent * 100).toFixed(0) : 0;
                                return <span className="text-sm">{entry.payload.name} ({percent}%)</span>;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Credit Management */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-gray-200 cursor-pointer"
                onClick={() => toggleSection('credit')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <FiCreditCard className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">💳 การจัดการเครดิต</h2>
                      <p className="text-gray-600 text-sm">ประวัติและแนวโน้มการใช้เครดิต (เริ่มนับ 1 ธ.ค. 2568)</p>
                    </div>
                  </div>
                  {expandedSections.credit ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {expandedSections.credit && (
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Credit History Area Chart */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">ประวัติเครดิต</h3>
                        <select 
                          value={creditPeriod}
                          onChange={(e) => setCreditPeriod(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="daily">รายวัน</option>
                          <option value="monthly">รายเดือน</option>
                          <option value="yearly">รายปี</option>
                        </select>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.credit_history || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="balance" fill="#f59e0b" name="เครดิตคงเหลือ" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="returned" fill="#10b981" name="ได้รับเครดิต" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="used" fill="#ef4444" name="ใช้เครดิต" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Recent Activities */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">กิจกรรมล่าสุด</h3>
                      <div className="space-y-4">
                        {(reportData.recent_activities || []).slice(0, 5).map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                activity.type === 'borrow' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                              }`}>
                                <FiPackage className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{activity.equipment}</p>
                                <p className="text-sm text-gray-600">
                                  {activity.type === 'borrow' ? 'ยืม' : 'คืน'} | {new Date(activity.date).toLocaleDateString('th-TH')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`font-medium ${
                                activity.type === 'borrow' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {activity.type === 'borrow' ? '-' : '+'}{activity.credit}
                              </span>
                              <p className={`text-xs ${
                                activity.status === 'active' ? 'text-yellow-600' :
                                activity.status === 'returned' ? 'text-green-600' :
                                'text-red-600'
                              }`}>
                                {activity.status === 'active' ? 'กำลังยืม' :
                                 activity.status === 'returned' ? 'คืนแล้ว' :
                                 'คืนล่าช้า'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!reportData.recent_activities || reportData.recent_activities.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <FiFileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>ยังไม่มีกิจกรรม</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Disbursement Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-50 to-red-50 px-8 py-6 border-b border-gray-200 cursor-pointer"
                onClick={() => toggleSection('disbursement')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-3 rounded-xl">
                      <FiPackage className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">📦 การเบิกจ่ายอุปกรณ์</h2>
                      <p className="text-gray-600 text-sm">แนวโน้มการเบิกจ่ายอุปกรณ์</p>
                    </div>
                  </div>
                  {expandedSections.disbursement ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {expandedSections.disbursement && (
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Disbursement by Type Pie Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">ประเภทอุปกรณ์ที่เบิกบ่อย</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportData.disbursement_categories || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#f97316"
                            dataKey="value"
                          >
                            {(reportData.disbursement_categories || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
                                  <p className="font-semibold text-gray-800">{payload[0].payload.category}</p>
                                  <p className="text-sm text-gray-600">เบิก: {payload[0].value} ครั้ง</p>
                                  {payload[0].payload.equipments && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      อุปกรณ์: {payload[0].payload.equipments}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Top 10 Equipment */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">10 อันดับอุปกรณ์ที่เบิกบ่อย</h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {(reportData.disbursement_categories || []).map((category, index) => (
                          <div key={index} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-800">{category.category}</span>
                              <span className="text-sm font-semibold text-orange-600">{category.value} ครั้ง</span>
                            </div>
                            {category.equipments && (
                              <p className="text-xs text-gray-600">
                                {category.equipments}
                              </p>
                            )}
                          </div>
                        ))}
                        {(!reportData.disbursement_categories || reportData.disbursement_categories.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <FiPackage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>ยังไม่มีข้อมูลการเบิกจ่าย</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserReports;