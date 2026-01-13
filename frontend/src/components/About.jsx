import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiPackage, FiUsers, FiTrendingUp, FiAward, 
  FiCheckCircle, FiTarget, FiHeart, FiStar,
  FiHome
} from 'react-icons/fi';

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">เกี่ยวกับเรา</h1>
            <Link 
              to="/welcome" 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiHome size={18} />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-full mb-6">
            <FiPackage size={40} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            ระบบจัดการยืม-คืนอุปกรณ์
          </h2>
          <h3 className="text-2xl font-semibold text-blue-600 mb-3">
            สาขาวิชาวิศวกรรมคอมพิวเตอร์
          </h3>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน
          </p>
          <p className="text-lg text-gray-500 mt-2">
            ระบบจัดการอุปกรณ์การเรียนการสอนที่มีประสิทธิภาพ โปร่งใส และตรวจสอบได้
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiTarget className="text-blue-600" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">พันธกิจ</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              จัดทำระบบการจัดการยืม-คืนอุปกรณ์การเรียนการสอนที่มีประสิทธิภาพ เพื่อสนับสนุนการเรียนการสอนของสาขาวิชาวิศวกรรมคอมพิวเตอร์ 
              โดยมุ่งเน้นความโปร่งใส การตรวจสอบได้ และความรับผิดชอบในการใช้ทรัพยากรร่วมกัน
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiStar className="text-purple-600" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">วิสัยทัศน์</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              พัฒนาระบบจัดการอุปกรณ์ที่ทันสมัย รองรับการใช้งานที่หลากหลาย และส่งเสริมการเรียนรู้ของนักศึกษา 
              เพื่อให้เป็นแบบอย่างของระบบจัดการทรัพยากรการศึกษาที่มีคุณภาพ
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            คุณสมบัติเด่น
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FiCheckCircle className="text-green-600" size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                ใช้งานง่าย
              </h4>
              <p className="text-gray-600">
                ออกแบบ UI/UX ที่เข้าใจง่าย ใช้งานได้ทันที ไม่ซับซ้อน
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FiTrendingUp className="text-blue-600" size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                รายงานแบบ Real-time
              </h4>
              <p className="text-gray-600">
                ติดตามสถานะและสถิติการใช้งานได้แบบเรียลไทม์
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FiAward className="text-purple-600" size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                ระบบเครดิต
              </h4>
              <p className="text-gray-600">
                จัดการสิทธิ์การยืมด้วยระบบเครดิตที่ยืดหยุ่นและยุติธรรม
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <FiUsers className="text-yellow-600" size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                จัดการผู้ใช้
              </h4>
              <p className="text-gray-600">
                ระบบจัดการผู้ใช้ที่ครอบคลุม มีระบบสิทธิ์แบบหลายระดับ
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FiPackage className="text-red-600" size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                ติดตามอุปกรณ์
              </h4>
              <p className="text-gray-600">
                ตรวจสอบสถานะและประวัติของอุปกรณ์ได้ครบถ้วน
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <FiHeart className="text-indigo-600" size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                การแจ้งเตือน
              </h4>
              <p className="text-gray-600">
                ระบบแจ้งเตือนแบบเรียลไทม์สำหรับทุกกิจกรรมที่สำคัญ
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">
            ข้อมูลการให้บริการ
          </h3>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">300+</div>
              <div className="text-blue-100">อุปกรณ์ในระบบ</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">200+</div>
              <div className="text-blue-100">นักศึกษาผู้ใช้งาน</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">1,500+</div>
              <div className="text-blue-100">รายการยืม-คืน/ปี</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">ระบบออนไลน์</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-100 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            สำหรับนักศึกษาสาขาวิศวกรรมคอมพิวเตอร์
          </h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            เข้าสู่ระบบด้วยบัญชีนักศึกษาของท่าน เพื่อเริ่มใช้งานระบบยืม-คืนอุปกรณ์การเรียนการสอน
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ลงทะเบียน
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 สาขาวิชาวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน
          </p>
          <p className="text-gray-500 text-sm mt-2">
            ระบบจัดการยืม-คืนอุปกรณ์การเรียนการสอน
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
