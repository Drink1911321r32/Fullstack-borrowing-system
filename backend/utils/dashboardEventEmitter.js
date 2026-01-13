const EventEmitter = require('events');

class DashboardEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcastUpdate(eventType, data) {
    this.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify({ type: eventType, data, timestamp: new Date() })}\n\n`);
      } catch (error) {
        console.error('Error sending to client:', error);
        this.removeClient(client);
      }
    });
  }

  // เรียกใช้เมื่อมีการเปลี่ยนแปลงข้อมูล
  notifyStatsChange(changeType) {
    this.emit('stats-changed', changeType);
  }
}

const dashboardEmitter = new DashboardEventEmitter();

module.exports = dashboardEmitter;
