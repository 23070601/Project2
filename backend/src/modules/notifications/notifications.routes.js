const express = require('express');
const controller = require('./notifications.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(controller.list));
router.get('/unread-count', asyncHandler(controller.unreadCount));
router.patch('/read-all', asyncHandler(controller.markAllAsRead));
router.patch('/:id/read', asyncHandler(controller.markAsRead));

module.exports = router;
