import React, { useState, useEffect } from 'react';
import { 
  FiCreditCard, FiTrendingUp, FiTrendingDown, FiClock, FiCheckCircle,
  FiXCircle, FiAlertCircle, FiCalendar, FiUser, FiDollarSign,
  FiRefreshCw, FiFilter, FiDownload, FiEye, FiArrowUp, FiArrowDown
} from 'react-icons/fi';

const CreditManagement = () => {
  const [creditInfo, setCreditInfo] = useState({
    current_credit: 85,
    initial_credit: 100,
    total_used: 45,
    total_returned: 30,
    pending_return: 15
  });

  const [creditHistory, setCreditHistory] = useState([]);
  const [borrowingHistory, setBorrowingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      
      // Mock credit history data
      const mockCreditHistory = [
        {
          id: 1,
          transaction_type: 'deduct',
          amount: 15,
          reason: 'ยืมโปรเจคเตอร์ Epson',
          date: '2025-10-26T10:30:00',
          status: 'pending',
          equipment_name: 'โปรเจคเตอร์ Epson',
          expected_return: '2025-10-30'
        },
        {
          id: 2,
          transaction_type: 'return',
          amount: 10,
          reason: 'คืนกล้องดิจิตอล Canon ตรงเวลา',
          date: '2025-10-25T14:15:00',
          status: 'completed',
          equipment_name: 'กล้องดิจิตอล Canon'
        },
        {
          id: 3,
          transaction_type: 'deduct',
          amount: 10,
          reason: 'ยืมกล้องดิจิตอล Canon',
          date: '2025-10-22T09:00:00',
          status: 'completed',
          equipment_name: 'กล้องดิจิตอล Canon'
        },
        {
          id: 4,
          transaction_type: 'penalty',
          amount: 5,
          reason: 'คืนอุปกรณ์ล่าช้า 1 วัน',
          date: '2025-10-20T16:30:00',
          status: 'completed',
          equipment_name: 'ไมโครโฟน Wireless'
        },
        {
          id: 5,
          transaction_type: 'return',
          amount: 8,
          reason: 'คืนไมโครโฟน Wireless',
          date: '2025-10-20T16:30:00',
          status: 'completed',
          equipment_name: 'ไมโครโฟน Wireless'
        },
        {
          id: 6,
          transaction_type: 'bonus',
          amount: 5,
          reason: 'โบนัสการใช้งานดี',
          date: '2025-10-15T12:00:00',
          status: 'completed',
          admin_note: 'ให้โบนัสเนื่องจากการใช้งานอุปกรณ์อย่างระมัดระวัง'
        }
      ];

      // Mock borrowing history
      const mockBorrowingHistory = [
        {
          id: 1,
          equipment_name: 'โปรเจคเตอร์ Epson',
          equipment_id: 'EQ001',
          borrow_date: '2025-10-26',
          expected_return_date: '2025-10-30',
          actual_return_date: null,
          credit_used: 15,
          status: 'borrowed',
          days_overdue: 0
        },
        {
          id: 2,
          equipment_name: 'กล้องดิจิตอล Canon',
          equipment_id: 'EQ015',
          borrow_date: '2025-10-22',
          expected_return_date: '2025-10-25',
          actual_return_date: '2025-10-25',
          credit_used: 10,
          status: 'returned',
          days_overdue: 0
        },
        {
          id: 3,
          equipment_name: 'ไมโครโฟน Wireless',
          equipment_id: 'EQ008',
          borrow_date: '2025-10-18',
          expected_return_date: '2025-10-19',
          actual_return_date: '2025-10-20',
          credit_used: 8,
          status: 'returned_late',
          days_overdue: 1
        }
      ];

      setCreditHistory(mockCreditHistory);
      setBorrowingHistory(mockBorrowingHistory);
      
    } catch (error) {
      console.error('Error fetching credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  // กรองประวัติตามประเภท
  const getFilteredHistory = () => {
    if (filterType === 'all') return creditHistory;
    return creditHistory.filter(item => item.transaction_type === filterType);
  };

  // Pagination
  const filteredHistory = getFilteredHistory();
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  // คำนวณสถิติ
  const getStats = () => {
    const thisMonth = creditHistory.filter(item => {
      const itemDate = new Date(item.date);
      const now = new Date();
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    });

    const totalDeducted = thisMonth
      .filter(item => item.transaction_type === 'deduct' || item.transaction_type === 'penalty')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalReturned = thisMonth
      .filter(item => item.transaction_type === 'return' || item.transaction_type === 'bonus')
      .reduce((sum, item) => sum + item.amount, 0);

    return { totalDeducted, totalReturned, thisMonth: thisMonth.length };
  };

  // แปลงประเภททรานแซคชัน
  const getTransactionInfo = (type) => {
    const typeMap = {
      'deduct': { 
        text: 'หักเครดิต', 
        color: 'red', 
        icon: FiArrowDown,
        bgColor: 'bg-red-50',
        textColor: 'text-red-600'
      },
      'return': { 
        text: 'คืนเครดิต', 
        color: 'green', 
        icon: FiArrowUp,
        bgColor: 'bg-green-50',
        textColor: 'text-green-600'
      },
      'penalty': { 
        text: 'ค่าปรับ', 
        color: 'orange', 
        icon: FiArrowDown,
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-600'
      },
      'bonus': { 
        text: 'โบนัส', 
        color: 'blue', 
        icon: FiArrowUp,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600'
      }
    };
    return typeMap[type] || typeMap['deduct'];
  };

  // แปลงสถานะการยืม
  const getBorrowStatus = (status) => {
    const statusMap = {
      'borrowed': { text: 'กำลังยืม', color: 'yellow', icon: FiClock },
      'returned': { text: 'คืนแล้ว', color: 'green', icon: FiCheckCircle },
      'returned_late': { text: 'คืนล่าช้า', color: 'orange', icon: FiAlertCircle },
      'overdue': { text: 'เกินกำหนด', color: 'red', icon: FiXCircle }
    };
    return statusMap[status] || statusMap['borrowed'];
  };

  const stats = getStats();

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <FiCreditCard className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">เครดิตของฉัน</h1>
                  <p className="text-indigo-100 mt-1 font-medium">ติดตามเครดิตและประวัติการใช้งานของคุณ</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                      <FiDollarSign className="inline w-4 h-4 mr-1 text-yellow-300" />
                      <span className="text-white font-semibold">เครดิตปัจจุบัน: {creditInfo.current_credit}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                <button
                  onClick={fetchCreditData}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30"
                >
                  <FiRefreshCw className="w-5 h-5 text-white" />
                </button>
                <button className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30">
                  <FiDownload className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Credit */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เครดิตปัจจุบัน</p>
                <p className="text-3xl font-bold text-indigo-600">{creditInfo.current_credit}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-xl">
                <FiCreditCard className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(creditInfo.current_credit / creditInfo.initial_credit) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((creditInfo.current_credit / creditInfo.initial_credit) * 100).toFixed(1)}% ของเครดิตเริ่มต้น
              </p>
            </div>
          </div>

          {/* Used This Month */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ใช้เดือนนี้</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalDeducted}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <FiTrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              รวม {stats.thisMonth} ครั้ง
            </p>
          </div>

          {/* Returned This Month */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ได้รับคืนเดือนนี้</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalReturned}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <FiTrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              จากการคืนครบถ้วน
            </p>
          </div>

          {/* Pending Return */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">รอคืน</p>
                <p className="text-3xl font-bold text-yellow-600">{creditInfo.pending_return}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <FiClock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              จากอุปกรณ์ที่ยืมอยู่
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credit History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 p-3 rounded-xl">
                      <FiCreditCard className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">💳 ประวัติเครดิต</h2>
                      <p className="text-gray-600 text-sm">รายการเปลี่ยนแปลงเครดิตทั้งหมด</p>
                    </div>
                  </div>
                  <div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="py-2 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">ทุกประเภท</option>
                      <option value="deduct">หักเครดิต</option>
                      <option value="return">คืนเครดิต</option>
                      <option value="penalty">ค่าปรับ</option>
                      <option value="bonus">โบนัส</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {loading ? (
                  <div className="py-20 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                    <p className="mt-3 text-gray-600">กำลังโหลดข้อมูล...</p>
                  </div>
                ) : currentHistory.length === 0 ? (
                  <div className="py-20 text-center">
                    <FiCreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">ไม่พบประวัติเครดิต</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {currentHistory.map((item) => {
                        const transactionInfo = getTransactionInfo(item.transaction_type);
                        const TransactionIcon = transactionInfo.icon;
                        
                        return (
                          <div key={item.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`${transactionInfo.bgColor} p-3 rounded-xl`}>
                                  <TransactionIcon className={`w-5 h-5 ${transactionInfo.textColor}`} />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{item.reason}</h3>
                                  <p className="text-sm text-gray-600">
                                    {new Date(item.date).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  {item.equipment_name && (
                                    <p className="text-sm text-gray-500">อุปกรณ์: {item.equipment_name}</p>
                                  )}
                                  {item.admin_note && (
                                    <p className="text-sm text-blue-600 mt-1">
                                      <FiUser className="inline w-4 h-4 mr-1" />
                                      {item.admin_note}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-xl font-bold ${transactionInfo.textColor}`}>
                                  {item.transaction_type === 'deduct' || item.transaction_type === 'penalty' ? '-' : '+'}
                                  {item.amount}
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.status === 'pending' ? '⏳ รอดำเนินการ' :
                                   item.status === 'completed' ? '✅ เสร็จสิ้น' : item.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center mt-8 space-x-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ก่อนหน้า
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage >= totalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ถัดไป
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Borrowing Status */}
          <div className="space-y-6">
            {/* Current Borrowing */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiClock className="mr-2" />
                  อุปกรณ์ที่ยืมอยู่
                </h3>
              </div>
              <div className="p-6">
                {borrowingHistory.filter(item => item.status === 'borrowed').length === 0 ? (
                  <div className="text-center py-8">
                    <FiClock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">ไม่มีอุปกรณ์ที่ยืมอยู่</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {borrowingHistory
                      .filter(item => item.status === 'borrowed')
                      .map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">{item.equipment_name}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>วันที่ยืม: {new Date(item.borrow_date).toLocaleDateString('th-TH')}</p>
                            <p>ต้องคืนวันที่: {new Date(item.expected_return_date).toLocaleDateString('th-TH')}</p>
                            <p>เครดิตที่ใช้: <span className="font-medium text-yellow-600">{item.credit_used}</span></p>
                          </div>
                          <div className="mt-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800`}>
                              <FiClock className="w-3 h-3 mr-1" />
                              กำลังยืม
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Returns */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiCheckCircle className="mr-2" />
                  การคืนล่าสุด
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {borrowingHistory
                    .filter(item => item.status === 'returned' || item.status === 'returned_late')
                    .slice(0, 3)
                    .map((item) => {
                      const statusInfo = getBorrowStatus(item.status);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">{item.equipment_name}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>วันที่คืน: {new Date(item.actual_return_date).toLocaleDateString('th-TH')}</p>
                            <p>เครดิตที่คืน: <span className="font-medium text-green-600">{item.credit_used}</span></p>
                            {item.days_overdue > 0 && (
                              <p>ล่าช้า: <span className="font-medium text-red-600">{item.days_overdue} วัน</span></p>
                            )}
                          </div>
                          <div className="mt-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === 'returned' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Credit Tips */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiAlertCircle className="mr-2" />
                  เคล็ดลับการใช้เครดิต
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <FiCheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>คืนอุปกรณ์ตรงเวลาเพื่อได้เครดิตคืนเต็มจำนวน</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FiAlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p>การคืนล่าช้าจะโดนหักเครดิตเพิ่ม 5 เครดิตต่อวัน</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FiTrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p>การใช้งานดีจะได้รับโบนัสเครดิตจากระบบ</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FiClock className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p>เครดิตจะถูกคืนในอัตรา 5 เครดิตต่อ 7 วัน</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditManagement;