const express = require('express');
const controller = require('./classrooms.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { ROLES } = require('../../shared/constants/roles');
const asyncHandler = require('../../shared/utils/asyncHandler');
const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate);

// Đọc: mọi vai trò đều cần (User tạo báo cáo cần chọn phòng, Technician tra cứu...)
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

// Upload middleware handles multiple photo fields (up to 10 photos)
const uploadMiddleware = upload.fields([
  { name: 'photo', maxCount: 10 },
  { name: 'photos', maxCount: 10 },
  { name: 'image', maxCount: 10 },
  { name: 'images', maxCount: 10 },
  { name: 'evidence', maxCount: 10 }
]);


// Ghi: chỉ Manager (ClassroomsManagement.html, AddClassroom.html)
router.post('/', requireRole(ROLES.MANAGER), uploadMiddleware, asyncHandler(controller.create));
router.patch('/:id', requireRole(ROLES.MANAGER), uploadMiddleware, asyncHandler(controller.update));
router.put('/:id', requireRole(ROLES.MANAGER), uploadMiddleware, asyncHandler(controller.update));
router.delete('/:id', requireRole(ROLES.MANAGER), asyncHandler(controller.remove));

module.exports = router;

