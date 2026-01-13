const { sequelize } = require('../config/db');

// ===================================================================
// Import all models
// ===================================================================
const Admin = require('./Admin');
const Member = require('./Member');
const Student = require('./Student');
const Faculty = require('./Faculty');
const Major = require('./Major');
const EquipmentType = require('./EquipmentType');
const Equipment = require('./Equipment');
const EquipmentItem = require('./EquipmentItem');
const EquipmentItemHistory = require('./EquipmentItemHistory');
const { BorrowingTransaction, DisbursementTransaction } = require('./Transaction');
const BorrowingTransactionItem = require('./BorrowingTransactionItem');
const CreditTransaction = require('./CreditTransaction');
const ReturnTransaction = require('./ReturnTransaction');
const Notification = require('./Notification');
const SystemSettings = require('./SystemSettings');

// ===================================================================
// Define associations (Relationships)
// ===================================================================

// -------------------------------------------------------------------
// Member associations
// -------------------------------------------------------------------
Member.hasOne(Student, { foreignKey: 'member_id', as: 'studentInfo' });
Member.hasMany(BorrowingTransaction, { foreignKey: 'member_id', as: 'borrowingTransactions' });
Member.hasMany(DisbursementTransaction, { foreignKey: 'member_id', as: 'disbursementTransactions' });
Member.hasMany(CreditTransaction, { foreignKey: 'member_id', as: 'creditTransactions' });
Member.hasMany(ReturnTransaction, { foreignKey: 'member_id', as: 'returnTransactions' });
Member.hasMany(Notification, { foreignKey: 'member_id', as: 'notifications' });
Member.hasMany(EquipmentItemHistory, { foreignKey: 'performed_by_member', as: 'itemHistories' });

// -------------------------------------------------------------------
// Admin associations
// -------------------------------------------------------------------
Admin.hasMany(BorrowingTransaction, { foreignKey: 'approved_by_admin', as: 'approvedBorrowings' });
Admin.hasMany(DisbursementTransaction, { foreignKey: 'approved_by_admin', as: 'approvedDisbursements' });
Admin.hasMany(CreditTransaction, { foreignKey: 'created_by_admin', as: 'createdCreditTransactions' });
Admin.hasMany(ReturnTransaction, { foreignKey: 'inspected_by_admin', as: 'inspectedReturns' });
Admin.hasMany(Notification, { foreignKey: 'admin_id', as: 'notifications' });
Admin.hasMany(EquipmentItemHistory, { foreignKey: 'performed_by_admin', as: 'itemHistories' });

// -------------------------------------------------------------------
// Faculty and Major associations
// -------------------------------------------------------------------
Faculty.hasMany(Major, { foreignKey: 'faculty_id', as: 'majors', onDelete: 'RESTRICT' });
Faculty.hasMany(Student, { foreignKey: 'faculty_id', as: 'students' });

Major.belongsTo(Faculty, { foreignKey: 'faculty_id', as: 'faculty' });
Major.hasMany(Student, { foreignKey: 'major_id', as: 'students' });

// -------------------------------------------------------------------
// Student associations
// -------------------------------------------------------------------
Student.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Student.belongsTo(Faculty, { foreignKey: 'faculty_id', as: 'faculty' });
Student.belongsTo(Major, { foreignKey: 'major_id', as: 'major' });

// -------------------------------------------------------------------
// EquipmentType associations
// -------------------------------------------------------------------
EquipmentType.hasMany(Equipment, { foreignKey: 'type_id', as: 'equipment' });

// -------------------------------------------------------------------
// Equipment associations
// -------------------------------------------------------------------
Equipment.belongsTo(EquipmentType, { foreignKey: 'type_id', as: 'equipmentType' });
Equipment.hasMany(EquipmentItem, { foreignKey: 'equipment_id', as: 'items' });
Equipment.hasMany(BorrowingTransaction, { foreignKey: 'equipment_id', as: 'borrowingTransactions' });
Equipment.hasMany(DisbursementTransaction, { foreignKey: 'equipment_id', as: 'disbursementTransactions' });
Equipment.hasMany(ReturnTransaction, { foreignKey: 'equipment_id', as: 'returnTransactions' });

// -------------------------------------------------------------------
// EquipmentItem associations
// -------------------------------------------------------------------
EquipmentItem.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });
EquipmentItem.hasMany(EquipmentItemHistory, { foreignKey: 'item_id', as: 'histories' });

// -------------------------------------------------------------------
// BorrowingTransaction associations
// -------------------------------------------------------------------
BorrowingTransaction.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
BorrowingTransaction.belongsTo(Admin, { foreignKey: 'approved_by_admin', as: 'adminApprover' });
BorrowingTransaction.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });
BorrowingTransaction.hasMany(ReturnTransaction, { foreignKey: 'borrowing_id', as: 'returns' });
BorrowingTransaction.hasMany(BorrowingTransactionItem, { foreignKey: 'transaction_id', as: 'transactionItems' });

// -------------------------------------------------------------------
// BorrowingTransactionItem associations (Item-level Tracking)
// -------------------------------------------------------------------
BorrowingTransactionItem.belongsTo(BorrowingTransaction, { foreignKey: 'transaction_id', as: 'borrowing' });
BorrowingTransactionItem.belongsTo(EquipmentItem, { foreignKey: 'item_id', as: 'equipmentItem' });

// EquipmentItem associations with BorrowingTransactionItem
EquipmentItem.hasMany(BorrowingTransactionItem, { foreignKey: 'item_id', as: 'transactionItems' });

// -------------------------------------------------------------------
// ReturnTransaction associations
// -------------------------------------------------------------------
ReturnTransaction.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
ReturnTransaction.belongsTo(Admin, { foreignKey: 'inspected_by_admin', as: 'adminInspector' });
ReturnTransaction.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });

// -------------------------------------------------------------------
// DisbursementTransaction associations
// -------------------------------------------------------------------
DisbursementTransaction.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
DisbursementTransaction.belongsTo(Admin, { foreignKey: 'approved_by_admin', as: 'adminApprover' });
DisbursementTransaction.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });

// -------------------------------------------------------------------
// CreditTransaction associations
// -------------------------------------------------------------------
CreditTransaction.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
CreditTransaction.belongsTo(Admin, { foreignKey: 'created_by_admin', as: 'adminCreator' });

// -------------------------------------------------------------------
// Notification associations
// -------------------------------------------------------------------
Notification.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Notification.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

// -------------------------------------------------------------------
// EquipmentItemHistory associations
// -------------------------------------------------------------------
EquipmentItemHistory.belongsTo(EquipmentItem, { foreignKey: 'item_id', as: 'equipmentItem' });
EquipmentItemHistory.belongsTo(Admin, { foreignKey: 'performed_by_admin', as: 'adminPerformer' });
EquipmentItemHistory.belongsTo(Member, { foreignKey: 'performed_by_member', as: 'memberPerformer' });

// ===================================================================
// Export all models
// ===================================================================
module.exports = {
  sequelize,
  Admin,
  Member,
  Student,
  Faculty,
  Major,
  EquipmentType,
  Equipment,
  EquipmentItem,
  EquipmentItemHistory,
  BorrowingTransaction,
  BorrowingTransactionItem,
  DisbursementTransaction,
  CreditTransaction,
  ReturnTransaction,
  Notification,
  SystemSettings
};
