import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { borrowingAPI } from '../../api/api';

/**
 * Custom Hook สำหรับ Borrowing Management
 */
export const useBorrowingManagement = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const fetchBorrowings = async () => {
    setLoading(true);
    try {
      const response = await borrowingAPI.getAllBorrowings();
      setBorrowings(response.data || []);
    } catch (error) {
      console.error('Error fetching borrowings:', error);
      toast.error('ไม่สามารถดึงข้อมูลการยืมได้');
    } finally {
      setLoading(false);
    }
  };

  const approveBorrowing = async (transactionId) => {
    try {
      await borrowingAPI.approveBorrowing(transactionId);
      toast.success('อนุมัติการยืมสำเร็จ');
      await fetchBorrowings();
      return true;
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('ไม่สามารถอนุมัติได้');
      return false;
    }
  };

  const rejectBorrowing = async (transactionId, reason) => {
    try {
      await borrowingAPI.rejectBorrowing(transactionId, { reason });
      toast.success('ปฏิเสธการยืมสำเร็จ');
      await fetchBorrowings();
      return true;
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('ไม่สามารถปฏิเสธได้');
      return false;
    }
  };

  const filteredBorrowings = borrowings.filter(item => {
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchSearch = item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return {
    borrowings,
    loading,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    filteredBorrowings,
    fetchBorrowings,
    approveBorrowing,
    rejectBorrowing
  };
};
