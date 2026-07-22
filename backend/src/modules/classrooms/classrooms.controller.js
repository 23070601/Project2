const classroomsRepository = require('./classrooms.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { ok, created, noContent, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, toPositiveInt } = require('../../shared/utils/validators');

async function list(req, res) {
  const { building, floorNumber, search } = req.query;
  const rooms = await classroomsRepository.findAll({
    building,
    floorNumber: floorNumber !== undefined ? Number(floorNumber) : undefined,
    search,
  });
  ok(res, rooms);
}

async function getById(req, res) {
  const roomId = toPositiveInt(req.params.id, 'id');
  const room = await classroomsRepository.findById(roomId);
  if (!room) throw new ApiError(404, 'Classroom not found');
  ok(res, room);
}

async function create(req, res) {
  requireFields(req.body, ['roomName']);
  const { roomName, building, floorNumber } = req.body;

  const existing = await classroomsRepository.findByName(roomName);
  if (existing) throw new ApiError(409, `Room "${roomName}" already exists`);

  const room = await classroomsRepository.create({ roomName, building, floorNumber });

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'CREATE',
    entityTable: 'Classrooms',
    entityId: room.room_id,
    roomId: room.room_id,
    description: `Manager ${req.user.email} added classroom ${roomName}`,
  });

  created(res, room);
}

async function update(req, res) {
  const roomId = toPositiveInt(req.params.id, 'id');
  const existing = await classroomsRepository.findById(roomId);
  if (!existing) throw new ApiError(404, 'Classroom not found');

  const updated = await classroomsRepository.update(roomId, req.body);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'Classrooms',
    entityId: roomId,
    roomId,
    description: `Manager ${req.user.email} updated classroom #${roomId}`,
  });

  ok(res, updated);
}

async function remove(req, res) {
  const roomId = toPositiveInt(req.params.id, 'id');
  const existing = await classroomsRepository.findById(roomId);
  if (!existing) throw new ApiError(404, 'Classroom not found');

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
