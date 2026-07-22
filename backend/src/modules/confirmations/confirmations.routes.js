const express = require('express');
const controller = require('./confirmations.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Users/ReportDetails.html - FR-11
router.post('/:orderId', requireRole(ROLES.USER), asyncHandler(controller.create));
router.get('/:orderId', asyncHandler(controller.getByOrderId));

module.exports = router;
