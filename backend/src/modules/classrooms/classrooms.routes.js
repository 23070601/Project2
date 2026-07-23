const express = require('express');
const controller = require('./classrooms.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Đọc: mọi vai trò đều cần (User tạo báo cáo cần chọn phòng, Technician tra cứu...)
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

// Ghi: chỉ Manager (ClassroomsManagement.html, AddClassroom.html)
router.post('/', requireRole(ROLES.MANAGER), asyncHandler(controller.create));
router.patch('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.update));
router.delete('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.remove));

module.exports = router;
