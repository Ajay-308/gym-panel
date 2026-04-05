const pool = require("../db/pool");
const {
  broadcastAnomalyDetected,
  broadcastAnomalyResolved,
} = require("../websocket/wsServer");

function isOperatingHours(opensAt, closesAt) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const parseTime = (t) => {
    const [h, m] = String(t).slice(0, 8).split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const open = parseTime(opensAt);
  const close = parseTime(closesAt);
  return currentMinutes >= open && currentMinutes <= close;
}

async function getLiveOccupancy(gymId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
    [gymId],
  );
  return result.rows[0].count;
}

async function getTodayRevenue(gymId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments
     WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
    [gymId],
  );
  return result.rows[0].total;
}

async function getLastWeekSameDayRevenue(gymId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments
     WHERE gym_id = $1
       AND paid_at::date = CURRENT_DATE - 7`,
    [gymId],
  );
  return result.rows[0].total;
}

async function getHoursSinceLastCheckin(gymId) {
  const result = await pool.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(checked_in))) / 3600 AS hours_ago
     FROM checkins WHERE gym_id = $1`,
    [gymId],
  );
  if (result.rows[0].hours_ago == null) return Infinity;
  return parseFloat(result.rows[0].hours_ago);
}

async function getActiveAnomaly(gymId, type) {
  const result = await pool.query(
    `SELECT id FROM anomalies
     WHERE gym_id = $1 AND type = $2 AND resolved = FALSE AND dismissed = FALSE`,
    [gymId, type],
  );
  return result.rows[0] || null;
}

async function createAnomaly(gymId, gymName, type, severity, message) {
  const result = await pool.query(
    `INSERT INTO anomalies (gym_id, type, severity, message)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [gymId, type, severity, message],
  );
  const anomaly = result.rows[0];
  broadcastAnomalyDetected({
    anomaly_id: anomaly.id,
    gym_id: gymId,
    gym_name: gymName,
    anomaly_type: type,
    severity,
    message,
  });
  return anomaly;
}

async function resolveAnomaly(anomalyId, gymId) {
  const result = await pool.query(
    `UPDATE anomalies SET resolved = TRUE, resolved_at = NOW()
     WHERE id = $1 RETURNING *`,
    [anomalyId],
  );
  if (result.rows.length > 0) {
    broadcastAnomalyResolved({
      anomaly_id: anomalyId,
      gym_id: gymId,
      resolved_at: result.rows[0].resolved_at,
    });
  }
}

async function runAnomalyDetection() {
  let gyms;
  try {
    const result = await pool.query(
      `SELECT id, name, capacity, status, opens_at, closes_at FROM gyms WHERE status = 'active'`,
    );
    gyms = result.rows;
  } catch (err) {
    console.error("Anomaly detection: failed to fetch gyms:", err.message);
    return;
  }

  for (const gym of gyms) {
    await checkZeroCheckins(gym);
    await checkCapacityBreach(gym);
    await checkRevenueDrop(gym);
  }
}

async function checkZeroCheckins(gym) {
  try {
    if (!isOperatingHours(gym.opens_at, gym.closes_at)) return;

    const hoursSince = await getHoursSinceLastCheckin(gym.id);
    const existing = await getActiveAnomaly(gym.id, "zero_checkins");

    if (hoursSince >= 2) {
      if (!existing) {
        await createAnomaly(
          gym.id,
          gym.name,
          "zero_checkins",
          "warning",
          `${gym.name} has had no check-ins for ${Math.floor(hoursSince)} hours during operating hours`,
        );
      }
    } else if (existing) {
      await resolveAnomaly(existing.id, gym.id);
    }
  } catch (err) {
    console.error(`Zero checkin check failed for ${gym.name}:`, err.message);
  }
}

async function checkCapacityBreach(gym) {
  try {
    const occupancy = await getLiveOccupancy(gym.id);
    const pct = (occupancy / gym.capacity) * 100;
    const existing = await getActiveAnomaly(gym.id, "capacity_breach");

    if (pct > 90) {
      if (!existing) {
        await createAnomaly(
          gym.id,
          gym.name,
          "capacity_breach",
          "critical",
          `${gym.name} is at ${pct.toFixed(1)}% capacity (${occupancy}/${gym.capacity} members)`,
        );
      }
    } else if (pct < 85 && existing) {
      await resolveAnomaly(existing.id, gym.id);
    }
  } catch (err) {
    console.error(`Capacity breach check failed for ${gym.name}:`, err.message);
  }
}

async function checkRevenueDrop(gym) {
  try {
    const todayRev = await getTodayRevenue(gym.id);
    const lastWeekRev = await getLastWeekSameDayRevenue(gym.id);
    if (lastWeekRev === 0) return;

    const dropPct = ((lastWeekRev - todayRev) / lastWeekRev) * 100;
    const existing = await getActiveAnomaly(gym.id, "revenue_drop");

    if (dropPct >= 30) {
      if (!existing) {
        await createAnomaly(
          gym.id,
          gym.name,
          "revenue_drop",
          "warning",
          `${gym.name} revenue is ₹${todayRev.toFixed(0)} today vs ₹${lastWeekRev.toFixed(0)} last week (${dropPct.toFixed(1)}% drop)`,
        );
      }
    } else if (dropPct <= 20 && existing) {
      await resolveAnomaly(existing.id, gym.id);
    }
  } catch (err) {
    console.error(`Revenue drop check failed for ${gym.name}:`, err.message);
  }
}

module.exports = {
  runAnomalyDetection,
  checkZeroCheckins,
  checkCapacityBreach,
  checkRevenueDrop,
  getLiveOccupancy,
  getTodayRevenue,
  getLastWeekSameDayRevenue,
  getHoursSinceLastCheckin,
  isOperatingHours,
};
