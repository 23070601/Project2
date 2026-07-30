const express = require('express');
const controller = require('./faultReports.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');
const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET routes
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

// ✅ POST route - QUAN TRỌNG: PHẢI CÓ DÒNG NÀY
router.post('/', 
  requireRole(ROLES.USER, ROLES.TECHNICIAN, ROLES.MANAGER), 
  upload.single('evidence'),
  asyncHandler(controller.create)
);

// PATCH route
router.patch('/:id/status', 
  requireRole(ROLES.MANAGER), 
  asyncHandler(controller.updateStatus)
);

// Users delete pending report
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
