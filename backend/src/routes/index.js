const express = require("express");
const router = express.Router();
const statsService = require("../services/statsService");
const pool = require("../db/pool");
const simulatorService = require("../services/simulatorService");

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}

router.get("/gyms", async (req, res) => {
  try {
    const gyms = await statsService.getAllGymsWithStats();
    res.json(gyms);
  } catch (err) {
    console.error("GET /api/gyms:", err.message);
    res.status(500).json({ error: "Failed to fetch gyms" });
  }
});

router.get("/gyms/:id/live", async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "Invalid gym ID" });
  }
  try {
    const snapshot = await statsService.getGymLiveSnapshot(id);
    if (!snapshot) return res.status(404).json({ error: "Gym not found" });
    res.json(snapshot);
  } catch (err) {
    console.error("GET /api/gyms/:id/live:", err.message);
    res.status(500).json({ error: "Failed to fetch live snapshot" });
  }
});

router.get("/gyms/:id/analytics", async (req, res) => {
  const { id } = req.params;
  const { dateRange = "30d" } = req.query;
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "Invalid gym ID" });
  }
  if (!["7d", "30d", "90d"].includes(dateRange)) {
    return res.status(400).json({ error: "dateRange must be 7d, 30d, or 90d" });
  }
  try {
    const data = await statsService.getGymAnalytics(id, dateRange);
    res.json(data);
  } catch (err) {
    console.error("GET /api/gyms/:id/analytics:", err.message);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/anomalies", async (req, res) => {
  const { gym_id, severity } = req.query;
  if (gym_id && !isValidUUID(gym_id)) {
    return res.status(400).json({ error: "Invalid gym_id" });
  }
  if (severity && !["warning", "critical"].includes(severity)) {
    return res.status(400).json({ error: "Invalid severity" });
  }
  try {
    let sql = `
      SELECT a.*, g.name AS gym_name
      FROM anomalies a
      JOIN gyms g ON g.id = a.gym_id
      WHERE a.dismissed = FALSE
        AND (
          a.resolved = FALSE
          OR (a.resolved = TRUE AND a.resolved_at > NOW() - INTERVAL '24 hours')
        )
    `;
    const params = [];
    if (gym_id) {
      params.push(gym_id);
      sql += ` AND a.gym_id = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      sql += ` AND a.severity = $${params.length}`;
    }
    sql += ` ORDER BY a.detected_at DESC`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/anomalies:", err.message);
    res.status(500).json({ error: "Failed to fetch anomalies" });
  }
});

router.patch("/anomalies/:id/dismiss", async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "Invalid anomaly ID" });
  }
  try {
    const anomaly = await pool.query("SELECT * FROM anomalies WHERE id = $1", [id]);
    if (!anomaly.rows.length) {
      return res.status(404).json({ error: "Anomaly not found" });
    }
    const a = anomaly.rows[0];
    if (a.severity === "critical") {
      return res.status(403).json({ error: "Critical anomalies cannot be dismissed" });
    }
    const result = await pool.query(
      `UPDATE anomalies SET dismissed = TRUE WHERE id = $1 RETURNING *`,
      [id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/anomalies/:id/dismiss:", err.message);
    res.status(500).json({ error: "Failed to dismiss" });
  }
});

router.get("/analytics/cross-gym", async (req, res) => {
  try {
    const data = await statsService.getCrossGymRevenue();
    res.json(data);
  } catch (err) {
    console.error("GET /api/analytics/cross-gym:", err.message);
    res.status(500).json({ error: "Failed to fetch cross-gym data" });
  }
});

router.get("/analytics/summary", async (req, res) => {
  try {
    const data = await statsService.getAllGymsSummary();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

router.post("/simulator/start", (req, res) => {
  const speed = Number((req.body && req.body.speed) ?? 1);
  if (![1, 5, 10].includes(speed)) {
    return res.status(400).json({ error: "speed must be 1, 5, or 10" });
  }
  simulatorService.startSimulator(speed);
  res.json({ status: "running", speed });
});

router.post("/simulator/stop", (req, res) => {
  simulatorService.stopSimulator();
  res.json({ status: "paused" });
});

router.post("/simulator/reset", async (req, res) => {
  try {
    await simulatorService.resetSimulator();
    res.json({ status: "reset" });
  } catch (err) {
    res.status(500).json({ error: "Reset failed" });
  }
});

router.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

module.exports = router;
