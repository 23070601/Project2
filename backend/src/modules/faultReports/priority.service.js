const { PRIORITY } = require('../../shared/constants/statusEnums');

/**
 * DSS1 - Priority Scoring
 * ------------------------------------------------------------------
 * Công thức thống nhất ở Tutorial 4:
 *     PriorityScore = PriorityWeight * 0.6 + CriticalityWeight * 0.4
 *
 * Schema thực tế (vnuis_asset_maintenance_dss.sql) không tách riêng bảng
 * PRIORITY_LEVEL/CRITICALITY_LEVEL, nên 2 trọng số được suy ra tại code:
 *   - PriorityWeight  : mức khẩn cấp do NGƯỜI BÁO CÁO chọn khi submit
 *                       (urgencyHint: 'High' | 'Medium' | 'Low')
 *   - CriticalityWeight: mức độ quan trọng của LOẠI THIẾT BỊ đối với việc dạy học,
 *                        tra theo asset_type (bảng ánh xạ ASSET_CRITICALITY_MAP)
 *
 * Kết quả cuối cùng vẫn là 1 trong 3 giá trị 'High'|'Medium'|'Low' để khớp
 * CHECK constraint chk_faultreports_priority trong DB.
 */

const WEIGHT_SCORE = { High: 3, Medium: 2, Low: 1 };

// Mức độ quan trọng mặc định theo loại thiết bị đối với hoạt động giảng dạy.
// Có thể mở rộng/điều chỉnh theo khảo sát thực tế của nhóm (Tutorial 3).
const ASSET_CRITICALITY_MAP = {
  Projector: 'High',
  'Interactive TV': 'High',
  'Air Conditioner': 'Medium',
  Computer: 'Medium',
  Speaker: 'Low',
  Microphone: 'Low',
};

const DEFAULT_CRITICALITY = 'Medium';

function calculatePriority({ urgencyHint = 'Medium', assetType = null, failureCount = 0 } = {}) {
  const priorityWeight = WEIGHT_SCORE[urgencyHint] ?? WEIGHT_SCORE.Medium;
  const criticalityLevel = (assetType && ASSET_CRITICALITY_MAP[assetType]) || DEFAULT_CRITICALITY;
  const criticalityWeight = WEIGHT_SCORE[criticalityLevel];

  // Thiết bị đã hỏng lặp lại nhiều lần (>=2 lần) được cộng thêm điểm khẩn cấp,
  // nhất quán với logic DSS3 (ngưỡng failure_count >= 3 -> đề xuất thay thế).
  const repeatBonus = failureCount >= 2 ? 0.5 : 0;

  const score = priorityWeight * 0.6 + criticalityWeight * 0.4 + repeatBonus;

  // Ngưỡng quy đổi điểm số (thang 1-3.5) về 3 mức priority
  if (score >= 2.6) return { priority: PRIORITY.HIGH, score };
  if (score >= 1.8) return { priority: PRIORITY.MEDIUM, score };
  return { priority: PRIORITY.LOW, score };
}

module.exports = { calculatePriority, ASSET_CRITICALITY_MAP };
