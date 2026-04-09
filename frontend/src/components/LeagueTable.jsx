// =============================================================
//  components/LeagueTable.jsx
//  Premium league standings table
// =============================================================

const TEAM_COLORS = [
  "#7c3aed","#3b82f6","#06b6d4","#10b981",
  "#f59e0b","#ef4444","#8b5cf6","#ec4899",
];

const MOCK_STANDINGS = [
  { pos:1, name:"Engineering FC",  p:18, w:13, d:3, l:2, gf:42, ga:18, pts:42, form:["w","w","d","w","w"] },
  { pos:2, name:"Science United",  p:18, w:11, d:4, l:3, gf:35, ga:22, pts:37, form:["w","l","w","w","d"] },
  { pos:3, name:"Law Athletic",    p:18, w:10, d:5, l:3, gf:30, ga:20, pts:35, form:["d","w","w","d","w"] },
  { pos:4, name:"Medicine City",   p:18, w:9,  d:4, l:5, gf:28, ga:25, pts:31, form:["l","w","w","l","w"] },
  { pos:5, name:"Commerce Rovers", p:18, w:7,  d:6, l:5, gf:24, ga:23, pts:27, form:["d","d","w","l","d"] },
  { pos:6, name:"Arts Wanderers",  p:18, w:6,  d:5, l:7, gf:22, ga:28, pts:23, form:["l","d","l","w","d"] },
  { pos:7, name:"Education FC",    p:18, w:4,  d:4, l:10,gf:18, ga:35, pts:16, form:["l","l","d","l","w"] },
  { pos:8, name:"Pharmacy United", p:18, w:2,  d:3, l:13,gf:12, ga:42, pts:9,  form:["l","l","l","d","l"] },
];

function FormDot({ result }) {
  return <span className={`form-dot ${result}`}></span>;
}

function getZoneClass(pos) {
  if (pos <= 2) return "zone-champions";
  if (pos === 3) return "zone-europa";
  if (pos >= 7) return "zone-relegation";
  return "";
}

export default function LeagueTable({ standings = MOCK_STANDINGS }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">League Standings</span>
        <div style={{ display:"flex", gap:"1rem", fontSize:"0.7rem", color:"var(--text-muted)" }}>
          <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
            <span style={{ width:8,height:8,borderRadius:2,background:"var(--accent-blue)",display:"inline-block"}}></span>
            Champions
          </span>
          <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
            <span style={{ width:8,height:8,borderRadius:2,background:"var(--accent-green)",display:"inline-block"}}></span>
            Europa
          </span>
          <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
            <span style={{ width:8,height:8,borderRadius:2,background:"var(--accent-red)",display:"inline-block"}}></span>
            Relegation
          </span>
        </div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Form</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => (
              <tr key={team.pos} className={getZoneClass(team.pos)}>
                <td>{team.pos}</td>
                <td>
                  <div className="team-cell">
                    <div
                      className="team-badge"
                      style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }}
                    >
                      {team.name.slice(0,2).toUpperCase()}
                    </div>
                    <span className="team-name">{team.name}</span>
                  </div>
                </td>
                <td>{team.p}</td>
                <td style={{ color:"var(--accent-green)" }}>{team.w}</td>
                <td style={{ color:"var(--accent-yellow)" }}>{team.d}</td>
                <td style={{ color:"var(--accent-red)" }}>{team.l}</td>
                <td>{team.gf}</td>
                <td>{team.ga}</td>
                <td style={{ color: team.gf-team.ga >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                  {team.gf-team.ga > 0 ? "+" : ""}{team.gf-team.ga}
                </td>
                <td>
                  <div className="form-dots">
                    {team.form.map((f, j) => <FormDot key={j} result={f} />)}
                  </div>
                </td>
                <td className="points-cell">{team.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}