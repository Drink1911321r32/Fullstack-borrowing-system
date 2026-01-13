import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { equipmentAPI } from '../../api/api';

/**
 * Custom Hook สำหรับ Inventory System
 */
export const useInventory = () => {
  const [equipment, setEquipment] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchEquipment();
    fetchTypes();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await equipmentAPI.getAllEquipment();
      setEquipment(response.data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('ไม่สามารถดึงข้อมูลอุปกรณ์ได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await equipmentAPI.getEquipmentTypes();
      setEquipmentTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchSearch = item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || item.type_id === parseInt(filterType);
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return {
    equipment,
    equipmentTypes,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    filteredEquipment,
    fetchEquipment
  };
};
