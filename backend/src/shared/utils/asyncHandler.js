// Bọc controller async để lỗi tự động rơi vào error.middleware.js
// Dùng: router.get('/', asyncHandler(controller.list))
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
