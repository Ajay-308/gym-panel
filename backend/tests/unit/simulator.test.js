const {
  getCurrentTrafficWeight,
  HOUR_MULTIPLIERS,
  DAY_MULTIPLIERS,
} = require("../../src/lib/simulatorWeights");

describe("simulator distribution", () => {
  test("dead night weight is zero", () => {
    expect(HOUR_MULTIPLIERS[2]).toBe(0);
  });

  test("morning rush peaks", () => {
    expect(HOUR_MULTIPLIERS[8]).toBeGreaterThan(HOUR_MULTIPLIERS[14]);
  });

  test("getCurrentTrafficWeight returns number", () => {
    const w = getCurrentTrafficWeight();
    expect(typeof w).toBe("number");
    expect(w).toBeGreaterThanOrEqual(0);
  });

  test("weekend dip vs weekday", () => {
    expect(DAY_MULTIPLIERS[0]).toBeLessThan(DAY_MULTIPLIERS[1]);
  });
});
