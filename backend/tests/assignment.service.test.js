const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/db');
const { suggestTechnicians } = require('../src/modules/workOrders/assignment.service');

test('suggestTechnicians sorts available technicians before overloaded ones', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    if (sql.includes('v_dss2_technician_workload')) {
      return [[
        { technician_id: 1, full_name: 'Le Van C', technician_specialty: 'Electrical', active_workload: 9, total_assigned: 15 },
        { technician_id: 2, full_name: 'Nguyen Tech Test', technician_specialty: 'Projector', active_workload: 5, total_assigned: 8 },
        { technician_id: 3, full_name: 'Pham Thi D', technician_specialty: 'Networking', active_workload: 5, total_assigned: 10 },
        { technician_id: 4, full_name: 'Vu Van F', technician_specialty: 'General', active_workload: 0, total_assigned: 2 }
      ]];
    }
    return [[]];
  };

  try {
    const suggestions = await suggestTechnicians('Projector');
    
    // Vu Van F should be first because he is available (workload 0 < 3)
    assert.equal(suggestions[0].fullName, 'Vu Van F');
    assert.equal(suggestions[0].activeWorkload, 0);
    assert.equal(suggestions[0].isOverloaded, false);

    // Le Van C should be second because he matches the specialty (Electrical matches Projector)
    // even though he is overloaded (workload 9 >= 3)
    assert.equal(suggestions[1].fullName, 'Le Van C');
    assert.equal(suggestions[1].specialtyMatch, true);
    assert.equal(suggestions[1].isOverloaded, true);

    // Nguyen Tech Test and Pham Thi D are overloaded and don't match specialty, so they are sorted last.
    assert.equal(suggestions[2].isOverloaded, true);
    assert.equal(suggestions[3].isOverloaded, true);
  } finally {
    pool.query = originalQuery;
  }
});
