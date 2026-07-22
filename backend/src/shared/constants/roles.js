// Khớp với CHECK constraint chk_users_role trong schema
const ROLES = Object.freeze({
  USER: 'User',
  TECHNICIAN: 'Technician',
  MANAGER: 'Manager',
});

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ALL_ROLES };
