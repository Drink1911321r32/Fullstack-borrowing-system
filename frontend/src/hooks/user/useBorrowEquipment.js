import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { equipmentAPI, borrowingAPI } from '../../api/api';

/**
 * Custom Hook สำหรับ User Borrow Equipment
 */
export const useBorrowEquipment = () => {
  const [equipment, setEquipment] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await equipmentAPI.getAvailableEquipment();
      setEquipment(response.data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('ไม่สามารถดึงข้อมูลอุปกรณ์ได้');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.equipment_id === item.equipment_id);
      if (exists) {
        return prev.filter(i => i.equipment_id !== item.equipment_id);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (equipmentId, quantity) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.equipment_id === equipmentId 
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.available_quantity)) }
          : item
      )
    );
  };

  const submitBorrowRequest = async (borrowData) => {
    try {
      await borrowingAPI.createBorrowRequest({
        ...borrowData,
        equipment: selectedItems.map(item => ({
          equipment_id: item.equipment_id,
          quantity: item.quantity
        }))
      });
      toast.success('ส่งคำขอยืมสำเร็จ');
      setSelectedItems([]);
      return true;
    } catch (error) {
      console.error('Error submitting borrow request:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถส่งคำขอได้');
      return false;
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchSearch = item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || item.type_id === parseInt(filterType);
    return matchSearch && matchType;
  });

  return {
    equipment,
    selectedItems,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filteredEquipment,
    toggleSelectItem,
    updateQuantity,
    submitBorrowRequest,
    fetchEquipment
  };
};
