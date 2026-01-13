import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { equipmentItemAPI } from '../../api/api';

/**
 * Custom Hook สำหรับจัดการ Equipment Items
 */
export const useEquipmentItems = (equipment, isOpen) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);

  useEffect(() => {
    if (isOpen && equipment) {
      fetchItems();
    }
  }, [isOpen, equipment]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      if (!equipment || !equipment.equipment_id) {
        console.error('❌ Equipment data is invalid');
        toast.error('ข้อมูลอุปกรณ์ไม่ถูกต้อง');
        return;
      }
      
      const response = await equipmentItemAPI.getItemsByEquipmentId(equipment.equipment_id);
      setItems(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching items:', error);
      toast.error('ไม่สามารถดึงข้อมูลรายการได้');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (formData) => {
    try {
      await equipmentItemAPI.createItem({
        ...formData,
        equipment_id: equipment.equipment_id
      });
      toast.success('เพิ่มรายการสำเร็จ');
      await fetchItems();
      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถเพิ่มรายการได้');
      return false;
    }
  };

  const updateItem = async (itemId, formData) => {
    try {
      await equipmentItemAPI.updateItem(itemId, formData);
      toast.success('แก้ไขรายการสำเร็จ');
      await fetchItems();
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถแก้ไขรายการได้');
      return false;
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await equipmentItemAPI.deleteItem(itemId);
      toast.success('ลบรายการสำเร็จ');
      await fetchItems();
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถลบรายการได้');
      return false;
    }
  };

  const fetchItemHistory = async (itemId) => {
    try {
      const response = await equipmentItemAPI.getItemHistory(itemId);
      setItemHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching item history:', error);
      toast.error('ไม่สามารถดึงประวัติรายการได้');
    }
  };

  return {
    items,
    loading,
    selectedItem,
    setSelectedItem,
    itemHistory,
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
    fetchItemHistory
  };
};
