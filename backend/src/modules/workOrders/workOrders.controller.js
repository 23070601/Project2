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

  // UPDATE kích hoạt trigger DB: ghi lịch sử + notification cho reporter
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

module.exports = { list, getById, suggestions, create, respond, reject, updateStatus, reassign };
