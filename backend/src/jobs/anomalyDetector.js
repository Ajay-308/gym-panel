const pool = require("../db/pool");
const { runAnomalyDetection } = require("../services/anomalyService");

let detectorInterval = null;
let matViewInterval = null;
const INTERVAL_MS = 30_000;

async function refreshMaterializedView() {
  try {
    await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats");
    console.log("Materialized view gym_hourly_stats refreshed");
  } catch (err) {
    try {
      await pool.query("REFRESH MATERIALIZED VIEW gym_hourly_stats");
      console.log("Materialized view gym_hourly_stats refreshed (non-concurrent)");
    } catch (e2) {
      console.error("MV refresh failed:", e2.message);
    }
  }
}

function startAnomalyDetector() {
  if (detectorInterval) return;

  console.log("Anomaly detection job every 30s");
  runAnomalyDetection().catch((err) => {
    console.error("Initial anomaly run failed:", err.message);
  });

  detectorInterval = setInterval(() => {
    runAnomalyDetection().catch((err) => {
      console.error("Anomaly job error:", err.message);
    });
  }, INTERVAL_MS);

  matViewInterval = setInterval(refreshMaterializedView, 15 * 60 * 1000);
}

function stopAnomalyDetector() {
  if (detectorInterval) {
    clearInterval(detectorInterval);
    detectorInterval = null;
  }
  if (matViewInterval) {
    clearInterval(matViewInterval);
    matViewInterval = null;
  }
}

module.exports = { startAnomalyDetector, stopAnomalyDetector, refreshMaterializedView };
