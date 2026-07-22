const { PRIORITY, PRIORITY_BY_ASSET_TYPE } = require('../../shared/constants/statusEnums');

/**
 * DSS1 - Priority Scoring
 * ------------------------------------------------------------------
 * Formula:
 *     PriorityScore = PriorityWeight * 0.6 + CriticalityWeight * 0.4
 *
 *   - PriorityWeight  : Urgency hint selected by reporter ('High' | 'Medium' | 'Low')
 *   - CriticalityWeight: Criticality level of ASSET TYPE (PRIORITY_BY_ASSET_TYPE):
 *                        + High: Projector, TV
 *                        + Medium: Aircon, Speaker, Microphone, DocumentCamera, NetworkSwitch
 *                        + Low: Cable
 */

const WEIGHT_SCORE = { High: 3, Medium: 2, Low: 1 };
const DEFAULT_CRITICALITY = 'Medium';

function calculatePriority({ urgencyHint = 'Medium', assetType = null, failureCount = 0 } = {}) {
  const priorityWeight = WEIGHT_SCORE[urgencyHint] ?? WEIGHT_SCORE.Medium;
  const criticalityLevel = (assetType && PRIORITY_BY_ASSET_TYPE[assetType]) || DEFAULT_CRITICALITY;
  const criticalityWeight = WEIGHT_SCORE[criticalityLevel];

  // Repeat failure bonus for DSS3 threshold tracking
  const repeatBonus = failureCount >= 2 ? 0.5 : 0;

  const score = priorityWeight * 0.6 + criticalityWeight * 0.4 + repeatBonus;

  if (score >= 2.6) return { priority: PRIORITY.HIGH, score };
  if (score >= 1.8) return { priority: PRIORITY.MEDIUM, score };
  return { priority: PRIORITY.LOW, score };
}

module.exports = { calculatePriority };
