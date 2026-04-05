# Aj gym

Real-time multi-gym operations dashboard: React + Node.js (Express + WebSocket) + PostgreSQL 15, orchestrated with Docker Compose.

<img width="2205" height="1314" alt="image" src="https://github.com/user-attachments/assets/d3a25766-0058-4f4a-94de-2c98df6d73e9" />
<img width="2417" height="1197" alt="image" src="https://github.com/user-attachments/assets/80b3237c-2d1d-4ee6-8059-a4fe2377545e" />
<img width="2150" height="1040" alt="image" src="https://github.com/user-attachments/assets/cc788d3a-ba15-42e9-8116-17528dc964e6" />
<img width="2280" height="587" alt="image" src="https://github.com/user-attachments/assets/b48ef689-c63a-4512-aec4-abe39ee47cd0" />




## 1. Quick start

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2).

From the repository root:

```bash
docker compose up --build
```

If you already had an older compose stack with the previous database name and user, reset the volume once: `docker compose down -v` then run the command above again.

Then open **http://localhost:3000** (nginx → static UI, `/api` and `/ws` proxied to the backend). The API alone is on **http://localhost:3001**.

No host `npm install` or manual migrations are required for the standard path: Postgres runs `backend/src/db/migrations/*.sql` on first data volume init; the backend runs an idempotent Node seed if gym/member counts are wrong.

**Local dev (optional):** start Postgres (or use Docker only for `db`), set `DATABASE_URL` from `.env.example`, then `cd backend && npm install && npm run dev` and `cd frontend && npm install && npm run dev` (Vite proxies `/api` and `/ws` to port 3001).

## 2. Architecture decisions

- **Partial index on live occupancy** (`idx_checkins_live_occupancy`): small, hot set (`checked_out IS NULL`) so `COUNT(*)` for “who is in the gym now” stays index-only for that predicate.
- **BRIN on `checkins(checked_in)`**: cheap for large append-only time ranges (historical scans, maintenance).
- **Composite `payments (gym_id, paid_at DESC)`**: matches “revenue today / by gym” filters without sorting heaps.
- **`payments (paid_at DESC) INCLUDE (gym_id, amount)`**: helps 30-day aggregation / cross-gym ranking touch fewer heap pages.
- **Partial index on active anomalies**: keeps “open incidents” reads tiny.
- **Partial index on `members(last_checkin_at)` for `active`**: aligns with churn-risk filters.
- **`gym_hourly_stats` materialized view**: pre-aggregates 7-day heatmap buckets so analytics reads hit the MV + unique index instead of scanning raw `checkins`.
- **Node seed (not only SQL)**: encodes data-spec scenarios (Okhla high occupancy, Vasant Kunj sparse recent traffic, Mayur Vihar revenue drop) and ~270k check-ins with batch inserts; SQL init only creates schema.

## 3. AI tools used

- **Cursor / GPT-based agent**: Scaffolded Docker layout, SQL schema, seed structure, Express routes, WebSocket events, React dashboard, tests, and README from the Aj gym technical assignment + data specification PDFs; iterative fixes for module layout, Jest isolation, and API/UI wiring.

## 4. Query benchmarks

Run the statements in `benchmarks/queries.sql` against a seeded database using:

`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT);`

Record execution times and paste screenshots under `benchmarks/screenshots/`. Targets from the assignment: Q1–Q6 sub-ms to low-ms on seeded data when indexes are used (no sequential scans on large `checkins` / `payments` for these access paths).

| # | Query (summary)              | Expected index / object        |
|---|------------------------------|---------------------------------|
| 1 | Live occupancy per gym       | `idx_checkins_live_occupancy`  |
| 2 | Today’s revenue per gym      | `idx_payments_gym_date`        |
| 3 | Churn risk (45+ days)        | `idx_members_churn_risk`       |
| 4 | 7-day heatmap                | `gym_hourly_stats` + unique index |
| 5 | Cross-gym 30-day revenue     | `idx_payments_date` (+ INCLUDE) |
| 6 | Open anomalies               | `idx_anomalies_active`         |

## 5. Known limitations

- Benchmark **screenshots** are not committed as images; you must generate them locally after `docker compose up` and a full seed.
- **Playwright E2E** (`cd frontend && npx playwright test`) expects the stack reachable at `BASE_URL` (default `http://127.0.0.1:3000`). Install browsers once: `npx playwright install`.
- **Backend integration tests** that hit a real DB are gated with `RUN_DB_TESTS=1` plus `DATABASE_URL`.
- **Anomaly “same day last week”** revenue uses `paid_at::date = CURRENT_DATE - 7` (calendar week-ago date).
- **Materialized view** refresh uses `CONCURRENTLY` when possible; falls back to non-concurrent refresh on first/error paths.

## Tests

```bash
cd backend && npm install && npm test
cd frontend && npm install && npx playwright test
```

## Layout

See the technical assignment for the canonical tree (`backend/src/routes`, `services`, `db/migrations`, `jobs`, `websocket`, `frontend/src/...`, `benchmarks/screenshots`).
