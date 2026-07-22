const QRCode = require('qrcode');
const classroomsRepository = require('../classrooms/classrooms.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { ok, ApiError } = require('../../shared/utils/responseWrapper');
const { toPositiveInt } = require('../../shared/utils/validators');

// URL đích khi quét QR: mở thẳng trang CreateReport.html với room_id điền sẵn.
// FRONTEND_BASE_URL nên trỏ tới domain thật khi deploy.
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5500/frontend/users';

// Managers/GenerateClassQR.html - sinh QR mới cho 1 phòng
async function generate(req, res) {
  const roomId = toPositiveInt(req.params.roomId, 'roomId');
  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, 'Classroom not found');

  const targetUrl = `${FRONTEND_BASE_URL}/CreateReport.html?room_id=${roomId}&room_name=${encodeURIComponent(room.room_name)}`;
  const qrCode = `QR-${room.room_name}-${Date.now()}`;
  const qrImageDataUrl = await QRCode.toDataURL(targetUrl, { width: 400, margin: 1 });

  await classroomsRepository.updateQrCode(roomId, qrCode);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'CREATE',
    entityTable: 'Classrooms',
    entityId: roomId,
    roomId,
    description: `Manager ${req.user.email} generated a new QR code for room ${room.room_name}`,
  });

  ok(res, { roomId, roomName: room.room_name, qrCode, targetUrl, qrImageDataUrl });
}

// Managers/ViewQRModal.html - render lại QR hiện có (không đổi mã) để xem/tải
async function view(req, res) {
  const roomId = toPositiveInt(req.params.roomId, 'roomId');
  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, 'Classroom not found');
  if (!room.qr_code) throw new ApiError(404, 'This classroom does not have a QR code yet');

  const targetUrl = `${FRONTEND_BASE_URL}/CreateReport.html?room_id=${roomId}&room_name=${encodeURIComponent(room.room_name)}`;
  const qrImageDataUrl = await QRCode.toDataURL(targetUrl, { width: 400, margin: 1 });

  ok(res, { roomId, roomName: room.room_name, qrCode: room.qr_code, targetUrl, qrImageDataUrl });
}

// Managers/QRManagement.html - danh sách toàn bộ phòng kèm trạng thái QR
async function list(req, res) {
  const rooms = await classroomsRepository.findAll();
  ok(res, rooms.map((r) => ({
    roomId: r.room_id,
    roomName: r.room_name,
    building: r.building,
    floorNumber: r.floor_number,
    hasQrCode: Boolean(r.qr_code),
    qrCode: r.qr_code,
  })));
}

module.exports = { generate, view, list };
