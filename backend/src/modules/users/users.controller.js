const bcrypt = require('bcryptjs');
const env = require('../../config/env');
const usersRepository = require('./users.repository');
const auditLogRepository = require('../auditLog/auditLog.repository');
const { ok, created, noContent, ApiError } = require('../../shared/utils/responseWrapper');
const { requireFields, requireOneOf, isValidEmail, toPositiveInt } = require('../../shared/utils/validators');
const { ALL_ROLES, ROLES } = require('../../shared/constants/roles');

async function list(req, res) {
  const { role, isActive, search } = req.query;
  const users = await usersRepository.findAll({
    role,
    isActive: isActive === undefined ? undefined : isActive === 'true',
    search,
  });
  ok(res, users);
}

async function listTechnicians(req, res) {
  const technicians = await usersRepository.listTechnicians();
  ok(res, technicians);
}

async function getById(req, res) {
  const userId = toPositiveInt(req.params.id, 'id');
  const user = await usersRepository.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  ok(res, user);
}

async function create(req, res) {
  requireFields(req.body, ['fullName', 'email', 'password', 'role']);
  const { fullName, email, password, role, phone, technicianSpecialty } = req.body;

  if (!isValidEmail(email)) throw new ApiError(400, 'Invalid email format');
  requireOneOf(role, ALL_ROLES, 'role');
  if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

  const existing = await usersRepository.findByEmail(email);
  if (existing) throw new ApiError(409, 'Email already in use');

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const user = await usersRepository.create({
    fullName,
    email,
    passwordHash,
    role,
    phone: phone ?? null,
    technicianSpecialty: role === ROLES.TECHNICIAN ? (technicianSpecialty ?? null) : null,
  });

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'CREATE',
    entityTable: 'Users',
    entityId: user.user_id,
    description: `Manager ${req.user.email} created user ${email} with role ${role}`,
  });

  created(res, user);
}

async function update(req, res) {
  const userId = toPositiveInt(req.params.id, 'id');
  const { fullName, phone, technicianSpecialty, isActive } = req.body;

  const existing = await usersRepository.findById(userId);
  if (!existing) throw new ApiError(404, 'User not found');

  const updated = await usersRepository.update(userId, { fullName, phone, technicianSpecialty, isActive });

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'Users',
    entityId: userId,
    description: `Manager ${req.user.email} updated user #${userId}`,
  });

  ok(res, updated);
}

async function resetPassword(req, res) {
  const userId = toPositiveInt(req.params.id, 'id');
  requireFields(req.body, ['newPassword']);
  if (String(req.body.newPassword).length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }
  const existing = await usersRepository.findById(userId);
  if (!existing) throw new ApiError(404, 'User not found');

  const passwordHash = await bcrypt.hash(req.body.newPassword, env.bcryptSaltRounds);
  await usersRepository.updatePasswordHash(userId, passwordHash);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'UPDATE',
    entityTable: 'Users',
    entityId: userId,
    description: `Manager ${req.user.email} reset password for user #${userId}`,
  });

  noContent(res);
}

async function deactivate(req, res) {
  const userId = toPositiveInt(req.params.id, 'id');
  const existing = await usersRepository.findById(userId);
  if (!existing) throw new ApiError(404, 'User not found');

  await usersRepository.remove(userId);

  await auditLogRepository.log({
    userId: req.user.userId,
    actionType: 'DELETE',
    entityTable: 'Users',
    entityId: userId,
    description: `Manager ${req.user.email} deactivated user #${userId}`,
  });

  noContent(res);
}

module.exports = { list, listTechnicians, getById, create, update, resetPassword, deactivate };
