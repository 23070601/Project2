const express = require('express');
const controller = require('./dashboard.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate, requireRole(ROLES.MANAGER));

router.get('/kpis', asyncHandler(controller.kpis));
router.get('/mttr', asyncHandler(controller.mttr));
router.get('/downtime', asyncHandler(controller.downtime));
router.get('/technician-workload', asyncHandler(controller.technicianWorkload));
router.get('/report-trend', asyncHandler(controller.reportTrend));

module.exports = router;
