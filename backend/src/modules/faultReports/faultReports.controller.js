const faultReportsRepository = require('./faultReports.repository');
const classroomsRepository = require('../classrooms/classrooms.repository');
const assetsRepository = require('../assets/assets.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { calculatePriority } = require('./priority.service');
const { ok, created, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, requireOneOf, toPositiveInt } = require('../../shared/utils/validators');
const { FAULT_REPORT_STATUS } = require('../../shared/constants/statusEnums');
const { ROLES } = require('../../shared/constants/roles');

async function list(req, res) {
  const { status, priority, roomId, mine } = req.query;

  const filters = { status, priority, roomId: roomId ? Number(roomId) : undefined };
  if (req.user.role === ROLES.USER || mine === 'true') {
    filters.reporterId = req.user.userId;
  }

  const reports = await faultReportsRepository.findAll(filters);
  ok(res, reports);
}

async function getById(req, res) {
  const reportId = toPositiveInt(req.params.id, 'id');
  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, 'Fault report not found');

  if (req.user.role === ROLES.USER && report.reporter_id !== req.user.userId) {
    throw new ApiError(403, 'You can only view your own fault reports');
  }

  const history = await faultReportsRepository.getStatusHistory(reportId);
  ok(res, { ...report, statusHistory: history });
}

// SỬA HÀM CREATE - XỬ LÝ FILE UPLOAD
async function create(req, res) {
  requireFields(req.body, ['roomId', 'description']);
  const { roomId, assetId, description, urgencyHint } = req.body;

  // Lấy imagePath từ file upload nếu có
  let imagePath = null;
  if (req.file) {
    imagePath = '/uploads/' + req.file.filename;
    console.log('File uploaded:', imagePath);
  }

  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, `Classroom #${roomId} not found`);

  let asset = null;
  if (assetId) {
    asset = await assetsRepository.findById(assetId);
    if (!asset) throw new ApiError(404, `Asset #${assetId} not found`);
    if (asset.room_id !== Number(roomId)) {
      throw new ApiError(400, 'Selected asset does not belong to the selected classroom');
    }
  }

  const { priority, score } = calculatePriority({
    urgencyHint: urgencyHint || 'Medium',
    assetType: asset?.asset_type ?? null,
    failureCount: asset?.failure_count ?? 0,
  });

  const report = await faultReportsRepository.create({
    reporterId: req.user.userId,
    assetId: assetId ?? null,
    roomId: roomId,
    description: description,
    imagePath: imagePath, // Đã có imagePath từ file upload
    priority: priority,
  });

  created(res, { ...report, dss1Score: score });
}

// Manager duyệt/từ chối báo cáo
async function updateStatus(req, res) {
  const reportId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['status']);
  requireOneOf(req.body.status, Object.values(FAULT_REPORT_STATUS), 'status');

  const existing = await faultReportsRepository.findById(reportId);
  if (!existing) throw new ApiError(404, 'Fault report not found');

  const updated = await faultReportsRepository.updateStatus(reportId, req.body.status);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'FaultReports',
    entityId: reportId,
    roomId: existing.room_id,
    assetId: existing.asset_id,
    description: `Manager ${req.user.email} set report #${reportId} status to ${req.body.status}${
      req.body.rejectionReason ? ` (reason: ${req.body.rejectionReason})` : ''
    }`,
  });

  ok(res, updated);
}

module.exports = { list, getById, create, updateStatus };