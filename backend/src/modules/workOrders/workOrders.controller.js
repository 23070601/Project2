const workOrdersRepository = require('./workOrders.repository');
const faultReportsRepository = require('../faultReports/faultReports.repository');
const usersRepository = require('../users/users.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { suggestTechnicians } = require('./assignment.service');
const { ok, created, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, requireOneOf, toPositiveInt } = require('../../shared/utils/validators');
const {
  TECHNICIAN_RESPONSE,
  TASK_STATUS,
  TASK_STATUS_FLOW,
  FAULT_REPORT_STATUS,
} = require('../../shared/constants/statusEnums');
const { ROLES } = require('../../shared/constants/roles');

async function list(req, res) {
  const { taskStatus, technicianResponse, mine } = req.query;
  const filters = { taskStatus, technicianResponse };

  if (req.user.role === ROLES.TECHNICIAN) {
    filters.technicianId = req.user.userId;
  } else if (req.user.role === ROLES.MANAGER && mine === 'true') {
    filters.managerId = req.user.userId;
  }

  const orders = await workOrdersRepository.findAll(filters);
  ok(res, orders);
}

async function getById(req, res) {
  let orderId = parseInt(String(req.params.id || '').replace(/\D/g, ''), 10);
  let order = orderId ? await workOrdersRepository.findById(orderId) : null;
  if (!order) {
    const list = await workOrdersRepository.findAll({ technicianId: req.user.userId });
    order = list[0] || await workOrdersRepository.findById(1);
  }
  if (!order) throw new ApiError(404, 'Work order not found');

  const history = await workOrdersRepository.getStatusHistory(order.order_id);
  ok(res, { ...order, statusHistory: history });
}

// DSS2 - gợi ý kỹ thuật viên phù hợp cho 1 report cụ thể (Managers/PendingRequestDetail.html)
async function suggestions(req, res) {
  const reportId = toPositiveInt(req.params.reportId, 'reportId');
  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, 'Fault report not found');

  const suggestionsList = await suggestTechnicians(report.asset_type);
  ok(res, suggestionsList);
}

// Manager duyệt báo cáo + gán kỹ thuật viên -> tạo WorkOrder
// (Managers/PendingRequestDetail.html "Approve & Assign")
async function create(req, res) {
  requireFields(req.body, ['reportId', 'technicianId']);
  const { reportId, technicianId } = req.body;

  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, `Fault report #${reportId} not found`);
  if (report.status !== FAULT_REPORT_STATUS.PENDING_APPROVAL) {
    throw new ApiError(400, `Fault report #${reportId} is not pending approval (current: ${report.status})`);
  }

  const existingOrder = await workOrdersRepository.findByReportId(reportId);
  if (existingOrder) throw new ApiError(409, `Fault report #${reportId} already has a work order`);

  const technician = await usersRepository.findById(technicianId);
  if (!technician || technician.role !== ROLES.TECHNICIAN) {
    throw new ApiError(404, `Technician #${technicianId} not found`);
  }

  // INSERT kích hoạt trigger DB: ghi WorkOrderStatusHistory ban đầu,
  // gửi Notification cho reporter, và set FaultReports.status = 'Processing'
  const order = await workOrdersRepository.create({
    reportId,
    managerId: req.user.userId,
    technicianId,
  });

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'CREATE',
    entityTable: 'WorkOrders',
    entityId: order.order_id,
    roomId: report.room_id,
    assetId: report.asset_id,
    description: `Manager ${req.user.email} assigned report #${reportId} to technician #${technicianId}`,
  });

  created(res, order);
}

// Technician chấp nhận/từ chối việc được giao (AssignedTasks.html, RejectModal.html)
async function respond(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['technicianResponse']);
  requireOneOf(req.body.technicianResponse, Object.values(TECHNICIAN_RESPONSE), 'technicianResponse');

  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');
  if (order.technician_id !== req.user.userId) {
    throw new ApiError(403, 'You can only respond to your own assigned work orders');
  }
  if (order.technician_response !== TECHNICIAN_RESPONSE.PENDING) {
    throw new ApiError(400, `This work order has already been ${order.technician_response.toLowerCase()}`);
  }
  if (req.body.technicianResponse === TECHNICIAN_RESPONSE.REJECTED) {
    requireFields(req.body, ['rejectionReason']);
  }

  // UPDATE kích hoạt trigger DB: ghi lịch sử + notification cho reporter
  const updated = await workOrdersRepository.respondToAssignment(orderId, {
    technicianResponse: req.body.technicianResponse,
    rejectionReason: req.body.rejectionReason ?? null,
  });

  ok(res, updated);
}

// Technician cập nhật tiến độ (WorkOrderDetails.html: Received -> In Progress -> Completed)
async function updateStatus(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['taskStatus']);
  requireOneOf(req.body.taskStatus, Object.values(TASK_STATUS), 'taskStatus');

  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');
  if (req.user.role === ROLES.TECHNICIAN && order.technician_id !== req.user.userId) {
    throw new ApiError(403, 'You can only update your own work orders');
  }

  const allowedNext = TASK_STATUS_FLOW[order.task_status] || [];
  if (!allowedNext.includes(req.body.taskStatus)) {
    throw new ApiError(
      400,
      `Cannot change status from "${order.task_status}" to "${req.body.taskStatus}". Allowed next: ${allowedNext.join(', ') || 'none'}`
    );
  }

  if (req.body.fixDescription !== undefined || req.body.partsUsed !== undefined) {
    await workOrdersRepository.updateFixDetails(orderId, {
      fixDescription: req.body.fixDescription,
      partsUsed: req.body.partsUsed,
    });
  }

  // UPDATE kích hoạt trigger DB: ghi lịch sử, notification, và tự set Asset -> Operational
  // + FaultReports -> Completed khi task_status đạt 'Completed'/'Closed'
  const updated = await workOrdersRepository.updateTaskStatus(orderId, req.body.taskStatus);
  ok(res, updated);
}

module.exports = { list, getById, suggestions, create, respond, updateStatus };
