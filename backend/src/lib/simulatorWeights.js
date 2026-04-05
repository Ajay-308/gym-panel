const HOUR_MULTIPLIERS = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0.6,
  6: 0.6,
  7: 1.0,
  8: 1.0,
  9: 1.0,
  10: 0.4,
  11: 0.4,
  12: 0.3,
  13: 0.3,
  14: 0.2,
  15: 0.2,
  16: 0.2,
  17: 0.9,
  18: 0.9,
  19: 0.9,
  20: 0.9,
  21: 0.35,
  22: 0.35,
  23: 0,
};

const DAY_MULTIPLIERS = [0.45, 1.0, 0.95, 0.9, 0.95, 0.85, 0.7];

function getCurrentTrafficWeight() {
  const hour = new Date().getHours();
  const dow = new Date().getDay();
  return (HOUR_MULTIPLIERS[hour] || 0) * (DAY_MULTIPLIERS[dow] || 0.5);
}

module.exports = {
  HOUR_MULTIPLIERS,
  DAY_MULTIPLIERS,
  getCurrentTrafficWeight,
};
