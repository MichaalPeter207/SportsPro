
// =============================================================
//  pages/Login.jsx
//  - If user is unverified → redirect to verify-email page
//  - Show/hide password
//  - Forgot password flow
// =============================================================

import { useState } from "react";
import { bgSportsPro } from "../styles/bgStyles";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function Login({ setPage, setUser, setVerifyEmail }) {
  const [view, setView]               = useState("login"); // login | forgot | sent
  const [form, setForm]               = useState({ username: "", password: "" });
  const [resetEmail, setResetEmail]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  // -----------------------------------------------------------
  // LOGIN
  // -----------------------------------------------------------
  const handleLogin = async () => {
    setError("");
    if (!form.username || !form.password) {
      setError("Username and password are required."); return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        // If unverified, redirect to verify page with their email
        if (data.unverified && data.email) {
          setVerifyEmail(data.email);
          setPage("verify-email");
          return;
        }
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.access_token);
      setUser(data.user);
      setPage("dashboard");

    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // FORGOT PASSWORD
  // -----------------------------------------------------------
  const handleForgotPassword = async () => {
    setError("");
    if (!resetEmail) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send reset email"); return; }
      setView("sent");
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // FORGOT PASSWORD SENT VIEW
  // -----------------------------------------------------------
  if (view === "sent") {
    return (
      <div className="auth-page" style={{ ...bgSportsPro, padding: "2rem 1.5rem", minHeight: "100vh" }}>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
          <div className="auth-title">Check Your Email</div>
          <div className="auth-subtitle" style={{ marginBottom: "1.5rem" }}>
            We sent a password reset link to:<br />
            <strong style={{ color: "white" }}>{resetEmail}</strong>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem", lineHeight: 1.7 }}>
            Click the link in the email to reset your password. The link expires in 1 hour.
            Check your spam folder if you don't see it.
          </p>
          <button className="btn-submit" onClick={() => { setView("login"); setResetEmail(""); }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // FORGOT PASSWORD FORM
  // -----------------------------------------------------------
  if (view === "forgot") {
    return (
      <div className="auth-page" style={{ ...bgSportsPro, padding: "2rem 1.5rem", minHeight: "100vh" }}>
        <div className="auth-card">
          <div className="auth-logo">🔑</div>
          <div className="auth-title">Reset Password</div>
          <div className="auth-subtitle">Enter your email to receive a reset link</div>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
            />
          </div>

          <button className="btn-submit" onClick={handleForgotPassword} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="auth-footer">
            Remember your password?{" "}
            <a href="#" onClick={() => { setView("login"); setError(""); }}>Back to login</a>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // LOGIN FORM
  // -----------------------------------------------------------
  return (
    <div className="auth-page" style={{ ...bgSportsPro, padding: "2rem 1.5rem", minHeight: "100vh" }}>
      <div className="auth-card">
        <div className="auth-logo">SP</div>
        <div className="auth-title">Welcome Back</div>
        <div className="auth-subtitle">Sign in to your SportsPro account</div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className="form-input"
            placeholder="Enter your username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              style={{ paddingRight: "2.5rem" }}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: "12px", top: "50%",
                transform: "translateY(-50%)", background: "none", border: "none",
                cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem", padding: 0
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <div style={{ textAlign: "right", marginTop: "0.4rem" }}>
            <a
              href="#"
              onClick={() => { setView("forgot"); setError(""); }}
              style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", textDecoration: "none", fontWeight: 600 }}
            >
              Forgot password?
            </a>
          </div>
        </div>

        <button className="btn-submit" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>

        <div className="auth-footer">
          Don't have an account?{" "}
          <a href="#" onClick={() => setPage("register")}>Register here</a>
        </div>
      </div>
    </div>
  );
}
