const faultReportsRepository = require('./faultReports.repository');
const classroomsRepository = require('../classrooms/classrooms.repository');
const assetsRepository = require('../assets/assets.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const notificationsRepository = require('../notifications/notifications.repository');
const links = require('../notifications/notificationLinks');
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
  const { status, priority, roomId, mine, sort } = req.query;

  const filters = { status, priority, roomId: roomId ? Number(roomId) : undefined, sort };
  
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

  // Get image paths from uploaded files if present
  let uploadedFiles = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      uploadedFiles = req.files;
    } else if (req.files.images && req.files.images.length > 0) {
      uploadedFiles = req.files.images;
    } else if (req.files.evidence && req.files.evidence.length > 0) {
      uploadedFiles = req.files.evidence;
    } else {
      Object.values(req.files).forEach(fileArray => {
        if (Array.isArray(fileArray)) {
          uploadedFiles = uploadedFiles.concat(fileArray);
        }
      });
    }
  } else if (req.file) {
    uploadedFiles.push(req.file);
  }

  const seen = new Set();
  uploadedFiles = uploadedFiles.filter(f => {
    if (!f || !f.filename) return false;
    if (seen.has(f.filename)) return false;
    seen.add(f.filename);
    return true;
  });

  if (uploadedFiles.length > 5) {
    throw new ApiError(400, 'Maximum 5 images allowed per report');
  }
  for (const f of uploadedFiles) {
    if (f.size > 5 * 1024 * 1024) {
      throw new ApiError(400, `File ${f.originalname || 'uploaded'} exceeds maximum limit of 5MB`);
    }
  }

  const imagePaths = uploadedFiles.map(f => '/uploads/' + f.filename);
  const imagePath = imagePaths.length > 0 ? imagePaths[0] : null;

  // Validate classroom exists
  let room = await classroomsRepository.findById(roomId);
  if (!room) {
    const allRooms = await classroomsRepository.findAll();
    room = allRooms[0] || { room_id: Number(roomId) || 1, room_name: `Room ${roomId}` };
  }

  // Validate asset if provided
  let asset = null;
  let validAssetId = null;
  if (assetId) {
    asset = await assetsRepository.findById(assetId);
    if (asset) {
      if (asset.status === 'Inactive') {
        throw new ApiError(400, 'Cannot create fault report for an inactive asset');
      }
      validAssetId = asset.asset_id;
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
    assetId: validAssetId,
    roomId: room.room_id,
    description: description,
    imagePath: imagePath,
    images: imagePaths,
    priority: priority,
  });

  const assetOrRoom = asset?.asset_name || `Room ${room.room_name}`;

  // Send confirmation notification to reporter
  await notificationsRepository.createNotification({
    userId: req.user.userId,
    reportId: report.report_id,
    message: `Fault report #${report.report_id} (${assetOrRoom}) has been created successfully.`,
    title: 'Fault Report Submitted',
    actionUrl: links.userReports,
  });

  // Send notification to all Managers
  await notificationsRepository.notifyRole('Manager', {
    reportId: report.report_id,
    message: `New fault report #${report.report_id} (${assetOrRoom}) requires manager review and assignment.`,
    title: 'New Fault Report Pending Review',
    actionUrl: links.managerPending,
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
  const updated = await faultReportsRepository.updateStatus(reportId, req.body.status, req.body.rejectionReason);

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
    title: 'Fault Report Status Updated',
    actionUrl: links.userReports,
  });

  ok(res, updated);
}

async function remove(req, res) {
  const reportId = toPositiveInt(req.params.id, 'id');
  const report = await faultReportsRepository.findById(reportId);
  if (!report) throw new ApiError(404, 'Fault report not found');

  const currentUserId = req.user?.userId || Number(req.headers['x-user-id'] || 0);

  // Cho phép xóa nếu là người tạo báo cáo HOẶC là Manager
  const isOwner = Number(report.reporter_id) === Number(currentUserId);
  const isManager = req.user.role === ROLES.MANAGER;

  if (!isOwner && !isManager) {
    throw new ApiError(403, 'You can only delete your own fault report');
  }

  const effectiveStatus = report.display_status || report.status;
  const pendingStatuses = ['Pending', 'Pending Approval'];
  if (!pendingStatuses.includes(report.status) || !pendingStatuses.includes(effectiveStatus)) {
    throw new ApiError(400, 'Only reports in Pending status can be deleted');
  }

  await faultReportsRepository.remove(reportId);

  await auditLogRepository.log({
    userId: currentUserId || 1,
    actionType: 'DELETE',
    entityTable: 'FaultReports',
    entityId: reportId,
    roomId: report.room_id,
    assetId: report.asset_id,
    description: `User ${req.user.email} deleted pending report #${reportId}`,
  });

  ok(res, { message: 'Fault report deleted successfully' });
}

module.exports = { list, getById, create, updateStatus, remove };