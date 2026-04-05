const pool = require("../db/pool");

const INTERVAL_SQL = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

async function getAllGymsWithStats() {
  const result = await pool.query(`
    SELECT
      g.id, g.name, g.city, g.capacity, g.status, g.opens_at, g.closes_at,
      (SELECT COUNT(*)::int FROM checkins c WHERE c.gym_id = g.id AND c.checked_out IS NULL) AS current_occupancy,
      (SELECT COALESCE(SUM(p.amount), 0)::float FROM payments p WHERE p.gym_id = g.id AND p.paid_at >= CURRENT_DATE) AS today_revenue,
      (SELECT COUNT(*)::int FROM anomalies a WHERE a.gym_id = g.id AND a.resolved = FALSE AND a.dismissed = FALSE) AS active_anomalies
    FROM gyms g
    ORDER BY g.name
  `);
  return result.rows.map((row) => ({
    ...row,
    occupancy_pct: parseFloat(
      ((row.current_occupancy / row.capacity) * 100).toFixed(1),
    ),
  }));
}

async function getGymLiveSnapshot(gymId) {
  const [occResult, revResult, gymResult, eventsResult, anomalyResult] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
        [gymId],
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
        [gymId],
      ),
      pool.query(
        `SELECT id, name, city, capacity, status, opens_at, closes_at FROM gyms WHERE id = $1`,
        [gymId],
      ),
      pool.query(
        `
        SELECT * FROM (
          SELECT 'checkin' AS event_type, m.name AS member_name, c.gym_id, g.name AS gym_name, c.checked_in AS ts
          FROM checkins c
          JOIN members m ON m.id = c.member_id
          JOIN gyms g ON g.id = c.gym_id
          UNION ALL
          SELECT 'checkout', m.name, c.gym_id, g.name, c.checked_out
          FROM checkins c
          JOIN members m ON m.id = c.member_id
          JOIN gyms g ON g.id = c.gym_id
          WHERE c.checked_out IS NOT NULL
          UNION ALL
          SELECT 'payment', m.name, p.gym_id, g.name, p.paid_at
          FROM payments p
          JOIN members m ON m.id = p.member_id
          JOIN gyms g ON g.id = p.gym_id
        ) e
        ORDER BY ts DESC NULLS LAST
        LIMIT 20
      `,
      ),
      pool.query(
        `SELECT * FROM anomalies WHERE gym_id = $1 AND resolved = FALSE AND dismissed = FALSE ORDER BY detected_at DESC`,
        [gymId],
      ),
    ]);

  if (!gymResult.rows.length) return null;
  const gym = gymResult.rows[0];
  const occupancy = occResult.rows[0].count;
  const todayRevenue = revResult.rows[0].total;
  return {
    gym,
    occupancy,
    capacity: gym.capacity,
    occupancy_pct: parseFloat(((occupancy / gym.capacity) * 100).toFixed(1)),
    today_revenue: todayRevenue,
    recent_events: eventsResult.rows.map((r) => ({
      event_type: r.event_type,
      member_name: r.member_name,
      gym_id: r.gym_id,
      gym_name: r.gym_name,
      timestamp: r.ts,
    })),
    active_anomalies: anomalyResult.rows,
  };
}

async function getGymAnalytics(gymId, dateRange = "30d") {
  const key = INTERVAL_SQL[dateRange] ? dateRange : "30d";
  const intervalLiteral = INTERVAL_SQL[key];

  const heatmapResult = await pool.query(
    `SELECT day_of_week, hour_of_day, checkin_count::int FROM gym_hourly_stats WHERE gym_id = $1`,
    [gymId],
  );

  const revenueByPlanResult = await pool.query(
    `SELECT plan_type, COUNT(*)::int AS transaction_count, SUM(amount)::float AS total_amount,
            DATE_TRUNC('day', paid_at) AS day
     FROM payments
     WHERE gym_id = $1 AND paid_at >= NOW() - INTERVAL '${intervalLiteral}'
     GROUP BY plan_type, DATE_TRUNC('day', paid_at)
     ORDER BY day DESC`,
    [gymId],
  );

  const churnResult = await pool.query(
    `
    SELECT id, name, email, phone, plan_type, last_checkin_at,
      CASE WHEN last_checkin_at < NOW() - INTERVAL '60 days' THEN 'critical' ELSE 'high' END AS risk_level,
      EXTRACT(DAY FROM NOW() - last_checkin_at)::int AS days_since_checkin
    FROM members
    WHERE status = 'active' AND gym_id = $1
      AND last_checkin_at < NOW() - INTERVAL '45 days'
    ORDER BY last_checkin_at ASC
    LIMIT 100
  `,
    [gymId],
  );

  const ratioResult = await pool.query(
    `SELECT payment_type, COUNT(*)::int AS count, SUM(amount)::float AS total
     FROM payments
     WHERE gym_id = $1 AND paid_at >= NOW() - INTERVAL '${intervalLiteral}'
     GROUP BY payment_type`,
    [gymId],
  );

  return {
    heatmap: heatmapResult.rows,
    revenue_by_plan: revenueByPlanResult.rows,
    churn_risk_members: churnResult.rows,
    new_vs_renewal: ratioResult.rows,
  };
}

async function getCrossGymRevenue() {
  const result = await pool.query(`
    SELECT g.id AS gym_id, g.name AS gym_name, g.city,
      COALESCE(SUM(p.amount), 0)::float AS total_revenue,
      COUNT(p.id)::int AS transaction_count,
      RANK() OVER (ORDER BY COALESCE(SUM(p.amount), 0) DESC)::int AS rank
    FROM gyms g
    LEFT JOIN payments p ON p.gym_id = g.id AND p.paid_at >= NOW() - INTERVAL '30 days'
    GROUP BY g.id, g.name, g.city
    ORDER BY total_revenue DESC
  `);
  return result.rows;
}

async function getAllGymsSummary() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM checkins WHERE checked_out IS NULL) AS total_occupancy,
      (SELECT COALESCE(SUM(amount), 0)::float FROM payments WHERE paid_at >= CURRENT_DATE) AS total_today_revenue,
      (SELECT COUNT(*)::int FROM anomalies WHERE resolved = FALSE AND dismissed = FALSE) AS active_anomaly_count
  `);
  const row = result.rows[0];
  return {
    total_occupancy: row.total_occupancy,
    total_today_revenue: row.total_today_revenue,
    active_anomaly_count: row.active_anomaly_count,
  };
}

module.exports = {
  getAllGymsWithStats,
  getGymLiveSnapshot,
  getGymAnalytics,
  getCrossGymRevenue,
  getAllGymsSummary,
};
