const express = require('express');
const controller = require('./workOrders.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate);

// Evidence Images API
router.post('/:orderId/images', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), upload.array('images', 5), asyncHandler(controller.uploadImages));
router.post('/:id/images', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), upload.array('images', 5), asyncHandler(controller.uploadImages));
router.delete('/:orderId/images/:imageId', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), asyncHandler(controller.deleteImage));
router.delete('/:id/images/:imageId', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), asyncHandler(controller.deleteImage));

// Technicians/AssignedTasks.html | Managers/AssignedTasks.html

router.get('/', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.list));
router.get('/:id/history', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN, ROLES.USER), asyncHandler(controller.getHistory));
router.get('/:id', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN, ROLES.USER), asyncHandler(controller.getById));

// DSS2 - Managers/PendingRequestDetail.html gọi trước khi Approve & Assign
router.get('/suggestions/:reportId', requireRole(ROLES.MANAGER), asyncHandler(controller.suggestions));

// Managers/PendingRequestDetail.html "Approve & Assign"
router.post('/', requireRole(ROLES.MANAGER), asyncHandler(controller.create));

// Technicians/AssignedTasks.html accept, RejectModal.html reject
router.patch('/:id/response', requireRole(ROLES.TECHNICIAN), asyncHandler(controller.respond));
router.patch('/:id/reject', requireRole(ROLES.TECHNICIAN), asyncHandler(controller.reject));

// Managers/WorkOrderDetails.html cập nhật deadline
router.patch('/:id/deadline', requireRole(ROLES.MANAGER), asyncHandler(controller.updateDeadline));

// Technicians/WorkOrderDetails.html cập nhật tiến độ
router.patch('/:orderId/status', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), asyncHandler(controller.updateStatus));
router.patch('/:id/status', requireRole(ROLES.TECHNICIAN, ROLES.MANAGER), asyncHandler(controller.updateStatus));

// Managers reassign technician
router.patch('/:id/reassign', requireRole(ROLES.MANAGER), asyncHandler(controller.reassign));

// User reopens WorkOrder when issue persists
router.post('/:orderId/reopen', asyncHandler(controller.reopen));
router.post('/:id/reopen', asyncHandler(controller.reopen));

module.exports = router;
