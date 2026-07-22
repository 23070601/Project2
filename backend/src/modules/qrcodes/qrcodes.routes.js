const express = require('express');
const controller = require('./qrcodes.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate, requireRole(ROLES.MANAGER));

router.get('/', asyncHandler(controller.list));
router.post('/:roomId/generate', asyncHandler(controller.generate));
router.get('/:roomId', asyncHandler(controller.view));

module.exports = router;
