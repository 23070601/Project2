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
  const { taskStatus, technicianResponse, priority, deadline, mine } = req.query;
  const filters = { taskStatus, technicianResponse, priority, deadline };

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
  const { reportId, technicianId, deadlineAt } = req.body;

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
    deadlineAt: deadlineAt || null,
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

  // Notify technician about the new assignment
  try {
    const assetName = report.asset_name || `Asset #${report.asset_id}`;
    const roomName = report.room_name || `Room #${report.room_id}`;
    await notificationsRepository.createNotification({
      userId: technicianId,
      reportId: reportId,
      orderId: order.order_id,
      message: `You have been assigned to Work Order #${order.order_id} (${assetName} in ${roomName}).`,
    });
  } catch (e) {
    console.log('Failed to send technician notification on assign:', e.message);
  }

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
  if (req.body.technicianResponse === TECHNICIAN_RESPONSE.REJECTED) {
    requireFields(req.body, ['rejectionReason']);
    const updated = await workOrdersRepository.rejectAssignment(orderId, req.body.rejectionReason);
    
    if (order.manager_id) {
      try {
        const technicianName = req.user.fullName || 'Technician';
        await notificationsRepository.createNotification({
          userId: order.manager_id,
          reportId: order.report_id,
          orderId: order.order_id,
          message: `Technician ${technicianName} rejected WorkOrder WO-${orderId}. Reason: ${req.body.rejectionReason}`,
        });
      } catch (e) {
        console.log('Failed to send manager notification on reject:', e.message);
      }
    }
    return ok(res, updated);
  }

  // Update assignment response
  const updated = await workOrdersRepository.respondToAssignment(orderId, {
    technicianResponse: req.body.technicianResponse,
    rejectionReason: req.body.rejectionReason ?? null,
  });

  // Gửi Notification cho Manager khi Kỹ thuật viên Accept
  if (order.manager_id) {
    try {
      const responseText = req.body.technicianResponse === TECHNICIAN_RESPONSE.ACCEPTED ? 'accepted' : 'rejected';
      await notificationsRepository.createNotification({
        userId: order.manager_id,
        reportId: order.report_id,
        orderId: order.order_id,
        message: `Technician has ${responseText} Work Order #${orderId}.${
          req.body.rejectionReason ? ` Reason: ${req.body.rejectionReason}` : ''
        }`,
      });
    } catch (e) {
      console.log('Failed to send manager notification on response:', e.message);
    }
  }

  ok(res, updated);
}

async function reject(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['rejectionReason']);

  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');
  if (order.technician_id !== req.user.userId) {
    throw new ApiError(403, 'You can only respond to your own assigned work orders');
  }
  if (order.technician_response !== TECHNICIAN_RESPONSE.PENDING) {
    throw new ApiError(400, `This work order has already been ${order.technician_response.toLowerCase()}`);
  }

  const updated = await workOrdersRepository.rejectAssignment(orderId, req.body.rejectionReason);

  // Send Notification to Manager on reject
  if (order.manager_id) {
    try {
      const technicianName = req.user.fullName || 'Technician';
      await notificationsRepository.createNotification({
        userId: order.manager_id,
        reportId: order.report_id,
        orderId: order.order_id,
        message: `Technician ${technicianName} rejected WorkOrder WO-${orderId}. Reason: ${req.body.rejectionReason}`,
      });
    } catch (e) {
      console.log('Failed to send manager notification on reject:', e.message);
    }
  }

  ok(res, updated);
}

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

  // Gửi Notification cho Reporter & Manager khi cập nhật trạng thái
  try {
    if (order.reporter_id) {
      await notificationsRepository.createNotification({
        userId: order.reporter_id,
        reportId: order.report_id,
        orderId: order.order_id,
        message: `Work Order #${orderId} for report #${order.report_id} updated to status: ${req.body.taskStatus}.`,
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
  } catch (e) {
    console.log('Failed to send status update notification:', e.message);
  }

  ok(res, updated);
}

async function reassign(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['technicianId']);
  const { technicianId } = req.body;

  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');

  const technician = await usersRepository.findById(technicianId);
  if (!technician || technician.role !== ROLES.TECHNICIAN) {
    throw new ApiError(404, `Technician #${technicianId} not found`);
  }

  const updated = await workOrdersRepository.reassign(orderId, technicianId);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'WorkOrders',
    entityId: orderId,
    roomId: order.room_id,
    assetId: order.asset_id,
    description: `Manager ${req.user.email} reassigned work order #${orderId} to technician #${technicianId}`,
  });

  try {
    await notificationsRepository.createNotification({
      userId: technicianId,
      reportId: order.report_id,
      orderId: order.order_id,
      message: `New task assigned: Work Order #${orderId}`,
    });
  } catch (e) {
    console.log('Failed to send technician notification on reassign:', e.message);
  }

  ok(res, updated);
}

async function updateDeadline(req, res) {
  const orderId = toPositiveInt(req.params.id, 'id');
  const deadlineAt = req.body.deadline_at || req.body.deadlineAt;

  if (!deadlineAt) {
    throw new ApiError(400, 'Please provide deadline_at');
  }

  const order = await workOrdersRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Work order not found');
  }

  if (['Closed', 'Completed'].includes(order.task_status)) {
    throw new ApiError(400, 'Cannot update deadline for completed/closed work order');
  }

  const deadlineDate = new Date(deadlineAt);
  if (isNaN(deadlineDate.getTime())) {
    throw new ApiError(400, 'Invalid deadline date format');
  }

  if (deadlineDate < new Date()) {
    throw new ApiError(400, 'Deadline cannot be in the past');
  }

  const formattedDeadline = deadlineDate.toISOString().slice(0, 19).replace('T', ' ');

  const updated = await workOrdersRepository.updateDeadline(orderId, formattedDeadline);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'WorkOrders',
    entityId: orderId,
    roomId: order.room_id,
    assetId: order.asset_id,
    description: `Manager updated deadline to ${formattedDeadline} for WorkOrder ${orderId}`,
  });

  if (order.technician_id) {
    try {
      await notificationsRepository.createNotification({
        userId: order.technician_id,
        reportId: order.report_id,
        orderId: orderId,
        message: `Deadline for WorkOrder WO-${orderId} has been updated to ${deadlineDate.toLocaleString()}`,
      });
    } catch (e) {
      console.log('Failed to send notification on deadline update:', e.message);
    }
  }

  return ok(res, updated);
}

async function reopen(req, res) {
  const rawId = req.params.orderId || req.params.id;
  const orderId = toPositiveInt(rawId, 'orderId');
  requireFields(req.body, ['reason']);
  const { reason } = req.body;

  const order = await workOrdersRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, `Work order #${orderId} not found`);
  }

  if (order.task_status === TASK_STATUS.CLOSED) {
    throw new ApiError(400, 'Work order is already closed and cannot be reopened');
  }

  if (order.task_status !== TASK_STATUS.COMPLETED) {
    throw new ApiError(400, `Work order is not in Completed status (current status: ${order.task_status})`);
  }

  // Update WorkOrder status -> In Progress
  await workOrdersRepository.updateStatus(orderId, TASK_STATUS.IN_PROGRESS);

  // Update FaultReport status -> Processing
  if (order.report_id) {
    await faultReportsRepository.updateStatus(order.report_id, FAULT_REPORT_STATUS.PROCESSING);
  }

  // Record status history log
  await workOrdersRepository.addStatusHistory({
    orderId,
    oldStatus: 'Completed',
    newStatus: 'In Progress',
    note: `User reported issue persists: ${reason}`,
    changedBy: req.user ? req.user.userId : null,
  });

  // Notify Technician & Manager
  if (order.technician_id) {
    try {
      await notificationsRepository.create({
        userId: order.technician_id,
        reportId: order.report_id,
        orderId: orderId,
        message: `WorkOrder WO-${orderId} has been reopened. User reported issue persists.`,
      });
    } catch (e) {
      console.log('Failed to send technician notification on reopen:', e.message);
    }
  }

  if (order.manager_id) {
    try {
      await notificationsRepository.create({
        userId: order.manager_id,
        reportId: order.report_id,
        orderId: orderId,
        message: `WorkOrder WO-${orderId} was reopened by User. Please review.`,
      });
    } catch (e) {
      console.log('Failed to send manager notification on reopen:', e.message);
    }
  }

  const updatedOrder = await workOrdersRepository.findById(orderId);
  return ok(res, updatedOrder);
}

module.exports = { list, getById, suggestions, create, respond, reject, updateStatus, reassign, updateDeadline, reopen };

