const express = require('express');
const controller = require('./reports.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate, requireRole(ROLES.MANAGER));

router.get('/overview-stats', asyncHandler(controller.overviewStats));
router.get('/maintenance-overview', asyncHandler(controller.maintenanceOverview));
router.get('/asset-failure-analysis', asyncHandler(controller.assetFailureAnalysis));

module.exports = router;
