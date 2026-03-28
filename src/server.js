const app = require("./app");
const env = require("./config/env");

const startServer = async () => {
  try {
    app.listen(env.port, () => {
      console.log(`Backend API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
