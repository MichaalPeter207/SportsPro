// =============================================================
//  components/MatchSchedule.jsx
//  Premium match cards with predictions
// =============================================================

const TEAM_COLORS = [
  "#7c3aed","#3b82f6","#06b6d4","#10b981",
  "#f59e0b","#ef4444","#8b5cf6","#ec4899",
];

const MOCK_MATCHES = [
  {
    id:1, round:"Round 12",
    date:"Sat 08 Mar 2026 · 15:00",
    home:{ name:"Engineering FC",  initials:"EF", color:"#7c3aed" },
    away:{ name:"Science United",  initials:"SU", color:"#3b82f6" },
    score:null, status:"upcoming",
    prediction:{ home:0.62, draw:0.22, away:0.16 },
  },
  {
    id:2, round:"Round 12",
    date:"Sat 08 Mar 2026 · 17:30",
    home:{ name:"Law Athletic",    initials:"LA", color:"#06b6d4" },
    away:{ name:"Medicine City",   initials:"MC", color:"#10b981" },
    score:null, status:"upcoming",
    prediction:{ home:0.44, draw:0.30, away:0.26 },
  },
  {
    id:3, round:"Round 11",
    date:"Sat 01 Mar 2026 · 15:00",
    home:{ name:"Commerce Rovers", initials:"CR", color:"#f59e0b" },
    away:{ name:"Engineering FC",  initials:"EF", color:"#7c3aed" },
    score:{ home:1, away:3 }, status:"ft",
    prediction:{ home:0.28, draw:0.25, away:0.47 },
  },
  {
    id:4, round:"Round 11",
    date:"Sat 01 Mar 2026 · 17:30",
    home:{ name:"Science United",  initials:"SU", color:"#3b82f6" },
    away:{ name:"Arts Wanderers",  initials:"AW", color:"#ef4444" },
    score:{ home:2, away:0 }, status:"ft",
    prediction:{ home:0.55, draw:0.25, away:0.20 },
  },
  {
    id:5, round:"Round 12",
    date:"Sun 09 Mar 2026 · 14:00",
    home:{ name:"Arts Wanderers",  initials:"AW", color:"#ef4444" },
    away:{ name:"Pharmacy United", initials:"PU", color:"#8b5cf6" },
    score:null, status:"upcoming",
    prediction:{ home:0.58, draw:0.24, away:0.18 },
  },
  {
    id:6, round:"Round 12",
    date:"Sun 09 Mar 2026 · 16:00",
    home:{ name:"Education FC",    initials:"ED", color:"#ec4899" },
    away:{ name:"Commerce Rovers", initials:"CR", color:"#f59e0b" },
    score:null, status:"upcoming",
    prediction:{ home:0.32, draw:0.28, away:0.40 },
  },
];

function MatchCard({ match }) {
  const homeW = Math.round(match.prediction.home * 100);
  const drawW = Math.round(match.prediction.draw * 100);
  const awayW = 100 - homeW - drawW;

  return (
    <div className="match-card">
      <div className="match-meta">
        <span className="match-round">{match.round}</span>
        <span className="match-date">{match.date}</span>
      </div>

      <div className="match-teams">
        {/* Home team */}
        <div className="match-team">
          <div className="match-team-badge" style={{ background: match.home.color }}>
            {match.home.initials}
          </div>
          <div className="match-team-name">{match.home.name}</div>
        </div>

        {/* Score */}
        <div className="match-score">
          {match.score ? (
            <>
              <div className="score-display">
                {match.score.home} — {match.score.away}
              </div>
              <div className="score-divider">Full Time</div>
            </>
          ) : (
            <>
              <div className="score-display" style={{ color:"var(--text-muted)" }}>VS</div>
              <div className="score-divider">Upcoming</div>
            </>
          )}
          <div style={{ display:"flex", justifyContent:"center", marginTop:"0.4rem" }}>
            <span className={`match-status status-${match.status}`}>
              {match.status === "ft" ? "FT" : match.status === "live" ? "LIVE" : "Soon"}
            </span>
          </div>
        </div>

        {/* Away team */}
        <div className="match-team">
          <div className="match-team-badge" style={{ background: match.away.color }}>
            {match.away.initials}
          </div>
          <div className="match-team-name">{match.away.name}</div>
        </div>
      </div>

      {/* Prediction bar */}
      <div className="prediction-bar">
        <div className="prediction-label">AI Prediction</div>
        <div className="prediction-track">
          <div className="pred-home" style={{ flex: match.prediction.home }}></div>
          <div className="pred-draw" style={{ flex: match.prediction.draw }}></div>
          <div className="pred-away" style={{ flex: match.prediction.away }}></div>
        </div>
        <div className="prediction-probs">
          <span style={{ color:"var(--accent-blue)" }}>{homeW}% H</span>
          <span>{drawW}% D</span>
          <span style={{ color:"var(--accent-purple)" }}>{awayW}% A</span>
        </div>
      </div>
    </div>
  );
}

export default function MatchSchedule({ matches = MOCK_MATCHES }) {
  return (
    <div>
      <div className="matches-grid">
        {matches.map(m => <MatchCard key={m.id} match={m} />)}
      </div>
    </div>
  );
}