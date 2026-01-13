import api from './api';

/**
 * ดาวน์โหลดรายงาน PDF สำหรับ Admin
 */
export const downloadAdminReportPDF = async (dateRange = '30days', startDate = null, endDate = null) => {
  let url = '/admin/reports/export/pdf';
  const params = new URLSearchParams();
  
  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  } else if (dateRange) {
    params.append('dateRange', dateRange);
  }
  
  const response = await api.get(`${url}?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * ดาวน์โหลดรายงาน Excel สำหรับ Admin
 */
export const downloadAdminReportExcel = async (dateRange = '30days', startDate = null, endDate = null) => {
  let url = '/admin/reports/export/excel';
  const params = new URLSearchParams();
  
  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  } else if (dateRange) {
    params.append('dateRange', dateRange);
  }
  
  const response = await api.get(`${url}?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * ดาวน์โหลดรายงาน PDF สำหรับ User
 */
export const downloadUserReportPDF = async (dateRange = '3months', startDate = null, endDate = null) => {
  let url = '/users/reports/export/pdf';
  const params = new URLSearchParams();
  
  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  } else if (dateRange) {
    params.append('dateRange', dateRange);
  }
  
  const response = await api.get(`${url}?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * ดาวน์โหลดรายงาน Excel สำหรับ User
 */
export const downloadUserReportExcel = async (dateRange = '3months', startDate = null, endDate = null) => {
  let url = '/users/reports/export/excel';
  const params = new URLSearchParams();
  
  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  } else if (dateRange) {
    params.append('dateRange', dateRange);
  }
  
  const response = await api.get(`${url}?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Helper function สำหรับดาวน์โหลดไฟล์
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * ดาวน์โหลดรายงานคลังอุปกรณ์เป็น Excel
 */
export const downloadInventoryExcel = async () => {
  try {
    const response = await api.get('/equipment/export/excel', {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading inventory Excel:', error);
    throw error.response?.data || error;
  }
};

export default {
  downloadAdminReportPDF,
  downloadAdminReportExcel,
  downloadUserReportPDF,
  downloadUserReportExcel,
  downloadInventoryExcel,
  downloadFile
};
