const confirmationsRepository = require('./confirmations.repository');
const workOrdersRepository = require('../workOrders/workOrders.repository');
const { created, ok, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, toPositiveInt } = require('../../shared/utils/validators');
const { TASK_STATUS } = require('../../shared/constants/statusEnums');

// FR-11: Users/ReportDetails.html - reporter xác nhận đã sửa xong & đánh giá chất lượng
async function create(req, res) {
  const orderId = toPositiveInt(req.params.orderId, 'orderId');
  requireFields(req.body, ['isConfirmed']);

  const order = await workOrdersRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'Work order not found');
  if (order.reporter_id !== req.user.userId) {
    throw new ApiError(403, 'You can only confirm work orders for your own fault reports');
  }
  if (![TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED].includes(order.task_status)) {
    throw new ApiError(400, 'Work order must be Completed before it can be confirmed');
  }

  const existing = await confirmationsRepository.findByOrderId(orderId);
  if (existing) throw new ApiError(409, 'This work order has already been confirmed');

  if (req.body.rating !== undefined) {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ApiError(400, 'rating must be an integer between 1 and 5');
    }
  }

  const confirmation = await confirmationsRepository.create({
    orderId,
    reporterId: req.user.userId,
    isConfirmed: req.body.isConfirmed,
    rating: req.body.rating,
    feedback: req.body.feedback,
  });

  created(res, confirmation);
}

async function getByOrderId(req, res) {
  const orderId = toPositiveInt(req.params.orderId, 'orderId');
  const confirmation = await confirmationsRepository.findByOrderId(orderId);
  if (!confirmation) throw new ApiError(404, 'No confirmation found for this work order');
  ok(res, confirmation);
}

module.exports = { create, getByOrderId };
