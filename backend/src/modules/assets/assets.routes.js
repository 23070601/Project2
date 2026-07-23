const express = require('express');
const controller = require('./assets.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Đọc: mọi vai trò (User tạo report chọn asset, Technician tra cứu AssetLookup/AssetList/AssetDetails)
router.get('/replacement-alerts', requireRole(ROLES.MANAGER), asyncHandler(controller.replacementAlerts));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

// Ghi: chỉ Manager (AddNewAssetClass.html, EditAssetClass.html)
router.post('/', requireRole(ROLES.MANAGER), asyncHandler(controller.create));
router.patch('/:id', requireRole(ROLES.MANAGER, ROLES.TECHNICIAN), asyncHandler(controller.update));
router.delete('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.remove));

module.exports = router;
