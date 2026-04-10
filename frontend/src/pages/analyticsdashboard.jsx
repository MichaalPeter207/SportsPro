// =============================================================
//  pages/AnalyticsDashboard.jsx
//  Professional performance visualization using Chart.js
//  Tabs: Overview | Teams | Players | Predictions
// =============================================================

import { useState, useEffect, useRef } from "react";
import { bgSportsPro } from "../styles/bgStyles";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ── Chart.js loaded via CDN in index.html ──
const getChart = () => window.Chart;

// ── Colour palette ────────────────────────────────────────────
const C = {
  purple:  "#7c3aed",
  blue:    "#3b82f6",
  cyan:    "#06b6d4",
  green:   "#22c55e",
  yellow:  "#f59e0b",
  red:     "#ef4444",
  orange:  "#f97316",
  pink:    "#ec4899",
  indigo:  "#6366f1",
  teal:    "#14b8a6",
};
const PALETTE = Object.values(C);
const alpha   = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

// ── Chart defaults ────────────────────────────────────────────
const DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#ccc", font: { family: "'Inter', sans-serif", size: 12 } } },
    tooltip: {
      backgroundColor: "#1a1a2e",
      borderColor: "#ffffff15",
      borderWidth: 1,
      titleColor: "#fff",
      bodyColor: "#aaa",
      padding: 12,
    },
  },
  scales: {
    x: { ticks: { color: "#888" }, grid: { color: "#ffffff08" } },
    y: { ticks: { color: "#888" }, grid: { color: "#ffffff0d" } },
  },
};

// ── Reusable chart canvas ─────────────────────────────────────
function ChartCanvas({ id, height = 280 }) {
  return <canvas id={id} style={{ height, width: "100%", display: "block" }} />;
}

function useChart(id, builder, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const Chart = getChart();
    if (!Chart) return;
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (ref.current) { ref.current.destroy(); ref.current = null; }
    ref.current = builder(ctx, Chart);
    return () => { if (ref.current) { ref.current.destroy(); ref.current = null; } };
  }, deps); // eslint-disable-line
}

// ── Section card ──────────────────────────────────────────────
function Card({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: "#12122b", border: "1px solid #ffffff0d",
      borderRadius: "16px", padding: "24px", ...style,
    }}>
      {title && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#fff" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── KPI badge ─────────────────────────────────────────────────
function KPI({ label, value, sub, color = C.purple, icon }) {
  return (
    <div style={{
      background: "#12122b", border: `1px solid ${color}33`,
      borderRadius: "14px", padding: "20px 18px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>{label}</div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#fff", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: "11px", color: "#555", marginTop: "5px" }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: "28px", opacity: 0.6 }}>{icon}</div>}
      </div>
    </div>
  );
}

// ── Form badge ────────────────────────────────────────────────
function FormBadge({ result }) {
  const colors = { W: C.green, D: C.yellow, L: C.red };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: "24px", height: "24px", borderRadius: "50%",
      background: alpha(colors[result] || "#555", 0.2),
      border: `1px solid ${colors[result] || "#555"}66`,
      color: colors[result] || "#aaa",
      fontSize: "11px", fontWeight: "800",
    }}>{result}</span>
  );
}

// =============================================================
//  MAIN COMPONENT
// =============================================================
export default function AnalyticsDashboard() {
  const [tab,        setTab]        = useState("overview");
  const [overview,   setOverview]   = useState(null);
  const [teamsData,  setTeamsData]  = useState([]);
  const [scorers,    setScorers]    = useState([]);
  const [predData,   setPredData]   = useState(null);
  const [teamDetail, setTeamDetail] = useState(null);
  const [selTeamId,  setSelTeamId]  = useState(null);
  const [allTeams,   setAllTeams]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/analytics/overview`).then(r => r.json()),
      fetch(`${BASE}/analytics/teams`).then(r => r.json()),
      fetch(`${BASE}/analytics/top-scorers?limit=15`).then(r => r.json()),
      fetch(`${BASE}/analytics/prediction-accuracy`).then(r => r.json()),
      fetch(`${BASE}/teams/`).then(r => r.json()),
    ]).then(([ov, tm, sc, pr, ts]) => {
      setOverview(ov);
      setTeamsData(tm.teams || []);
      setScorers(sc.scorers || []);
      setPredData(pr);
      setAllTeams(ts.teams || []);
      if ((ts.teams || []).length > 0) setSelTeamId(ts.teams[0].team_id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selTeamId) return;
    fetch(`${BASE}/analytics/team/${selTeamId}`).then(r => r.json()).then(d => setTeamDetail(d));
  }, [selTeamId]);

  const TABS = [
    { id: "overview",    label: "📊 Overview"    },
    { id: "teams",       label: "🏟️ Teams"       },
    { id: "players",     label: "👤 Players"     },
    { id: "predictions", label: "🤖 Predictions" },
  ];

  if (loading) return (
    <div style={{ textAlign: "center", padding: "5rem", color: "#555" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
      <div style={{ fontSize: "16px" }}>Loading analytics...</div>
    </div>
  );

  return (
    <div style={{ ...bgSportsPro, padding: "2rem 1.5rem", maxWidth: "980px", margin: "0 auto", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0 }}>📊 Analytics & Performance</h1>
        <p style={{ color: "#555", margin: "6px 0 0", fontSize: "13px" }}>
          Powered by XGBoost predictions · Chart.js visualizations
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "9px 18px", borderRadius: "10px", cursor: "pointer",
            background: tab === t.id ? C.purple : "#12122b",
            color: tab === t.id ? "#fff" : "#666",
            fontWeight: tab === t.id ? "700" : "500",
            fontSize: "13px",
            border: `1px solid ${tab === t.id ? C.purple : "#ffffff0d"}`,
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && overview && <OverviewTab data={overview} />}

      {/* ── TEAMS TAB ── */}
      {tab === "teams" && (
        <TeamsTab
          teams={teamsData}
          allTeams={allTeams}
          selTeamId={selTeamId}
          setSelTeamId={setSelTeamId}
          teamDetail={teamDetail}
        />
      )}

      {/* ── PLAYERS TAB ── */}
      {tab === "players" && <PlayersTab scorers={scorers} />}

      {/* ── PREDICTIONS TAB ── */}
      {tab === "predictions" && predData && <PredictionsTab data={predData} />}
    </div>
  );
}

// =============================================================
//  OVERVIEW TAB
// =============================================================
function OverviewTab({ data }) {
  const { kpis, outcome_split, goals_trend } = data;

  // Goals over time line chart
  useChart("chart-goals-trend", (ctx, Chart) => new Chart(ctx, {
    type: "line",
    data: {
      labels: goals_trend.map(g => g.label),
      datasets: [
        {
          label: "Total Goals",
          data: goals_trend.map(g => g.goals),
          borderColor: C.cyan,
          backgroundColor: alpha(C.cyan, 0.08),
          fill: true,
          tension: 0.4,
          pointBackgroundColor: C.cyan,
          pointRadius: 4,
        },
        {
          label: "Home",
          data: goals_trend.map(g => g.home_score),
          borderColor: C.purple,
          backgroundColor: "transparent",
          tension: 0.4,
          borderDash: [4, 3],
          pointRadius: 3,
        },
        {
          label: "Away",
          data: goals_trend.map(g => g.away_score),
          borderColor: C.orange,
          backgroundColor: "transparent",
          tension: 0.4,
          borderDash: [4, 3],
          pointRadius: 3,
        },
      ],
    },
    options: {
      ...DEFAULTS,
      plugins: { ...DEFAULTS.plugins, legend: { ...DEFAULTS.plugins.legend, position: "top" } },
    },
  }), [goals_trend]);

  // Outcome doughnut
  useChart("chart-outcomes", (ctx, Chart) => new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Home Wins", "Away Wins", "Draws"],
      datasets: [{
        data: [outcome_split.home_wins, outcome_split.away_wins, outcome_split.draws],
        backgroundColor: [alpha(C.purple, 0.85), alpha(C.blue, 0.85), alpha(C.yellow, 0.85)],
        borderColor: ["#0f0f1a"],
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      ...DEFAULTS,
      scales: {},
      cutout: "70%",
      plugins: {
        ...DEFAULTS.plugins,
        legend: { ...DEFAULTS.plugins.legend, position: "bottom" },
      },
    },
  }), [outcome_split]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "14px" }}>
        <KPI label="Matches Played"       value={kpis.total_matches}  icon="⚽" color={C.purple} />
        <KPI label="Total Goals"          value={kpis.total_goals}    icon="🥅" color={C.cyan}   sub={`${kpis.avg_goals_pm} per match`} />
        <KPI label="Teams"                value={kpis.total_teams}    icon="🏟️" color={C.blue}   />
        <KPI label="Players"              value={kpis.total_players}  icon="👤" color={C.green}  />
        <KPI label="Upcoming Fixtures"    value={kpis.scheduled}      icon="📅" color={C.yellow} />
        <KPI label="Prediction Accuracy"  value={`${kpis.prediction_accuracy}%`} icon="🤖" color={C.orange} sub="XGBoost model" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
        <Card title="Goals Per Match" subtitle="Home · Away · Total over time">
          {goals_trend.length === 0
            ? <Empty text="No completed matches yet" />
            : <div style={{ height: 280 }}><ChartCanvas id="chart-goals-trend" height={280} /></div>
          }
        </Card>
        <Card title="Match Outcomes" subtitle="Win / Draw / Loss split">
          {(outcome_split.home_wins + outcome_split.away_wins + outcome_split.draws) === 0
            ? <Empty text="No completed matches yet" />
            : <div style={{ height: 280 }}><ChartCanvas id="chart-outcomes" height={280} /></div>
          }
        </Card>
      </div>
    </div>
  );
}

// =============================================================
//  TEAMS TAB
// =============================================================
function TeamsTab({ teams, allTeams, selTeamId, setSelTeamId, teamDetail }) {
  const sorted5 = teams.slice(0, 8);

  // Team comparison bar chart — goals for vs against
  useChart("chart-team-goals", (ctx, Chart) => new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted5.map(t => t.team_name.length > 12 ? t.team_name.slice(0,12)+"…" : t.team_name),
      datasets: [
        {
          label: "Goals For",
          data: sorted5.map(t => t.goals_for),
          backgroundColor: alpha(C.green, 0.75),
          borderColor: C.green,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Goals Against",
          data: sorted5.map(t => t.goals_against),
          backgroundColor: alpha(C.red, 0.75),
          borderColor: C.red,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: { ...DEFAULTS, plugins: { ...DEFAULTS.plugins, legend: { ...DEFAULTS.plugins.legend, position: "top" } } },
  }), [teams]);

  // Points bar chart
  useChart("chart-team-points", (ctx, Chart) => new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted5.map(t => t.team_name.length > 12 ? t.team_name.slice(0,12)+"…" : t.team_name),
      datasets: [{
        label: "Points",
        data: sorted5.map(t => t.points),
        backgroundColor: sorted5.map((_, i) => alpha(PALETTE[i % PALETTE.length], 0.8)),
        borderColor:     sorted5.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: { ...DEFAULTS, plugins: { ...DEFAULTS.plugins, legend: { display: false } } },
  }), [teams]);

  // Team detail radar
  useChart("chart-team-radar", (ctx, Chart) => {
    if (!teamDetail?.stats) return;
    const s = teamDetail.stats;
    return new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Win %", "Goals/Game", "Clean Sheets*", "Form", "Attack", "Defense*"],
        datasets: [{
          label: teamDetail.team?.team_name || "Team",
          data: [
            s.win_pct,
            Math.min(s.goals_for_pg * 20, 100),
            Math.max(0, 100 - s.goals_against_pg * 20),
            (s.won / Math.max(s.played, 1)) * 100,
            Math.min(s.goals_for / Math.max(s.played, 1) * 15, 100),
            Math.max(0, 100 - (s.goals_against / Math.max(s.played, 1)) * 15),
          ],
          backgroundColor: alpha(C.purple, 0.2),
          borderColor: C.purple,
          pointBackgroundColor: C.purple,
          pointRadius: 5,
          borderWidth: 2,
        }],
      },
      options: {
        ...DEFAULTS,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: false },
            grid: { color: "#ffffff15" },
            pointLabels: { color: "#aaa", font: { size: 11 } },
            angleLines: { color: "#ffffff10" },
          },
        },
      },
    });
  }, [teamDetail]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <Card title="Goals For vs Against" subtitle="By team">
          {teams.length === 0 ? <Empty text="No match data yet" /> : <div style={{ height: 260 }}><ChartCanvas id="chart-team-goals" height={260} /></div>}
        </Card>
        <Card title="Points Table" subtitle="Sorted by points">
          {teams.length === 0 ? <Empty text="No match data yet" /> : <div style={{ height: 260 }}><ChartCanvas id="chart-team-points" height={260} /></div>}
        </Card>
      </div>

      {/* Team deep-dive */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Team picker */}
          <Card title="Team Deep-Dive">
            <select
              value={selTeamId || ""}
              onChange={e => setSelTeamId(+e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f0f1a", border: "1px solid #ffffff15", color: "#fff", fontSize: "13px" }}
            >
              {allTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
            </select>

            {teamDetail?.stats && (
              <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { l: "Played",  v: teamDetail.stats.played  },
                  { l: "Points",  v: teamDetail.stats.points  },
                  { l: "Won",     v: teamDetail.stats.won,   c: C.green  },
                  { l: "Lost",    v: teamDetail.stats.lost,  c: C.red    },
                  { l: "GF",      v: teamDetail.stats.goals_for  },
                  { l: "GA",      v: teamDetail.stats.goals_against },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: "#0f0f1a", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontWeight: "800", fontSize: "20px", color: c || "#fff" }}>{v}</div>
                    <div style={{ fontSize: "10px", color: "#555" }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Form guide */}
            {teamDetail?.form?.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px" }}>LAST {Math.min(teamDetail.form.length, 10)} MATCHES</div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {teamDetail.form.slice(-10).map((f, i) => <FormBadge key={i} result={f.result} />)}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Radar */}
        <Card title="Performance Radar" subtitle="Relative performance across 6 dimensions">
          {!teamDetail?.stats
            ? <Empty text="Select a team" />
            : <div style={{ height: 300 }}><ChartCanvas id="chart-team-radar" height={300} /></div>
          }
        </Card>
      </div>

      {/* Top players for selected team */}
      {teamDetail?.players?.length > 0 && (
        <Card title={`Top Players — ${teamDetail.team?.team_name}`} subtitle="Sorted by goals">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ffffff0d" }}>
                  {["Player","Pos","Apps","Goals","Assists","Mins","Rating"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Player" ? "left" : "center", color: "#555", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamDetail.players.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #ffffff05" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#ffffff04"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 12px", fontWeight: "600" }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: C.cyan, fontSize: "11px" }}>{p.position || "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#888" }}>{p.apps}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "700", color: C.green }}>{p.goals}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: C.blue }}>{p.assists}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#666" }}>{p.minutes}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {p.rating ? <span style={{ color: ratingColor(p.rating), fontWeight: "700" }}>{p.rating}</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================
//  PLAYERS TAB
// =============================================================
function PlayersTab({ scorers }) {
  // Goals bar chart
  useChart("chart-top-scorers", (ctx, Chart) => new Chart(ctx, {
    type: "bar",
    data: {
      labels: scorers.slice(0,10).map(p => p.name.split(" ")[0]),
      datasets: [
        {
          label: "Goals",
          data: scorers.slice(0,10).map(p => p.goals),
          backgroundColor: alpha(C.green, 0.8),
          borderColor: C.green,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Assists",
          data: scorers.slice(0,10).map(p => p.assists),
          backgroundColor: alpha(C.blue, 0.8),
          borderColor: C.blue,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: { ...DEFAULTS, plugins: { ...DEFAULTS.plugins, legend: { ...DEFAULTS.plugins.legend, position: "top" } } },
  }), [scorers]);

  // Rating bubble / bar
  useChart("chart-player-ratings", (ctx, Chart) => {
    const rated = scorers.filter(p => p.rating).slice(0, 10);
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: rated.map(p => p.name.split(" ")[0]),
        datasets: [{
          label: "Avg Rating",
          data: rated.map(p => p.rating),
          backgroundColor: rated.map(p => alpha(ratingColor(p.rating), 0.8)),
          borderColor:     rated.map(p => ratingColor(p.rating)),
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        ...DEFAULTS,
        plugins: { ...DEFAULTS.plugins, legend: { display: false } },
        scales: { ...DEFAULTS.scales, y: { ...DEFAULTS.scales.y, min: 0, max: 10 } },
      },
    });
  }, [scorers]);

  // Minutes played horizontal bar
  useChart("chart-minutes", (ctx, Chart) => {
    const top = [...scorers].sort((a,b) => b.minutes - a.minutes).slice(0,10);
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: top.map(p => p.name.split(" ")[0]),
        datasets: [{
          label: "Minutes Played",
          data: top.map(p => p.minutes),
          backgroundColor: alpha(C.cyan, 0.75),
          borderColor: C.cyan,
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        ...DEFAULTS,
        indexAxis: "y",
        plugins: { ...DEFAULTS.plugins, legend: { display: false } },
      },
    });
  }, [scorers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <Card title="Goals & Assists Leaders" subtitle="Top 10 players">
          {scorers.length === 0 ? <Empty text="No stats entered yet" /> : <div style={{ height: 260 }}><ChartCanvas id="chart-top-scorers" height={260} /></div>}
        </Card>
        <Card title="Player Ratings" subtitle="Average match rating">
          {scorers.filter(p=>p.rating).length === 0 ? <Empty text="No ratings entered yet" /> : <div style={{ height: 260 }}><ChartCanvas id="chart-player-ratings" height={260} /></div>}
        </Card>
      </div>

      <Card title="Minutes on the Pitch" subtitle="Most minutes played">
        {scorers.length === 0 ? <Empty text="No stats entered yet" /> : <div style={{ height: 280 }}><ChartCanvas id="chart-minutes" height={280} /></div>}
      </Card>

      {/* Full player table */}
      <Card title="All Player Stats" subtitle={`${scorers.length} players with recorded statistics`}>
        {scorers.length === 0
          ? <Empty text="No stats recorded yet. Coaches can enter stats in the Manage → Stats tab." />
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ffffff0d" }}>
                    {["#","Player","Team","Pos","Apps","Goals","Ast","Yel","Red","Mins","Rating"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Player" || h === "Team" ? "left" : "center", color: "#555", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scorers.map((p, i) => (
                    <tr key={p.player_id} style={{ borderBottom: "1px solid #ffffff05" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#ffffff04"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px", textAlign: "center", color: i < 3 ? C.yellow : "#555", fontWeight: "700" }}>{i+1}</td>
                      <td style={{ padding: "10px", fontWeight: "600" }}>{p.name}</td>
                      <td style={{ padding: "10px", color: "#888", fontSize: "12px" }}>{p.team}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.cyan, fontSize: "11px" }}>{p.position || "—"}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: "#666" }}>{p.apps}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: "700", color: C.green }}>{p.goals}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.blue }}>{p.assists}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.yellow }}>{p.yellows}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.red }}>{p.reds}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: "#666" }}>{p.minutes}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        {p.rating ? <span style={{ color: ratingColor(p.rating), fontWeight: "700" }}>{p.rating}</span> : <span style={{ color: "#333" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    </div>
  );
}

// =============================================================
//  PREDICTIONS TAB
// =============================================================
function PredictionsTab({ data }) {
  const { records, overall_accuracy, total } = data;

  // Running accuracy line chart
  useChart("chart-pred-accuracy", (ctx, Chart) => new Chart(ctx, {
    type: "line",
    data: {
      labels: records.map(r => r.date),
      datasets: [{
        label: "Running Accuracy %",
        data: records.map(r => r.running_accuracy),
        borderColor: C.green,
        backgroundColor: alpha(C.green, 0.08),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: records.map(r => r.correct ? C.green : C.red),
        pointRadius: 5,
        pointBorderColor: "transparent",
      }],
    },
    options: {
      ...DEFAULTS,
      plugins: { ...DEFAULTS.plugins, legend: { display: false } },
      scales: { ...DEFAULTS.scales, y: { ...DEFAULTS.scales.y, min: 0, max: 100 } },
    },
  }), [records]);

  // Prediction outcome distribution doughnut
  const predCounts = { home: 0, draw: 0, away: 0 };
  records.forEach(r => { predCounts[r.predicted] = (predCounts[r.predicted] || 0) + 1; });

  useChart("chart-pred-dist", (ctx, Chart) => new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Home Win Predicted", "Draw Predicted", "Away Win Predicted"],
      datasets: [{
        data: [predCounts.home, predCounts.draw, predCounts.away],
        backgroundColor: [alpha(C.purple, 0.85), alpha(C.yellow, 0.85), alpha(C.blue, 0.85)],
        borderColor: ["#0f0f1a"],
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: { ...DEFAULTS, scales: {}, cutout: "68%",
      plugins: { ...DEFAULTS.plugins, legend: { ...DEFAULTS.plugins.legend, position: "bottom" } } },
  }), [records]);

  const correct   = records.filter(r => r.correct).length;
  const incorrect = records.length - correct;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "14px" }}>
        <KPI label="Overall Accuracy"    value={`${overall_accuracy}%`} color={C.green}  icon="🎯" sub={`${correct} of ${total} correct`} />
        <KPI label="Correct Predictions" value={correct}   color={C.green}  icon="✅" />
        <KPI label="Incorrect"           value={incorrect} color={C.red}    icon="❌" />
        <KPI label="Total Predicted"     value={total}     color={C.purple} icon="🤖" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>
        <Card title="Prediction Accuracy Over Time" subtitle="Running % · Green dot = correct · Red dot = wrong">
          {records.length === 0
            ? <Empty text="No predictions evaluated yet" />
            : <div style={{ height: 280 }}><ChartCanvas id="chart-pred-accuracy" height={280} /></div>
          }
        </Card>
        <Card title="Prediction Distribution" subtitle="What the model predicted">
          {records.length === 0
            ? <Empty text="No predictions yet" />
            : <div style={{ height: 280 }}><ChartCanvas id="chart-pred-dist" height={280} /></div>
          }
        </Card>
      </div>

      {/* Prediction log */}
      <Card title="Prediction Log" subtitle="Match-by-match breakdown">
        {records.length === 0
          ? <Empty text="Complete some matches to see predictions evaluated" />
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ffffff0d" }}>
                    {["Match","Date","Predicted","Actual","H%","D%","A%","Model","Result"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "center", color: "#555", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ffffff05" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#ffffff04"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px", textAlign: "center", color: "#aaa" }}>{r.match}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: "#555", fontSize: "11px" }}>{r.date}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <OutcomeBadge outcome={r.predicted} />
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <OutcomeBadge outcome={r.actual} />
                      </td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.purple }}>{Math.round(r.home_prob*100)}%</td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.yellow }}>{Math.round(r.draw_prob*100)}%</td>
                      <td style={{ padding: "10px", textAlign: "center", color: C.blue  }}>{Math.round(r.away_prob*100)}%</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <span style={{ fontSize: "10px", color: r.model?.startsWith("xgboost") ? C.cyan : "#555",
                          background: r.model?.startsWith("xgboost") ? alpha(C.cyan, 0.1) : "transparent",
                          padding: "2px 7px", borderRadius: "20px" }}>
                          {r.model?.startsWith("xgboost") ? "XGB" : "STAT"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <span style={{ fontSize: "16px" }}>{r.correct ? "✅" : "❌"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#444" }}>
      <div style={{ fontSize: "32px", marginBottom: "10px" }}>📭</div>
      <div style={{ fontSize: "13px" }}>{text}</div>
    </div>
  );
}

function OutcomeBadge({ outcome }) {
  const map = { home: { label: "Home", color: C.purple }, draw: { label: "Draw", color: C.yellow }, away: { label: "Away", color: C.blue } };
  const { label, color } = map[outcome] || { label: outcome, color: "#555" };
  return (
    <span style={{ background: alpha(color, 0.15), color, border: `1px solid ${alpha(color, 0.3)}`,
      borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: "600" }}>
      {label}
    </span>
  );
}

function ratingColor(r) {
  if (r >= 8) return C.green;
  if (r >= 6.5) return C.yellow;
  return C.red;
}
