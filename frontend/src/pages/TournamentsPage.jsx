// =============================================================
//  pages/TournamentsPage.jsx
//  Coach isolation: each coach sees only their own data
//  Predictions: always shown on fixture cards
//  Fresh token: getHeaders() reads token on every request
// =============================================================
import { useState, useEffect, useRef, useCallback } from "react";

const BASE = "http://localhost:5000/api";

// Always read token fresh — avoids 422 stale token errors
const getHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const C = {
  purple:"#7c3aed", blue:"#3b82f6", green:"#22c55e",
  yellow:"#f59e0b", red:"#ef4444", cyan:"#06b6d4",
  orange:"#f97316", pink:"#ec4899",
  bg:"#0a0a14", card:"#12122b", elevated:"#1a1a2e",
  border:"#ffffff0d", muted:"#555",
};

const CHART_DEFAULTS = {
  plugins:{
    legend:{ labels:{ color:"#888", font:{ size:11 }, padding:16 } },
    tooltip:{ backgroundColor:"#1a1a2e", borderColor:"#ffffff15", borderWidth:1, titleColor:"#fff", bodyColor:"#aaa", padding:10, cornerRadius:8 },
  },
  scales:{
    x:{ ticks:{ color:"#555", font:{ size:11 } }, grid:{ color:"#ffffff06" }, border:{ color:"#ffffff0d" } },
    y:{ ticks:{ color:"#555", font:{ size:11 } }, grid:{ color:"#ffffff06" }, border:{ color:"#ffffff0d" } },
  },
};

function useChart(ref, buildFn, deps) {
  useEffect(() => {
    if (!ref.current || typeof window.Chart === "undefined") return;
    const ex = window.Chart.getChart(ref.current);
    if (ex) ex.destroy();
    buildFn(ref.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function TournamentsPage({ user }) {
  const [tab,        setTab]        = useState("active");
  const [active,     setActive]     = useState([]);
  const [past,       setPast]       = useState([]);
  const [mine,       setMine]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [msg,        setMsg]        = useState("");
  const [err,        setErr]        = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  const [selected,   setSelected]   = useState(null);

  const roles   = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = roles.includes("admin") || user?.role === "admin";
  const isCoach = roles.includes("coach") || user?.role === "coach" || isAdmin;

  const flash = (ok, text) => {
    ok ? setMsg(text) : setErr(text);
    setTimeout(() => { setMsg(""); setErr(""); }, 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const h = getHeaders();
    const [a, p] = await Promise.all([
      fetch(`${BASE}/tournaments/`).then(r=>r.json()).catch(()=>({tournaments:[]})),
      fetch(`${BASE}/tournaments/past`).then(r=>r.json()).catch(()=>({tournaments:[]})),
    ]);
    setActive(a.tournaments||[]);
    setPast(p.tournaments||[]);
    if (isCoach && h) {
      const m = await fetch(`${BASE}/tournaments/mine`,{headers:h}).then(r=>r.json()).catch(()=>({tournaments:[]}));
      setMine(m.tournaments||[]);
    }
    setLoading(false);
  }, [isCoach]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  if (selected) return (
    <TournamentDetail
      t={selected} user={user} isAdmin={isAdmin} isCoach={isCoach}
      onBack={() => { setSelected(null); load(); }} flash={flash}
    />
  );

  const TABS = [
    { id:"active", label:"⚡ Active", count:active.length },
    { id:"past",   label:"📁 Past",   count:past.length   },
    ...(isCoach ? [{ id:"mine", label:"🏅 Mine", count:mine.length }] : []),
  ];

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", color:"#fff", paddingBottom:"4rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"32px", flexWrap:"wrap", gap:"16px" }}>
        <div>
          <h1 style={{ fontSize:"26px", fontWeight:"900", margin:0, letterSpacing:"-0.5px" }}>🏆 Tournaments</h1>
          <p style={{ color:C.muted, margin:"6px 0 0", fontSize:"13px" }}>
            {isAdmin ? "Full platform access · all tournaments" : isCoach ? "Your tournaments & shared access" : "Browse active and past tournaments"}
          </p>
        </div>
        {isCoach && (
          <div style={{ display:"flex", gap:"10px" }}>
            <GhostBtn color={C.cyan}   onClick={() => setShowJoin(true)}>🔑 Join via Code</GhostBtn>
            <SolidBtn color={C.purple} onClick={() => setShowCreate(true)}>＋ New Tournament</SolidBtn>
          </div>
        )}
      </div>

      {msg && <Toast color={C.green}>{msg}</Toast>}
      {err && <Toast color={C.red}>{err}</Toast>}

      <div style={{ display:"flex", gap:"4px", marginBottom:"28px", background:C.card, borderRadius:"12px", padding:"4px", width:"fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"8px 18px", borderRadius:"9px", border:"none", cursor:"pointer",
            background: tab===t.id ? C.purple : "transparent",
            color: tab===t.id ? "#fff" : C.muted, fontWeight: tab===t.id ? "700" : "500",
            fontSize:"13px", transition:"all 0.2s", display:"flex", alignItems:"center", gap:"6px",
          }}>
            {t.label}
            <span style={{ background: tab===t.id ? "#ffffff33" : "#ffffff11", borderRadius:"10px", padding:"1px 7px", fontSize:"11px", fontWeight:"700" }}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab==="active" && <TGrid tournaments={active} onSelect={setSelected} empty="No active tournaments right now." />}
      {tab==="past"   && <TGrid tournaments={past}   onSelect={setSelected} empty="No past tournaments yet." />}
      {tab==="mine"   && <TGrid tournaments={mine}   onSelect={setSelected} empty="You haven't created or joined any tournaments yet." isMine />}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)}
        onCreated={t => { flash(true,`✅ "${t.title}" created! Access code: ${t.access_code}`); setShowCreate(false); load(); }} flash={flash} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)}
        onJoined={t => { flash(true,`✅ Joined "${t.title}"!`); setShowJoin(false); load(); }} flash={flash} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TOURNAMENT CARD GRID
// ─────────────────────────────────────────────────────────────
function TGrid({ tournaments, onSelect, empty, isMine }) {
  if (!tournaments.length) return (
    <div style={{ textAlign:"center", padding:"6rem 2rem", color:"#333" }}>
      <div style={{ fontSize:"52px", marginBottom:"16px", filter:"grayscale(1)" }}>🏆</div>
      <div style={{ fontSize:"15px", fontWeight:"600", color:"#444" }}>{empty}</div>
    </div>
  );
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"16px" }}>
      {tournaments.map(t => <TCard key={t.tournament_id} t={t} onSelect={onSelect} isMine={isMine} />)}
    </div>
  );
}

function TCard({ t, onSelect, isMine }) {
  const sc  = { active:C.green, completed:C.blue, archived:"#444" };
  const col = sc[t.status]||C.purple;
  return (
    <div onClick={() => onSelect(t)}
      style={{ background:C.card, border:`1px solid ${col}22`, borderRadius:"16px", padding:"22px", cursor:"pointer",
               transition:"all 0.2s", position:"relative", overflow:"hidden" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow=`0 8px 32px ${col}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg,${col},${col}44)` }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div style={{ fontWeight:"800", fontSize:"16px", flex:1, marginRight:"10px", lineHeight:"1.3" }}>{t.title}</div>
        <SBadge status={t.status} />
      </div>
      {t.description && <div style={{ fontSize:"12px", color:"#666", marginBottom:"14px", lineHeight:"1.5" }}>{t.description}</div>}
      <div style={{ display:"flex", gap:"18px", fontSize:"12px", color:"#555", marginBottom:"14px" }}>
        <span>📅 {t.season_name}</span>
        <span>⚽ {t.match_count} matches</span>
        {t.team_count > 0 && <span>👥 {t.team_count} teams</span>}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:"11px", color:"#444" }}>By <span style={{ color:"#888" }}>{t.owner_name}</span>{t.start_date && ` · ${t.start_date}`}</div>
        <div style={{ fontSize:"11px", color:col, fontWeight:"700" }}>View →</div>
      </div>
      {isMine && t.access_code && (
        <div style={{ marginTop:"12px", background:"#0f0f1a", borderRadius:"8px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"11px", color:"#444" }}>Access Code</span>
          <span style={{ fontFamily:"monospace", fontSize:"13px", fontWeight:"800", color:C.yellow, letterSpacing:"3px", marginLeft:"auto" }}>{t.access_code}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TOURNAMENT DETAIL
// ─────────────────────────────────────────────────────────────
function TournamentDetail({ t, user, isAdmin, isCoach, onBack, flash }) {
  const [dTab,    setDTab]    = useState("overview");
  const [detail,  setDetail]  = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [stats,   setStats]   = useState([]);
  const [showCode,setShowCode]= useState(false);
  const [code,    setCode]    = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwner   = user?.user_id === t.created_by;
  const canManage = isAdmin || isOwner || !!t.access_code;

  const loadData = useCallback(() => {
    setLoading(true);
    const h = getHeaders();
    Promise.all([
      fetch(`${BASE}/tournaments/${t.tournament_id}/matches`).then(r=>r.json()),
      (isAdmin||canManage) && h
        ? fetch(`${BASE}/tournaments/${t.tournament_id}/coaches`,{headers:h}).then(r=>r.json()).catch(()=>({coaches:[]}))
        : Promise.resolve({coaches:[]}),
      fetch(`${BASE}/performance/tournament/${t.tournament_id}`).then(r=>r.json()).catch(()=>({players:[]})),
    ]).then(([d,co,st]) => {
      setDetail(d); setCoaches(co.coaches||[]); setStats(st.players||[]);
      setLoading(false);
    });
  }, [t.tournament_id, isAdmin, canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  const fetchCode = async () => {
    const r = await fetch(`${BASE}/tournaments/${t.tournament_id}/code`,{headers:getHeaders()}).then(r=>r.json());
    r.access_code ? (setCode(r.access_code), setShowCode(true)) : flash(false, r.error||"Cannot get code");
  };

  const doArchive = async () => {
    if (!window.confirm(`Archive "${t.title}"?`)) return;
    const r = await fetch(`${BASE}/tournaments/${t.tournament_id}/archive`,{method:"POST",headers:getHeaders()}).then(r=>r.json());
    r.message ? (flash(true,r.message), onBack()) : flash(false,r.error||"Archive failed");
  };

  const doDelete = async () => {
    if (!window.confirm(`PERMANENTLY DELETE "${t.title}"?\n\nMatches will be unlinked but kept.`)) return;
    const res = await fetch(`${BASE}/tournaments/${t.tournament_id}`,{method:"DELETE",headers:getHeaders()});
    const r   = await res.json();
    r.message ? (flash(true,r.message), onBack()) : flash(false,r.error||`Delete failed (${res.status})`);
  };

  const doComplete = async () => {
    if (!window.confirm(`Mark "${t.title}" as completed?`)) return;
    const r = await fetch(`${BASE}/tournaments/${t.tournament_id}/complete`,{method:"POST",headers:getHeaders()}).then(r=>r.json());
    r.message ? (flash(true,r.message), onBack()) : flash(false,r.error||"Failed");
  };

  const revokeCoach = async (cid, cname) => {
    if (!window.confirm(`Revoke ${cname}'s access?`)) return;
    const r = await fetch(`${BASE}/tournaments/${t.tournament_id}/coaches/${cid}`,{method:"DELETE",headers:getHeaders()}).then(r=>r.json());
    r.message ? (flash(true,r.message), setCoaches(coaches.filter(c=>c.coach_id!==cid))) : flash(false,r.error||"Failed");
  };

  if (loading) return <Spinner />;

  const matches   = detail?.matches||[];
  const completed = matches.filter(m=>m.status==="completed");
  const scheduled = matches.filter(m=>m.status==="scheduled");
  const postponed = matches.filter(m=>m.status==="postponed");
  const totalGoals= completed.reduce((s,m)=>s+(m.home_score||0)+(m.away_score||0),0);
  const avgGoals  = completed.length ? (totalGoals/completed.length).toFixed(1) : "0.0";
  const standings = buildStandings(completed);
  const topScorer = [...stats].sort((a,b)=>(b.goals||0)-(a.goals||0))[0];
  const topAssist = [...stats].sort((a,b)=>(b.assists||0)-(a.assists||0))[0];

  const DTABS = [
    { id:"overview",  icon:"📋", label:"Overview"   },
    { id:"standings", icon:"🏆", label:"Standings"  },
    { id:"fixtures",  icon:"📅", label:"Fixtures",  badge:scheduled.length },
    { id:"results",   icon:"⚽", label:"Results",   badge:completed.length },
    { id:"stats",     icon:"📊", label:"Player Stats" },
    ...(isAdmin||isOwner ? [{ id:"manage", icon:"⚙️", label:"Manage" }] : []),
  ];

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", color:"#fff", paddingBottom:"4rem" }}>
      {/* Breadcrumb + actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px", flexWrap:"wrap", gap:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button onClick={onBack} style={{ background:"none", border:"1px solid #ffffff15", borderRadius:"8px", color:C.muted, cursor:"pointer", fontSize:"12px", padding:"6px 12px" }}>← Tournaments</button>
          <button onClick={loadData} style={{ background:"none", border:"1px solid #ffffff0d", borderRadius:"8px", color:"#444", cursor:"pointer", fontSize:"12px", padding:"6px 10px" }} title="Refresh">🔄</button>
        </div>
        {(isAdmin||canManage) && (
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {(isOwner||isAdmin) && t.status!=="archived" && <GhostBtn color={C.yellow} sm onClick={fetchCode}>🔑 Access Code</GhostBtn>}
            {t.status==="active" && <GhostBtn color={C.blue} sm onClick={doComplete}>✅ Mark Complete</GhostBtn>}
            {isAdmin && t.status!=="archived" && <GhostBtn color={C.orange} sm onClick={doArchive}>🗄️ Archive</GhostBtn>}
            {isAdmin && <GhostBtn color={C.red} sm onClick={doDelete}>🗑️ Delete</GhostBtn>}
          </div>
        )}
      </div>

      {/* Hero banner */}
      <div style={{ background:`linear-gradient(135deg,#7c3aed18,#3b82f618)`, border:"1px solid #7c3aed22", borderRadius:"20px", padding:"28px 32px", marginBottom:"28px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-40px", right:"-40px", width:"200px", height:"200px", background:"radial-gradient(circle,#7c3aed22,transparent)", borderRadius:"50%" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"20px" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"8px" }}>
              <h1 style={{ fontSize:"24px", fontWeight:"900", margin:0 }}>{t.title}</h1>
              <SBadge status={t.status} />
            </div>
            <div style={{ color:"#888", fontSize:"13px", marginBottom:"6px" }}>
              {t.season_name} · By <span style={{ color:C.cyan }}>{t.owner_name}</span>
              {t.start_date && ` · ${t.start_date}`}{t.end_date && ` — ${t.end_date}`}
            </div>
            <div style={{ color:"#555", fontSize:"11px", marginBottom:"6px" }}>
              Tournament ID: {t.tournament_id}
            </div>
            {t.description && <div style={{ color:"#666", fontSize:"13px", maxWidth:"500px", lineHeight:"1.5" }}>{t.description}</div>}
          </div>
          <div style={{ display:"flex", gap:"20px", flexWrap:"wrap" }}>
            {[
              { v:matches.length, l:"Matches",    c:C.purple },
              { v:completed.length, l:"Played",   c:C.green  },
              { v:totalGoals,     l:"Goals",      c:C.cyan   },
              { v:avgGoals,       l:"Goals/Game", c:C.yellow },
            ].map(({v,l,c}) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:"28px", fontWeight:"900", color:c, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:"11px", color:"#555", marginTop:"4px", fontWeight:"600", textTransform:"uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {showCode && (
          <div style={{ marginTop:"20px", background:"#0f0f1a", borderRadius:"12px", padding:"14px 18px", display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap", border:`1px solid ${C.yellow}33` }}>
            <span style={{ fontSize:"12px", color:"#666", fontWeight:"600" }}>TOURNAMENT ACCESS CODE</span>
            <span style={{ fontFamily:"monospace", fontSize:"24px", fontWeight:"900", color:C.yellow, letterSpacing:"6px" }}>{code}</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
              <GhostBtn color={C.yellow} sm onClick={() => { navigator.clipboard.writeText(code); flash(true,"Code copied!"); }}>Copy</GhostBtn>
              <button onClick={() => setShowCode(false)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:"18px" }}>✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Highlight cards */}
      {(topScorer||standings.length>0) && (
        <div className="tp-grid tp-grid-cards" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"12px", marginBottom:"24px" }}>
          {standings[0] && <HighlightCard icon="🥇" label="League Leader" value={standings[0].team} sub={`${standings[0].pts} pts · ${standings[0].w}W ${standings[0].d}D ${standings[0].l}L`} color={C.yellow} />}
          {topScorer && topScorer.goals>0 && <HighlightCard icon="⚽" label="Top Scorer" value={topScorer.player_name} sub={`${topScorer.goals} goals · ${topScorer.team_name}`} color={C.green} />}
          {topAssist && topAssist.assists>0 && <HighlightCard icon="🎯" label="Top Assist" value={topAssist.player_name} sub={`${topAssist.assists} assists · ${topAssist.team_name}`} color={C.cyan} />}
          {completed.length>0 && (() => {
            const highest = completed.reduce((best,m) => { const g=(m.home_score||0)+(m.away_score||0); return g>(best.goals||0)?{match:m,goals:g}:best; },{});
            return highest.match ? <HighlightCard icon="🔥" label="Highest Scoring" value={`${highest.match.home_team} ${highest.match.home_score}–${highest.match.away_score} ${highest.match.away_team}`} sub={`${highest.goals} goals total`} color={C.orange} /> : null;
          })()}
        </div>
      )}

      {/* Detail tabs */}
      <div style={{ display:"flex", gap:"2px", marginBottom:"24px", background:C.card, borderRadius:"12px", padding:"4px", overflowX:"auto" }}>
        {DTABS.map(dt => (
          <button key={dt.id} onClick={() => setDTab(dt.id)} style={{
            padding:"9px 16px", borderRadius:"9px", border:"none", cursor:"pointer", whiteSpace:"nowrap",
            background:dTab===dt.id?C.elevated:"transparent", color:dTab===dt.id?"#fff":C.muted,
            fontWeight:dTab===dt.id?"700":"500", fontSize:"13px", transition:"all 0.2s",
            display:"flex", alignItems:"center", gap:"6px",
            boxShadow:dTab===dt.id?"0 2px 8px rgba(0,0,0,0.3)":"none",
          }}>
            {dt.icon} {dt.label}
            {dt.badge>0 && <span style={{ background:dTab===dt.id?C.purple:"#ffffff11", borderRadius:"10px", padding:"1px 6px", fontSize:"10px", fontWeight:"700" }}>{dt.badge}</span>}
          </button>
        ))}
      </div>

      {dTab==="overview"  && <OverviewTab matches={matches} standings={standings} completed={completed} scheduled={scheduled} stats={stats} />}
      {dTab==="standings" && <StandingsTab standings={standings} completed={completed} />}
      {dTab==="fixtures"  && <FixturesTab matches={scheduled} postponed={postponed} />}
      {dTab==="results"   && <ResultsTab matches={completed} />}
      {dTab==="stats"     && <StatsTab stats={stats} />}
      {dTab==="manage"    && (isAdmin||isOwner) && <ManageTab t={t} coaches={coaches} isAdmin={isAdmin} isOwner={isOwner} onRevoke={revokeCoach} onDataChange={loadData} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  BUILD STANDINGS
// ─────────────────────────────────────────────────────────────
function buildStandings(completed) {
  const tbl = {};
  completed.forEach(m => {
    const ht=m.home_team, at=m.away_team;
    if (!ht||!at) return;
    if (!tbl[ht]) tbl[ht]={team:ht,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,form:[]};
    if (!tbl[at]) tbl[at]={team:at,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,form:[]};
    const hs=m.home_score||0, as_=m.away_score||0;
    tbl[ht].p++; tbl[at].p++;
    tbl[ht].gf+=hs; tbl[ht].ga+=as_; tbl[at].gf+=as_; tbl[at].ga+=hs;
    if (hs>as_)      { tbl[ht].w++; tbl[ht].pts+=3; tbl[at].l++;  tbl[ht].form.push("W"); tbl[at].form.push("L"); }
    else if (hs<as_) { tbl[at].w++; tbl[at].pts+=3; tbl[ht].l++;  tbl[at].form.push("W"); tbl[ht].form.push("L"); }
    else             { tbl[ht].d++; tbl[at].d++; tbl[ht].pts++; tbl[at].pts++; tbl[ht].form.push("D"); tbl[at].form.push("D"); }
  });
  return Object.values(tbl).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
}

// ─────────────────────────────────────────────────────────────
//  OVERVIEW TAB
// ─────────────────────────────────────────────────────────────
function OverviewTab({ matches, standings, completed, scheduled, stats }) {
  const goalsRef   = useRef(null);
  const outcomeRef = useRef(null);
  const scorerRef  = useRef(null);
  const formRef    = useRef(null);

  useChart(goalsRef, (canvas) => {
    const rounds = {};
    completed.forEach(m => {
      const k=`R${m.round_number||"?"}`;
      if (!rounds[k]) rounds[k]={home:0,away:0};
      rounds[k].home+=m.home_score||0; rounds[k].away+=m.away_score||0;
    });
    const labels = Object.keys(rounds).sort((a,b)=>parseInt(a.slice(1)||0)-parseInt(b.slice(1)||0));
    if (!labels.length) return;
    new window.Chart(canvas, {
      type:"bar",
      data:{ labels, datasets:[
        { label:"Home Goals", data:labels.map(l=>rounds[l].home), backgroundColor:`${C.purple}99`, borderWidth:0, borderRadius:{topLeft:4,topRight:4}, stack:"s" },
        { label:"Away Goals", data:labels.map(l=>rounds[l].away), backgroundColor:`${C.blue}99`,   borderWidth:0, borderRadius:{topLeft:4,topRight:4}, stack:"s" },
      ]},
      options:{ ...CHART_DEFAULTS, plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Goals per Round",color:"#aaa",font:{size:12,weight:"600"}}}, scales:{...CHART_DEFAULTS.scales,x:{...CHART_DEFAULTS.scales.x,stacked:true},y:{...CHART_DEFAULTS.scales.y,stacked:true}} }
    });
  }, [completed.length]);

  useChart(outcomeRef, (canvas) => {
    let hw=0,d=0,aw=0;
    completed.forEach(m => { const hs=m.home_score||0,as_=m.away_score||0; if(hs>as_)hw++; else if(hs<as_)aw++; else d++; });
    if (!hw&&!d&&!aw) return;
    const total=hw+d+aw;
    new window.Chart(canvas, {
      type:"doughnut",
      data:{ labels:[`Home Win ${Math.round(hw/total*100)}%`,`Draw ${Math.round(d/total*100)}%`,`Away Win ${Math.round(aw/total*100)}%`],
             datasets:[{ data:[hw,d,aw], backgroundColor:[C.purple,C.yellow,C.blue], borderWidth:3, borderColor:C.card, hoverOffset:6 }] },
      options:{ ...CHART_DEFAULTS, cutout:"68%", plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Outcome Distribution",color:"#aaa",font:{size:12,weight:"600"}}} }
    });
  }, [completed.length]);

  useChart(formRef, (canvas) => {
    if (standings.length<2||completed.length<2) return;
    const top5=standings.slice(0,5);
    const maxR=Math.max(...completed.map(m=>m.round_number||1),1);
    const labels=Array.from({length:maxR},(_,i)=>`R${i+1}`);
    const colors=[C.yellow,C.purple,C.green,C.blue,C.orange];
    const datasets=top5.map((s,i)=>({
      label:s.team.length>12?s.team.slice(0,12)+"…":s.team,
      data:labels.map((_,ri)=>{
        let p=0;
        completed.filter(m=>(m.home_team===s.team||m.away_team===s.team)&&(m.round_number||1)<=(ri+1))
          .forEach(m=>{ const hs=m.home_score||0,as_=m.away_score||0;
            if(m.home_team===s.team){ if(hs>as_)p+=3; else if(hs===as_)p+=1; }
            else { if(as_>hs)p+=3; else if(hs===as_)p+=1; }
          });
        return p;
      }),
      borderColor:colors[i],backgroundColor:`${colors[i]}22`,borderWidth:2,pointRadius:3,pointHoverRadius:6,tension:0.3,fill:false,
    }));
    new window.Chart(canvas, {
      type:"line", data:{ labels, datasets },
      options:{ ...CHART_DEFAULTS, interaction:{mode:"index",intersect:false}, plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Points Race",color:"#aaa",font:{size:12,weight:"600"}}} }
    });
  }, [completed.length, standings.length]);

  useChart(scorerRef, (canvas) => {
    const top=[...stats].sort((a,b)=>(b.goals||0)-(a.goals||0)).slice(0,7);
    if (!top.length) return;
    new window.Chart(canvas, {
      type:"bar",
      data:{ labels:top.map(p=>p.player_name?.split(" ").slice(-1)[0]||"?"), datasets:[
        { label:"Goals",   data:top.map(p=>p.goals||0),   backgroundColor:`${C.green}99`, borderWidth:0, borderRadius:4 },
        { label:"Assists", data:top.map(p=>p.assists||0), backgroundColor:`${C.cyan}99`,  borderWidth:0, borderRadius:4 },
      ]},
      options:{ ...CHART_DEFAULTS, plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Top Goal Contributions",color:"#aaa",font:{size:12,weight:"600"}}} }
    });
  }, [stats.length]);

  // Summary pills
  const totalGoals=completed.reduce((s,m)=>s+(m.home_score||0)+(m.away_score||0),0);
  const homeWins=completed.filter(m=>(m.home_score||0)>(m.away_score||0)).length;
  const awayWins=completed.filter(m=>(m.away_score||0)>(m.home_score||0)).length;
  const draws=completed.length-homeWins-awayWins;
  const predRight=completed.filter(m=>{
    if(!m.prediction) return false;
    const actual=(m.home_score||0)>(m.away_score||0)?"home":(m.away_score||0)>(m.home_score||0)?"away":"draw";
    const fav=m.prediction.home_win_prob>m.prediction.away_win_prob?"home":m.prediction.away_win_prob>m.prediction.home_win_prob?"away":"draw";
    return actual===fav;
  }).length;
  const predTotal=completed.filter(m=>m.prediction).length;
  const predAcc=predTotal>0?Math.round(predRight/predTotal*100):null;
  const recent=[...completed].reverse().slice(0,4);

  return (
    <div>
      {/* Stat pills */}
      <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"20px" }}>
        {[
          {l:"Home Wins", v:homeWins, c:C.purple},
          {l:"Away Wins", v:awayWins, c:C.blue},
          {l:"Draws",     v:draws,    c:C.yellow},
          {l:"Total Goals",v:totalGoals,c:C.cyan},
          ...(predAcc!==null?[{l:"AI Accuracy",v:`${predAcc}%`,c:C.green}]:[]),
          {l:"Upcoming",v:scheduled.length,c:C.orange},
        ].map(({l,v,c})=>(
          <div key={l} style={{ background:`${c}12`, border:`1px solid ${c}30`, borderRadius:"10px", padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontSize:"18px", fontWeight:"900", color:c }}>{v}</div>
            <div style={{ fontSize:"10px", color:"#555", marginTop:"2px", fontWeight:"600", textTransform:"uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* 4 charts */}
      <div className="tp-grid tp-grid-charts" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" }}>
        <Card style={{ position:"relative", minHeight:"180px" }}><canvas ref={goalsRef} />{!completed.length&&<ChartEmpty />}</Card>
        <Card style={{ position:"relative", minHeight:"180px" }}><canvas ref={outcomeRef} />{!completed.length&&<ChartEmpty />}</Card>
        <Card style={{ position:"relative", minHeight:"180px" }}><canvas ref={formRef} />{completed.length<2&&<ChartEmpty text="Need 2+ completed matches" />}</Card>
        <Card style={{ position:"relative", minHeight:"180px" }}><canvas ref={scorerRef} />{!stats.length&&<ChartEmpty text="No player stats yet" />}</Card>
      </div>

      <div className="tp-grid tp-grid-split" style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"20px" }}>
        <div>
          {recent.length>0 && (<><SecTitle>⚽ Recent Results</SecTitle><div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"20px" }}>{recent.map(m=><MatchCard key={m.match_id} m={m} />)}</div></>)}
          {scheduled.length>0 && (<><SecTitle>📅 Next Fixtures</SecTitle><div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>{scheduled.slice(0,2).map(m=><MatchCard key={m.match_id} m={m} />)}</div></>)}
          {!recent.length&&!scheduled.length&&<Empty text="No matches yet. Generate fixtures via ⚙️ Manage → Fixtures." />}
        </div>
        <div>
          <SecTitle>🏆 Standings</SecTitle>
          <MiniTable standings={standings} />
          {stats.length>0 && (
            <><SecTitle style={{ marginTop:"20px" }}>⭐ Top Performers</SecTitle>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", overflow:"hidden" }}>
              {[...stats].sort((a,b)=>(b.goals||0)-(a.goals||0)).slice(0,5).map((p,i)=>(
                <div key={i} style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"10px" }}>
                  <span style={{ color:i===0?C.yellow:i===1?"#aaa":i===2?C.orange:"#555", fontWeight:"800", fontSize:"13px", width:"20px" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:"700", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.player_name}</div>
                    <div style={{ fontSize:"11px", color:"#555" }}>{p.team_name}</div>
                  </div>
                  <div style={{ display:"flex", gap:"8px", fontSize:"12px" }}>
                    <span style={{ color:C.green, fontWeight:"800" }}>{p.goals||0}G</span>
                    <span style={{ color:C.cyan }}>{p.assists||0}A</span>
                  </div>
                </div>
              ))}
            </div></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  STANDINGS TAB
// ─────────────────────────────────────────────────────────────
function StandingsTab({ standings, completed }) {
  const ptRef = useRef(null);
  const gdRef = useRef(null);
  const wdlRef= useRef(null);

  useChart(ptRef, (canvas) => {
    const data=standings.slice(0,10);
    if(!data.length) return;
    new window.Chart(canvas, {
      type:"bar", indexAxis:"y",
      data:{ labels:data.map(s=>s.team), datasets:[{ label:"Points", data:data.map(s=>s.pts), backgroundColor:data.map((_,i)=>i===0?C.yellow:i===1?`${C.yellow}aa`:i===2?`${C.orange}88`:`${C.purple}66`), borderWidth:0, borderRadius:4 }] },
      options:{ ...CHART_DEFAULTS, indexAxis:"y", plugins:{...CHART_DEFAULTS.plugins,legend:{display:false},title:{display:true,text:"Points Table",color:"#aaa",font:{size:12,weight:"600"}}}, scales:{x:{...CHART_DEFAULTS.scales.x},y:{...CHART_DEFAULTS.scales.y,ticks:{color:"#ccc",font:{size:11}}}} }
    });
  }, [standings.length]);

  useChart(gdRef, (canvas) => {
    const data=standings.slice(0,10);
    if(!data.length) return;
    new window.Chart(canvas, {
      type:"bar",
      data:{ labels:data.map(s=>s.team.length>10?s.team.slice(0,10)+"…":s.team), datasets:[
        { label:"Goals For",     data:data.map(s=>s.gf), backgroundColor:`${C.green}88`, borderWidth:0, borderRadius:4 },
        { label:"Goals Against", data:data.map(s=>s.ga), backgroundColor:`${C.red}77`,   borderWidth:0, borderRadius:4 },
      ]},
      options:{ ...CHART_DEFAULTS, plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Goals For vs Against",color:"#aaa",font:{size:12,weight:"600"}}} }
    });
  }, [standings.length]);

  useChart(wdlRef, (canvas) => {
    const data=standings.slice(0,6);
    if(!data.length) return;
    new window.Chart(canvas, {
      type:"bar",
      data:{ labels:data.map(s=>s.team.length>10?s.team.slice(0,10)+"…":s.team), datasets:[
        { label:"Won",  data:data.map(s=>s.w), backgroundColor:`${C.green}88`,  borderWidth:0, borderRadius:2, stack:"s" },
        { label:"Drawn",data:data.map(s=>s.d), backgroundColor:`${C.yellow}88`, borderWidth:0, borderRadius:2, stack:"s" },
        { label:"Lost", data:data.map(s=>s.l), backgroundColor:`${C.red}77`,    borderWidth:0, borderRadius:2, stack:"s" },
      ]},
      options:{ ...CHART_DEFAULTS, plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Win / Draw / Loss",color:"#aaa",font:{size:12,weight:"600"}}}, scales:{...CHART_DEFAULTS.scales,x:{...CHART_DEFAULTS.scales.x,stacked:true},y:{...CHART_DEFAULTS.scales.y,stacked:true}} }
    });
  }, [standings.length]);

  if (!standings.length) return <Empty text="No matches completed yet." />;
  return (
    <div>
      <div className="tp-grid tp-grid-charts" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
        <Card><canvas ref={ptRef} /></Card>
        <Card><canvas ref={gdRef} /></Card>
      </div>
      <Card style={{ marginBottom:"20px" }}><canvas ref={wdlRef} /></Card>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontWeight:"700", fontSize:"14px" }}>Full Standings</div>
          <div style={{ fontSize:"11px", color:C.muted }}>{standings.length} teams · {completed.length} played</div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px", minWidth:"640px" }}>
            <thead>
              <tr style={{ background:C.elevated }}>
                {["Pos","Team","P","W","D","L","GF","GA","GD","Pts","Form"].map(h=>(
                  <th key={h} style={{ padding:"12px", textAlign:h==="Team"?"left":"center", color:"#555", fontWeight:"600", fontSize:"11px", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s,i)=>(
                <tr key={s.team} style={{ borderTop:`1px solid ${C.border}`, background:i===0?`${C.yellow}08`:i<3?`${C.purple}05`:"transparent" }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${C.purple}10`}
                  onMouseLeave={e=>e.currentTarget.style.background=i===0?`${C.yellow}08`:i<3?`${C.purple}05`:"transparent"}>
                  <td style={{ padding:"13px 12px", textAlign:"center" }}>
                    {i===0?<span style={{ color:C.yellow,fontWeight:"900",fontSize:"15px" }}>🥇</span>
                    :i===1?<span style={{ color:"#aaa",fontWeight:"900",fontSize:"15px" }}>🥈</span>
                    :i===2?<span style={{ color:C.orange,fontWeight:"900",fontSize:"15px" }}>🥉</span>
                    :<span style={{ color:"#555",fontWeight:"600" }}>{i+1}</span>}
                  </td>
                  <td style={{ padding:"13px 12px", fontWeight:"700", fontSize:"14px" }}>{s.team}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center", color:"#888" }}>{s.p}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center", color:C.green, fontWeight:"700" }}>{s.w}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center", color:"#888" }}>{s.d}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center", color:C.red }}>{s.l}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center" }}>{s.gf}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center" }}>{s.ga}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center", fontWeight:"700", color:s.gf-s.ga>0?C.green:s.gf-s.ga<0?C.red:"#888" }}>{s.gf-s.ga>0?"+":""}{s.gf-s.ga}</td>
                  <td style={{ padding:"13px 12px", textAlign:"center" }}>
                    <span style={{ background:`${C.purple}33`, color:C.purple, borderRadius:"8px", padding:"4px 10px", fontWeight:"900", fontSize:"14px" }}>{s.pts}</span>
                  </td>
                  <td style={{ padding:"13px 12px", textAlign:"center" }}>
                    <div style={{ display:"flex", gap:"3px", justifyContent:"center" }}>
                      {s.form.slice(-5).map((f,j)=>(
                        <span key={j} style={{ width:"18px",height:"18px",borderRadius:"4px",fontSize:"9px",fontWeight:"800",display:"flex",alignItems:"center",justifyContent:"center",
                          background:f==="W"?`${C.green}33`:f==="L"?`${C.red}33`:`${C.yellow}33`,
                          color:f==="W"?C.green:f==="L"?C.red:C.yellow }}>{f}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  FIXTURES TAB
// ─────────────────────────────────────────────────────────────
function FixturesTab({ matches, postponed }) {
  if (!matches.length&&!postponed.length) return <Empty text="No upcoming fixtures scheduled." />;
  const byRound = {};
  matches.forEach(m => { const k=`Round ${m.round_number||"—"}`; if(!byRound[k])byRound[k]=[]; byRound[k].push(m); });
  return (
    <div>
      {Object.entries(byRound).map(([round,ms])=>(
        <div key={round} style={{ marginBottom:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
            <div style={{ fontWeight:"700", fontSize:"13px", color:C.blue }}>{round}</div>
            <div style={{ flex:1, height:"1px", background:C.border }} />
            <div style={{ fontSize:"11px", color:C.muted }}>{ms.length} match{ms.length!==1?"es":""}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>{ms.map(m=><MatchCard key={m.match_id} m={m} />)}</div>
        </div>
      ))}
      {postponed.length>0 && (<div style={{ marginTop:"24px" }}><SecTitle>⏸️ Postponed</SecTitle>{postponed.map(m=><MatchCard key={m.match_id} m={m} />)}</div>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RESULTS TAB
// ─────────────────────────────────────────────────────────────
function ResultsTab({ matches }) {
  if (!matches.length) return <Empty text="No results yet." />;
  const byRound = {};
  [...matches].reverse().forEach(m => { const k=`Round ${m.round_number||"—"}`; if(!byRound[k])byRound[k]=[]; byRound[k].push(m); });
  return (
    <div>
      {Object.entries(byRound).map(([round,ms])=>(
        <div key={round} style={{ marginBottom:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
            <div style={{ fontWeight:"700", fontSize:"13px", color:C.green }}>{round}</div>
            <div style={{ flex:1, height:"1px", background:C.border }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>{ms.map(m=><MatchCard key={m.match_id} m={m} />)}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  STATS TAB
// ─────────────────────────────────────────────────────────────
function StatsTab({ stats }) {
  const goalsRef  = useRef(null);
  const ratingRef = useRef(null);
  const minsRef   = useRef(null);
  const sorted    = [...stats].sort((a,b)=>(b.goals||0)-(a.goals||0));
  const top       = sorted.slice(0,10);
  const shortName = p => p.player_name?.split(" ").slice(-1)[0]||"?";

  useChart(goalsRef, (canvas) => {
    if (!top.length) return;
    new window.Chart(canvas, {
      type:"bar",
      data:{ labels:top.map(shortName), datasets:[
        { label:"Goals",   data:top.map(p=>p.goals||0),   backgroundColor:`${C.green}99`, borderWidth:0, borderRadius:{topLeft:4,topRight:4}, stack:"g" },
        { label:"Assists", data:top.map(p=>p.assists||0), backgroundColor:`${C.cyan}77`,  borderWidth:0, borderRadius:{topLeft:4,topRight:4}, stack:"g" },
      ]},
      options:{ ...CHART_DEFAULTS, plugins:{...CHART_DEFAULTS.plugins,title:{display:true,text:"Goals & Assists (Top 10)",color:"#aaa",font:{size:12,weight:"600"}}} }
    });
  }, [stats.length]);

  useChart(ratingRef, (canvas) => {
    const wr=[...stats].filter(p=>p.rating>0).sort((a,b)=>b.rating-a.rating).slice(0,10);
    if (!wr.length) return;
    new window.Chart(canvas, {
      type:"bar", indexAxis:"y",
      data:{ labels:wr.map(p=>p.player_name?.split(" ").slice(0,2).join(" ")||"?"),
             datasets:[{ label:"Rating", data:wr.map(p=>Number(p.rating).toFixed(1)),
               backgroundColor:wr.map(p=>p.rating>=8?`${C.green}99`:p.rating>=7?`${C.cyan}99`:p.rating>=6?`${C.yellow}99`:`${C.orange}88`), borderWidth:0, borderRadius:4 }] },
      options:{ ...CHART_DEFAULTS, indexAxis:"y", plugins:{...CHART_DEFAULTS.plugins,legend:{display:false},title:{display:true,text:"Player Ratings",color:"#aaa",font:{size:12,weight:"600"}}},
        scales:{ x:{...CHART_DEFAULTS.scales.x,min:0,max:10,ticks:{...CHART_DEFAULTS.scales.x.ticks,callback:v=>`${v}/10`}}, y:{...CHART_DEFAULTS.scales.y,ticks:{color:"#ccc",font:{size:11}}} } }
    });
  }, [stats.length]);

  useChart(minsRef, (canvas) => {
    const tm=[...stats].sort((a,b)=>(b.minutes_played||0)-(a.minutes_played||0)).slice(0,8);
    if (!tm.length) return;
    new window.Chart(canvas, {
      type:"bar",
      data:{ labels:tm.map(shortName), datasets:[{ label:"Minutes", data:tm.map(p=>p.minutes_played||0), backgroundColor:`${C.purple}88`, borderWidth:0, borderRadius:4 }] },
      options:{ ...CHART_DEFAULTS, plugins:{...CHART_DEFAULTS.plugins,legend:{display:false},title:{display:true,text:"Minutes Played",color:"#aaa",font:{size:12,weight:"600"}}} }
    });
  }, [stats.length]);

  if (!stats.length) return <Empty text="No player stats yet. Enter stats via ⚙️ Manage → Stats." />;
  return (
    <div>
      <div className="tp-grid tp-grid-charts" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
        <Card><canvas ref={goalsRef} /></Card>
        <Card><canvas ref={ratingRef} /></Card>
      </div>
      <Card style={{ marginBottom:"20px" }}><canvas ref={minsRef} /></Card>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontWeight:"700", fontSize:"14px" }}>Player Statistics</div>
          <div style={{ fontSize:"11px", color:C.muted }}>{stats.length} players</div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px", minWidth:"640px" }}>
            <thead>
              <tr style={{ background:C.elevated }}>
                {["#","Player","Team","G","A","G+A","YC","RC","Mins","Rating"].map(h=>(
                  <th key={h} style={{ padding:"11px 12px", textAlign:["Player","Team"].includes(h)?"left":"center", color:"#555", fontWeight:"600", fontSize:"11px", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p,i)=>{
                const rating=p.rating?Number(p.rating):null;
                const rColor=rating>=8?C.green:rating>=7?C.cyan:rating>=6?C.yellow:rating>=5?C.orange:C.red;
                return (
                  <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=`${C.purple}08`}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"11px 12px", textAlign:"center", color:"#555", fontSize:"12px" }}>{i+1}</td>
                    <td style={{ padding:"11px 12px" }}>
                      <div style={{ fontWeight:"700" }}>{p.player_name||"?"}</div>
                      <div style={{ fontSize:"11px", color:"#555" }}>{p.position||""}</div>
                    </td>
                    <td style={{ padding:"11px 12px", color:"#888", fontSize:"12px" }}>{p.team_name}</td>
                    <td style={{ padding:"11px 12px", textAlign:"center", fontWeight:"800", color:C.green, fontSize:"15px" }}>{p.goals||0}</td>
                    <td style={{ padding:"11px 12px", textAlign:"center", fontWeight:"700", color:C.cyan }}>{p.assists||0}</td>
                    <td style={{ padding:"11px 12px", textAlign:"center", color:"#888", fontSize:"12px" }}>{(p.goals||0)+(p.assists||0)}</td>
                    <td style={{ padding:"11px 12px", textAlign:"center" }}>
                      {(p.yellow_cards||0)>0?<span style={{ background:`${C.yellow}33`,color:C.yellow,borderRadius:"4px",padding:"2px 7px",fontSize:"11px",fontWeight:"700" }}>{p.yellow_cards}</span>:<span style={{ color:"#333" }}>—</span>}
                    </td>
                    <td style={{ padding:"11px 12px", textAlign:"center" }}>
                      {(p.red_cards||0)>0?<span style={{ background:`${C.red}33`,color:C.red,borderRadius:"4px",padding:"2px 7px",fontSize:"11px",fontWeight:"700" }}>{p.red_cards}</span>:<span style={{ color:"#333" }}>—</span>}
                    </td>
                    <td style={{ padding:"11px 12px", textAlign:"center", color:"#888" }}>{p.minutes_played||0}'</td>
                    <td style={{ padding:"11px 12px", textAlign:"center" }}>
                      {rating?<span style={{ background:`${rColor}22`,color:rColor,border:`1px solid ${rColor}44`,borderRadius:"8px",padding:"3px 9px",fontWeight:"800",fontSize:"13px" }}>{rating.toFixed(1)}</span>:<span style={{ color:"#333" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MANAGE TAB — all fetch calls use getHeaders()
// ─────────────────────────────────────────────────────────────
function ManageTab({ t, coaches, isAdmin, isOwner, onRevoke, onDataChange }) {
  const [manSub,  setManSub]  = useState("teams");
  const [teams,   setTeams]   = useState({ registered:[], available:[] });
  const [rounds,  setRounds]  = useState(null);
  const [genForm, setGenForm] = useState({ start_date:"", days_between_rounds:"7", venue:"" });
  const [busy,    setBusy]    = useState(false);
  const [lmsg,    setLmsg]    = useState("");
  const [lerr,    setLerr]    = useState("");

  const lflash = (ok,txt) => { ok?setLmsg(txt):setLerr(txt); setTimeout(()=>{setLmsg("");setLerr("");},5000); };

  // All fetches use getHeaders() for fresh token
  const loadTeams = () =>
    fetch(`${BASE}/tournaments/${t.tournament_id}/teams`,{headers:getHeaders()})
      .then(r=>r.json()).then(d=>setTeams({registered:d.registered||[],available:d.available||[]})).catch(()=>{});

  const loadRounds = () =>
    fetch(`${BASE}/tournaments/${t.tournament_id}/rounds`)
      .then(r=>r.json()).then(d=>setRounds(d)).catch(()=>{});

  useEffect(()=>{ loadTeams(); loadRounds(); },[]);

  const addTeam = async (teamId) => {
    const r=await fetch(`${BASE}/tournaments/${t.tournament_id}/teams`,{method:"POST",headers:getHeaders(),body:JSON.stringify({team_id:teamId})}).then(r=>r.json());
    r.message?(lflash(true,r.message),loadTeams()):lflash(false,r.error||"Failed");
  };

  const deleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Delete team "${teamName}"? This cannot be undone.`)) return;
    const h = getHeaders();
    if (!h) return lflash(false, "Unauthorized");
    const r = await fetch(`${BASE}/teams/${teamId}`, { method:"DELETE", headers:h }).then(r=>r.json());
    r.message ? (lflash(true, r.message), loadTeams()) : lflash(false, r.error || "Failed");
  };

  const removeTeam = async (teamId,teamName) => {
    if (!window.confirm(`Remove ${teamName}?`)) return;
    const r=await fetch(`${BASE}/tournaments/${t.tournament_id}/teams/${teamId}`,{method:"DELETE",headers:getHeaders()}).then(r=>r.json());
    r.message?(lflash(true,r.message),loadTeams()):lflash(false,r.error||"Failed");
  };

  const generateFixtures = async () => {
    if (teams.registered.length<2) return lflash(false,`Need at least 2 teams. Currently ${teams.registered.length}.`);
    if (!genForm.start_date) return lflash(false,"Select a start date");
    const n=teams.registered.length;
    const rounds_count=n%2===0?n-1:n;
    const matches_per_round=Math.floor(n/2);
    if (!window.confirm(`Generate ${matches_per_round*rounds_count} fixtures across ${rounds_count} rounds for ${n} teams?\n\nExisting scheduled matches will be replaced.`)) return;
    setBusy(true);
    const r=await fetch(`${BASE}/tournaments/${t.tournament_id}/generate-fixtures`,{method:"POST",headers:getHeaders(),body:JSON.stringify(genForm)}).then(r=>r.json());
    setBusy(false);
    if (r.message) { lflash(true,`✅ ${r.message}`); loadRounds(); if(onDataChange)onDataChange(); }
    else lflash(false,r.error||"Failed");
  };

  const MANsubs=[{id:"teams",label:"👥 Teams"},{id:"fixtures",label:"🗓️ Fixtures"},{id:"coaches",label:"🤝 Coaches"}];
  const rsc = s => s==="completed"?C.green:s==="in_progress"?C.yellow:C.muted;

  return (
    <div>
      {lmsg&&<Toast color={C.green}>{lmsg}</Toast>}
      {lerr&&<Toast color={C.red}>{lerr}</Toast>}

      <div style={{ display:"flex", gap:"4px", marginBottom:"20px", background:C.card, borderRadius:"10px", padding:"4px", width:"fit-content" }}>
        {MANsubs.map(s=>(
          <button key={s.id} onClick={()=>setManSub(s.id)} style={{ padding:"7px 16px", borderRadius:"7px", border:"none", cursor:"pointer",
            background:manSub===s.id?C.elevated:"transparent", color:manSub===s.id?"#fff":C.muted, fontWeight:manSub===s.id?"700":"500", fontSize:"13px", transition:"all 0.2s" }}>{s.label}</button>
        ))}
      </div>

      {/* TEAMS */}
      {manSub==="teams" && (
        <div className="tp-grid tp-grid-split" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div>
            <SecTitle>✅ Registered Teams ({teams.registered.length})</SecTitle>
            {!teams.registered.length ? <Empty text="No teams yet. Add from the right panel." /> : (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", overflow:"hidden" }}>
                {teams.registered.map((tt,i)=>(
                  <div key={tt.team_id} style={{ padding:"12px 16px", borderBottom:i<teams.registered.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:`linear-gradient(135deg,${C.purple}44,${C.blue}44)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"13px" }}>{tt.team_name?.[0]}</div>
                    <div style={{ flex:1 }}><div style={{ fontWeight:"700", fontSize:"13px" }}>{tt.team_name}</div></div>
                    <button onClick={()=>removeTeam(tt.team_id,tt.team_name)} style={{ background:"none", border:`1px solid ${C.red}33`, color:C.red, borderRadius:"6px", padding:"3px 8px", cursor:"pointer", fontSize:"11px" }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <SecTitle>➕ Add Your Teams</SecTitle>
            {!teams.available.length ? <Empty text="All your teams are already registered." /> : (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", overflow:"hidden" }}>
                {teams.available.map((tm,i)=>(
                  <div key={tm.team_id} style={{ padding:"12px 16px", borderBottom:i<teams.available.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:`${C.green}22`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"13px", color:C.green }}>{tm.team_name?.[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:"600", fontSize:"13px" }}>{tm.team_name}</div>
                      {tm.department&&<div style={{ fontSize:"11px", color:C.muted }}>{tm.department}</div>}
                    </div>
                    <button onClick={()=>addTeam(tm.team_id)} style={{ background:`${C.green}22`, border:`1px solid ${C.green}44`, color:C.green, borderRadius:"6px", padding:"3px 10px", cursor:"pointer", fontSize:"11px", fontWeight:"600" }}>+ Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIXTURES */}
      {manSub==="fixtures" && (
        <div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"20px", marginBottom:"20px" }}>
            <div style={{ fontWeight:"700", fontSize:"15px", marginBottom:"4px" }}>🗓️ Auto-Generate Round-Robin Fixtures</div>
            <div style={{ fontSize:"12px", color:C.muted, marginBottom:"16px" }}>
              {teams.registered.length>=2
                ? `${teams.registered.length} teams → ${teams.registered.length%2===0?teams.registered.length-1:teams.registered.length} rounds × ${Math.floor(teams.registered.length/2)} matches = ${Math.floor(teams.registered.length/2)*(teams.registered.length%2===0?teams.registered.length-1:teams.registered.length)} total fixtures`
                : "Register at least 2 teams first"}
            </div>
            {teams.registered.length<2 && (
              <div style={{ background:`${C.yellow}11`, border:`1px solid ${C.yellow}33`, borderRadius:"8px", padding:"10px 14px", marginBottom:"16px", fontSize:"12px", color:C.yellow }}>
                ⚠️ You need at least 2 teams. Go to Teams tab to add teams.
              </div>
            )}
            <div className="tp-grid tp-grid-form" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"16px" }}>
              {[
                {label:"Start Date *", type:"date", key:"start_date", placeholder:""},
                {label:"Days Between Rounds", type:"number", key:"days_between_rounds", placeholder:"7"},
                {label:"Default Venue", type:"text", key:"venue", placeholder:"e.g. University Ground"},
              ].map(({label,type,key,placeholder})=>(
                <div key={key}>
                  <div style={{ fontSize:"11px", color:"#666", marginBottom:"5px", fontWeight:"600", textTransform:"uppercase" }}>{label}</div>
                  <input type={type} value={genForm[key]} placeholder={placeholder} min={type==="number"?"1":undefined} max={type==="number"?"30":undefined}
                    onChange={e=>setGenForm({...genForm,[key]:e.target.value})}
                    style={{ width:"100%", padding:"9px 12px", background:C.elevated, border:"1px solid #ffffff12", borderRadius:"8px", color:"#fff", fontSize:"13px", boxSizing:"border-box" }}/>
                </div>
              ))}
            </div>
            <SolidBtn color={C.purple} onClick={generateFixtures} disabled={busy||teams.registered.length<2}>
              {busy?"⏳ Generating...":`⚡ Generate ${teams.registered.length>=2?Math.floor(teams.registered.length/2)*(teams.registered.length%2===0?teams.registered.length-1:teams.registered.length)+" Fixtures":"Fixtures"}`}
            </SolidBtn>
          </div>
          {rounds?.rounds?.length>0 && (
            <div>
              <SecTitle>📊 Round Progress</SecTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {rounds.rounds.map(r=>(
                  <div key={r.round} style={{ background:C.card, border:`1px solid ${rsc(r.status)}22`, borderLeft:`3px solid ${rsc(r.status)}`, borderRadius:"12px", padding:"14px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                      <div style={{ fontWeight:"700", fontSize:"14px" }}>Round {r.round}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <span style={{ fontSize:"12px", color:C.muted }}>{r.completed}/{r.total} played</span>
                        <span style={{ background:`${rsc(r.status)}22`, color:rsc(r.status), borderRadius:"6px", padding:"3px 10px", fontSize:"11px", fontWeight:"700" }}>
                          {r.status==="completed"?"✅ Done":r.status==="in_progress"?"🔄 In Progress":"📅 Upcoming"}
                        </span>
                      </div>
                    </div>
                    <div style={{ height:"4px", background:C.border, borderRadius:"2px", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${r.total>0?Math.round(r.completed/r.total*100):0}%`, background:rsc(r.status), transition:"width 0.3s" }}/>
                    </div>
                  </div>
                ))}
              </div>
              {rounds.all_complete && (
                <div style={{ marginTop:"16px", background:`${C.green}11`, border:`1px solid ${C.green}33`, borderRadius:"10px", padding:"14px 18px", fontSize:"13px", color:C.green, fontWeight:"600" }}>
                  🎉 All rounds complete! Mark the tournament as Complete using the button at the top.
                </div>
              )}
            </div>
          )}
          {rounds?.rounds?.length===0 && <Empty text="No fixtures yet. Fill the form above and click Generate Fixtures." />}
        </div>
      )}

      {/* COACHES */}
      {manSub==="coaches" && (
        <div style={{ maxWidth:"520px" }}>
          <SecTitle>👥 Coaches with Access</SecTitle>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"12px", background:`${C.purple}08` }}>
              <div style={{ width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"14px" }}>
                {t.owner_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div><div style={{ fontWeight:"700",fontSize:"13px" }}>{t.owner_name}</div><div style={{ fontSize:"11px",color:C.muted }}>Tournament Owner</div></div>
              <span style={{ marginLeft:"auto",background:`${C.purple}33`,color:C.purple,borderRadius:"6px",padding:"3px 8px",fontSize:"11px",fontWeight:"700" }}>OWNER</span>
            </div>
            {!coaches.length
              ? <div style={{ padding:"24px",textAlign:"center",color:"#444",fontSize:"13px" }}>No additional coaches yet.<br/><span style={{ fontSize:"12px",color:"#333" }}>Share the access code to collaborate.</span></div>
              : coaches.map(co=>(
                <div key={co.coach_id} style={{ padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:"12px" }}>
                  <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:`${C.cyan}33`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"800",fontSize:"13px",color:C.cyan }}>{co.coach_name?.[0]?.toUpperCase()||"?"}</div>
                  <div><div style={{ fontWeight:"600",fontSize:"13px" }}>{co.coach_name}</div><div style={{ fontSize:"11px",color:C.muted }}>Joined · {co.granted_at?.slice(0,10)}</div></div>
                  {(isOwner||isAdmin)&&<button onClick={()=>onRevoke(co.coach_id,co.coach_name)} style={{ marginLeft:"auto",background:"none",border:`1px solid ${C.red}44`,color:C.red,borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"11px",fontWeight:"600" }}>Revoke</button>}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MATCH CARD — prediction confidence + ✅/❌ after result
// ─────────────────────────────────────────────────────────────
function MatchCard({ m }) {
  const done     = m.status==="completed";
  const hs       = m.home_score??null;
  const as_      = m.away_score??null;
  const winner   = done?(hs>as_?"home":hs<as_?"away":"draw"):null;
  const p        = m.prediction;
  const hp       = p?Math.round(p.home_win_prob*100):null;
  const dp       = p?Math.round(p.draw_prob*100):null;
  const ap       = p?Math.round(p.away_win_prob*100):null;
  const favoured = p?(hp>ap?"home":ap>hp?"away":"draw"):null;
  const conf     = p?Math.max(hp,dp,ap):null;
  const isXGB    = p?.model_version?.includes("xgb");

  return (
    <div style={{ background:C.card, border:`1px solid ${done?C.border:favoured==="home"?`${C.purple}33`:favoured==="away"?`${C.blue}33`:C.border}`, borderRadius:"12px", overflow:"hidden", transition:"all 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.3)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>

      {/* Top bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 16px", background:C.elevated, fontSize:"11px" }}>
        <span style={{ color:C.blue, fontWeight:"700", background:`${C.blue}18`, borderRadius:"4px", padding:"2px 8px" }}>Round {m.round_number||"—"}</span>
        <span style={{ color:"#555" }}>
          {m.match_date?new Date(m.match_date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}):"—"}
          {m.venue&&<span style={{ color:"#444" }}> · {m.venue}</span>}
        </span>
        <span style={{ color:done?C.green:m.status==="postponed"?C.red:C.yellow, fontWeight:"700", background:done?`${C.green}18`:`${C.yellow}18`, borderRadius:"4px", padding:"2px 8px" }}>
          {done?"Full Time":m.status==="postponed"?"Postponed":"Upcoming"}
        </span>
      </div>

      <div style={{ padding:"16px 20px" }}>
        {/* Score row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:"12px", marginBottom:(done||p)?"14px":"0" }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:winner==="home"?"900":"700", fontSize:"15px", color:winner==="home"?C.yellow:winner==="draw"?"#fff":"#aaa" }}>{m.home_team}</div>
            <div style={{ fontSize:"11px", color:C.muted, marginTop:"3px" }}>HOME</div>
            {!done&&favoured==="home"&&conf>=50&&<div style={{ fontSize:"10px",color:C.purple,marginTop:"3px",fontWeight:"600" }}>⭐ Favoured</div>}
          </div>
          <div style={{ textAlign:"center" }}>
            {done?(
              <div style={{ background:"#0f0f1a", borderRadius:"10px", padding:"10px 18px", border:`1px solid ${winner==="draw"?C.yellow:C.border}` }}>
                <div style={{ fontWeight:"900", fontSize:"22px", letterSpacing:"3px" }}>
                  <span style={{ color:winner==="home"?C.green:winner==="draw"?C.yellow:"#fff" }}>{hs}</span>
                  <span style={{ color:"#333", margin:"0 8px" }}>–</span>
                  <span style={{ color:winner==="away"?C.green:winner==="draw"?C.yellow:"#fff" }}>{as_}</span>
                </div>
                {winner==="draw"&&<div style={{ fontSize:"10px",color:C.yellow,marginTop:"3px",fontWeight:"700" }}>DRAW</div>}
              </div>
            ):(
              <div style={{ background:"#0f0f1a", borderRadius:"10px", padding:"10px 14px", minWidth:"60px" }}>
                <div style={{ fontSize:"12px", fontWeight:"800", color:C.muted, letterSpacing:"2px" }}>VS</div>
                {m.match_date&&<div style={{ fontSize:"10px",color:"#444",marginTop:"2px" }}>{new Date(m.match_date).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>}
              </div>
            )}
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontWeight:winner==="away"?"900":"700", fontSize:"15px", color:winner==="away"?C.yellow:winner==="draw"?"#fff":"#aaa" }}>{m.away_team}</div>
            <div style={{ fontSize:"11px", color:C.muted, marginTop:"3px" }}>AWAY</div>
            {!done&&favoured==="away"&&conf>=50&&<div style={{ fontSize:"10px",color:C.blue,marginTop:"3px",fontWeight:"600" }}>⭐ Favoured</div>}
          </div>
        </div>

        {/* Prediction — upcoming matches */}
        {p&&!done&&(
          <div style={{ background:"#0a0a14", borderRadius:"10px", padding:"12px 14px", border:"1px solid #ffffff08" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
              <div style={{ fontSize:"10px", color:"#555", fontWeight:"700", textTransform:"uppercase" }}>
                {isXGB?"🤖 XGBoost":"📊 Statistical Model"}
              </div>
              <div style={{ fontSize:"10px", fontWeight:"700", color:conf>=70?C.green:conf>=55?C.yellow:C.muted }}>
                {conf>=70?"High Confidence":conf>=55?"Medium":"Low Confidence"}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"8px" }}>
              {[{l:"Home Win",pct:hp,c:C.purple},{l:"Draw",pct:dp,c:C.yellow},{l:"Away Win",pct:ap,c:C.blue}].map(({l,pct,c})=>(
                <div key={l} style={{ textAlign:"center" }}>
                  <div style={{ height:"5px", background:"#ffffff0d", borderRadius:"3px", marginBottom:"4px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:c, borderRadius:"3px" }}/>
                  </div>
                  <div style={{ fontSize:"14px", fontWeight:"800", color:c }}>{pct}%</div>
                  <div style={{ fontSize:"9px", color:"#444", marginTop:"1px" }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ height:"8px", borderRadius:"4px", overflow:"hidden", display:"flex" }}>
              <div style={{ width:`${hp}%`, background:`linear-gradient(90deg,${C.purple}cc,${C.purple}88)` }}/>
              <div style={{ width:`${dp}%`, background:`${C.yellow}99` }}/>
              <div style={{ width:`${ap}%`, background:`linear-gradient(90deg,${C.blue}88,${C.blue}cc)` }}/>
            </div>
            <div style={{ marginTop:"6px", fontSize:"11px", color:C.muted, textAlign:"center" }}>
              Predicted: <span style={{ color:favoured==="home"?C.purple:favoured==="away"?C.blue:C.yellow, fontWeight:"700" }}>
                {favoured==="home"?`${m.home_team} Win`:favoured==="away"?`${m.away_team} Win`:"Draw"}
              </span>
            </div>
          </div>
        )}

        {/* Post-match: was prediction correct? */}
        {p&&done&&(
          <div style={{ background:"#0a0a14", borderRadius:"8px", padding:"7px 12px", border:"1px solid #ffffff08", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"11px" }}>
            <span style={{ color:"#555" }}>
              AI predicted: <span style={{ color:favoured==="home"?C.purple:favoured==="away"?C.blue:C.yellow, fontWeight:"700" }}>
                {favoured==="home"?`${m.home_team} Win`:favoured==="away"?`${m.away_team} Win`:"Draw"}
              </span> ({conf}%)
            </span>
            {(()=>{ const correct=winner===favoured; return (
              <span style={{ color:correct?C.green:C.red, fontWeight:"700", background:correct?`${C.green}18`:`${C.red}18`, borderRadius:"4px", padding:"2px 8px" }}>
                {correct?"✅ Correct":"❌ Wrong"}
              </span>
            ); })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MINI TABLE
// ─────────────────────────────────────────────────────────────
function MiniTable({ standings }) {
  if (!standings.length) return <Empty text="No matches yet." />;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
        <thead>
          <tr style={{ background:C.elevated }}>
            {["#","Team","P","W","D","L","Pts"].map(h=>(
              <th key={h} style={{ padding:"9px 8px", textAlign:h==="Team"?"left":"center", color:"#555", fontWeight:"600", fontSize:"10px", textTransform:"uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((s,i)=>(
            <tr key={s.team} style={{ borderTop:`1px solid ${C.border}`, background:i===0?`${C.yellow}06`:i<3?`${C.purple}04`:"transparent" }}>
              <td style={{ padding:"8px", textAlign:"center", color:i<3?C.yellow:"#555", fontWeight:i<3?"800":"400", fontSize:"11px" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</td>
              <td style={{ padding:"8px", fontWeight:"600", maxWidth:"90px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.team}</td>
              <td style={{ padding:"8px", textAlign:"center", color:"#888" }}>{s.p}</td>
              <td style={{ padding:"8px", textAlign:"center", color:C.green, fontWeight:"600" }}>{s.w}</td>
              <td style={{ padding:"8px", textAlign:"center", color:"#888" }}>{s.d}</td>
              <td style={{ padding:"8px", textAlign:"center", color:C.red }}>{s.l}</td>
              <td style={{ padding:"8px", textAlign:"center", fontWeight:"900", color:C.purple, fontSize:"13px" }}>{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  HIGHLIGHT CARD
// ─────────────────────────────────────────────────────────────
function HighlightCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${color}22`, borderRadius:"12px", padding:"16px 18px", borderLeft:`3px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
        <span style={{ fontSize:"18px" }}>{icon}</span>
        <span style={{ fontSize:"11px", color:C.muted, fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</span>
      </div>
      <div style={{ fontWeight:"800", fontSize:"14px", marginBottom:"3px", color:"#fff" }}>{value}</div>
      <div style={{ fontSize:"11px", color:"#555" }}>{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MODALS
// ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated, flash }) {
  const [form,setForm]     = useState({ title:"", description:"", season_name:"", start_date:"", end_date:"" });
  const [saving,setSaving] = useState(false);
  const submit = async () => {
    if (!form.title.trim()) return flash(false,"Title is required");
    setSaving(true);
    const res=await fetch(`${BASE}/tournaments/`,{method:"POST",headers:getHeaders(),body:JSON.stringify(form)});
    const d=await res.json(); setSaving(false);
    res.ok?onCreated(d.tournament):flash(false,d.error||"Failed");
  };
  return (
    <Modal title="Create New Tournament" onClose={onClose}>
      <MF label="Tournament Title *" value={form.title} onChange={v=>setForm({...form,title:v})} placeholder="e.g. First Semester Football Cup" />
      <MF label="Description" value={form.description} onChange={v=>setForm({...form,description:v})} placeholder="Optional" />
      <MF label="Season Name" value={form.season_name} onChange={v=>setForm({...form,season_name:v})} placeholder={`e.g. Season ${new Date().getFullYear()}`} />
      <div className="tp-grid tp-grid-form" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
        <MF label="Start Date" type="date" value={form.start_date} onChange={v=>setForm({...form,start_date:v})} />
        <MF label="End Date"   type="date" value={form.end_date}   onChange={v=>setForm({...form,end_date:v})} />
      </div>
      <SolidBtn color={C.purple} full onClick={submit} disabled={saving}>{saving?"Creating...":"Create Tournament"}</SolidBtn>
    </Modal>
  );
}

function JoinModal({ onClose, onJoined, flash }) {
  const [code,setCode]     = useState("");
  const [saving,setSaving] = useState(false);
  const submit = async () => {
    if (!code.trim()) return flash(false,"Enter the access code");
    setSaving(true);
    const res=await fetch(`${BASE}/tournaments/join`,{method:"POST",headers:getHeaders(),body:JSON.stringify({access_code:code.trim().toUpperCase()})});
    const d=await res.json(); setSaving(false);
    res.ok?onJoined(d.tournament):flash(false,d.error||"Invalid code");
  };
  return (
    <Modal title="Join Tournament via Access Code" onClose={onClose}>
      <p style={{ color:"#666", fontSize:"13px", marginTop:0, lineHeight:"1.6" }}>
        Get the 8-character code from the tournament owner. Once joined you can manage matches and upload results.
      </p>
      <MF label="Access Code *" value={code} onChange={setCode} placeholder="e.g. AB3X9KF2"
        style={{ fontFamily:"monospace", fontSize:"20px", letterSpacing:"5px", textTransform:"uppercase", textAlign:"center" }} />
      <SolidBtn color={C.cyan} full onClick={submit} disabled={saving}>{saving?"Joining...":"Join Tournament"}</SolidBtn>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,backdropFilter:"blur(4px)" }} />
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:1001,background:C.card,border:"1px solid #ffffff18",borderRadius:"20px",padding:"32px",width:"min(480px,92vw)",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
          <div style={{ fontWeight:"800",fontSize:"17px" }}>{title}</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"22px",lineHeight:1,padding:"4px" }}>✕</button>
        </div>
        {children}
      </div>
    </>
  );
}

function MF({ label, value, onChange, placeholder, type="text", style={} }) {
  return (
    <div style={{ marginBottom:"16px" }}>
      <div style={{ fontSize:"11px",color:"#666",marginBottom:"6px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.5px" }}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%",padding:"11px 14px",background:C.elevated,border:"1px solid #ffffff12",borderRadius:"10px",color:"#fff",fontSize:"13px",boxSizing:"border-box",outline:"none",...style }}
        onFocus={e=>e.target.style.borderColor="#7c3aed55"}
        onBlur={e=>e.target.style.borderColor="#ffffff12"} />
    </div>
  );
}

function SolidBtn({ color, onClick, children, full, disabled, sm }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:sm?"6px 14px":"11px 22px", background:color, border:"none", color:"#fff",
      borderRadius:"9px", cursor:disabled?"not-allowed":"pointer", fontWeight:"700",
      fontSize:sm?"12px":"13px", whiteSpace:"nowrap", width:full?"100%":"auto",
      opacity:disabled?0.6:1, marginTop:full?"4px":0, boxShadow:disabled?"none":`0 4px 16px ${color}44`, transition:"all 0.2s",
    }}
    onMouseEnter={e=>{ if(!disabled)e.currentTarget.style.opacity="0.9"; }}
    onMouseLeave={e=>{ e.currentTarget.style.opacity=disabled?"0.6":"1"; }}>
      {children}
    </button>
  );
}

function GhostBtn({ color, onClick, children, sm }) {
  return (
    <button onClick={onClick} style={{
      padding:sm?"6px 12px":"10px 20px", background:`${color}18`, border:`1px solid ${color}44`,
      color, borderRadius:"9px", cursor:"pointer", fontWeight:"600", fontSize:sm?"12px":"13px", whiteSpace:"nowrap", transition:"all 0.2s",
    }}
    onMouseEnter={e=>{ e.currentTarget.style.background=`${color}28`; }}
    onMouseLeave={e=>{ e.currentTarget.style.background=`${color}18`; }}>
      {children}
    </button>
  );
}

function Card({ children, style }) {
  return <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"18px",...style }}>{children}</div>;
}

function SBadge({ status }) {
  const m={active:{c:C.green,l:"Active"},completed:{c:C.blue,l:"Completed"},archived:{c:"#444",l:"Archived"}};
  const {c,l}=m[status]||{c:"#444",l:status};
  return <span style={{ background:`${c}22`,color:c,border:`1px solid ${c}44`,borderRadius:"20px",padding:"4px 12px",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap" }}>{l}</span>;
}

function Toast({ color, children }) {
  return <div style={{ background:`${color}15`,border:`1px solid ${color}40`,color,borderRadius:"10px",padding:"13px 18px",fontSize:"13px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"8px" }}><span>{children}</span></div>;
}

function SecTitle({ children, style }) {
  return <div style={{ fontWeight:"700",fontSize:"14px",marginBottom:"14px",color:"#aaa",display:"flex",alignItems:"center",gap:"8px",...style }}>{children}</div>;
}

function Empty({ text }) {
  return (
    <div style={{ textAlign:"center",padding:"48px 24px",color:"#333",background:C.card,borderRadius:"14px",border:`1px solid ${C.border}` }}>
      <div style={{ fontSize:"36px",marginBottom:"12px",filter:"grayscale(1)" }}>📭</div>
      <div style={{ fontSize:"13px",color:"#444",lineHeight:"1.6",maxWidth:"300px",margin:"0 auto" }}>{text}</div>
    </div>
  );
}

function ChartEmpty({ text="No data yet" }) {
  return <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#333",fontSize:"12px",pointerEvents:"none" }}>{text}</div>;
}

function Spinner() {
  return (
    <div style={{ textAlign:"center",padding:"6rem",color:"#555" }}>
      <div style={{ fontSize:"44px",marginBottom:"16px" }}>⚽</div>
      <div style={{ fontSize:"14px",fontWeight:"600" }}>Loading tournament data...</div>
    </div>
  );
}
