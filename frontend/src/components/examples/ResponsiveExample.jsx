import React, { useState } from 'react';
import { 
  FiPackage, FiUsers, FiDollarSign, FiTrendingUp,
  FiSearch, FiFilter, FiDownload, FiPlus, FiEdit, FiTrash
} from 'react-icons/fi';
import {
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveGrid,
  ResponsiveTable,
  ResponsiveModal,
  ResponsiveStatsCard,
  ResponsiveInput
} from './ResponsiveComponents';

/**
 * ตัวอย่างการใช้งาน Responsive Components
 * แสดงวิธีการใช้งาน components ที่สร้างขึ้นในรูปแบบต่างๆ
 */

const ResponsiveExample = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ข้อมูลตัวอย่าง
  const stats = [
    { label: 'ทั้งหมด', value: 150, icon: FiPackage, color: 'blue', trend: 'up', trendValue: '+12%' },
    { label: 'ผู้ใช้งาน', value: 48, icon: FiUsers, color: 'green', trend: 'up', trendValue: '+5' },
    { label: 'รายได้', value: '25,000', icon: FiDollarSign, color: 'yellow' },
    { label: 'เติบโต', value: '15%', icon: FiTrendingUp, color: 'purple', trend: 'up' },
  ];

  const tableData = [
    { id: 1, name: 'อุปกรณ์ A', category: 'อิเล็กทรอนิกส์', quantity: 10, status: 'พร้อมใช้งาน' },
    { id: 2, name: 'อุปกรณ์ B', category: 'เครื่องมือ', quantity: 5, status: 'กำลังใช้งาน' },
    { id: 3, name: 'อุปกรณ์ C', category: 'อิเล็กทรอนิกส์', quantity: 15, status: 'พร้อมใช้งาน' },
    { id: 4, name: 'อุปกรณ์ D', category: 'เครื่องใช้', quantity: 8, status: 'ซ่อมบำรุง' },
  ];

  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'ชื่ออุปกรณ์' },
    { key: 'category', label: 'หมวดหมู่' },
    { key: 'quantity', label: 'จำนวน' },
    { 
      key: 'status', 
      label: 'สถานะ',
      render: (value) => (
        <span className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${value === 'พร้อมใช้งาน' ? 'bg-green-100 text-green-800' : ''}
          ${value === 'กำลังใช้งาน' ? 'bg-blue-100 text-blue-800' : ''}
          ${value === 'ซ่อมบำรุง' ? 'bg-yellow-100 text-yellow-800' : ''}
        `}>
          {value}
        </span>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header Section */}
        <ResponsiveCard
          title="ตัวอย่างระบบ Responsive"
          subtitle="แสดงผลได้ทุกขนาดหน้าจอ - มือถือ, แท็บเล็ต, คอมพิวเตอร์"
          actions={
            <>
              <ResponsiveButton 
                icon={FiPlus} 
                variant="primary"
                onClick={() => setIsModalOpen(true)}
              >
                เพิ่มข้อมูล
              </ResponsiveButton>
              <ResponsiveButton 
                icon={FiDownload} 
                variant="outline"
              >
                ดาวน์โหลด
              </ResponsiveButton>
            </>
          }
        >
          <p className="text-sm sm:text-base text-gray-600">
            Components เหล่านี้ได้รับการออกแบบมาเพื่อรองรับทุกอุปกรณ์และทุกเบราว์เซอร์
            ทำงานได้ดีตั้งแต่มือถือขนาดเล็กไปจนถึงจอคอมพิวเตอร์ขนาดใหญ่
          </p>
        </ResponsiveCard>

        {/* Statistics Section */}
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            สถิติภาพรวม
          </h2>
          <ResponsiveGrid 
            cols={{ xs: 2, sm: 2, md: 4, lg: 4 }}
            gap={3}
          >
            {stats.map((stat, index) => (
              <ResponsiveStatsCard
                key={index}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                trend={stat.trend}
                trendValue={stat.trendValue}
              />
            ))}
          </ResponsiveGrid>
        </div>

        {/* Search & Filter Section */}
        <ResponsiveCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <ResponsiveInput
                icon={FiSearch}
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <ResponsiveButton 
                icon={FiFilter} 
                variant="secondary"
                fullWidth
              >
                ตัวกรอง
              </ResponsiveButton>
            </div>
          </div>
        </ResponsiveCard>

        {/* Table Section */}
        <ResponsiveCard
          title="รายการข้อมูล"
          subtitle="ตารางแสดงผลแบบ responsive - บน desktop แสดงเป็นตาราง บน mobile แสดงเป็น cards"
        >
          <ResponsiveTable
            data={tableData}
            columns={tableColumns}
            onRowClick={(row) => console.log('Clicked:', row)}
            emptyMessage="ไม่พบข้อมูล"
          />
        </ResponsiveCard>

        {/* Button Variants Section */}
        <ResponsiveCard title="ตัวอย่างปุ่มต่างๆ">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">ขนาดปุ่ม:</p>
              <div className="flex flex-wrap gap-2">
                <ResponsiveButton size="sm" icon={FiPlus}>เล็ก</ResponsiveButton>
                <ResponsiveButton size="md" icon={FiPlus}>ปานกลาง</ResponsiveButton>
                <ResponsiveButton size="lg" icon={FiPlus}>ใหญ่</ResponsiveButton>
              </div>
            </div>

            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">สีของปุ่ม:</p>
              <div className="flex flex-wrap gap-2">
                <ResponsiveButton variant="primary" icon={FiPlus}>Primary</ResponsiveButton>
                <ResponsiveButton variant="secondary" icon={FiEdit}>Secondary</ResponsiveButton>
                <ResponsiveButton variant="success" icon={FiDownload}>Success</ResponsiveButton>
                <ResponsiveButton variant="danger" icon={FiTrash}>Danger</ResponsiveButton>
                <ResponsiveButton variant="warning" icon={FiFilter}>Warning</ResponsiveButton>
                <ResponsiveButton variant="outline" icon={FiSearch}>Outline</ResponsiveButton>
              </div>
            </div>

            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">ปุ่มพิเศษ:</p>
              <div className="flex flex-wrap gap-2">
                <ResponsiveButton icon={FiPlus} fullWidth>Full Width</ResponsiveButton>
                <ResponsiveButton icon={FiSearch} iconOnly title="Search" />
                <ResponsiveButton icon={FiFilter} iconOnly title="Filter" />
                <ResponsiveButton disabled icon={FiPlus}>Disabled</ResponsiveButton>
              </div>
            </div>
          </div>
        </ResponsiveCard>

        {/* Grid Examples */}
        <ResponsiveCard title="ตัวอย่าง Grid Layouts">
          <div className="space-y-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">2 คอลัมน์บนมือถือ, 4 คอลัมน์บน desktop:</p>
              <ResponsiveGrid cols={{ xs: 2, sm: 2, md: 3, lg: 4 }} gap={3}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <div key={item} className="bg-blue-100 rounded-lg p-4 text-center font-medium">
                    Item {item}
                  </div>
                ))}
              </ResponsiveGrid>
            </div>

            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">1 คอลัมน์บนมือถือ, 3 คอลัมน์บน desktop:</p>
              <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3 }} gap={4}>
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-green-100 rounded-lg p-6 text-center font-medium">
                    Card {item}
                  </div>
                ))}
              </ResponsiveGrid>
            </div>
          </div>
        </ResponsiveCard>

        {/* Form Example */}
        <ResponsiveCard title="ตัวอย่างฟอร์ม">
          <div className="space-y-3 sm:space-y-4">
            <ResponsiveInput
              label="ชื่อ-นามสกุล"
              icon={FiUsers}
              placeholder="กรอกชื่อ-นามสกุล"
            />
            <ResponsiveInput
              label="อีเมล"
              type="email"
              placeholder="example@email.com"
              helper="กรุณากรอกอีเมลที่ถูกต้อง"
            />
            <ResponsiveInput
              label="รหัสผ่าน"
              type="password"
              placeholder="••••••••"
              error="รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
            />
            <ResponsiveButton fullWidth variant="primary" icon={FiPlus}>
              บันทึกข้อมูล
            </ResponsiveButton>
          </div>
        </ResponsiveCard>

      </div>

      {/* Modal Example */}
      <ResponsiveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="ตัวอย่าง Modal"
        size="md"
        footer={
          <>
            <ResponsiveButton 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)}
            >
              ยกเลิก
            </ResponsiveButton>
            <ResponsiveButton 
              variant="primary" 
              icon={FiPlus}
              onClick={() => {
                alert('บันทึกข้อมูล!');
                setIsModalOpen(false);
              }}
            >
              บันทึก
            </ResponsiveButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm sm:text-base text-gray-600">
            Modal นี้จะปรับขนาดตามหน้าจอโดยอัตโนมัติ
            บนมือถือจะเต็มความกว้างของหน้าจอ
            บน desktop จะมีความกว้างที่เหมาะสม
          </p>
          <ResponsiveInput
            label="ข้อมูลตัวอย่าง"
            placeholder="กรอกข้อมูล..."
          />
          <ResponsiveInput
            label="รายละเอียด"
            placeholder="กรอกรายละเอียด..."
          />
        </div>
      </ResponsiveModal>
    </div>
  );
};

export default ResponsiveExample;
