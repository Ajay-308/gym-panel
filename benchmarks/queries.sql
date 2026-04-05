-- Run inside aj_gym after seed. Use:
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
-- Save screenshots under benchmarks/screenshots/

-- Q1 Live occupancy (single gym — replace :gym_id)
-- SELECT COUNT(*) FROM checkins WHERE gym_id = $1 AND checked_out IS NULL;

-- Q2 Today's revenue (single gym)
-- SELECT COALESCE(SUM(amount),0) FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE;

-- Q3 Churn risk
-- SELECT id, name, last_checkin_at FROM members WHERE status='active' AND last_checkin_at < NOW() - INTERVAL '45 days';

-- Q4 Peak heatmap MV
-- SELECT * FROM gym_hourly_stats WHERE gym_id = $1;

-- Q5 Cross-gym revenue
-- SELECT gym_id, SUM(amount) FROM payments WHERE paid_at >= NOW() - INTERVAL '30 days' GROUP BY gym_id ORDER BY SUM DESC;

-- Q6 Active anomalies
-- SELECT * FROM anomalies WHERE resolved = FALSE ORDER BY detected_at DESC;
