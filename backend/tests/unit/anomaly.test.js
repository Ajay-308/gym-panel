const {
  computeRevenueDropPercent,
  shouldFireCapacityAnomaly,
  shouldResolveCapacityAnomaly,
} = require("../../src/lib/anomalyMath");

describe("anomaly logic", () => {
  test("revenue drop fires when today < 70% of last week", () => {
    const drop = computeRevenueDropPercent(2000, 10000);
    expect(drop).toBe(80);
  });

  test("revenue drop null when no baseline", () => {
    expect(computeRevenueDropPercent(100, 0)).toBeNull();
  });

  test("revenue drop ~30% threshold", () => {
    expect(computeRevenueDropPercent(7000, 10000)).toBe(30);
  });

  test("capacity breach when > 90%", () => {
    expect(shouldFireCapacityAnomaly(271, 300)).toBe(true);
    expect(shouldFireCapacityAnomaly(270, 300)).toBe(false);
  });

  test("capacity resolves when < 85%", () => {
    expect(shouldResolveCapacityAnomaly(250, 300)).toBe(true);
    expect(shouldResolveCapacityAnomaly(255, 300)).toBe(false);
  });
});
