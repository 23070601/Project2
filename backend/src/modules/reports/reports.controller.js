const reportsRepository = require('./reports.repository');
const { ok } = require('../../shared/utils/responseWrapper');

async function overviewStats(req, res) {
  const { filter, startDate, endDate } = req.query;
  const data = await reportsRepository.getOverviewStats({ filter, startDate, endDate });
  ok(res, data);
}

async function maintenanceOverview(req, res) {
  const { year, filter, startDate, endDate } = req.query;
  const data = await reportsRepository.getMaintenanceOverview({ year, filter, startDate, endDate });
  ok(res, data);
}

async function assetFailureAnalysis(req, res) {
  const { filter, startDate, endDate } = req.query;
  const data = await reportsRepository.getAssetFailureAnalysis({ filter, startDate, endDate });
  ok(res, data);
}

module.exports = {
  overviewStats,
  maintenanceOverview,
  assetFailureAnalysis,
};
