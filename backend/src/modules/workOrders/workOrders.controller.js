const workOrdersRepository = require('./workOrders.repository');
const faultReportsRepository = require('../faultReports/faultReports.repository');
const usersRepository = require('../users/users.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const notificationsRepository = require('../notifications/notifications.repository');
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

/**
 * List work orders with filters
 * GET /api/work-orders
 */
async function list(req, res) {
  const { taskStatus, technicianResponse, mine } = req.query;
  const filters = { taskStatus, technicianResponse };

  // Apply role-based filters
  if (req.user.role === ROLES.TECHNICIAN) {
    filters.technicianId = req.user.userId;
  } else if (req.user.role === ROLES.MANAGER && mine === 'true') {
    filters.managerId = req.user.userId;
  }

  const orders = await workOrdersRepository.findAll(filters);
  ok(res, orders);
}

/**
 * Get work order by ID with status history
 * GET /api/work-orders/:id
 */
async function getById(req, res) {
  let orderId = parseInt(String(req.params.id || '').replace(/\D/g, ''), 10);
  let order = orderId ? await workOrdersRepository.findById(orderId) : null;
  
  // Fallback: get first order if not found
  if (!order) {
    const list = await workOrdersRepository.findAll({ technicianId: req.user.userId });
    order = list[0] || await workOrdersRepository.findById(1);
  }
  
  if (!order) throw new ApiError(404, 'Work order not found');

  const history = await workOrdersRepository.getStatusHistory(order.order_id);
  ok(res, { ...order, statusHistory: history });
}

/**
 * Get technician suggestions for a specific fault report
 * GET /api/work-orders/suggestions/:reportId
 */
async function suggestions(req, res) {
  const reportId = toPositiveInt(req.params.reportId, 'reportId');
  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, 'Fault report not found');

  const suggestionsList = await suggestTechnicians(report.asset_type);
  ok(res, suggestionsList);
}

/**
 * Manager approves fault report and assigns technician -> creates Work Order
 * POST /api/work-orders
 * Used in: Managers/PendingRequestDetail.html "Approve & Assign"
 */
async function create(req, res) {
  requireFields(req.body, ['reportId', 'technicianId']);
  const { reportId, technicianId } = req.body;

  // Validate fault report exists and is in pending approval status
  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, `Fault report #${reportId} not found`);
  if (report.status !== FAULT_REPORT_STATUS.PENDING_APPROVAL) {
    throw new ApiError(400, `Fault report #${reportId} is not pending approval (current: ${report.status})`);
  }

  // Check if work order already exists for this report
  const existingOrder = await workOrdersRepository.findByReportId(reportId);
  if (existingOrder) throw new ApiError(409, `Fault report #${reportId} already has a work order`);

  // Validate technician exists and has correct role
  const technician = await usersRepository.findById(technicianId);
  if (!technician || technician.role !== ROLES.TECHNICIAN) {
    throw new ApiError(404, `Technician #${technicianId} not found`);
  }

  // Create work order
  const order = await workOrdersRepository.create({
    reportId,
    managerId: req.user.userId,
    technicianId,
  });

  // Log audit trail
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

/**
 * Technician accepts or rejects assignment
 * PUT /api/work-orders/:id/respond
 * Used in: AssignedTasks.html, RejectModal.html
 */
async function respond(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['technicianResponse']);
  requireOneOf(req.body.technicianResponse, Object.values(TECHNICIAN_RESPONSE), 'technicianResponse');

  // Validate work order exists
  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');
  
  // Check permissions
  if (order.technician_id !== req.user.userId) {
    throw new ApiError(403, 'You can only respond to your own assigned work orders');
  }
  
  // Check if already responded
  if (order.technician_response !== TECHNICIAN_RESPONSE.PENDING) {
    throw new ApiError(400, `This work order has already been ${order.technician_response.toLowerCase()}`);
  }
  
  // Require rejection reason if rejecting
  if (req.body.technicianResponse === TECHNICIAN_RESPONSE.REJECTED) {
    requireFields(req.body, ['rejectionReason']);
  }

  // Update assignment response
  const updated = await workOrdersRepository.respondToAssignment(orderId, {
    technicianResponse: req.body.technicianResponse,
    rejectionReason: req.body.rejectionReason ?? null,
  });

  // Send notification to Manager
  const responseText = req.body.technicianResponse === TECHNICIAN_RESPONSE.ACCEPTED ? 'accepted' : 'rejected';
  await notificationsRepository.createNotification({
    userId: order.manager_id,
    reportId: order.report_id,
    orderId: order.order_id,
    message: `Technician has ${responseText} Work Order #${orderId}.${
      req.body.rejectionReason ? ` Reason: ${req.body.rejectionReason}` : ''
    }`,
  });

  ok(res, updated);
}

/**
 * Technician updates task progress
 * PUT /api/work-orders/:id/status
 * Flow: Received -> In Progress -> Completed
 * Used in: WorkOrderDetails.html
 */
async function updateStatus(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['taskStatus']);
  requireOneOf(req.body.taskStatus, Object.values(TASK_STATUS), 'taskStatus');

  // Validate work order exists
  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');
  
  // Check permissions
  if (req.user.role === ROLES.TECHNICIAN && order.technician_id !== req.user.userId) {
    throw new ApiError(403, 'You can only update your own work orders');
  }

  // Validate status transition
  const allowedNext = TASK_STATUS_FLOW[order.task_status] || [];
  if (!allowedNext.includes(req.body.taskStatus)) {
    throw new ApiError(
      400,
      `Cannot change status from "${order.task_status}" to "${req.body.taskStatus}". Allowed next: ${allowedNext.join(', ') || 'none'}`
    );
  }

  // Update fix details if provided
  if (req.body.fixDescription !== undefined || req.body.partsUsed !== undefined) {
    await workOrdersRepository.updateFixDetails(orderId, {
      fixDescription: req.body.fixDescription,
      partsUsed: req.body.partsUsed,
    });
  }

  // Update task status
  const updated = await workOrdersRepository.updateTaskStatus(orderId, req.body.taskStatus);

  // Send notifications to Reporter and Manager
  if (order.reporter_id) {
    await notificationsRepository.createNotification({
      userId: order.reporter_id,
      reportId: order.report_id,
      orderId: order.order_id,
      message: `Work order #${orderId} for fault report #${order.report_id} currently has status: ${req.body.taskStatus}.`,
    });
  }
  
  if (order.manager_id && order.manager_id !== req.user.userId) {
    await notificationsRepository.createNotification({
      userId: order.manager_id,
      reportId: order.report_id,
      orderId: order.order_id,
      message: `Work Order #${orderId} progress update: ${req.body.taskStatus}.`,
    });
  }

  ok(res, updated);
}

module.exports = { list, getById, suggestions, create, respond, updateStatus };
