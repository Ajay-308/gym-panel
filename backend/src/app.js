require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const { initWebSocket } = require("./websocket/wsServer");
const { runSeed } = require("./db/seeds/seed");
const { startAnomalyDetector } = require("./jobs/anomalyDetector");

const PORT = Number(process.env.PORT || 3001);

function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use("/api", apiRoutes);
  // Same routes without /api (e.g. GET /gyms) for direct backend access and simple clients.
  app.use("/", apiRoutes);
  app.get("/", (req, res) => {
    res.json({ service: "aj-gym-backend", ok: true });
  });
  return app;
}

async function boot() {
  const app = createApp();
  const server = http.createServer(app);
  initWebSocket(server);

  if (process.env.SKIP_SEED !== "1") {
    console.log("Running seed check...");
    await runSeed();
  }

  if (process.env.SKIP_JOBS !== "1") {
    startAnomalyDetector();
  }

  return new Promise((resolve) => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Aj gym API + WS on port ${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  boot().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { createApp, boot };
