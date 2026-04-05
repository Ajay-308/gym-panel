import { useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useDashboardStore } from "./store/useDashboardStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { AnimatedNumber } from "./components/AnimatedNumber";
import styles from "./App.module.css";

const API = "/api";

async function j(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function occColor(pct) {
  if (pct < 60) return "#22c55e";
  if (pct <= 85) return "#eab308";
  return "#ef4444";
}

export default function App() {
  const {
    gyms,
    selectedGymId,
    live,
    summary,
    analytics,
    analyticsLoading,
    analyticsError,
    crossGym,
    anomalies,
    activity,
    tab,
    loadingGyms,
    error,
    setGyms,
    selectGym,
    setLive,
    setSummary,
    setAnalytics,
    setAnalyticsLoading,
    setAnalyticsError,
    setCrossGym,
    setAnomalies,
    setActivity,
    prependActivity,
    setTab,
    setLoadingGyms,
    setError,
  } = useDashboardStore();

  const refreshLive = useCallback(async (gymId) => {
    if (!gymId) return;
    const data = await j(`${API}/gyms/${gymId}/live`);
    setLive(data);
    setActivity(data.recent_events || []);
  }, [setLive, setActivity]);

  const refreshSummary = useCallback(async () => {
    const s = await j(`${API}/analytics/summary`);
    setSummary(s);
  }, [setSummary]);

  const refreshAnomalies = useCallback(async () => {
    const rows = await j(`${API}/anomalies`);
    setAnomalies(rows);
  }, [setAnomalies]);

  const refreshAnalytics = useCallback(
    async (gymId) => {
      if (!gymId) return;
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const [a, c] = await Promise.all([
          j(`${API}/gyms/${gymId}/analytics?dateRange=30d`),
          j(`${API}/analytics/cross-gym`),
        ]);
        setAnalytics(a);
        setCrossGym(c);
      } catch (e) {
        setAnalyticsError(e.message || "Failed to load analytics");
        setAnalytics(null);
        setCrossGym([]);
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [setAnalytics, setCrossGym, setAnalyticsLoading, setAnalyticsError],
  );

  useEffect(() => {
    (async () => {
      try {
        setLoadingGyms(true);
        const list = await j(`${API}/gyms`);
        setGyms(list);
        if (list.length && !selectedGymId) selectGym(list[0].id);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingGyms(false);
      }
    })();
  }, [setGyms, selectGym, selectedGymId, setLoadingGyms, setError]);

  useEffect(() => {
    if (!selectedGymId) return;
    refreshLive(selectedGymId).catch((e) => setError(e.message));
    refreshAnalytics(selectedGymId);
  }, [selectedGymId, refreshLive, refreshAnalytics, setError]);

  useEffect(() => {
    if (tab === "analytics" && selectedGymId) {
      refreshAnalytics(selectedGymId);
    }
  }, [tab, selectedGymId, refreshAnalytics]);

  useEffect(() => {
    refreshSummary().catch(() => {});
    refreshAnomalies().catch(() => {});
  }, [refreshSummary, refreshAnomalies]);

  const wsHandlers = useMemo(
    () => ({
      onCheckin: (msg) => {
        if (msg.gym_id === selectedGymId) refreshLive(selectedGymId);
        refreshSummary();
        prependActivity({
          event_type: "checkin",
          member_name: msg.member_name,
          gym_id: msg.gym_id,
          timestamp: msg.timestamp,
        });
      },
      onCheckout: (msg) => {
        if (msg.gym_id === selectedGymId) refreshLive(selectedGymId);
        refreshSummary();
        prependActivity({
          event_type: "checkout",
          member_name: msg.member_name,
          gym_id: msg.gym_id,
          timestamp: msg.timestamp,
        });
      },
      onPayment: (msg) => {
        if (msg.gym_id === selectedGymId) refreshLive(selectedGymId);
        refreshSummary();
        prependActivity({
          event_type: "payment",
          member_name: msg.member_name,
          gym_id: msg.gym_id,
          timestamp: new Date().toISOString(),
        });
      },
      onAnomaly: () => {
        refreshAnomalies();
        refreshSummary();
      },
      onAnomalyResolved: () => {
        refreshAnomalies();
        refreshSummary();
      },
    }),
    [selectedGymId, refreshLive, refreshSummary, refreshAnomalies, prependActivity],
  );

  const { connected } = useWebSocket(wsHandlers);

  const badge = anomalies.filter((a) => !a.resolved).length;

  const heatmapGrid = useMemo(() => {
    if (!analytics?.heatmap?.length) return null;
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 1;
    for (const h of analytics.heatmap) {
      const d = Number(h.day_of_week);
      const hr = Number(h.hour_of_day);
      const v = Number(h.checkin_count);
      grid[d][hr] = v;
      max = Math.max(max, v);
    }
    return { grid, max };
  }, [analytics]);

  const donutData = useMemo(() => {
    if (!analytics?.new_vs_renewal?.length) return [];
    return analytics.new_vs_renewal.map((r) => ({
      name: r.payment_type,
      value: Number(r.count),
    }));
  }, [analytics]);

  const planBarData = useMemo(() => {
    const m = {};
    for (const r of analytics?.revenue_by_plan || []) {
      const k = r.plan_type;
      m[k] = (m[k] || 0) + Number(r.total_amount);
    }
    return Object.entries(m).map(([plan, total]) => ({ plan, total }));
  }, [analytics]);

  const COLORS = ["#14b8a6", "#f97316"];

  async function simStart(speed) {
    await j(`${API}/simulator/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed }),
    });
  }
  async function simStop() {
    await j(`${API}/simulator/stop`, { method: "POST" });
  }
  async function simReset() {
    await j(`${API}/simulator/reset`, { method: "POST" });
    if (selectedGymId) refreshLive(selectedGymId);
    refreshSummary();
  }

  async function dismissAnomaly(id) {
    if (!window.confirm("Dismiss this warning?")) return;
    await j(`${API}/anomalies/${id}/dismiss`, { method: "PATCH" });
    refreshAnomalies();
  }

  if (loadingGyms) {
    return <div className={styles.skeletonPage}>Loading Aj gym…</div>;
  }
  if (error && !gyms.length) {
    return <div className={styles.errorBanner}>{error}</div>;
  }

  const occPct = live?.occupancy_pct ?? 0;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}>Aj gym</span>
        </div>
        <nav className={styles.nav}>
          {["dashboard", "analytics", "anomalies"].map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? styles.navOn : styles.navBtn}
              onClick={() => setTab(t)}
            >
              {t === "anomalies" ? (
                <>
                  Anomalies
                  {badge > 0 ? <span className={styles.badge}>{badge}</span> : null}
                </>
              ) : (
                t[0].toUpperCase() + t.slice(1)
              )}
            </button>
          ))}
        </nav>
        <select
          className={styles.select}
          value={selectedGymId || ""}
          onChange={(e) => selectGym(e.target.value)}
        >
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </header>

      {summary && (
        <section className={styles.summary}>
          <div>
            <div className={styles.muted}>All gyms — checked in now</div>
            <div className={styles.kpi}>
              <AnimatedNumber value={summary.total_occupancy} />
            </div>
          </div>
          <div>
            <div className={styles.muted}>All gyms — revenue today</div>
            <div className={styles.kpi}>
              ₹
              <AnimatedNumber value={summary.total_today_revenue} decimals={0} />
            </div>
          </div>
          <div>
            <div className={styles.muted}>Active anomalies</div>
            <div className={styles.kpi}>
              <AnimatedNumber value={summary.active_anomaly_count} />
            </div>
          </div>
        </section>
      )}

      {tab === "dashboard" && (
        <>
          <section className={styles.grid2}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span>Live occupancy</span>
                <span
                  className={styles.liveDot}
                  style={{ background: connected ? "#22c55e" : "#ef4444" }}
                  title={connected ? "WebSocket live" : "Disconnected"}
                />
              </div>
              {live ? (
                <>
                  <div
                    className={styles.bigNum}
                    style={{ color: occColor(occPct) }}
                  >
                    <AnimatedNumber value={live.occupancy} />
                    <span className={styles.sub}>
                      {" "}
                      / {live.capacity} (
                      <AnimatedNumber value={occPct} decimals={1} suffix="%" />)
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.muted}>No data</div>
              )}
            </div>
            <div className={styles.card}>
              <div className={styles.cardHead}>Revenue today</div>
              {live ? (
                <div className={styles.bigNum}>
                  ₹<AnimatedNumber value={live.today_revenue} decimals={0} />
                </div>
              ) : (
                <div className={styles.muted}>No data</div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>Activity feed (last 20)</div>
            <div className={styles.feed}>
              {(activity.length ? activity : live?.recent_events || []).map(
                (ev, i) => (
                  <div key={i} className={styles.feedRow}>
                    <span className={styles.tag}>{ev.event_type}</span>
                    <span>{ev.member_name}</span>
                    <span className={styles.muted}>
                      {ev.timestamp
                        ? new Date(ev.timestamp).toLocaleString()
                        : ""}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>Simulator</div>
            <div className={styles.simRow}>
              <button type="button" onClick={() => simStart(1)}>
                Start 1×
              </button>
              <button type="button" onClick={() => simStart(5)}>
                Start 5×
              </button>
              <button type="button" onClick={() => simStart(10)}>
                Start 10×
              </button>
              <button type="button" onClick={simStop}>
                Pause
              </button>
              <button type="button" onClick={simReset}>
                Reset baseline
              </button>
            </div>
          </section>
        </>
      )}

      {tab === "analytics" && (
        <>
          {analyticsLoading && (
            <div className={styles.panelHint}>Loading analytics…</div>
          )}
          {analyticsError && (
            <div className={styles.errorPanel}>
              <p>{analyticsError}</p>
              <button
                type="button"
                onClick={() =>
                  selectedGymId && refreshAnalytics(selectedGymId)
                }
              >
                Retry
              </button>
            </div>
          )}

          {!analyticsLoading && !analyticsError && !analytics && (
            <div className={styles.panelHint}>
              Select a gym or wait for data. If this persists, check that the
              API is reachable at <code className="mono">/api</code>.
            </div>
          )}

          {analytics && (
            <>
              <section className={styles.card}>
                <div className={styles.cardHead}>7-day peak hours</div>
                {heatmapGrid ? (
                  <div className={styles.heatWrap}>
                    <div className={styles.heatLabels}>
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div key={d} className={styles.heatRowLabel}>
                            {d}
                          </div>
                        ),
                      )}
                    </div>
                    <div>
                      <div className={styles.heatHours}>
                        {Array.from({ length: 24 }, (_, h) => (
                          <span key={h}>{h}</span>
                        ))}
                      </div>
                      {heatmapGrid.grid.map((row, di) => (
                        <div key={di} className={styles.heatRow}>
                          {row.map((v, hi) => (
                            <div
                              key={hi}
                              className={styles.heatCell}
                              style={{
                                opacity: 0.15 + (0.85 * v) / heatmapGrid.max,
                                background: "#14b8a6",
                              }}
                              title={`${v} check-ins`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={styles.muted}>
                    No heatmap rows yet (materialized view may be empty for the
                    last 7 days). Data appears after check-ins in that window.
                  </p>
                )}
              </section>

              <section className={styles.grid2}>
                <div className={styles.card}>
                  <div className={styles.cardHead}>Revenue by plan (30d)</div>
                  <div className={styles.chartBox}>
                    {planBarData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={planBarData}>
                          <XAxis dataKey="plan" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip
                            contentStyle={{
                              background: "#1a1a2e",
                              border: "none",
                            }}
                          />
                          <Bar dataKey="total" fill="#14b8a6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className={styles.muted}>No payment rows in range.</p>
                    )}
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardHead}>New vs renewal</div>
                  <div className={styles.chartBox}>
                    {donutData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={80}
                          >
                            {donutData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={COLORS[i % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip
                            contentStyle={{
                              background: "#1a1a2e",
                              border: "none",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className={styles.muted}>No new/renewal split data.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>Churn risk (45+ days)</div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Last check-in</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics.churn_risk_members || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className={styles.muted}>
                          No members in churn window for this gym.
                        </td>
                      </tr>
                    ) : (
                      (analytics.churn_risk_members || []).map((m) => (
                        <tr key={m.id}>
                          <td>{m.name}</td>
                          <td>
                            {m.last_checkin_at
                              ? new Date(
                                  m.last_checkin_at,
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>{m.risk_level}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>Cross-gym revenue (30d)</div>
                <div className={styles.chartBoxTall}>
                  {crossGym.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={crossGym} layout="vertical">
                        <XAxis type="number" stroke="#64748b" />
                        <YAxis
                          type="category"
                          dataKey="gym_name"
                          width={160}
                          stroke="#64748b"
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a2e",
                            border: "none",
                          }}
                        />
                        <Bar dataKey="total_revenue" fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className={styles.muted}>No cross-gym revenue data.</p>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {tab === "anomalies" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>Anomaly log</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Gym</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Detected</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id}>
                  <td>{a.gym_name}</td>
                  <td>{a.type}</td>
                  <td>{a.severity}</td>
                  <td>{new Date(a.detected_at).toLocaleString()}</td>
                  <td>
                    {a.resolved
                      ? "Resolved"
                      : a.dismissed
                        ? "Dismissed"
                        : "Open"}
                  </td>
                  <td>
                    {a.severity === "warning" && !a.dismissed && !a.resolved ? (
                      <button type="button" onClick={() => dismissAnomaly(a.id)}>
                        Dismiss
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
