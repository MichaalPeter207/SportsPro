// =============================================================
//  pages/AdminPanel.jsx
//  Admin only: assign roles, delete users
// =============================================================

import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ALL_ROLES   = ["fan", "coach", "analyst", "admin"];
const ROLE_COLORS = { admin: "#ef4444", coach: "#6c63ff", analyst: "#3b82f6", fan: "#22c55e" };

export default function AdminPanel() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("users"); // users | feedback
  const [saving,   setSaving]   = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [confirm,  setConfirm]  = useState(null); // username pending delete confirm
  const [msg,      setMsg]      = useState("");
  const [search,   setSearch]   = useState("");
  const [pending,  setPending]  = useState({});
  const [feedback, setFeedback] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 5000);
  };

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/auth/users`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        const list = d.users || [];
        setUsers(list);
        const init = {};
        list.forEach(u => { init[u.user_id] = [...(u.roles || [u.role])]; });
        setPending(init);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadFeedback = () => {
    setFbLoading(true);
    fetch(`${BASE}/feedback/`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        setFeedback(d.feedback || []);
        setFbLoading(false);
      })
      .catch(() => setFbLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "feedback") loadFeedback(); }, [tab]);

  // ── Role toggle ────────────────────────────────────────────
  const toggleRole = (userId, role) => {
    setPending(prev => {
      const cur = prev[userId] || [];
      const has = cur.includes(role);
      if (has && cur.length === 1) return prev;
      return { ...prev, [userId]: has ? cur.filter(r => r !== role) : [...cur, role] };
    });
  };

  const saveRoles = async (username, userId) => {
    const roles = pending[userId];
    if (!roles?.length) return;
    setSaving(userId);
    setMsg("");
    try {
      const res  = await fetch(`${BASE}/auth/assign-roles`, {
        method: "PUT", headers: authHeaders,
        body: JSON.stringify({ username, roles }),
      });
      const data = await res.json();
      flash(res.ok
        ? `✅ Roles updated for ${username}. Email + in-app notification sent.`
        : `❌ ${data.error}`);
      if (res.ok) load();
    } catch { flash("❌ Network error"); }
    finally  { setSaving(null); }
  };

  // ── Delete user ────────────────────────────────────────────
  const deleteUser = async (username) => {
    setDeleting(username);
    setConfirm(null);
    try {
      const res  = await fetch(`${BASE}/auth/users/${username}`, {
        method: "DELETE", headers: authHeaders,
      });
      const data = await res.json();
      flash(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
      if (res.ok) load();
    } catch { flash("❌ Network error"); }
    finally  { setDeleting(null); }
  };

  // ── Filter ─────────────────────────────────────────────────
  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "980px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 className="page-title">🛡️ Admin Panel</h1>
        <p className="page-subtitle">
          Manage user roles and accounts. Role changes trigger email + in-app notifications.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "18px", background: "var(--bg-elevated)", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {[
          { id: "users", label: "Users" },
          { id: "feedback", label: "Feedback" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: tab === t.id ? "linear-gradient(135deg,#6c63ff,#3b82f6)" : "transparent",
            color: tab === t.id ? "#fff" : "#777", fontWeight: tab === t.id ? "700" : "500",
            fontSize: "12px",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <>
          {/* Role legend */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            {ALL_ROLES.map(r => (
              <div key={r} style={{
                background: ROLE_COLORS[r] + "22",
                border: `1px solid ${ROLE_COLORS[r]}44`,
                borderRadius: "20px", padding: "4px 14px",
                fontSize: "12px", color: ROLE_COLORS[r], fontWeight: "bold",
              }}>
                {r.charAt(0).toUpperCase() + r.slice(1)} —{" "}
                <span style={{ color: "#aaa", fontWeight: "normal" }}>
                  {r === "fan"     ? "View only"                       : ""}
                  {r === "coach"   ? "Manage matches, teams, players"  : ""}
                  {r === "analyst" ? "Analytics access"                : ""}
                  {r === "admin"   ? "Full control + role assignment"  : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Flash message */}
      {msg && (
        <div className={`alert ${msg.startsWith("✅") ? "alert-success" : "alert-error"}`}>
          {msg}
        </div>
      )}

      {tab === "users" && (
        <>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ marginBottom: "20px" }}
          />

          {/* User count */}
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filtered.map(u => {
                const curRoles  = pending[u.user_id] || [];
                const original  = (u.roles || [u.role]).slice().sort().join(",");
                const changed   = curRoles.slice().sort().join(",") !== original;
                const isSaving  = saving  === u.user_id;
                const isDeleting= deleting === u.username;
                const isConfirm = confirm  === u.username;

                return (
                  <div key={u.user_id} className="card" style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>

                      {/* User info */}
                      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                          {u.first_name || ""} {u.last_name || ""}
                          {!u.first_name && !u.last_name && u.username}
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                          @{u.username}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.email}
                        </div>
                      </div>

                      {/* Role toggle buttons */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {ALL_ROLES.map(role => {
                          const active = curRoles.includes(role);
                          return (
                            <button key={role} onClick={() => toggleRole(u.user_id, role)} style={{
                              padding: "5px 12px", borderRadius: "20px",
                              fontSize: "12px", fontWeight: "bold", cursor: "pointer",
                              border: `2px solid ${ROLE_COLORS[role]}`,
                              background: active ? ROLE_COLORS[role] : "transparent",
                              color: active ? "#fff" : ROLE_COLORS[role],
                              transition: "all .15s",
                            }}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Save roles button — only if changed */}
                      {changed && (
                        <button onClick={() => saveRoles(u.username, u.user_id)}
                          disabled={isSaving} style={{
                            background: "linear-gradient(135deg,#6c63ff,#3b82f6)",
                            color: "#fff", border: "none", borderRadius: "8px",
                            padding: "8px 16px", fontWeight: "bold",
                            cursor: isSaving ? "not-allowed" : "pointer",
                            fontSize: "13px", opacity: isSaving ? 0.7 : 1,
                            whiteSpace: "nowrap",
                          }}>
                          {isSaving ? "Saving..." : "💾 Save"}
                        </button>
                      )}

                      {/* Delete button */}
                      {!isConfirm ? (
                        <button onClick={() => setConfirm(u.username)}
                          disabled={isDeleting} style={{
                            background: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "8px", padding: "8px 14px",
                            fontWeight: "bold", cursor: "pointer",
                            fontSize: "13px", whiteSpace: "nowrap",
                          }}>
                          {isDeleting ? "Deleting..." : "🗑️ Delete"}
                        </button>
                      ) : (
                        /* Confirm delete */
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "#ef4444", whiteSpace: "nowrap" }}>
                            Sure?
                          </span>
                          <button onClick={() => deleteUser(u.username)} style={{
                            background: "#ef4444", color: "#fff", border: "none",
                            borderRadius: "6px", padding: "6px 12px",
                            fontWeight: "bold", cursor: "pointer", fontSize: "12px",
                          }}>
                            Yes, Delete
                          </button>
                          <button onClick={() => setConfirm(null)} style={{
                            background: "var(--bg-elevated)", color: "var(--text-secondary)",
                            border: "1px solid var(--border)", borderRadius: "6px",
                            padding: "6px 10px", cursor: "pointer", fontSize: "12px",
                          }}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No users found.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "feedback" && (
        <div>
          {fbLoading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {feedback.map(fb => (
                <div key={fb.feedback_id} className="card" style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <div style={{ fontWeight: "700", fontSize: "13px" }}>
                      {fb.username ? `${fb.username} (${fb.email})` : "Anonymous"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fb.created_at}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "700" }}>Rating:</div>
                    <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "800" }}>{fb.rating} / 5</div>
                    {fb.page && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>· {fb.page}</div>}
                  </div>
                  {fb.message && (
                    <div style={{ fontSize: "12px", color: "#aaa", lineHeight: 1.6 }}>
                      {fb.message}
                    </div>
                  )}
                </div>
              ))}

              {feedback.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No feedback yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

