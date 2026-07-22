const assetsRepository = require('./assets.repository');
const classroomsRepository = require('../classrooms/classrooms.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { ok, created, noContent, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, requireOneOf, toPositiveInt } = require('../../shared/utils/validators');
const { ASSET_STATUS } = require('../../shared/constants/statusEnums');

async function list(req, res) {
  const { roomId, assetType, status, search } = req.query;
  const assets = await assetsRepository.findAll({
    roomId: roomId ? Number(roomId) : undefined,
    assetType,
    status,
    search,
  });
  ok(res, assets);
}

async function getById(req, res) {
  const assetId = toPositiveInt(req.params.id, 'id');
  const asset = await assetsRepository.findById(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');
  ok(res, asset);
}

async function create(req, res) {
  requireFields(req.body, ['assetName', 'assetType', 'roomId']);
  const { assetName, assetType, roomId, status } = req.body;

  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, `Classroom #${roomId} not found`);

  if (status) requireOneOf(status, Object.values(ASSET_STATUS), 'status');

  const asset = await assetsRepository.create({ assetName, assetType, roomId, status });

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'CREATE',
    entityTable: 'Assets',
    entityId: asset.asset_id,
    roomId,
    assetId: asset.asset_id,
    description: `Manager ${req.user.email} added asset "${assetName}" to room ${room.room_name}`,
  });

  created(res, asset);
}

async function update(req, res) {
  const assetId = toPositiveInt(req.params.id, 'id');
  const existing = await assetsRepository.findById(assetId);
  if (!existing) throw new ApiError(404, 'Asset not found');

  if (req.body.status) requireOneOf(req.body.status, Object.values(ASSET_STATUS), 'status');
  if (req.body.roomId) {
    const room = await classroomsRepository.findById(req.body.roomId);
    if (!room) throw new ApiError(404, `Classroom #${req.body.roomId} not found`);
  }

  const updated = await assetsRepository.update(assetId, req.body);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'Assets',
    entityId: assetId,
    assetId,
    description: `Manager ${req.user.email} updated asset #${assetId}`,
  });

  ok(res, updated);
}

async function remove(req, res) {
  const assetId = toPositiveInt(req.params.id, 'id');
  const existing = await assetsRepository.findById(assetId);
  if (!existing) throw new ApiError(404, 'Asset not found');

  await assetsRepository.remove(assetId);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'DELETE',
    entityTable: 'Assets',
    entityId: assetId,
    description: `Manager ${req.user.email} deleted asset #${assetId}`,
  });

  noContent(res);
}

// DSS3 - dùng cho ManagerDashboard.html (cảnh báo đề xuất thay thế)
async function replacementAlerts(req, res) {
  const alerts = await assetsRepository.findReplacementAlerts();
  ok(res, alerts);
}

module.exports = { list, getById, create, update, remove, replacementAlerts };
