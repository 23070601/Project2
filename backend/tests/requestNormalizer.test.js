const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRequestBody } = require('../src/shared/utils/requestNormalizer');

test('normalizes snake_case request body to camelCase', () => {
  const req = {
    body: {
      room_name: 'R101',
      room_id: 1,
      asset_name: 'Laptop',
      asset_type: 'Equipment',
      technician_specialty: 'Hardware',
      full_name: 'Nguyen Van A',
      rejection_reason: 'Need replacement',
      task_status: 'Completed',
      fix_description: 'Repaired motherboard',
    },
  };

  normalizeRequestBody(req, {}, () => {});

  assert.deepStrictEqual(req.body, {
    roomName: 'R101',
    roomId: 1,
    assetName: 'Laptop',
    assetType: 'Equipment',
    technicianSpecialty: 'Hardware',
    fullName: 'Nguyen Van A',
    rejectionReason: 'Need replacement',
    taskStatus: 'Completed',
    fixDescription: 'Repaired motherboard',
  });
});
