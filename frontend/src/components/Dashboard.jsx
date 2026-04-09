// =============================================================
//  components/Dashboard.jsx
//  Full analytics dashboard - visible to ALL roles
//  Shows: standings, upcoming/ongoing matches, predictions,
//         player stats, win/draw/loss charts
// =============================================================

import { useState, useEffect } from "react";

const BASE = "http://localhost:5000/api";

export default function Dashboard({ initialTab = "standings" }) {
  const [standings,  setStandings]  = useState([]);
  const [matches,    setMatches]    = useState([]);
  const [players,    setPlayers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState(initialTab);
  const [tournament,   setTournament]   = useState(null);
  const [activeTournaments, setActiveTournaments] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/matches/standings`).then(r => r.json()),
      fetch(`${BASE}/matches/`).then(r => r.json()),
      fetch(`${BASE}/performance/top?limit=100`).then(r => r.json()).catch(() => ({ players: [] })),
      fetch(`${BASE}/matches/tournament`).then(r => r.json()).catch(() => ({})),
      fetch(`${BASE}/tournaments/`).then(r => r.json()).catch(() => ({ tournaments: [] })),
      fetch(`${BASE}/teams/`).then(r => r.json()).catch(() => ({ teams: [] })),
    ]).then(async ([s, m, p, t, tourRes, teamsRes]) => {
      setStandings(s.standings || []);
      setMatches(m.matches || []);
      setTournament(t.tournament || null);
      setActiveTournaments(tourRes.tournaments || []);

      // Merge all registered players with their stats (show all players, not just ones with stats)
      const statsMap = {};
      (p.players || []).forEach(pl => { statsMap[pl.player_id] = pl; });

      const allTeams = teamsRes.teams || [];
      const allPlayers = [];
      for (const team of allTeams) {
        try {
          const pr = await fetch(`${BASE}/teams/${team.team_id}/players`).then(r => r.json());
          (pr.players || []).forEach(pl => {
            const stats = statsMap[pl.player_id];
            allPlayers.push({
              player_id:      pl.player_id,
              first_name:     pl.first_name,
              last_name:      pl.last_name,
              position:       pl.position,
              jersey_num:     pl.jersey_num,
              nationality:    pl.nationality,
              team_name:      team.team_name,
              goals:          stats?.goals          || 0,
              assists:        stats?.assists         || 0,
              yellow_cards:   stats?.yellow_cards    || 0,
              red_cards:      stats?.red_cards       || 0,
              minutes_played: stats?.minutes_played  || 0,
              rating:         stats?.rating          || null,
            });
          });
        } catch(e) {}
      }
      // Sort by goals desc, then assists
      allPlayers.sort((a, b) => (b.goals - a.goals) || (b.assists - a.assists));
      setPlayers(allPlayers);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const now        = new Date();
  const upcoming   = matches.filter(m => m.status === "scheduled");
  const completed  = matches.filter(m => m.status === "completed");
  const ongoing    = matches.filter(m => m.status === "ongoing");

  // Compute overall stats for summary cards
  const totalGoals  = completed.reduce((s, m) => s + (m.home_score || 0) + (m.away_score || 0), 0);
  const totalTeams  = standings.length;
  const totalPlayed = completed.length;

  const tabs = [
    { id: "standings", label: "🏆 Standings" },
    { id: "fixtures",  label: "📅 Fixtures"  },
    { id: "results",   label: "⚽ Results"   },
    { id: "players",   label: "👤 Players"   },
  ];

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "#aaa" }}>
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚽</div>
      Loading dashboard...
    </div>
  );

  return (
    <div style={{ padding: "0 0 3rem" }}>

      {/* Active Tournaments Banner */}
      {activeTournaments.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#aaa", marginBottom: "10px", letterSpacing: "0.5px" }}>
            ⚡ ACTIVE TOURNAMENTS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "10px" }}>
            {activeTournaments.map(t => (
              <div key={t.tournament_id} style={{
                background: "linear-gradient(135deg,#6c63ff14,#3b82f614)",
                border: "1px solid #6c63ff33", borderRadius: "12px",
                padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px",
              }}>
                <span style={{ fontSize: "24px" }}>🏆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ color: "#888", fontSize: "12px" }}>{t.season_name} · {t.match_count} matches</div>
                </div>
                <div style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", color: "#22c55e", fontWeight: "700", whiteSpace: "nowrap" }}>
                  LIVE
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Teams",          value: totalTeams,  icon: "🏟️", color: "#6c63ff" },
          { label: "Matches Played", value: totalPlayed, icon: "⚽", color: "#3b82f6" },
          { label: "Upcoming",       value: upcoming.length, icon: "📅", color: "#f59e0b" },
          { label: "Total Goals",    value: totalGoals,  icon: "🥅", color: "#22c55e" },
        ].map(c => (
          <div key={c.label} style={{
            background: "#1a1a2e", border: `1px solid ${c.color}33`,
            borderRadius: "12px", padding: "20px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{c.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: c.color }}>{c.value}</div>
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Ongoing Matches */}
      {ongoing.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <SectionTitle icon="🔴" title="Live Matches" />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ongoing.map(m => <MatchCard key={m.match_id} match={m} highlight />)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "9px 18px", borderRadius: "8px", border: "none",
            cursor: "pointer", fontWeight: "bold", fontSize: "13px",
            background: activeTab === t.id
              ? "linear-gradient(135deg,#6c63ff,#3b82f6)" : "#1a1a2e",
            color: activeTab === t.id ? "#fff" : "#aaa",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STANDINGS TAB */}
      {activeTab === "standings" && (
        <div>
          {standings.length === 0 ? (
            <Empty text="No standings yet. Results will appear here after matches are played." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#1a1a2e", color: "#aaa", fontSize: "12px" }}>
                    {["#","Team","Dept","P","W","D","L","GF","GA","GD","Pts"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: h === "Team" || h === "Dept" ? "left" : "center", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <tr key={row.team_id} style={{
                      borderBottom: "1px solid #ffffff08",
                      background: i % 2 === 0 ? "#0f0f1a" : "transparent",
                    }}>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <PositionBadge pos={row.position} />
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: "bold" }}>{row.team_name}</td>
                      <td style={{ padding: "10px 12px", color: "#aaa", fontSize: "12px" }}>{row.department || "—"}</td>
                      {[row.played, row.won, row.drawn, row.lost,
                        row.goals_for, row.goals_against, row.goal_diff].map((v, j) => (
                        <td key={j} style={{ padding: "10px 12px", textAlign: "center" }}>{v}</td>
                      ))}
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <strong style={{ color: "#6c63ff", fontSize: "16px" }}>{row.points}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Form guide legend */}
              <div style={{ marginTop: "12px", fontSize: "12px", color: "#555", display: "flex", gap: "16px" }}>
                <span>🟣 Champions League spots</span>
                <span>🟡 Europa spots</span>
                <span>🔴 Relegation zone</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FIXTURES TAB */}
      {activeTab === "fixtures" && (
        <div>
          {upcoming.length === 0 ? (
            <Empty text="No upcoming fixtures scheduled yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {upcoming.map(m => <MatchCard key={m.match_id} match={m} showPrediction />)}
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === "results" && (
        <div>
          {completed.length === 0 ? (
            <Empty text="No results yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[...completed].reverse().map(m => <MatchCard key={m.match_id} match={m} showScore />)}
            </div>
          )}
        </div>
      )}

      {/* PLAYERS TAB */}
      {activeTab === "players" && (
        <div>
          {players.length === 0 ? (
            <Empty text="No players registered yet. Coaches can register players in the Manage panel." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "16px" }}>
              {players.map((p, i) => <PlayerCard key={p.player_id} player={p} rank={i + 1} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <span style={{ fontWeight: "700", fontSize: "16px" }}>{title}</span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{
      background: "#1a1a2e", borderRadius: "12px",
      padding: "40px", textAlign: "center", color: "#555",
    }}>
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
      {text}
    </div>
  );
}

function PositionBadge({ pos }) {
  const color = pos === 1 ? "#f59e0b" : pos === 2 ? "#aaa" : pos === 3 ? "#cd7f32" : "#555";
  return (
    <span style={{ color, fontWeight: "bold" }}>{pos}</span>
  );
}

function MatchCard({ match: m, showScore, showPrediction, highlight }) {
  const pred = m.prediction;

  return (
    <div style={{
      background: highlight ? "#6c63ff11" : "#1a1a2e",
      border: `1px solid ${highlight ? "#6c63ff44" : "#ffffff0d"}`,
      borderRadius: "12px", padding: "16px 20px",
    }}>
      {/* Tournament / Round */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", color: "#6c63ff", fontWeight: "bold" }}>
          {m.tournament_title || "League Match"}
        </span>
        <span style={{ fontSize: "11px", color: "#555" }}>
          Round {m.round_number} · {m.match_date?.slice(0, 10)}
        </span>
      </div>

      {/* Teams + Score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ fontWeight: "bold", flex: 1, textAlign: "right" }}>{m.home_team}</span>
        <div style={{
          background: "#0f0f1a", borderRadius: "8px",
          padding: "8px 16px", fontWeight: "900", fontSize: "18px",
          minWidth: "70px", textAlign: "center",
          color: showScore ? "#fff" : "#555",
        }}>
          {showScore ? `${m.home_score} - ${m.away_score}` : "VS"}
        </div>
        <span style={{ fontWeight: "bold", flex: 1 }}>{m.away_team}</span>
      </div>

      {/* Venue */}
      {m.venue && (
        <div style={{ fontSize: "11px", color: "#555", textAlign: "center", marginTop: "6px" }}>
          📍 {m.venue}
        </div>
      )}

      {/* Prediction bars */}
      {showPrediction && pred && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "6px", textAlign: "center" }}>
            AI Prediction
          </div>
          <PredictionBar
            homeProb={pred.home_win_prob}
            drawProb={pred.draw_prob}
            awayProb={pred.away_win_prob}
            outcome={pred.predicted_outcome}
          />
        </div>
      )}

      {/* Result outcome badge */}
      {showScore && (
        <div style={{ textAlign: "center", marginTop: "8px" }}>
          {m.home_score > m.away_score && <Badge color="#22c55e" text={`${m.home_team} Win`} />}
          {m.home_score < m.away_score && <Badge color="#22c55e" text={`${m.away_team} Win`} />}
          {m.home_score === m.away_score && <Badge color="#f59e0b" text="Draw" />}
        </div>
      )}
    </div>
  );
}

function PredictionBar({ homeProb, drawProb, awayProb, outcome }) {
  const hp = Math.round(homeProb * 100);
  const dp = Math.round(drawProb * 100);
  const ap = Math.round(awayProb * 100);

  return (
    <div>
      <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", height: "10px" }}>
        <div style={{ width: `${hp}%`, background: "#6c63ff" }} />
        <div style={{ width: `${dp}%`, background: "#f59e0b" }} />
        <div style={{ width: `${ap}%`, background: "#3b82f6" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px", color: "#aaa" }}>
        <span style={{ color: outcome === "home" ? "#6c63ff" : "#aaa" }}>Home {hp}%</span>
        <span style={{ color: outcome === "draw" ? "#f59e0b" : "#aaa" }}>Draw {dp}%</span>
        <span style={{ color: outcome === "away" ? "#3b82f6" : "#aaa" }}>Away {ap}%</span>
      </div>
    </div>
  );
}

function Badge({ color, text }) {
  return (
    <span style={{
      background: color + "22", border: `1px solid ${color}44`,
      color, borderRadius: "20px", padding: "3px 12px", fontSize: "11px", fontWeight: "bold",
    }}>
      {text}
    </span>
  );
}

function PlayerCard({ player: p, rank }) {
  const rankColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#aaa" : rank === 3 ? "#cd7f32" : "#555";
  return (
    <div style={{
      background: "#1a1a2e", border: "1px solid #ffffff0d",
      borderRadius: "12px", padding: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: `${rankColor}22`, border: `2px solid ${rankColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "bold", color: rankColor,
        }}>
          {rank}
        </div>
        <div>
          <div style={{ fontWeight: "bold" }}>{p.first_name} {p.last_name}</div>
          <div style={{ fontSize: "12px", color: "#aaa" }}>{p.position} · {p.team_name}</div>
        </div>
        {p.rating && (
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: ratingColor(p.rating) }}>
              {parseFloat(p.rating).toFixed(1)}
            </div>
            <div style={{ fontSize: "10px", color: "#555" }}>Rating</div>
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "Goals",   value: p.goals   || 0, icon: "⚽" },
          { label: "Assists", value: p.assists  || 0, icon: "🎯" },
          { label: "Yellow",  value: p.yellow_cards || 0, icon: "🟨" },
          { label: "Mins",    value: p.minutes_played || 0, icon: "⏱️" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#0f0f1a", borderRadius: "8px",
            padding: "8px 4px", textAlign: "center",
          }}>
            <div style={{ fontSize: "14px" }}>{s.icon}</div>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{s.value}</div>
            <div style={{ fontSize: "10px", color: "#555" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ratingColor(r) {
  if (r >= 8) return "#22c55e";
  if (r >= 6) return "#f59e0b";
  return "#ef4444";
}