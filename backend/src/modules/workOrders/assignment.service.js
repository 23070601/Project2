const { pool } = require('../../config/db');
const { DSS_CONSTANTS } = require('../../shared/constants/statusEnums');

/**
 * DSS2 - Technician Assignment Suggestion
 * ------------------------------------------------------------------
 * Dùng view v_dss2_technician_workload có sẵn trong schema (đếm số WorkOrder
 * đang active theo từng kỹ thuật viên) kết hợp với technician_specialty để
 * gợi ý người phù hợp nhất cho 1 FaultReport cụ thể:
 *   1) Ưu tiên kỹ thuật viên chưa bị quá tải (active_workload < DSS2_MAX_WORKLOAD)
 *   2) Tiếp theo, ưu tiên kỹ thuật viên có technician_specialty khớp với asset_type của báo cáo
 *   3) Cuối cùng, chọn người có active_workload thấp nhất
 *
 * Đây là bản mở rộng cho "Reflection - DSS2" đã ghi trong schema comment
 * (technician_specialty được thêm vào Users chính vì mục đích này).
 */

// Ánh xạ asset_type -> specialty gần nhất; có thể tinh chỉnh theo dữ liệu thực tế.
const ASSET_TYPE_TO_SPECIALTY = {
  Projector: 'Electrical',
  TV: 'Electrical',
  Aircon: 'HVAC',
  Speaker: 'Electrical',
  Microphone: 'Electrical',
  DocumentCamera: 'Electrical',
  Cable: 'Networking',
  NetworkSwitch: 'Networking',
};

async function suggestTechnicians(assetType = null) {
  const [rows] = await pool.query('SELECT * FROM v_dss2_technician_workload');

  const preferredSpecialty = assetType ? ASSET_TYPE_TO_SPECIALTY[assetType] : null;
  const maxWorkload = DSS_CONSTANTS.DSS2_MAX_WORKLOAD || 3;

  const ranked = rows
    .map((r) => {
      const activeWorkload = r.active_workload || 0;
      const isOverloaded = activeWorkload >= maxWorkload;
      const specialtyMatch = preferredSpecialty ? r.technician_specialty === preferredSpecialty : false;

      return {
        technicianId: r.technician_id,
        fullName: r.full_name,
        specialty: r.technician_specialty,
        activeWorkload,
        totalAssigned: r.total_assigned,
        specialtyMatch,
        isOverloaded,
      };
    })
    .sort((a, b) => {
      // 1) Ưu tiên người chưa bị quá tải xếp trước người đã bị quá tải
      if (a.isOverloaded !== b.isOverloaded) {
        return a.isOverloaded ? 1 : -1;
      }
      // 2) Ưu tiên khớp chuyên môn
      if (a.specialtyMatch !== b.specialtyMatch) {
        return a.specialtyMatch ? -1 : 1;
      }
      // 3) Ưu tiên workload thấp
      return a.activeWorkload - b.activeWorkload;
    });

  return ranked;
}

module.exports = { suggestTechnicians, ASSET_TYPE_TO_SPECIALTY };
