const dashboardRepository = require("./dashboard.repository");

const getOverview = async (userId) => {
  const data = await dashboardRepository.getOverview(userId);

  const sent = data.stats.total_sent || 0;
  const opened = data.stats.total_opened || 0;
  const clicked = data.stats.total_clicked || 0;

  const openRate = sent > 0 ? Number(((opened / sent) * 100).toFixed(2)) : 0;
  const clickRate = sent > 0 ? Number(((clicked / sent) * 100).toFixed(2)) : 0;

  return {
    ...data,
    performance: {
      openRate,
      clickRate,
    },
  };
};

module.exports = {
  getOverview,
};
