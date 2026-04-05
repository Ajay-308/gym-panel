function computeRevenueDropPercent(todayRev, lastWeekRev) {
  if (!lastWeekRev || lastWeekRev === 0) return null;
  return ((lastWeekRev - todayRev) / lastWeekRev) * 100;
}

function shouldFireCapacityAnomaly(occupancy, capacity) {
  return occupancy / capacity > 0.9;
}

function shouldResolveCapacityAnomaly(occupancy, capacity) {
  return occupancy / capacity < 0.85;
}

module.exports = {
  computeRevenueDropPercent,
  shouldFireCapacityAnomaly,
  shouldResolveCapacityAnomaly,
};
