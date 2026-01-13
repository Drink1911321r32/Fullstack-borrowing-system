const { pool } = require('../config/db');

/**
 * ดึงการแจ้งเตือนของผู้ใช้
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.admin_id;
    const { type, is_read, limit = 50 } = req.query;
    
    // console.log('[Notifications] Fetching for userId:', userId, 'user_type:', req.user.user_type);

    let query = `
      SELECT 
        notification_id,
        COALESCE(member_id, admin_id) as user_id,
        type,
        title,
        message,
        is_read,
        priority,
        reference_type,
        reference_id,
        created_at,
        read_at
      FROM notifications
      WHERE (member_id = ? OR admin_id = ?)
    `;

    const params = [userId, userId];

    if (type && type !== 'all') {
      query += ` AND type = ?`;
      params.push(type);
    }

    if (is_read !== undefined && is_read !== 'all') {
      query += ` AND is_read = ?`;
      params.push(is_read === 'true' || is_read === '1');
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [notifications] = await pool.query(query, params);

    // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE (member_id = ? OR admin_id = ?) AND is_read = FALSE',
      [userId, userId]
    );

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount[0].count
      },
      message: 'ดึงการแจ้งเตือนสำเร็จ'
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน',
      error: error.message
    });
  }
};

/**
 * ทำเครื่องหมายว่าอ่านแล้ว
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.admin_id;
    const { notification_id } = req.params;

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE notification_id = ? AND (member_id = ? OR admin_id = ?)',
      [notification_id, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการแจ้งเตือน'
      });
    }

    res.status(200).json({
      success: true,
      message: 'ทำเครื่องหมายว่าอ่านแล้ว'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  }
};

/**
 * ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.admin_id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE (member_id = ? OR admin_id = ?) AND is_read = FALSE',
      [userId, userId]
    );

    res.status(200).json({
      success: true,
      message: 'ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว'
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  }
};

/**
 * ลบการแจ้งเตือน
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.admin_id;
    const { notification_id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM notifications WHERE notification_id = ? AND (member_id = ? OR admin_id = ?)',
      [notification_id, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการแจ้งเตือน'
      });
    }

    res.status(200).json({
      success: true,
      message: 'ลบการแจ้งเตือนสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  }
};

/**
 * สร้างการแจ้งเตือน (สำหรับระบบภายใน)
 */
const createNotification = async (userId, data, isAdmin = false) => {
  try {
    const { type, title, message, priority = 'medium', reference_id = null, reference_type = null } = data;

    // แยกว่าจะใส่ใน member_id หรือ admin_id
    const memberId = isAdmin ? null : userId;
    const adminId = isAdmin ? userId : null;

    const [result] = await pool.query(
      `INSERT INTO notifications (member_id, admin_id, type, title, message, priority, reference_id, reference_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [memberId, adminId, type, title, message, priority, reference_id, reference_type]
    );

    return {
      success: true,
      notification_id: result.insertId
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ดึงการแจ้งเตือนทั้งหมด (Admin)
 */
const getAllNotifications = async (req, res) => {
  try {
    const userId = req.user.member_id || req.user.admin_id;
    const userType = req.user.user_type; // 'admin' หรือ 'member'
    const { type, is_read, limit = 100, user_id } = req.query;

    // console.log('[Admin Notifications] Fetching for userId:', userId, 'userType:', userType);

    let query = `
      SELECT 
        n.notification_id,
        COALESCE(n.member_id, n.admin_id) as user_id,
        n.member_id,
        n.admin_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.priority,
        n.reference_id,
        n.reference_type,
        n.created_at,
        n.read_at,
        COALESCE(m.first_name, a.first_name) as first_name,
        COALESCE(m.last_name, a.last_name) as last_name,
        COALESCE(m.email, a.email) as email
      FROM notifications n
      LEFT JOIN members m ON n.member_id = m.member_id
      LEFT JOIN admins a ON n.admin_id = a.admin_id
      WHERE 1=1
    `;

    const params = [];

    // Admin เห็นทั้งหมด, Member เห็นเฉพาะของตัวเอง
    if (userType !== 'admin') {
      query += ` AND (n.member_id = ? OR n.admin_id = ?)`;
      params.push(userId, userId);
    }

    if (user_id) {
      query += ` AND COALESCE(n.member_id, n.admin_id) = ?`;
      params.push(user_id);
    }

    if (type && type !== 'all') {
      query += ` AND n.type = ?`;
      params.push(type);
    }

    if (is_read !== undefined && is_read !== 'all') {
      query += ` AND n.is_read = ?`;
      params.push(is_read === 'true' || is_read === '1');
    }

    query += ` ORDER BY n.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [notifications] = await pool.query(query, params);

    // นับจำนวนทั้งหมดและยังไม่อ่าน
    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread
      FROM notifications
      WHERE 1=1
    `;
    const statsParams = [];

    if (userType !== 'admin') {
      statsQuery += ` AND (member_id = ? OR admin_id = ?)`;
      statsParams.push(userId, userId);
    }

    const [stats] = await pool.query(statsQuery, statsParams);

    // console.log('[Admin Notifications] Found', notifications.length, 'notifications');

    res.status(200).json({
      success: true,
      data: {
        notifications,
        stats: stats[0]
      },
      message: 'ดึงการแจ้งเตือนสำเร็จ'
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน',
      error: error.message
    });
  }
};

// SSE clients tracking
const sseClients = new Map();

/**
 * Stream notifications แบบ real-time ด้วย SSE
 */
const streamNotifications = (req, res) => {
  const userId = req.user.member_id || req.user.admin_id;

  // ตั้งค่า SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // เก็บ client connection
  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  sseClients.get(userId).push(res);

  // ส่งข้อมูลเริ่มต้น
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connected' })}\n\n`);

  // ส่ง heartbeat ทุก 30 วินาที
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Cleanup เมื่อ client ตัดการเชื่อมต่อ
  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0) {
        sseClients.delete(userId);
      }
    }
  });
};

/**
 * ส่ง notification แบบ real-time ไปยัง user
 */
const sendNotificationToUser = (userId, notification) => {
  const clients = sseClients.get(userId);
  if (clients && clients.length > 0) {
    const data = JSON.stringify({ type: 'notification', data: notification });
    clients.forEach(client => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error('Error sending SSE notification:', error);
      }
    });
  }
};

module.exports = {
  getUserNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  streamNotifications,
  sendNotificationToUser,
  getUnreadNotifications
};

// เพิ่ม getUnreadNotifications method
async function getUnreadNotifications(req, res) {
  try {
    const userId = req.user.userId;
    
    const [notifications] = await pool.query(`
      SELECT 
        notification_id,
        COALESCE(member_id, admin_id) as user_id,
        notification_type,
        title,
        message,
        related_id,
        is_read,
        created_at
      FROM notifications
      WHERE (member_id = ? OR admin_id = ?) AND is_read = 0
      ORDER BY created_at DESC
    `, [userId, userId]);

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      message: 'ดึงข้อมูลการแจ้งเตือนที่ยังไม่ได้อ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Error in getUnreadNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน',
      error: error.message
    });
  }
}
