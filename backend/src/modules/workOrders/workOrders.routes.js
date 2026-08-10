const express = require('express');
const controller = require('./workOrders.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate);

// DSS2 - Managers/PendingRequestDetail.html gọi trước khi Approve & Assign
router.get('/suggestions/:reportId', requireRole(ROLES.MANAGER), asyncHandler(controller.suggestions));

// Technicians/AssignedTasks.html | Managers/AssignedTasks.html
router.get('/', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.list));
router.get('/:id', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN, ROLES.USER), asyncHandler(controller.getById));

// Managers/PendingRequestDetail.html "Approve & Assign"
router.post('/', requireRole(ROLES.MANAGER), asyncHandler(controller.create));

// Technicians/AssignedTasks.html accept, RejectModal.html reject
router.patch('/:id/response', requireRole(ROLES.TECHNICIAN), asyncHandler(controller.respond));
router.patch('/:id/reject', requireRole(ROLES.TECHNICIAN), asyncHandler(controller.reject));

// Managers/WorkOrderDetails.html cập nhật deadline & reassign
router.patch('/:id/deadline', requireRole(ROLES.MANAGER), asyncHandler(controller.updateDeadline));
router.patch('/:id/reassign', requireRole(ROLES.MANAGER), asyncHandler(controller.reassign));

// Technicians/WorkOrderDetails.html upload minh chứng sửa chữa (multi-file)
router.post(
  '/:id/images',
  requireRole(ROLES.TECHNICIAN, ROLES.MANAGER),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'evidence', maxCount: 5 }]),
  asyncHandler(controller.uploadImages)
);
router.delete(
  '/:id/images',
  requireRole(ROLES.TECHNICIAN, ROLES.MANAGER),
  asyncHandler(controller.deleteImage)
);

// Technicians/WorkOrderDetails.html cập nhật tiến độ
router.patch(
  '/:id/status',
  requireRole(ROLES.TECHNICIAN, ROLES.MANAGER),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'evidence', maxCount: 5 }]),
  asyncHandler(controller.updateStatus)
);

// Comments timeline for Manager - Technician communication
router.get('/:id/comments', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.getComments));
router.post('/:id/comments', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.addComment));

// User/ReportDetails.html reopen work order when issue persists
router.post('/:id/reopen', requireRole(ROLES.USER, ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.reopen));

module.exports = router;

