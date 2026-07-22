const express = require('express');
const controller = require('./faultReports.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Users/ListReports.html, ReportDetails.html | Managers/PendingRequest.html
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

// Users/CreateReport.html
router.post('/', requireRole(ROLES.USER), asyncHandler(controller.create));

// Managers/PendingRequestDetail.html (duyệt), RejectReport.html (từ chối)
router.patch('/:id/status', requireRole(ROLES.MANAGER), asyncHandler(controller.updateStatus));

module.exports = router;
