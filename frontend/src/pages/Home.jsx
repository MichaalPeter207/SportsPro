// =============================================================
//  pages/Home.jsx — Public landing page (unauthenticated only)
// =============================================================

export default function Home({ setPage }) {
  const watermarkSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <g fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="6">
        <circle cx="900" cy="260" r="180"/>
        <path d="M900 80 L980 150 L940 250 L860 250 L820 150 Z"/>
        <path d="M900 440 L980 360 L940 260 L860 260 L820 360 Z"/>
        <path d="M720 260 L800 340 L880 300 L880 220 L800 180 Z"/>
        <path d="M1080 260 L1000 340 L920 300 L920 220 L1000 180 Z"/>
        <circle cx="300" cy="620" r="120"/>
        <path d="M300 520 L360 560 L340 620 L260 620 L240 560 Z"/>
        <path d="M300 720 L360 680 L340 620 L260 620 L240 680 Z"/>
      </g>
    </svg>`
  );

  return (
    <div style={{
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      color: "#fff",
      backgroundColor: "#0a0a14",
      backgroundImage: `
        radial-gradient(900px 400px at 15% -10%, rgba(34,197,94,0.22), transparent 60%),
        radial-gradient(800px 500px at 110% 0%, rgba(59,130,246,0.18), transparent 60%),
        linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08)),
        url("data:image/svg+xml;utf8,${watermarkSvg}")
      `,
      backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
      backgroundPosition: "left top, right top, center, center",
      backgroundSize: "auto, auto, cover, 1200px 800px",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 40px",
        borderBottom: "1px solid #ffffff08"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "14px"
          }}>
            SP
          </div>
          <span style={{ fontWeight: "800", fontSize: "18px" }}>
            Sports<span style={{ color: "#7c3aed" }}>Pro</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <span style={{
            fontSize: "12px",
            color: "#6b7280",
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontWeight: "700"
          }}>
            Matchday Hub
          </span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "96px 40px 52px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(34px, 5.8vw, 64px)", fontWeight: "900", lineHeight: "1.05", margin: "0 0 18px" }}>
          The Matchday Experience
          <br />
          <span style={{ background: "linear-gradient(135deg,#22c55e,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            
          </span>
        </h1>

        <p style={{ fontSize: "16px", color: "#9aa4b2", lineHeight: "1.7", maxWidth: "660px", margin: "0 auto 28px" }}>
          Follow every fixture, goal, and table update in real time. Coaches manage tournaments and teams, while fans get a clean, live matchday view — all in one platform.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setPage("register")} style={{
            padding: "12px 28px",
            background: "linear-gradient(135deg,#22c55e,#3b82f6)",
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "800",
            letterSpacing: "0.5px",
            textTransform: "uppercase"
          }}>
            Register
          </button>
          <button onClick={() => setPage("login")} style={{
            padding: "12px 28px",
            background: "transparent",
            border: "1px solid #ffffff22",
            borderRadius: "10px",
            color: "#aaa",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.4px"
          }}>
            Sign In
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ marginTop: "36px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px" }}>
          {[
            { k: "Fixtures", v: "Auto-Scheduled", c: "#22c55e" },
            { k: "Predictions", v: "AI-Powered", c: "#3b82f6" },
            { k: "Roles", v: "Coach / Fan", c: "#f59e0b" },
            { k: "Analytics", v: "Matchday KPIs", c: "#a78bfa" },
          ].map(s => (
            <div key={s.k} style={{ background: "rgba(18,18,43,0.85)", border: "1px solid #ffffff12", borderRadius: "12px", padding: "12px 10px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>{s.k}</div>
              <div style={{ fontWeight: "800", fontSize: "14px", color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 40px 70px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "16px" }}>
        {[
          { icon: "🏆", title: "Tournament Management", desc: "Create and manage active tournaments. Share access codes with co-coaches. Archive completed tournaments." },
          { icon: "🤖", title: "AI Match Predictions", desc: "Win probability for every fixture — home win, draw, and away win percentages before kickoff." },
          { icon: "📊", title: "Performance Analytics", desc: "Auto-generated player and team stats, standings, and visual performance charts after every match." },
          { icon: "🛡️", title: "Role-Based Access", desc: "Fans view. Coaches manage their own data. Admins oversee the platform. Secure and isolated by design." },
          { icon: "🔑", title: "Coach Collaboration", desc: "Share tournament access codes so co-coaches can upload results and stats for the same tournament." },
          { icon: "📱", title: "Live Standings", desc: "Real-time league table with points, goal difference, form guide — updates instantly after every result." },
        ].map(f => (
          <div key={f.title} style={{ background: "#12122b", border: "1px solid #ffffff0a", borderRadius: "14px", padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>{f.icon}</div>
            <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "8px" }}>{f.title}</div>
            <div style={{ color: "#666", fontSize: "13px", lineHeight: "1.6" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA strip */}
      <div style={{ background: "linear-gradient(135deg,#22c55e18,#3b82f618)", borderTop: "1px solid rgba(34,197,94,0.25)", padding: "52px 40px", textAlign: "center" }}>
        <h2 style={{ fontWeight: "900", fontSize: "26px", margin: "0 0 10px" }}>For Fans and Coaches</h2>
        <p style={{ color: "#768194", marginBottom: "0" }}>Fans get clean matchday updates, coaches run tournaments, and everyone stays in sync.</p>
      </div>

      <div style={{ padding: "24px 40px 36px", textAlign: "center", color: "#6b7280", fontSize: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        Copyright © {new Date().getFullYear()} SportsPro. All rights reserved.
      </div>
    </div>
  );
}
