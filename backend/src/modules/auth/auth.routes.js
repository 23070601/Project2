const express = require('express');
const controller = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.post('/login', asyncHandler(controller.login));
router.get('/me', authenticate, asyncHandler(controller.me));
router.patch('/me/password', authenticate, asyncHandler(controller.changePassword));
// THÊM ROUTE MỚI: Cập nhật profile
router.patch('/me/profile', authenticate, asyncHandler(controller.updateProfile));

module.exports = router;
