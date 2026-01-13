import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiMail, FiPhone, FiMapPin, FiClock, 
  FiFacebook, FiTwitter, FiInstagram, FiLinkedin,
  FiSend, FiHome, FiUser, FiMessageSquare
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast.success('ส่งข้อความเรียบร้อยแล้ว! เราจะติดต่อกลับโดยเร็วที่สุด');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">ติดต่อเรา</h1>
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
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            ติดต่อสาขาวิชาวิศวกรรมคอมพิวเตอร์
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            สาขาวิชาวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน
          </p>
          <p className="text-lg text-gray-500 mt-2">
            มีข้อสงสัยเกี่ยวกับระบบยืม-คืนอุปกรณ์? ติดต่อสอบถามได้ที่นี่
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Address */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">ที่อยู่</h3>
                  <p className="text-gray-600">
                    สาขาวิชาวิศวกรรมคอมพิวเตอร์<br />
                    มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน<br />
                    744 ถนนสุรนารายณ์ ตำบลในเมือง<br />
                    อำเภอเมืองนครราชสีมา<br />
                    จังหวัดนครราชสีมา 30000
                  </p>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiPhone className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">โทรศัพท์</h3>
                  <p className="text-gray-600">
                    <a href="tel:+66044233000" className="hover:text-blue-600">
                      044-233000
                    </a>
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    สาขาวิชาวิศวกรรมคอมพิวเตอร์
                  </p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiMail className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">อีเมล</h3>
                  <p className="text-gray-600">
                    <a href="mailto:cpe@rmuti.ac.th" className="hover:text-blue-600">
                      cpe@rmuti.ac.th
                    </a>
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    สาขาวิชาวิศวกรรมคอมพิวเตอร์
                  </p>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiClock className="text-yellow-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">เวลาให้บริการ</h3>
                  <p className="text-gray-600">
                    วันจันทร์ - วันศุกร์<br />
                    08:00 - 16:30 น.<br />
                    <span className="text-sm text-gray-500">
                      (เว้นวันหยุดราชการ)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">ติดตามเรา</h3>
              <div className="flex gap-3">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <FiFacebook size={20} />
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-sky-500 text-white rounded-lg flex items-center justify-center hover:bg-sky-600 transition-colors"
                >
                  <FiTwitter size={20} />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-pink-600 text-white rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors"
                >
                  <FiInstagram size={20} />
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-700 text-white rounded-lg flex items-center justify-center hover:bg-blue-800 transition-colors"
                >
                  <FiLinkedin size={20} />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                ส่งข้อความถึงเรา
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiUser className="inline mr-2" size={16} />
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="กรอกชื่อของคุณ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiMail className="inline mr-2" size={16} />
                      อีเมล
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMessageSquare className="inline mr-2" size={16} />
                    หัวเรื่อง
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="เรื่องที่ต้องการติดต่อ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ข้อความ
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="พิมพ์ข้อความของคุณที่นี่..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>กำลังส่ง...</>
                  ) : (
                    <>
                      <FiSend size={18} />
                      ส่งข้อความ
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Map */}
            <div className="mt-8 bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <iframe
                  title="Google Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3826.6461596814786!2d102.08589931484237!3d14.882089989642087!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31194d7a3b309821%3A0x3c5e5e6b5e5e5e5e!2sRajamangala%20University%20of%20Technology%20Isan!5e0!3m2!1sth!2sth!4v1623456789012!5m2!1sth!2sth"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">
            ต้องการข้อมูลเพิ่มเติม?
          </h3>
          <p className="text-xl text-blue-100 mb-6">
            สามารถเข้าสู่ระบบเพื่อดูรายละเอียดเพิ่มเติม หรือติดต่อสอบถามได้ตามช่องทางด้านบน
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/welcome"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              ดูคำถามที่พบบ่อย
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

export default Contact;
