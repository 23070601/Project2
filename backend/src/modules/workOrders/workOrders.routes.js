const express = require('express');
const controller = require('./workOrders.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const upload = require('../../middlewares/upload.middleware');

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

// Managers/WorkOrderDetails.html cập nhật deadline
router.patch('/:id/deadline', requireRole(ROLES.MANAGER), asyncHandler(controller.updateDeadline));

// Technicians/WorkOrderDetails.html upload minh chứng sửa chữa (multi-file)
router.post(
  '/:id/images',
  requireRole(ROLES.TECHNICIAN, ROLES.MANAGER),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'evidence', maxCount: 5 }]),
  asyncHandler(controller.uploadImages)
);

// Technicians/WorkOrderDetails.html cập nhật tiến độ
router.patch(
  '/:id/status',
  requireRole(ROLES.TECHNICIAN, ROLES.MANAGER),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'evidence', maxCount: 5 }]),
  asyncHandler(controller.updateStatus)
);

// Managers reassign technician
router.patch('/:id/reassign', requireRole(ROLES.MANAGER), asyncHandler(controller.reassign));

// Comments timeline for Manager - Technician communication
router.get('/:id/comments', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.getComments));
router.post('/:id/comments', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.addComment));

module.exports = router;

