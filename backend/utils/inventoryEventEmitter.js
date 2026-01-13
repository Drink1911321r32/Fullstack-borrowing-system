const EventEmitter = require('events');

class InventoryEventEmitter extends EventEmitter {
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
        console.error('Error sending to inventory client:', error);
        this.removeClient(client);
      }
    });
  }

  // เรียกใช้เมื่อมีการเปลี่ยนแปลงข้อมูล inventory
  notifyInventoryChange(changeType, data = {}) {
    this.emit('inventory-changed', { changeType, data });
    this.broadcastUpdate('inventory-updated', { changeType, ...data });
  }
}

const inventoryEmitter = new InventoryEventEmitter();

module.exports = inventoryEmitter;
