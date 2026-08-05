const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureUserCanBeDeactivated } = require('../src/modules/users/userStatus.service');
const { ROLES } = require('../src/shared/constants/roles');

test('allows deactivating a non-technician user', async () => {
  const pool = {
    query: async () => [[{ activeWorkOrderCount: 0 }]],
  };

  await assert.doesNotReject(() => ensureUserCanBeDeactivated({
    pool,
    user: { user_id: 1, role: ROLES.USER },
    newActive: false,
  }));
});

test('prevents deactivating a user with active work orders', async () => {
  const pool = {
    query: async () => [[{ technicianActiveWorkOrderCount: 2, managerActiveWorkOrderCount: 0 }]],
  };

  await assert.rejects(() => ensureUserCanBeDeactivated({
    pool,
    user: { user_id: 7, role: ROLES.TECHNICIAN },
    newActive: false,
  }), /Cannot deactivate user/i);
});
