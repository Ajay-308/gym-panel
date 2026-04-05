const pool = require("../db/pool");
const {
  broadcastCheckin,
  broadcastCheckout,
  broadcastPayment,
} = require("../websocket/wsServer");
const { getCurrentTrafficWeight } = require("../lib/simulatorWeights");

let simulatorInterval = null;
let simulatorSpeed = 1;
let isRunning = false;

/**
 * Get all active gyms with their current occupancy
 */
async function getActiveGyms() {
  const result = await pool.query(`
    SELECT
      g.id, g.name, g.capacity, g.opens_at, g.closes_at,
      COUNT(c.id) FILTER (WHERE c.checked_out IS NULL) AS current_occupancy
    FROM gyms g
    LEFT JOIN checkins c ON c.gym_id = g.id
    WHERE g.status = 'active'
    GROUP BY g.id
  `);
  return result.rows;
}

/**
 * Simulate a check-in event for a random active member
 */
async function simulateCheckin(gym) {
  // Pick a random active member not currently checked in
  const memberResult = await pool.query(
    `
    SELECT m.id, m.name FROM members m
    WHERE m.gym_id = $1
      AND m.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM checkins c
        WHERE c.member_id = m.id AND c.checked_out IS NULL
      )
    ORDER BY random() LIMIT 1
  `,
    [gym.id],
  );

  if (!memberResult.rows.length) return;
  const member = memberResult.rows[0];

  const checkinResult = await pool.query(
    `
    INSERT INTO checkins (member_id, gym_id, checked_in)
    VALUES ($1, $2, NOW()) RETURNING id
  `,
    [member.id, gym.id],
  );

  // Update member's last_checkin_at
  await pool.query(`UPDATE members SET last_checkin_at = NOW() WHERE id = $1`, [
    member.id,
  ]);

  // Get updated occupancy
  const occResult = await pool.query(
    `SELECT COUNT(*) AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
    [gym.id],
  );
  const currentOccupancy = parseInt(occResult.rows[0].count, 10);
  const capacityPct = parseFloat(
    ((currentOccupancy / gym.capacity) * 100).toFixed(1),
  );

  broadcastCheckin({
    gym_id: gym.id,
    member_name: member.name,
    timestamp: new Date().toISOString(),
    current_occupancy: currentOccupancy,
    capacity_pct: capacityPct,
  });
}

/**
 * Simulate a check-out event
 */
async function simulateCheckout(gym) {
  // Pick a random member currently checked in
  const result = await pool.query(
    `
    SELECT c.id AS checkin_id, m.id AS member_id, m.name
    FROM checkins c
    JOIN members m ON m.id = c.member_id
    WHERE c.gym_id = $1 AND c.checked_out IS NULL
      AND c.checked_in < NOW() - INTERVAL '30 minutes'
    ORDER BY random() LIMIT 1
  `,
    [gym.id],
  );

  if (!result.rows.length) return;
  const row = result.rows[0];

  await pool.query(`UPDATE checkins SET checked_out = NOW() WHERE id = $1`, [
    row.checkin_id,
  ]);

  const occResult = await pool.query(
    `SELECT COUNT(*) AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
    [gym.id],
  );
  const currentOccupancy = parseInt(occResult.rows[0].count, 10);
  const capacityPct = parseFloat(
    ((currentOccupancy / gym.capacity) * 100).toFixed(1),
  );

  broadcastCheckout({
    gym_id: gym.id,
    member_name: row.name,
    timestamp: new Date().toISOString(),
    current_occupancy: currentOccupancy,
    capacity_pct: capacityPct,
  });
}

/**
 * Occasionally simulate a payment event (every ~20 ticks)
 */
async function simulatePayment() {
  if (Math.random() > 0.05) return; // 5% chance per tick

  const result = await pool.query(`
    SELECT m.id, m.name, m.gym_id, m.plan_type
    FROM members m
    WHERE m.status = 'active'
    ORDER BY random() LIMIT 1
  `);
  if (!result.rows.length) return;
  const member = result.rows[0];

  const amount =
    { monthly: 1499.0, quarterly: 3999.0, annual: 11999.0 }[
      member.plan_type
    ] || 1499.0;

  await pool.query(
    `
    INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
    VALUES ($1, $2, $3, $4, 'renewal', NOW())
  `,
    [member.id, member.gym_id, amount, member.plan_type],
  );

  const todayResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
    [member.gym_id],
  );

  broadcastPayment({
    gym_id: member.gym_id,
    amount,
    plan_type: member.plan_type,
    member_name: member.name,
    today_total: parseFloat(todayResult.rows[0].total),
  });
}

/**
 * Single simulator tick - runs every 2 seconds / speed multiplier
 */
async function simulatorTick() {
  try {
    const gyms = await getActiveGyms();
    const trafficWeight = getCurrentTrafficWeight();

    for (const gym of gyms) {
      const occupancyPct = gym.current_occupancy / gym.capacity;

      // Decide: checkin or checkout this tick?
      const rand = Math.random();

      if (occupancyPct < 0.05) {
        // Very empty: prefer checkins
        if (rand < 0.8 * trafficWeight) await simulateCheckin(gym);
      } else if (occupancyPct > 0.85) {
        // Near capacity: prefer checkouts
        if (rand < 0.7) await simulateCheckout(gym);
        else if (rand < 0.75 * trafficWeight) await simulateCheckin(gym);
      } else {
        // Normal: balanced
        if (rand < 0.45 * trafficWeight) await simulateCheckin(gym);
        else if (rand < 0.45 * trafficWeight + 0.3) await simulateCheckout(gym);
      }
    }

    await simulatePayment();
  } catch (err) {
    console.error("Simulator tick error:", err.message);
  }
}

/**
 * Start the simulator
 */
function startSimulator(speed = 1) {
  if (isRunning) stopSimulator();

  simulatorSpeed = speed;
  isRunning = true;
  const intervalMs = Math.max(200, 2000 / speed); // base 2s, min 200ms at 10x

  simulatorInterval = setInterval(simulatorTick, intervalMs);
  console.log(
    `Simulator started at ${speed}x speed (tick every ${intervalMs}ms)`,
  );
}

/**
 * Stop the simulator
 */
function stopSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  isRunning = false;
  console.log("Simulator stopped");
}

/**
 * Reset: close all open check-ins, return to baseline
 */
async function resetSimulator() {
  stopSimulator();
  await pool.query(
    `UPDATE checkins SET checked_out = NOW() WHERE checked_out IS NULL`,
  );
  console.log("Simulator reset: all open check-ins closed");
}

function getStatus() {
  return { status: isRunning ? "running" : "paused", speed: simulatorSpeed };
}

module.exports = {
  startSimulator,
  stopSimulator,
  resetSimulator,
  getStatus,
  simulatorTick,
  getCurrentTrafficWeight,
};
