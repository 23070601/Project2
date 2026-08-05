const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureRoomCanBeDeleted } = require('../src/modules/classrooms/classroomDeletion.service');

test('allows deleting a room with no active assets and no maintenance history', async () => {
  const pool = {
    query: async () => [[{ activeAssetCount: 0, maintenanceHistoryCount: 0 }]],
  };

  await assert.doesNotReject(() => ensureRoomCanBeDeleted({ pool, roomId: 99 }));
});

test('prevents deleting a room that still has active assets', async () => {
  const pool = {
    query: async () => [[{ activeAssetCount: 2, maintenanceHistoryCount: 0 }]],
  };

  await assert.rejects(() => ensureRoomCanBeDeleted({ pool, roomId: 12 }), /active assets/i);
});

test('prevents deleting a room that still has maintenance history', async () => {
  const pool = {
    query: async () => [[{ activeAssetCount: 0, maintenanceHistoryCount: 1 }]],
  };

  await assert.rejects(() => ensureRoomCanBeDeleted({ pool, roomId: 12 }), /maintenance history/i);
});
