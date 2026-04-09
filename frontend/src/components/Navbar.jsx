// =============================================================
//  components/Navbar.jsx
//  Only shown to authenticated users.
//  Links: Tournaments | Manage (coach/admin) | Admin (admin)
//  Right: Bell · Role badge · Username · Logout
// =============================================================

import { useState, useEffect, useRef } from "react";

const BASE = "http://localhost:5000/api";

export default function Navbar({ currentPage, setPage, user, onLogout }) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(user?.unread_notifications || 0);
  const notifRef = useRef(null);

  const roles          = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const isAdminOrCoach = roles.includes("admin") || roles.includes("coach")
                         || user?.role === "admin" || user?.role === "coach";
  const isAdmin        = roles.includes("admin") || user?.role === "admin";

  const links = [
    { label: "Tournaments", page: "tournaments", icon: "🏆" },
    ...(isAdminOrCoach ? [{ label: "Manage", page: "manage", icon: "⚙️" }] : []),
    ...(isAdmin        ? [{ label: "Admin",  page: "admin",  icon: "🛡️" }] : []),
  ];

  // Fetch notifications when bell opens
  useEffect(() => {
    if (!notifOpen || !user) return;
    const t = localStorage.getItem("token");
    fetch(`${BASE}/auth/notifications`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        setNotifs(d.notifications || []);
        setUnread(0);
        fetch(`${BASE}/auth/notifications/read`, {
          method: "PUT", headers: { Authorization: `Bearer ${t}` }
        });
      }).catch(() => {});
  }, [notifOpen, user]);

  // Close notif on outside click
  useEffect(() => {
    const fn = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Poll unread count every 60s
  useEffect(() => {
    if (!user) return;
    const poll = () => {
      const t = localStorage.getItem("token");
      if (!t) return;
      fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(d => { if (d?.user?.unread_notifications != null) setUnread(d.user.unread_notifications); })
        .catch(() => {});
    };
    const iv = setInterval(poll, 60000);
    return () => clearInterval(iv);
  }, [user]);

  const ago = d => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const roleLabel = roles.length
    ? roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(" · ")
    : (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Fan");

  return (
    <nav className="navbar">
      {/* Brand */}
      <a className="navbar-brand" href="#" onClick={e => { e.preventDefault(); setPage("tournaments"); }}>
        <div className="navbar-logo">SP</div>
        <span className="navbar-title">Sports<span>Pro</span></span>
      </a>

      {/* Links */}
      <ul className={`navbar-links ${menuOpen ? "open" : ""}`}>
        {links.map(link => (
          <li key={link.label}>
            <a href="#"
              className={currentPage === link.page ? "active" : ""}
              onClick={e => { e.preventDefault(); setPage(link.page); setMenuOpen(false); }}
            >
              <span>{link.icon}</span> {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Right section */}
      <div className="navbar-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button onClick={() => setNotifOpen(!notifOpen)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", position: "relative", padding: "4px 8px",
          }} title="Notifications">
            🔔
            {unread > 0 && (
              <span style={{
                position: "absolute", top: 0, right: 0,
                background: "#ef4444", color: "#fff", borderRadius: "50%",
                fontSize: "10px", width: "16px", height: "16px",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold",
              }}>{unread > 9 ? "9+" : unread}</span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: "absolute", right: 0, top: "110%",
              width: "320px", background: "#1a1a2e",
              border: "1px solid #6c63ff33", borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 1000, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #6c63ff22", fontWeight: "bold", fontSize: "14px" }}>
                Notifications
              </div>
              {notifs.length === 0
                ? <div style={{ padding: "24px", textAlign: "center", color: "#555", fontSize: "13px" }}>No notifications yet</div>
                : notifs.map((n, i) => (
                  <div key={i} style={{
                    padding: "12px 16px", borderBottom: "1px solid #ffffff08",
                    background: n.is_read ? "transparent" : "#6c63ff0d",
                  }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>{n.title}</div>
                    <div style={{ color: "#aaa", fontSize: "12px", lineHeight: "1.4" }}>{n.message}</div>
                    <div style={{ color: "#444", fontSize: "11px", marginTop: "4px" }}>{ago(n.created_at)}</div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Role badge */}
        <span style={{
          background: "linear-gradient(135deg,#6c63ff,#3b82f6)",
          padding: "4px 10px", borderRadius: "20px",
          fontSize: "11px", fontWeight: "bold", color: "#fff",
        }}>
          {roleLabel}
        </span>

        {/* Username */}
        <span style={{ fontSize: "13px", color: "#aaa" }}>{user.username}</span>

        {/* Logout */}
        <button className="btn-login" onClick={onLogout}>Logout</button>

        {/* Hamburger */}
        <div className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span><span></span><span></span>
        </div>
      </div>
    </nav>
  );
}