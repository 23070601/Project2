const { pool } = require('../../config/db');

/**
 * DSS2 - Technician Assignment Suggestion
 * ------------------------------------------------------------------
 * Dùng view v_dss2_technician_workload có sẵn trong schema (đếm số WorkOrder
 * đang active theo từng kỹ thuật viên) kết hợp với technician_specialty để
 * gợi ý người phù hợp nhất cho 1 FaultReport cụ thể:
 *   1) Ưu tiên kỹ thuật viên có technician_specialty khớp asset_type của báo cáo
 *   2) Trong nhóm khớp chuyên môn (hoặc không có ai khớp), chọn người có
 *      active_workload thấp nhất
 *
 * Đây là bản mở rộng cho "Reflection - DSS2" đã ghi trong schema comment
 * (technician_specialty được thêm vào Users chính vì mục đích này).
 */

// Ánh xạ asset_type -> specialty gần nhất; có thể tinh chỉnh theo dữ liệu thực tế.
const ASSET_TYPE_TO_SPECIALTY = {
  Projector: 'Electrical',
  'Interactive TV': 'Electrical',
  'Air Conditioner': 'HVAC',
  Computer: 'Software',
  Speaker: 'Electrical',
  Microphone: 'Electrical',
};

async function suggestTechnicians(assetType = null) {
  const [rows] = await pool.query('SELECT * FROM v_dss2_technician_workload');

  const preferredSpecialty = assetType ? ASSET_TYPE_TO_SPECIALTY[assetType] : null;

  const ranked = rows
    .map((r) => ({
      technicianId: r.technician_id,
      fullName: r.full_name,
      specialty: r.technician_specialty,
      activeWorkload: r.active_workload,
      totalAssigned: r.total_assigned,
      specialtyMatch: preferredSpecialty ? r.technician_specialty === preferredSpecialty : false,
    }))
    .sort((a, b) => {
      // Khớp chuyên môn được ưu tiên trước, sau đó mới đến workload thấp
      if (a.specialtyMatch !== b.specialtyMatch) return a.specialtyMatch ? -1 : 1;
      return a.activeWorkload - b.activeWorkload;
    });

  return ranked;
}

module.exports = { suggestTechnicians, ASSET_TYPE_TO_SPECIALTY };
