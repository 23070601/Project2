const classroomsRepository = require('./classrooms.repository');
const { ensureRoomCanBeDeleted } = require('./classroomDeletion.service');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { ok, created, noContent, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, toPositiveInt } = require('../../shared/utils/validators');

async function list(req, res) {
  const { search } = req.query;
  const rooms = await classroomsRepository.findAll({ search });
  ok(res, rooms);
}

async function getById(req, res) {
  const roomId = toPositiveInt(req.params.id, 'id');
  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, 'Classroom not found');
  ok(res, room);
}

async function create(req, res) {
  const roomName = req.body.roomName || req.body.room_name;
  if (!roomName) throw new ApiError(400, 'Room name is required');

  let imagePaths = [];
  if (req.files) {
    const fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    imagePaths = fileList.map(f => '/uploads/' + f.filename);
  } else if (req.file) {
    imagePaths = ['/uploads/' + req.file.filename];
  }

  const capacity = req.body.capacity ? parseInt(req.body.capacity, 10) : null;
  const status = req.body.status || 'Available';

  const existing = await classroomsRepository.findByName(roomName);
  if (existing) throw new ApiError(409, `Room "${roomName}" already exists`);

  const room = await classroomsRepository.create({
    roomName,
    capacity,
    status,
    imageUrl: imagePaths[0] || req.body.image_url || req.body.imageUrl || null,
    imagePaths,
  });

  await auditLogRepository.log({
    userId: req.user?.userId || req.user?.user_id,
    actionType: 'CREATE',
    entityTable: 'Classrooms',
    entityId: room.room_id,
    roomId: room.room_id,
    description: `Manager ${req.user?.email || 'System'} added classroom ${roomName}`,
  });

  created(res, room);
}

async function update(req, res) {
  const roomId = toPositiveInt(req.params.id, 'id');
  const existing = await classroomsRepository.findById(roomId);
  if (!existing) throw new ApiError(404, 'Classroom not found');

  let imagePaths = [];
  if (req.files) {
    const fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    imagePaths = fileList.map(f => '/uploads/' + f.filename);
  } else if (req.file) {
    imagePaths = ['/uploads/' + req.file.filename];
  }

  const updateData = { ...req.body };
  if (req.body.room_name) updateData.roomName = req.body.room_name;
  if (imagePaths.length > 0) {
    updateData.imageUrl = imagePaths[0];
    updateData.imagePaths = imagePaths;
  }
  if (req.body.capacity) updateData.capacity = parseInt(req.body.capacity, 10);

  const updated = await classroomsRepository.update(roomId, updateData);

  await auditLogRepository.log({
    userId: req.user?.userId || req.user?.user_id,
    actionType: 'UPDATE',
    entityTable: 'Classrooms',
    entityId: roomId,
    roomId,
    description: `Manager ${req.user?.email || 'System'} updated classroom #${roomId}`,
  });

  ok(res, updated);
}

async function remove(req, res) {
  const roomId = toPositiveInt(req.params.id, 'id');
  const existing = await classroomsRepository.findById(roomId);
  if (!existing) throw new ApiError(404, 'Classroom not found');

  await ensureRoomCanBeDeleted({ pool: require('../../config/db').pool, roomId });

  await classroomsRepository.remove(roomId);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'DELETE',
    entityTable: 'Classrooms',
    entityId: roomId,
    description: `Manager ${req.user.email} deleted classroom #${roomId}`,
  });

  noContent(res);
}

module.exports = { list, getById, create, update, remove };
