const app = require("./app");
const env = require("./config/env");
const {
  startCampaignScheduler,
} = require("./modules/campaigns/campaignScheduler");

const startServer = async () => {
  try {
    const server = app.listen(env.port, () => {
      console.log(`Backend API listening on port ${env.port}`);
    });

    const scheduler = startCampaignScheduler();

    const shutdown = () => {
      scheduler.stop();
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
