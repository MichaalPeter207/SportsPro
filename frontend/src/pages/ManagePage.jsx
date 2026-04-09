// =============================================================
//  pages/ManagePage.jsx
//  Changes from original:
//  1. Edit match list hides completed matches (can't edit them)
//  2. Uses /my-matches endpoint for scoped match loading
//  3. Result/stats dropdowns scoped to coach's accessible matches
// =============================================================
import { useState, useEffect, useCallback } from "react";

const BASE = "http://localhost:5000/api";
const POSITIONS = [
  "Goalkeeper","Defender","Centre-Back","Left-Back","Right-Back",
  "Midfielder","Defensive Mid","Central Mid","Attacking Mid",
  "Left Winger","Right Winger","Striker","Centre-Forward","Forward",
];

const norm = s => (s || "").toLowerCase().replace(/\s+/g," ").trim();
const findTeam = (teams, name) => teams.find(t => norm(t.team_name) === norm(name));
const EDIT_TTL = 60 * 60 * 1000;

export default function ManagePage({ user }) {
  const [tab,        setTab]        = useState("match");
  const [msg,        setMsg]        = useState("");
  const [error,      setError]      = useState("");
  const [matches,    setMatches]    = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [myMatches,  setMyMatches]  = useState([]);
  const [teams,      setTeams]      = useState([]);
  const [myTeams,    setMyTeams]    = useState([]);
  const [players,    setPlayers]    = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [editMatch,  setEditMatch]  = useState(null);
  const [editMatchAt,setEditMatchAt]= useState(null);
  const [editTeam,   setEditTeam]   = useState(null);
  const [editTeamAt, setEditTeamAt] = useState(null);
  const [editPlayer, setEditPlayer] = useState(null);
  const [editPlayerAt,setEditPlayerAt]=useState(null);

  const [statsTab,       setStatsTab]       = useState({ match_id:"", goals:0, assists:0, yellow_cards:0, red_cards:0, minutes_played:90, rating:"" });
  const [allPlayers,     setAllPlayers]     = useState([]);
  const [myPlayers,      setMyPlayers]      = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerSearch,   setPlayerSearch]   = useState("");
  const [showDropdown,   setShowDropdown]   = useState(false);

  const token   = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const roles   = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = roles.includes("admin") || user?.role === "admin";
  const isCoach = roles.includes("coach") || user?.role === "coach" || isAdmin;

  const flash = (ok, text) => {
    ok ? setMsg(text) : setError(text);
    setTimeout(() => { setMsg(""); setError(""); }, 5000);
  };

  const apiFetch = async (url, options = {}) => {
    const t = localStorage.getItem("token");
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, ...(options.headers || {}) }
    });
    let data = {};
    try { data = await res.json(); } catch { data = { error: "Invalid server response" }; }
    if (res.status === 401 || res.status === 422) {
      localStorage.removeItem("token");
      flash(false, "⚠️ Your session has expired. Please log out and log back in.");
      return { ok: false, data, error: "Session expired" };
    }
    if (!res.ok) return { ok: false, data, error: data.error || data.message || data.msg || `Error ${res.status}` };
    return { ok: true, data };
  };

  const reload = useCallback(async () => {
    const freshToken = localStorage.getItem("token");
    const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` };
    const [myM, teamsRes, tourRes] = await Promise.all([
      fetch(`${BASE}/matches/my-matches`, { headers: authHeaders }).then(r=>r.json()).catch(()=>({matches:[]})),
      fetch(`${BASE}/teams/`, { headers: authHeaders }).then(r=>r.json()).catch(()=>({teams:[]})),
      fetch(`${BASE}/tournaments/mine`, { headers: authHeaders }).then(r=>r.json()).catch(()=>({tournaments:[]})),
    ]);

    const allM = myM.matches || [];
    const allT = teamsRes.teams || [];

    // Scheduled = result upload dropdown; all = edit list
    setMatches(allM.filter(m => m.status === 'scheduled'));
    setAllMatches(allM);
    setTeams(allT);
    setTournaments(tourRes.tournaments || []);

    if (isAdmin) {
      setMyMatches(allM);
      setMyTeams(allT);
    } else if (user?.user_id) {
      const myTourIds = new Set((tourRes.tournaments || []).map(t => t.tournament_id));
      setMyMatches(allM.filter(m =>
        m.entered_by === user.user_id ||
        (m.tournament_id && myTourIds.has(m.tournament_id))
      ));
      setMyTeams(allT.filter(t => t.coach_id === user.user_id));
    }
  }, [user, isAdmin]);

  const loadPlayers = (teamId) => {
    if (!teamId) return;
    fetch(`${BASE}/teams/${teamId}/players`, { headers })
      .then(r=>r.json())
      .then(d=>setPlayers(d.players||[]));
  };

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (tab === "stats") loadAllPlayers(); }, [tab]);

  // Auto-clear stale edits after 1 hour
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      if (editMatchAt  && now - editMatchAt  > EDIT_TTL) { setEditMatch(null);  setEditMatchAt(null); }
      if (editTeamAt   && now - editTeamAt   > EDIT_TTL) { setEditTeam(null);   setEditTeamAt(null); }
      if (editPlayerAt && now - editPlayerAt > EDIT_TTL) { setEditPlayer(null); setEditPlayerAt(null); }
    }, 60000);
    return () => clearInterval(iv);
  }, [editMatchAt, editTeamAt, editPlayerAt]);

  // ── CREATE MATCH ──────────────────────────────────────────
  const [mf, setMf] = useState({ home_team_name:"", away_team_name:"", season_name:"", match_date:"", venue:"", tournament_title:"", round_number:1, tournament_id:"" });

  const createMatch = async () => {
    const hn = norm(mf.home_team_name), an = norm(mf.away_team_name);
    if (!hn || !an || !mf.match_date) return flash(false,"Home team, away team and date are required");
    if (hn === an) return flash(false,"Home and away teams must be different");
    const home = findTeam(teams, mf.home_team_name);
    const away = findTeam(teams, mf.away_team_name);
    if (!home) return flash(false,`Team "${mf.home_team_name}" not found. Available: ${teams.map(t=>t.team_name).join(", ")}`);
    if (!away) return flash(false,`Team "${mf.away_team_name}" not found. Available: ${teams.map(t=>t.team_name).join(", ")}`);
    const { ok, error } = await apiFetch(`${BASE}/matches/create`,{ method:"POST", body: JSON.stringify({
      home_team_id: home.team_id, away_team_id: away.team_id,
      season_name: mf.season_name || `Season ${new Date().getFullYear()}`,
      match_date: mf.match_date, venue: mf.venue.trim(),
      tournament_title: mf.tournament_title.trim(), round_number: mf.round_number,
      ...(mf.tournament_id ? { tournament_id: +mf.tournament_id } : {}),
    })});
    if (ok) {
      flash(true,"✅ Match created! AI prediction generated.");
      setMf({ home_team_name:"", away_team_name:"", season_name:"", match_date:"", venue:"", tournament_title:"", round_number:1, tournament_id:"" });
      reload();
    } else flash(false,`❌ ${error||"Failed to create match"}`);
  };

  // ── EDIT MATCH ────────────────────────────────────────────
  const saveEditMatch = async () => {
    if (!editMatch) return;
    const home = findTeam(teams, editMatch.home_team || "");
    const away = findTeam(teams, editMatch.away_team || "");
    const body = {
      venue:            (editMatch.venue||"").trim(),
      tournament_title: (editMatch.tournament_title||"").trim(),
      round_number:     editMatch.round_number,
      match_date:       editMatch.match_date,
      status:           editMatch.status,
      ...(home ? { home_team_id: home.team_id } : {}),
      ...(away ? { away_team_id: away.team_id } : {}),
    };
    const { ok, error } = await apiFetch(`${BASE}/matches/${editMatch.match_id}/edit`,{ method:"PUT", body:JSON.stringify(body) });
    if (ok) {
      flash(true,"✅ Match updated!");
      setEditMatch(null); setEditMatchAt(null);
      reload();
    } else flash(false,`❌ ${error||"Update failed"}`);
  };

  // ── UPLOAD RESULT ─────────────────────────────────────────
  const [rf, setRf] = useState({ match_id:"", home_score:"", away_score:"" });

  const myTourIds = new Set(tournaments.map(t => t.tournament_id));
  const resultMatches = isAdmin
    ? matches
    : matches.filter(m =>
        m.entered_by === user?.user_id ||
        (m.tournament_id && myTourIds.has(m.tournament_id))
      );
  const selMatch = resultMatches.find(m => String(m.match_id) === String(rf.match_id));

  const uploadResult = async () => {
    if (!rf.match_id || rf.home_score==="" || rf.away_score==="")
      return flash(false,"Select a match and enter both scores");
    const { ok, error } = await apiFetch(`${BASE}/matches/${rf.match_id}/result`,{
      method:"PUT", body:JSON.stringify({ home_score:+rf.home_score, away_score:+rf.away_score })
    });
    if (ok) {
      flash(true,"✅ Result uploaded! Predictions refreshed for remaining fixtures.");
      setRf({ match_id:"", home_score:"", away_score:"" });
      reload();
    } else flash(false,`❌ ${error||"Failed"}`);
  };

  // ── CREATE TEAM ───────────────────────────────────────────
  const [tf, setTf] = useState({ team_name:"", department:"", home_city:"", stadium:"" });

  const createTeam = async () => {
    if (!tf.team_name.trim()) return flash(false,"Team name is required");
    const lr = await fetch(`${BASE}/leagues/`).then(r=>r.json()).catch(()=>({leagues:[]}));
    const leagueId = lr.leagues?.[0]?.league_id;
    if (!leagueId) return flash(false,"No league found. Contact admin.");
    const { ok, data, error } = await apiFetch(`${BASE}/teams/`,{ method:"POST", body:JSON.stringify({ ...tf, team_name: tf.team_name.trim(), league_id:leagueId }) });
    if (ok) {
      flash(true,`✅ Team "${data.team?.team_name || tf.team_name}" registered!`);
      setTf({ team_name:"", department:"", home_city:"", stadium:"" });
      reload();
    } else flash(false,`❌ ${error||"Failed"}`);
  };

  const saveEditTeam = async () => {
    if (!editTeam) return;
    const { ok, error } = await apiFetch(`${BASE}/teams/${editTeam.team_id}`,{ method:"PUT", body:JSON.stringify(editTeam) });
    if (ok) { flash(true,"✅ Team updated!"); setEditTeam(null); setEditTeamAt(null); reload(); }
    else flash(false,`❌ ${error||"Update failed"}`);
  };

  // ── REGISTER PLAYER ───────────────────────────────────────
  const [pf, setPf] = useState({ team_name:"", first_name:"", last_name:"", position:"", jersey_num:"", nationality:"", date_of_birth:"", height_cm:"", weight_kg:"" });

  const registerPlayer = async () => {
    if (!pf.team_name.trim() || !pf.first_name.trim() || !pf.last_name.trim())
      return flash(false,"Team name, first name and last name are required");
    const team = findTeam(teams, pf.team_name);
    if (!team) return flash(false,`Team "${pf.team_name}" not found. Available: ${teams.map(t=>t.team_name).join(", ")}`);
    const { team_name, ...body } = pf;
    const { ok, data, error } = await apiFetch(`${BASE}/teams/${team.team_id}/players`,{ method:"POST", body:JSON.stringify({ ...body, first_name: pf.first_name.trim(), last_name: pf.last_name.trim() }) });
    if (ok) {
      flash(true,`✅ Player ${data.player?.first_name||pf.first_name} ${data.player?.last_name||pf.last_name} registered!`);
      setPf({ team_name:"", first_name:"", last_name:"", position:"", jersey_num:"", nationality:"", date_of_birth:"", height_cm:"", weight_kg:"" });
      loadPlayers(team.team_id);
    } else flash(false,`❌ ${error||"Failed"}`);
  };

  const saveEditPlayer = async () => {
    if (!editPlayer) return;
    let teamId = editPlayer.team_id;
    if (editPlayer.team_name_edit && editPlayer.team_name_edit.trim()) {
      const t = findTeam(teams, editPlayer.team_name_edit);
      if (!t) return flash(false,`Team "${editPlayer.team_name_edit}" not found`);
      teamId = t.team_id;
    }
    const { team_name_edit, ...body } = editPlayer;
    const { ok, error } = await apiFetch(`${BASE}/teams/${teamId}/players/${editPlayer.player_id}`,{ method:"PUT", body:JSON.stringify({ ...body, team_id:teamId }) });
    if (ok) { flash(true,"✅ Player updated!"); setEditPlayer(null); setEditPlayerAt(null); loadPlayers(teamId); }
    else flash(false,`❌ ${error||"Update failed"}`);
  };

  // ── PLAYER STATS ──────────────────────────────────────────
  const loadAllPlayers = async () => {
    const freshToken = localStorage.getItem("token");
    const tr = await fetch(`${BASE}/teams/`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` } })
      .then(r=>r.json())
      .catch(()=>({teams:[]}));
    const list = [], myList = [];
    for (const team of (tr.teams||[])) {
      const pr = await fetch(`${BASE}/teams/${team.team_id}/players`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` } })
        .then(r=>r.json())
        .catch(()=>({players:[]}));
      (pr.players||[]).forEach(p => {
        const entry = { player_id:p.player_id, first_name:p.first_name, last_name:p.last_name, position:p.position||"", jersey_num:p.jersey_num||"", team_name:team.team_name, team_id:team.team_id, display:`${p.first_name} ${p.last_name}` };
        list.push(entry);
        if (isAdmin || team.coach_id === user?.user_id) myList.push(entry);
      });
    }
    setAllPlayers(list);
    setMyPlayers(myList);
  };

  const statsMatches = isAdmin ? allMatches : myMatches;

  const submitStats = async () => {
    if (!statsTab.match_id) return flash(false,"Please select a match");
    if (!selectedPlayer)    return flash(false,"Please select a player");
    const body = { match_id:+statsTab.match_id, player_id:selectedPlayer.player_id, team_id:selectedPlayer.team_id, goals:+statsTab.goals, assists:+statsTab.assists, yellow_cards:+statsTab.yellow_cards, red_cards:+statsTab.red_cards, minutes_played:+statsTab.minutes_played, rating:statsTab.rating ? +statsTab.rating : null };
    const { ok, error } = await apiFetch(`${BASE}/performance/`,{ method:"POST", body:JSON.stringify(body) });
    if (ok) {
      flash(true,`✅ Stats saved for ${selectedPlayer.display}!`);
      setSelectedPlayer(null); setPlayerSearch(""); setShowDropdown(false);
      setStatsTab({ match_id:statsTab.match_id, goals:0, assists:0, yellow_cards:0, red_cards:0, minutes_played:90, rating:"" });
    } else flash(false,`❌ ${error||"Failed"}`);
  };

  const TABS = [
    { id:"match",  icon:"📅", label:"Matches"  },
    { id:"result", icon:"⚽", label:"Results"  },
    { id:"team",   icon:"🏟️", label:"Teams"    },
    { id:"player", icon:"👤", label:"Players"  },
    { id:"stats",  icon:"📊", label:"Stats"    },
  ];

  return (
    <div style={{ padding:"2rem 1.5rem", maxWidth:"900px", margin:"0 auto" }}>

      <div style={{ marginBottom:"24px" }}>
        <h1 className="page-title">⚙️ Management Panel</h1>
        <p className="page-subtitle">{isAdmin ? "Admin" : "Coach"} · Create and manage your league data</p>
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs" style={{ marginBottom:"24px", width:"100%" }}>
        {TABS.map(t=>(
          <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)} style={{ flex:1 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ MATCHES TAB ══ */}
      {tab==="match" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
          <div className="card">
            <div className="card-header"><div className="card-title">📅 Create New Match</div></div>

            {tournaments.filter(t=>t.status==="active").length > 0 && (
              <Field label="Link to Tournament (optional)">
                <select value={mf.tournament_id} onChange={e=>setMf({...mf,tournament_id:e.target.value})} className="form-select" style={{ marginBottom:"12px" }}>
                  <option value="">— Standalone match (no tournament) —</option>
                  {tournaments.filter(t=>t.status==="active").map(t=>(
                    <option key={t.tournament_id} value={t.tournament_id}>{t.title} ({t.season_name})</option>
                  ))}
                </select>
              </Field>
            )}

            <Row>
              <Field label="Home Team *">
                <TeamInput value={mf.home_team_name} onChange={v=>setMf({...mf,home_team_name:v})} teams={teams} placeholder="Type team name"/>
              </Field>
              <Field label="Away Team *">
                <TeamInput value={mf.away_team_name} onChange={v=>setMf({...mf,away_team_name:v})} teams={teams} placeholder="Type team name"/>
              </Field>
            </Row>
            <Row>
              <Field label="Match Date & Time *">
                <input type="datetime-local" value={mf.match_date} onChange={e=>setMf({...mf,match_date:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/>
              </Field>
              <Field label="Round Number">
                <input type="number" min="1" value={mf.round_number} onChange={e=>setMf({...mf,round_number:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/>
              </Field>
            </Row>
            <Row>
              <Field label="Venue">
                <FInput placeholder="e.g. University Sports Complex" value={mf.venue} onChange={v=>setMf({...mf,venue:v})}/>
              </Field>
              <Field label="Tournament Title (optional label)">
                <FInput placeholder="e.g. First Semester Cup" value={mf.tournament_title} onChange={v=>setMf({...mf,tournament_title:v})}/>
              </Field>
            </Row>
            <button className="btn-submit" onClick={createMatch}>Create Match + Auto-Predict</button>
          </div>

          {/* Edit list — completed matches excluded */}
          {allMatches.filter(m => m.status !== 'completed').length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">✏️ Edit Match</div>
                <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>
                  {isAdmin ? "Admin: all non-completed matches" : "Your matches only"} · Completed matches cannot be edited
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {(isAdmin ? allMatches : myMatches)
                  .filter(m => m.status !== 'completed')
                  .map(m=>(
                  <div key={m.match_id}>
                    {editMatch?.match_id===m.match_id ? (
                      <div style={{ background:"var(--bg-elevated)", borderRadius:"10px", padding:"16px" }}>
                        <Row>
                          <Field label="Home Team">
                            <TeamInput value={editMatch.home_team||""} onChange={v=>setEditMatch({...editMatch,home_team:v})} teams={teams}/>
                          </Field>
                          <Field label="Away Team">
                            <TeamInput value={editMatch.away_team||""} onChange={v=>setEditMatch({...editMatch,away_team:v})} teams={teams}/>
                          </Field>
                        </Row>
                        <Row>
                          <Field label="Venue"><FInput value={editMatch.venue||""} onChange={v=>setEditMatch({...editMatch,venue:v})}/></Field>
                          <Field label="Round #"><input type="number" min="1" value={editMatch.round_number||1} onChange={e=>setEditMatch({...editMatch,round_number:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
                        </Row>
                        <Row>
                          <Field label="Match Date & Time">
                            <input type="datetime-local" value={(editMatch.match_date||"").slice(0,16)} onChange={e=>setEditMatch({...editMatch,match_date:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/>
                          </Field>
                          <Field label="Status">
                            <select value={editMatch.status||"scheduled"} onChange={e=>setEditMatch({...editMatch,status:e.target.value})} className="form-select" style={{ marginBottom:"12px" }}>
                              <option value="scheduled">Scheduled</option>
                              <option value="postponed">Postponed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </Field>
                        </Row>
                        <div style={{ display:"flex", gap:"8px" }}>
                          <button className="btn-submit" style={{ flex:1, marginTop:0 }} onClick={saveEditMatch}>Save Changes</button>
                          <CancelBtn onClick={()=>{setEditMatch(null);setEditMatchAt(null);}}/>
                        </div>
                      </div>
                    ) : (
                      <RowItem
                        main={`${m.home_team} vs ${m.away_team}`}
                        sub={[m.match_date?.slice(0,10), m.venue].filter(Boolean).join(" · ")}
                        badge={m.status}
                        badgeClass={m.status==="scheduled"?"badge-blue":"badge-yellow"}
                        onEdit={()=>{setEditMatch({...m});setEditMatchAt(Date.now());}}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ RESULTS TAB ══ */}
      {tab==="result" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚽ Upload Match Result</div>
            {!isAdmin && <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>Showing your matches only</div>}
          </div>
          <div className="form-label">Select Scheduled Match *</div>
          <select value={rf.match_id} onChange={e=>setRf({...rf,match_id:e.target.value})} className="form-select" style={{ marginBottom:"12px" }}>
            <option value="">Choose a match...</option>
            {resultMatches.map(m=>(
              <option key={m.match_id} value={m.match_id}>
                {m.home_team} vs {m.away_team} — {m.match_date?.slice(0,10)}
              </option>
            ))}
          </select>
          {selMatch && (
            <div style={{ background:"var(--bg-elevated)", borderRadius:"10px", padding:"14px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontWeight:"bold" }}>{selMatch.home_team}</div>
                <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>HOME</div>
              </div>
              <div style={{ fontSize:"20px", color:"var(--text-muted)", fontWeight:"bold" }}>VS</div>
              <div style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontWeight:"bold" }}>{selMatch.away_team}</div>
                <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>AWAY</div>
              </div>
            </div>
          )}
          <Row>
            <Field label="Home Score">
              <input type="number" min="0" value={rf.home_score} onChange={e=>setRf({...rf,home_score:e.target.value})} className="form-input" style={{ fontSize:"28px", fontWeight:"900", textAlign:"center", marginBottom:"12px" }}/>
            </Field>
            <Field label="Away Score">
              <input type="number" min="0" value={rf.away_score} onChange={e=>setRf({...rf,away_score:e.target.value})} className="form-input" style={{ fontSize:"28px", fontWeight:"900", textAlign:"center", marginBottom:"12px" }}/>
            </Field>
          </Row>
          <button className="btn-submit" onClick={uploadResult}>Upload Result & Update Standings</button>
        </div>
      )}

      {/* ══ TEAMS TAB ══ */}
      {tab==="team" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
          <div className="card">
            <div className="card-header"><div className="card-title">🏟️ Register New Team</div></div>
            <Row>
              <Field label="Team Name *"><FInput placeholder="e.g. Engineering FC" value={tf.team_name} onChange={v=>setTf({...tf,team_name:v})}/></Field>
              <Field label="Department / Faculty"><FInput placeholder="e.g. Faculty of Engineering" value={tf.department} onChange={v=>setTf({...tf,department:v})}/></Field>
            </Row>
            <Row>
              <Field label="Home City"><FInput placeholder="City" value={tf.home_city} onChange={v=>setTf({...tf,home_city:v})}/></Field>
              <Field label="Stadium / Ground"><FInput placeholder="Stadium name" value={tf.stadium} onChange={v=>setTf({...tf,stadium:v})}/></Field>
            </Row>
            <button className="btn-submit" onClick={createTeam}>Register Team</button>
          </div>

          {myTeams.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">✏️ Edit Your Teams</div>
                <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>Edit rows auto-hide after 1 hour</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {myTeams.map(t=>(
                  <div key={t.team_id}>
                    {editTeam?.team_id===t.team_id ? (
                      <div style={{ background:"var(--bg-elevated)", borderRadius:"10px", padding:"16px" }}>
                        <Row>
                          <Field label="Team Name"><FInput value={editTeam.team_name} onChange={v=>setEditTeam({...editTeam,team_name:v})}/></Field>
                          <Field label="Department"><FInput value={editTeam.department||""} onChange={v=>setEditTeam({...editTeam,department:v})}/></Field>
                        </Row>
                        <Row>
                          <Field label="Home City"><FInput value={editTeam.home_city||""} onChange={v=>setEditTeam({...editTeam,home_city:v})}/></Field>
                          <Field label="Stadium"><FInput value={editTeam.stadium||""} onChange={v=>setEditTeam({...editTeam,stadium:v})}/></Field>
                        </Row>
                        <div style={{ display:"flex", gap:"8px" }}>
                          <button className="btn-submit" style={{ flex:1, marginTop:0 }} onClick={saveEditTeam}>Save Changes</button>
                          <CancelBtn onClick={()=>{setEditTeam(null);setEditTeamAt(null);}}/>
                        </div>
                      </div>
                    ) : (
                      <RowItem
                        main={t.team_name}
                        sub={[t.department, t.home_city, t.stadium].filter(Boolean).join(" · ")}
                        onEdit={()=>{setEditTeam({...t});setEditTeamAt(Date.now());}}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PLAYERS TAB ══ */}
      {tab==="player" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
          <div className="card">
            <div className="card-header"><div className="card-title">👤 Register Player</div></div>
            <Field label="Team Name *">
              <TeamInput value={pf.team_name} onChange={v=>{ setPf({...pf,team_name:v}); const t=findTeam(teams,v); if(t) loadPlayers(t.team_id); }} teams={teams} placeholder="Type team name"/>
            </Field>
            <Row>
              <Field label="First Name *"><FInput placeholder="First name" value={pf.first_name} onChange={v=>setPf({...pf,first_name:v})}/></Field>
              <Field label="Last Name *"><FInput placeholder="Last name" value={pf.last_name} onChange={v=>setPf({...pf,last_name:v})}/></Field>
            </Row>
            <Field label="Position">
              <select value={pf.position} onChange={e=>setPf({...pf,position:e.target.value})} className="form-select" style={{ marginBottom:"12px" }}>
                <option value="">Select position...</option>
                {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Row>
              <Field label="Jersey Number"><input type="number" min="1" max="99" placeholder="#" value={pf.jersey_num} onChange={e=>setPf({...pf,jersey_num:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
              <Field label="Nationality"><FInput placeholder="Country" value={pf.nationality} onChange={v=>setPf({...pf,nationality:v})}/></Field>
            </Row>
            <Row>
              <Field label="Date of Birth"><input type="date" value={pf.date_of_birth} onChange={e=>setPf({...pf,date_of_birth:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
              <Field label="Height (cm)"><input type="number" placeholder="e.g. 175" value={pf.height_cm} onChange={e=>setPf({...pf,height_cm:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
            </Row>
            <Field label="Weight (kg)">
              <input type="number" placeholder="e.g. 70" value={pf.weight_kg} onChange={e=>setPf({...pf,weight_kg:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/>
            </Field>
            <button className="btn-submit" onClick={registerPlayer}>Register Player</button>
          </div>

          {players.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">✏️ Edit Players</div>
                <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>Edit rows auto-hide after 1 hour</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {players.map(p=>(
                  <div key={p.player_id}>
                    {editPlayer?.player_id===p.player_id ? (
                      <div style={{ background:"var(--bg-elevated)", borderRadius:"10px", padding:"16px" }}>
                        <Row>
                          <Field label="First Name"><FInput value={editPlayer.first_name} onChange={v=>setEditPlayer({...editPlayer,first_name:v})}/></Field>
                          <Field label="Last Name"><FInput value={editPlayer.last_name} onChange={v=>setEditPlayer({...editPlayer,last_name:v})}/></Field>
                        </Row>
                        <Field label="Position">
                          <select value={editPlayer.position||""} onChange={e=>setEditPlayer({...editPlayer,position:e.target.value})} className="form-select" style={{ marginBottom:"12px" }}>
                            <option value="">Select position...</option>
                            {POSITIONS.map(pos=><option key={pos} value={pos}>{pos}</option>)}
                          </select>
                        </Field>
                        <Row>
                          <Field label="Jersey #"><input type="number" min="1" max="99" value={editPlayer.jersey_num||""} onChange={e=>setEditPlayer({...editPlayer,jersey_num:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
                          <Field label="Nationality"><FInput value={editPlayer.nationality||""} onChange={v=>setEditPlayer({...editPlayer,nationality:v})}/></Field>
                        </Row>
                        <Row>
                          <Field label="Date of Birth"><input type="date" value={editPlayer.date_of_birth||""} onChange={e=>setEditPlayer({...editPlayer,date_of_birth:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
                          <Field label="Height (cm)"><input type="number" value={editPlayer.height_cm||""} onChange={e=>setEditPlayer({...editPlayer,height_cm:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
                        </Row>
                        <Field label="Weight (kg)">
                          <input type="number" value={editPlayer.weight_kg||""} onChange={e=>setEditPlayer({...editPlayer,weight_kg:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/>
                        </Field>
                        <div style={{ display:"flex", gap:"8px" }}>
                          <button className="btn-submit" style={{ flex:1, marginTop:0 }} onClick={saveEditPlayer}>Save Changes</button>
                          <CancelBtn onClick={()=>{setEditPlayer(null);setEditPlayerAt(null);}}/>
                        </div>
                      </div>
                    ) : (
                      <RowItem
                        main={`${p.first_name} ${p.last_name}`}
                        sub={[p.position, p.jersey_num?`#${p.jersey_num}`:null, p.nationality].filter(Boolean).join(" · ")}
                        badge={p.position} badgeClass="badge-purple"
                        onEdit={()=>{setEditPlayer({...p});setEditPlayerAt(Date.now());}}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ STATS TAB ══ */}
      {tab==="stats" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Enter Player Stats</div>
            {!isAdmin && <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>Showing your matches & players only</div>}
          </div>
          <p style={{ color:"var(--text-muted)", fontSize:"13px", marginBottom:"16px" }}>
            Select a match, find a player, enter stats. Re-submitting overwrites the previous entry.
          </p>

          <div className="form-label">Select Match *</div>
          <select value={statsTab.match_id} onChange={e=>setStatsTab({...statsTab,match_id:e.target.value})} className="form-select" style={{ marginBottom:"16px" }}>
            <option value="">Choose a match...</option>
            {statsMatches.map(m=>(
              <option key={m.match_id} value={m.match_id}>
                #{m.match_id} — {m.home_team} vs {m.away_team} — {m.match_date?.slice(0,10)} {m.status==="completed"?"(FT)":""}
              </option>
            ))}
          </select>

          <div className="form-label">Search Player * <span style={{ color:"var(--text-muted)", fontWeight:"normal", fontSize:"11px" }}>(name, team, position, jersey #)</span></div>
          <PlayerSearch
            allPlayers={isAdmin ? allPlayers : myPlayers}
            playerSearch={playerSearch} setPlayerSearch={setPlayerSearch}
            selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer}
            showDropdown={showDropdown} setShowDropdown={setShowDropdown}
            loadAllPlayers={loadAllPlayers}
          />

          <Row>
            <Field label="Goals"><input type="number" min="0" value={statsTab.goals} onChange={e=>setStatsTab({...statsTab,goals:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
            <Field label="Assists"><input type="number" min="0" value={statsTab.assists} onChange={e=>setStatsTab({...statsTab,assists:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
          </Row>
          <Row>
            <Field label="Yellow Cards"><input type="number" min="0" max="2" value={statsTab.yellow_cards} onChange={e=>setStatsTab({...statsTab,yellow_cards:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
            <Field label="Red Cards"><input type="number" min="0" max="1" value={statsTab.red_cards} onChange={e=>setStatsTab({...statsTab,red_cards:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
          </Row>
          <Row>
            <Field label="Minutes Played"><input type="number" min="0" max="120" value={statsTab.minutes_played} onChange={e=>setStatsTab({...statsTab,minutes_played:+e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
            <Field label="Rating (0–10)"><input type="number" min="0" max="10" step="0.1" placeholder="e.g. 7.5" value={statsTab.rating} onChange={e=>setStatsTab({...statsTab,rating:e.target.value})} className="form-input" style={{ marginBottom:"12px" }}/></Field>
          </Row>
          <button className="btn-submit" onClick={submitStats}>Save Player Stats</button>
        </div>
      )}
    </div>
  );
}

// ── Team name input with live match indicator ─────────────────
function TeamInput({ value, onChange, teams, placeholder="" }) {
  const matched = findTeam(teams, value);
  return (
    <div>
      <input className="form-input" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} style={{ marginBottom:"4px" }}/>
      {value.trim() && (
        <div style={{ fontSize:"11px", marginBottom:"12px", color: matched ? "var(--accent-green)" : "var(--accent-red)" }}>
          {matched ? `✅ ${matched.team_name}` : `⚠️ Not found. Available: ${teams.map(t=>t.team_name).join(", ")||"none"}`}
        </div>
      )}
      {!value.trim() && <div style={{ marginBottom:"12px" }}/>}
    </div>
  );
}

// ── Player Search ─────────────────────────────────────────────
function PlayerSearch({ allPlayers, playerSearch, setPlayerSearch, selectedPlayer, setSelectedPlayer, showDropdown, setShowDropdown, loadAllPlayers }) {
  const q = norm(playerSearch);
  const filtered = allPlayers.filter(p =>
    !q ||
    norm(p.first_name).includes(q) || norm(p.last_name).includes(q) ||
    norm(p.display).includes(q) || norm(p.team_name).includes(q) ||
    norm(p.position).includes(q) || String(p.jersey_num||"").includes(q)
  );

  return (
    <div style={{ marginBottom:"16px" }}>
      {allPlayers.length === 0 && <div style={{ fontSize:"11px", color:"var(--text-muted)", marginBottom:"6px" }}>⏳ Loading players...</div>}
      <div style={{ position:"relative" }}>
        {showDropdown && !selectedPlayer && (
          <div onClick={()=>setShowDropdown(false)} style={{ position:"fixed", inset:0, zIndex:998 }}/>
        )}
        <input className="form-input" style={{ marginBottom:0, position:"relative", zIndex:999 }}
          placeholder={allPlayers.length > 0 ? `Search ${allPlayers.length} players...` : "Loading..."}
          value={selectedPlayer ? `${selectedPlayer.display} — ${selectedPlayer.team_name}` : playerSearch}
          readOnly={!!selectedPlayer}
          onFocus={()=>{ if(!selectedPlayer){ if(allPlayers.length===0) loadAllPlayers(); setShowDropdown(true); } }}
          onChange={e=>{ setSelectedPlayer(null); setPlayerSearch(e.target.value); setShowDropdown(true); if(allPlayers.length===0) loadAllPlayers(); }}
        />
        {selectedPlayer && (
          <button onClick={()=>{ setSelectedPlayer(null); setPlayerSearch(""); setShowDropdown(false); }}
            style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--accent-red)", cursor:"pointer", fontSize:"18px", zIndex:1000 }}>✕</button>
        )}
        {showDropdown && !selectedPlayer && (
          <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:999, background:"var(--bg-elevated)", border:"1px solid var(--border-light)", borderRadius:"10px", maxHeight:"260px", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
            {filtered.length === 0
              ? <div style={{ padding:"16px", textAlign:"center", color:"var(--text-muted)", fontSize:"13px" }}>{allPlayers.length===0?"Loading...":"No players match"}</div>
              : filtered.map(p=>(
                <div key={p.player_id} onMouseDown={e=>{ e.preventDefault(); setSelectedPlayer(p); setPlayerSearch(""); setShowDropdown(false); }}
                  style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"12px" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg-card-hover)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"13px", color:"#fff", flexShrink:0 }}>
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight:"bold", fontSize:"14px" }}>{p.display}</div>
                    <div style={{ fontSize:"12px", color:"var(--text-muted)" }}>{p.team_name}{p.position&&<span style={{ color:"var(--accent-cyan)", marginLeft:"6px" }}>· {p.position}</span>}{p.jersey_num&&<span style={{ marginLeft:"6px" }}>· #{p.jersey_num}</span>}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        {selectedPlayer && (
          <div style={{ marginTop:"8px", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.3)", borderRadius:"8px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"12px", color:"#fff" }}>
              {selectedPlayer.first_name[0]}{selectedPlayer.last_name[0]}
            </div>
            <div>
              <div style={{ fontWeight:"bold", fontSize:"13px" }}>{selectedPlayer.display}</div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>{selectedPlayer.team_name}{selectedPlayer.position&&" · "+selectedPlayer.position}{selectedPlayer.jersey_num&&" · #"+selectedPlayer.jersey_num}</div>
            </div>
            <span style={{ marginLeft:"auto", color:"var(--accent-green)", fontSize:"12px", fontWeight:"bold" }}>✅ Selected</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────
function Row({ children }) { return <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>{children}</div>; }
function Field({ label, children }) { return <div><div className="form-label">{label}</div>{children}</div>; }
function FInput({ placeholder="", value, onChange }) {
  return <input className="form-input" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} style={{ marginBottom:"12px" }}/>;
}
function CancelBtn({ onClick }) {
  return <button onClick={onClick} style={{ padding:"10px 20px", background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"8px", color:"var(--text-secondary)", cursor:"pointer" }}>Cancel</button>;
}
function RowItem({ main, sub, badge, badgeClass, onEdit }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg-secondary)", borderRadius:"8px", padding:"10px 16px" }}>
      <div>
        <span style={{ fontWeight:"bold", fontSize:"14px" }}>{main}</span>
        {badge && <span className={`badge ${badgeClass||"badge-blue"}`} style={{ marginLeft:"8px" }}>{badge}</span>}
        {sub   && <div style={{ color:"var(--text-muted)", fontSize:"12px", marginTop:"2px" }}>{sub}</div>}
      </div>
      <button onClick={onEdit} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-light)", borderRadius:"6px", color:"var(--text-secondary)", padding:"5px 12px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" }}>
        ✏️ Edit
      </button>
    </div>
  );
}
