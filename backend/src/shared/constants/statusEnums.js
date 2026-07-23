// All constants and labels use ENGLISH as requested.
// Aligned 100% with vnuis_asset_maintenance_dss.sql & INS328201-Project II - Cons&Vali.pdf

const ROLES = Object.freeze({
  USER: 'User',
  TECHNICIAN: 'Technician',
  MANAGER: 'Manager',
});

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

// Exact 8 Asset Types from INS328201-Project II - Cons&Vali.pdf
const ASSET_TYPES = Object.freeze({
  PROJECTOR: 'Projector',
  TV: 'TV',
  AIRCON: 'Aircon',
  SPEAKER: 'Speaker',
  MICROPHONE: 'Microphone',
  DOCUMENT_CAMERA: 'DocumentCamera',
  CABLE: 'Cable',
  NETWORK_SWITCH: 'NetworkSwitch',
});

// Priority mapping for DSS1 from INS328201-Project II - Cons&Vali.pdf
const PRIORITY_BY_ASSET_TYPE = Object.freeze({
  Projector: PRIORITY.HIGH,
  TV: PRIORITY.HIGH,
  Aircon: PRIORITY.MEDIUM,
  Speaker: PRIORITY.MEDIUM,
  Microphone: PRIORITY.MEDIUM,
  DocumentCamera: PRIORITY.MEDIUM,
  NetworkSwitch: PRIORITY.MEDIUM,
  Cable: PRIORITY.LOW,
});

const DSS_CONSTANTS = Object.freeze({
  DSS3_THRESHOLD: 3,           // DSS3 threshold: 3 failures in 3 months
  DSS2_MAX_WORKLOAD: 3,        // Max active WorkOrders per technician
  PAGE_SIZE: 10,               // Table page size
  NOTIFICATION_PAGE_SIZE: 20,  // Notification dropdown page size
});

const REJECTION_REASONS = Object.freeze([
  { code: 'no_specialty', label: 'No matching technical specialty' },
  { code: 'overloaded', label: 'Currently overloaded with tasks' },
  { code: 'missing_parts', label: 'Missing spare parts or components' },
  { code: 'previous_fail', label: 'Previously unresolved repair issue' },
  { code: 'time_constraint', label: 'Unable to meet required time constraint' },
  { code: 'other', label: 'Other reason' },
]);

// Allowed task status transition flow
const TASK_STATUS_FLOW = {
  [TASK_STATUS.ASSIGNED]: [TASK_STATUS.RECEIVED],
  [TASK_STATUS.RECEIVED]: [TASK_STATUS.IN_PROGRESS],
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED],
  [TASK_STATUS.COMPLETED]: [],
  [TASK_STATUS.CLOSED]: [],
};

module.exports = {
  ROLES,
  ASSET_STATUS,
  PRIORITY,
  FAULT_REPORT_STATUS,
  TECHNICIAN_RESPONSE,
  TASK_STATUS,
  ASSET_TYPES,
  PRIORITY_BY_ASSET_TYPE,
  DSS_CONSTANTS,
  REJECTION_REASONS,
  TASK_STATUS_FLOW,
};
