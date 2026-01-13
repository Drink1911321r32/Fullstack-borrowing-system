import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // อัปเดต state เมื่อเกิด error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // บันทึก error สำหรับการ debug
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // ส่ง error ไปยัง logging service (ถ้ามี)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI เมื่อเกิด error
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="mt-4 text-xl font-semibold text-gray-900 text-center">
              เกิดข้อผิดพลาด
            </h1>
            
            <p className="mt-2 text-sm text-gray-600 text-center">
              ขออภัย เกิดข้อผิดพลาดในการแสดงผลหน้านี้
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium">ข้อมูล Error (Development)</summary>
                <div className="mt-2">
                  <div className="font-semibold">Error:</div>
                  <div className="text-red-600">{this.state.error.toString()}</div>
                  <div className="mt-2 font-semibold">Stack Trace:</div>
                  <pre className="text-gray-600 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            )}
            
            <div className="mt-6 flex flex-col space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                รีโหลดหน้า
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;