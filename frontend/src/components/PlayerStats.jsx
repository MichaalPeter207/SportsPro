// =============================================================
//  components/PlayerStats.jsx
//  Top scorers and player performance cards
// =============================================================

const MOCK_PLAYERS = [
  { id:1, name:"Emeka Okafor",   team:"Engineering FC",  position:"Forward",    goals:18, assists:6,  apps:18, rating:8.4, color:"#7c3aed" },
  { id:2, name:"Kola Fashola",   team:"Science United",  position:"Forward",    goals:14, assists:8,  apps:17, rating:8.1, color:"#3b82f6" },
  { id:3, name:"Chidi Nwosu",    team:"Engineering FC",  position:"Midfielder", goals:9,  assists:12, apps:18, rating:7.9, color:"#7c3aed" },
  { id:4, name:"Femi Abiodun",   team:"Law Athletic",    position:"Midfielder", goals:8,  assists:10, apps:16, rating:7.7, color:"#06b6d4" },
  { id:5, name:"Uche Eze",       team:"Science United",  position:"Midfielder", goals:7,  assists:9,  apps:18, rating:7.6, color:"#3b82f6" },
  { id:6, name:"Tunde Adeyemi",  team:"Engineering FC",  position:"Defender",   goals:3,  assists:4,  apps:18, rating:7.8, color:"#7c3aed" },
  { id:7, name:"Bayo Olawale",   team:"Science United",  position:"Goalkeeper", goals:0,  assists:1,  apps:17, rating:7.5, color:"#3b82f6" },
  { id:8, name:"Segun Bello",    team:"Medicine City",   position:"Forward",    goals:11, assists:3,  apps:15, rating:7.3, color:"#10b981" },
];

const POSITION_COLORS = {
  Forward:    "var(--accent-red)",
  Midfielder: "var(--accent-blue)",
  Defender:   "var(--accent-green)",
  Goalkeeper: "var(--accent-yellow)",
};

function PlayerCard({ player }) {
  const initials = player.name.split(" ").map(n => n[0]).join("");

  return (
    <div className="player-card">
      <div className="player-avatar" style={{ background: player.color }}>
        {initials}
      </div>
      <div className="player-name">{player.name}</div>
      <div className="player-position" style={{ color: POSITION_COLORS[player.position] || "var(--accent-cyan)" }}>
        {player.position}
      </div>
      <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:"0.75rem" }}>
        {player.team}
      </div>

      <div className="player-stats-row">
        <div className="player-stat">
          <div className="player-stat-num" style={{ color:"var(--accent-red)" }}>{player.goals}</div>
          <div className="player-stat-label">Goals</div>
        </div>
        <div className="player-stat">
          <div className="player-stat-num" style={{ color:"var(--accent-cyan)" }}>{player.assists}</div>
          <div className="player-stat-label">Assists</div>
        </div>
        <div className="player-stat">
          <div className="player-stat-num">{player.rating}</div>
          <div className="player-stat-label">Rating</div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerStats({ players = MOCK_PLAYERS }) {
  return (
    <div className="players-grid">
      {players.map(p => <PlayerCard key={p.id} player={p} />)}
    </div>
  );
}