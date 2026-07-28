const faultReportsRepository = require('./faultReports.repository');
const classroomsRepository = require('../classrooms/classrooms.repository');
const assetsRepository = require('../assets/assets.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const notificationsRepository = require('../notifications/notifications.repository');
const { calculatePriority } = require('./priority.service');
const { ok, created, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, requireOneOf, toPositiveInt } = require('../../shared/utils/validators');
const { FAULT_REPORT_STATUS } = require('../../shared/constants/statusEnums');
const { ROLES } = require('../../shared/constants/roles');

/**
 * List fault reports with filters
 * GET /api/fault-reports
 */
async function list(req, res) {
  const { status, priority, roomId, mine } = req.query;

  const filters = { status, priority, roomId: roomId ? Number(roomId) : undefined };
  
  // Regular users can only see their own reports
  if (req.user.role === ROLES.USER || mine === 'true') {
    filters.reporterId = req.user.userId;
  }

  const reports = await faultReportsRepository.findAll(filters);
  ok(res, reports);
}

/**
 * Get fault report by ID with status history
 * GET /api/fault-reports/:id
 */
async function getById(req, res) {
  const reportId = toPositiveInt(req.params.id, 'id');
  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, 'Fault report not found');

  // Regular users can only view their own reports
  if (req.user.role === ROLES.USER && report.reporter_id !== req.user.userId) {
    throw new ApiError(403, 'You can only view your own fault reports');
  }

  const history = await faultReportsRepository.getStatusHistory(reportId);
  ok(res, { ...report, statusHistory: history });
}

/**
 * Create a new fault report with file upload support
 * POST /api/fault-reports
 */
async function create(req, res) {
  requireFields(req.body, ['roomId', 'description']);
  const { roomId, assetId, description, urgencyHint } = req.body;

  // Get image path from uploaded file if present
  let imagePath = null;
  if (req.file) {
    imagePath = '/uploads/' + req.file.filename;
    console.log('File uploaded:', imagePath);
  }

  // Validate classroom exists
  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, `Classroom #${roomId} not found`);

  // Validate asset if provided
  let asset = null;
  if (assetId) {
    asset = await assetsRepository.findById(assetId);
    if (!asset) throw new ApiError(404, `Asset #${assetId} not found`);
    if (asset.room_id !== Number(roomId)) {
      throw new ApiError(400, 'Selected asset does not belong to the selected classroom');
    }
  }

  // Calculate priority using DSS algorithm
  const { priority, score } = calculatePriority({
    urgencyHint: urgencyHint || 'Medium',
    assetType: asset?.asset_type ?? null,
    failureCount: asset?.failure_count ?? 0,
  });

  // Create fault report
  const report = await faultReportsRepository.create({
    reporterId: req.user.userId,
    assetId: assetId ?? null,
    roomId: roomId,
    description: description,
    imagePath: imagePath,
    priority: priority,
  });

  const assetOrRoom = asset?.asset_name || `Room ${room.room_name}`;

  // Send confirmation notification to reporter
  await notificationsRepository.createNotification({
    userId: req.user.userId,
    reportId: report.report_id,
    message: `Fault report #${report.report_id} (${assetOrRoom}) has been created successfully.`,
  });

  // Send notification to all Managers
  await notificationsRepository.notifyRole('Manager', {
    reportId: report.report_id,
    message: `New fault report #${report.report_id} (${assetOrRoom}) requires manager review and assignment.`,
  });

  created(res, { ...report, dss1Score: score });
}

/**
 * Manager approves or rejects fault report
 * PUT /api/fault-reports/:id/status
 */
async function updateStatus(req, res) {
  const reportId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['status']);
  requireOneOf(req.body.status, Object.values(FAULT_REPORT_STATUS), 'status');

  // Validate report exists
  const existing = await faultReportsRepository.findById(reportId);
  if (!existing) throw new ApiError(404, 'Fault report not found');

  // Update status
  const updated = await faultReportsRepository.updateStatus(reportId, req.body.status);

  // Log audit trail
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

  // Send notification to reporter when status changes
  await notificationsRepository.createNotification({
    userId: existing.reporter_id,
    reportId: reportId,
    message: `Fault report #${reportId} status has been updated to: ${req.body.status}${
      req.body.rejectionReason ? ` (Reason: ${req.body.rejectionReason})` : ''
    }.`,
  });

  ok(res, updated);
}

module.exports = { list, getById, create, updateStatus };