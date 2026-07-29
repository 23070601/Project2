const express = require('express');
const controller = require('./workOrders.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Technicians/AssignedTasks.html | Managers/AssignedTasks.html
router.get('/', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.list));
router.get('/:id', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.getById));

// DSS2 - Managers/PendingRequestDetail.html gọi trước khi Approve & Assign
router.get('/suggestions/:reportId', requireRole(ROLES.MANAGER), asyncHandler(controller.suggestions));

// Managers/PendingRequestDetail.html "Approve & Assign"
router.post('/', requireRole(ROLES.MANAGER), asyncHandler(controller.create));

// Technicians/AssignedTasks.html accept, RejectModal.html reject
router.patch('/:id/response', requireRole(ROLES.TECHNICIAN), asyncHandler(controller.respond));
router.patch('/:id/reject', requireRole(ROLES.TECHNICIAN), asyncHandler(controller.reject));

// Technicians/WorkOrderDetails.html cập nhật tiến độ
router.patch('/:id/status', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), asyncHandler(controller.updateStatus));

// Managers reassign technician
router.patch('/:id/reassign', requireRole(ROLES.MANAGER), asyncHandler(controller.reassign));

module.exports = router;
