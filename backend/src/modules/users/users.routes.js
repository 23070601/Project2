const express = require('express');
const controller = require('./users.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Danh sách kỹ thuật viên - Manager dùng khi gán WorkOrder
router.get('/technicians', requireRole(ROLES.MANAGER), asyncHandler(controller.listTechnicians));

// Quản lý người dùng - chỉ Manager (UsersManagement.html, AddNewUser.html, EditUserModal.html)
router.get('/', requireRole(ROLES.MANAGER), asyncHandler(controller.list));
router.get('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.getById));
router.post('/', requireRole(ROLES.MANAGER), asyncHandler(controller.create));
router.patch('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.update));
router.patch('/:id/password', requireRole(ROLES.MANAGER), asyncHandler(controller.resetPassword));
router.delete('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.deactivate));

module.exports = router;
