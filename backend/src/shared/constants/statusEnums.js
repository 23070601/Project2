// Toàn bộ giá trị dưới đây PHẢI khớp với CHECK constraint trong
// vnuis_asset_maintenance_dss.sql. Đổi ở đây thì phải đổi cả trong SQL.

const ASSET_STATUS = Object.freeze({
  OPERATIONAL: 'Operational',
  UNDER_REPAIR: 'Under Repair',
  RECOMMENDED_FOR_REPLACEMENT: 'Recommended for Replacement',
  RETIRED: 'Retired',
});

const PRIORITY = Object.freeze({
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
});

const FAULT_REPORT_STATUS = Object.freeze({
  PENDING_APPROVAL: 'Pending Approval',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
});

const TECHNICIAN_RESPONSE = Object.freeze({
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
});

const TASK_STATUS = Object.freeze({
  ASSIGNED: 'Assigned',
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
});

// Thứ tự hợp lệ để chuyển trạng thái WorkOrder (dùng để validate PATCH status)
const TASK_STATUS_FLOW = {
  [TASK_STATUS.ASSIGNED]: [TASK_STATUS.RECEIVED],
  [TASK_STATUS.RECEIVED]: [TASK_STATUS.IN_PROGRESS],
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED],
  [TASK_STATUS.COMPLETED]: [TASK_STATUS.CLOSED],
  [TASK_STATUS.CLOSED]: [],
};

module.exports = {
  ASSET_STATUS,
  PRIORITY,
  FAULT_REPORT_STATUS,
  TECHNICIAN_RESPONSE,
  TASK_STATUS,
  TASK_STATUS_FLOW,
};
