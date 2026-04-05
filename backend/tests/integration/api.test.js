const request = require("supertest");
const { createApp } = require("../../src/app");
const simulatorService = require("../../src/services/simulatorService");

const app = createApp();
const UUID = "00000000-0000-4000-8000-000000000001";

describe("HTTP API validation", () => {
  test("GET /api/gyms/:id/live invalid uuid returns 400", async () => {
    const r = await request(app).get("/api/gyms/not-uuid/live");
    expect(r.status).toBe(400);
  });

  test("GET /api/gyms/:id/analytics invalid dateRange", async () => {
    const r = await request(app).get(
      `/api/gyms/${UUID}/analytics?dateRange=invalid`,
    );
    expect(r.status).toBe(400);
  });

  test("GET /api/anomalies invalid gym_id", async () => {
    const r = await request(app).get("/api/anomalies?gym_id=bad");
    expect(r.status).toBe(400);
  });

  test("GET /api/anomalies invalid severity", async () => {
    const r = await request(app).get("/api/anomalies?severity=high");
    expect(r.status).toBe(400);
  });

  test("PATCH dismiss invalid uuid", async () => {
    const r = await request(app).patch("/api/anomalies/bad/dismiss");
    expect(r.status).toBe(400);
  });

  test("POST simulator start valid speed", async () => {
    const r = await request(app)
      .post("/api/simulator/start")
      .send({ speed: 1 });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("running");
    expect(r.body.speed).toBe(1);
  });

  test("POST simulator start invalid speed", async () => {
    const r = await request(app)
      .post("/api/simulator/start")
      .send({ speed: 3 });
    expect(r.status).toBe(400);
  });

  test("POST simulator stop", async () => {
    const r = await request(app).post("/api/simulator/stop");
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("paused");
  });

  test("GET / root", async () => {
    const r = await request(app).get("/");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });
});

const describeDb =
  process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1"
    ? describe
    : describe.skip;

describeDb("HTTP API with database", () => {
  test("GET /api/gyms returns array", async () => {
    const r = await request(app).get("/api/gyms");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  test("GET /api/anomalies returns array", async () => {
    const r = await request(app).get("/api/anomalies");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });
});

afterAll(() => {
  simulatorService.stopSimulator();
});
