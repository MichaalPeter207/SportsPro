
// =============================================================
//  pages/Register.jsx
//  After successful registration → redirects to verify-email page
// =============================================================

import { useState } from "react";
import { bgSportsPro } from "../styles/bgStyles";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register({ setPage, setVerifyEmail }) {
  const [form, setForm] = useState({
    username: "", email: "", password: "", confirm_password: "",
    first_name: "", last_name: "", role: "fan", activation_code: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showCode, setShowCode]         = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const handleRoleChange = (e) => {
    setForm({ ...form, role: e.target.value, activation_code: "" });
    setError("");
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.username || !form.email || !form.password) {
      setError("Username, email and password are required."); return;
    }
    if (!emailRegex.test(form.email)) {
      setError("Invalid email address."); return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    if (form.role === "admin" && !form.activation_code.trim()) {
      setError("Activation code is required to register as Admin."); return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || "Registration failed"); return; }

      // Pass the registered email to the verify page and navigate there
      const email = data.email || form.email;
      setVerifyEmail(email);
      const url = new URL(window.location.href);
      url.searchParams.set("verify","1");
      url.searchParams.set("email", email);
      window.history.replaceState({}, "", url);
      setPage("verify-email");

    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = (show, toggle) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute", right: "12px", top: "50%",
        transform: "translateY(-50%)", background: "none", border: "none",
        cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem", padding: 0
      }}
    >
      {show ? "🙈" : "👁️"}
    </button>
  );

  return (
    <div className="auth-page" style={{ ...bgSportsPro, padding: "2rem 1.5rem", minHeight: "100vh" }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">SP</div>
        <div className="auth-title">Create Account</div>
        <div className="auth-subtitle">Join the SportsPro platform</div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input className="form-input" placeholder="John" value={form.first_name}
              onChange={e => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" placeholder="Doe" value={form.last_name}
              onChange={e => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" placeholder="Choose a username" value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" placeholder="your@email.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              className="form-input" placeholder="Create a password (min 6 chars)"
              value={form.password}
              style={{ paddingRight: "2.5rem" }}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            {eyeBtn(showPassword, () => setShowPassword(!showPassword))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              className="form-input" placeholder="Re-type your password"
              value={form.confirm_password}
              style={{
                paddingRight: "2.5rem",
                borderColor: form.confirm_password && form.password !== form.confirm_password
                  ? "var(--accent-red)" : ""
              }}
              onChange={e => setForm({ ...form, confirm_password: e.target.value })}
            />
            {eyeBtn(showConfirm, () => setShowConfirm(!showConfirm))}
          </div>
          {form.confirm_password && form.password !== form.confirm_password && (
            <div style={{ fontSize: "0.75rem", color: "var(--accent-red)", marginTop: "0.3rem" }}>
              ⚠ Passwords do not match
            </div>
          )}
          {form.confirm_password && form.password === form.confirm_password && (
            <div style={{ fontSize: "0.75rem", color: "var(--accent-green)", marginTop: "0.3rem" }}>
              ✓ Passwords match
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={handleRoleChange}>
            <option value="fan">Fan</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {form.role === "admin" && (
          <div className="form-group">
            <label className="form-label">Admin Activation Code</label>
            <div style={{ position: "relative" }}>
              <input
                type={showCode ? "text" : "password"}
                className="form-input"
                placeholder="Enter activation code"
                value={form.activation_code}
                style={{ paddingRight: "2.5rem" }}
                onChange={e => setForm({ ...form, activation_code: e.target.value })}
              />
              {eyeBtn(showCode, () => setShowCode(!showCode))}
            </div>
            <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              🔒 Contact your system administrator for the activation code
            </div>
          </div>
        )}

        <div style={{
          padding: "0.75rem 1rem",
          background: form.role === "admin" ? "rgba(124,58,237,0.08)" : "rgba(6,182,212,0.06)",
          border: `1px solid ${form.role === "admin" ? "rgba(124,58,237,0.2)" : "rgba(6,182,212,0.15)"}`,
          borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)",
          marginBottom: "1rem", lineHeight: 1.6
        }}>
          {form.role === "fan"
            ? "👤 As a Fan you can view standings, fixtures, and match predictions."
            : "🔐 As an Admin you can manage leagues, teams, players and assign roles."}
        </div>

        <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="auth-footer">
          Already have an account?{" "}
          <a href="#" onClick={() => setPage("login")}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
