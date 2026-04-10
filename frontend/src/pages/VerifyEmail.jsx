// =============================================================
//  pages/VerifyEmail.jsx
//  User enters the 6-digit code sent to their email.
//  - Correct code → redirect to login
//  - Wrong code   → "Invalid code. Please try again."
//  - Resend code  → calls /api/auth/resend-code
// =============================================================

import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function VerifyEmail({ setPage, verifyEmail }) {
  const [email, setEmail]       = useState(verifyEmail || "");
  const [digits, setDigits]     = useState(["", "", "", "", "", ""]);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent]     = useState(false);
  const refs                    = useRef([]);

  const code = digits.join("");

  // -----------------------------------------------------------
  // Handle individual digit input
  // -----------------------------------------------------------
  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;           // digits only
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError("");
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits]; next[i] = ""; setDigits(next);
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft"  && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
    if (e.key === "Enter" && code.length === 6) handleVerify();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(""));
      refs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // -----------------------------------------------------------
  // Submit code
  // -----------------------------------------------------------
  const handleVerify = async () => {
    setError("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code."); return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setDigits(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        return;
      }

      setSuccess("Email verified! Redirecting to sign in...");
      setTimeout(() => setPage("login"), 2000);

    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // Resend code
  // -----------------------------------------------------------
  const handleResend = async () => {
    setResending(true);
    setError("");
    setResent(false);
    try {
      const res  = await fetch(`${API}/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to resend code."); return; }
      setResent(true);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
      setTimeout(() => setResent(false), 4000);
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page" style={{ ...require("../styles/bgStyles").bgSportsPro, padding: "2rem 1.5rem", minHeight: "100vh" }}>
      <div className="auth-card" style={{ maxWidth: 420, textAlign: "center" }}>

        {/* Icon */}
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📬</div>
        <div className="auth-title">Verify Your Email</div>
        <div className="auth-subtitle" style={{ marginBottom: "0.5rem" }}>
          We sent a 6-digit code to:
        </div>
        <div style={{
          display: "inline-block",
          background: "rgba(124,58,237,0.1)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: "8px",
          padding: "6px 16px",
          fontSize: "0.85rem",
          color: "#a78bfa",
          fontFamily: "monospace",
          fontWeight: 700,
          marginBottom: "1.75rem",
          wordBreak: "break-all",
        }}>
          {email || "your email address"}
        </div>

        {!verifyEmail && (
          <div style={{ marginBottom: "1rem" }}>
            <div className="form-label" style={{ textAlign: "left" }}>Email</div>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        )}

        {/* Alerts */}
        {error   && <div className="alert alert-error"   style={{ textAlign:"left" }}>⚠ {error}</div>}
        {success && <div className="alert alert-success" style={{ textAlign:"left" }}>✓ {success}</div>}
        {resent  && !error && (
          <div className="alert alert-success" style={{ textAlign:"left" }}>
            ✓ New code sent! Check your inbox.
          </div>
        )}

        {/* 6-digit input boxes */}
        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              style={{
                width: "46px",
                height: "54px",
                textAlign: "center",
                fontSize: "22px",
                fontWeight: 700,
                fontFamily: "monospace",
                borderRadius: "10px",
                border: `1.5px solid ${
                  error ? "var(--accent-red)"
                  : d    ? "rgba(124,58,237,0.7)"
                         : "var(--border)"
                }`,
                background: error
                  ? "rgba(239,68,68,0.07)"
                  : d
                    ? "rgba(124,58,237,0.1)"
                    : "var(--surface)",
                color: error ? "var(--accent-red)" : "white",
                outline: "none",
                transition: "border-color 0.15s, background 0.15s",
                caretColor: "#7c3aed",
              }}
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          className="btn-submit"
          onClick={handleVerify}
          disabled={loading || code.length < 6}
          style={{ marginBottom: "1rem", opacity: code.length < 6 ? 0.5 : 1 }}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        {/* Resend + back links */}
        <div className="auth-footer" style={{ flexDirection: "column", gap: "0.4rem" }}>
          <span>
            Didn't receive it?{" "}
            <a
              href="#"
              onClick={e => { e.preventDefault(); handleResend(); }}
              style={{ pointerEvents: resending ? "none" : "auto", opacity: resending ? 0.5 : 1 }}
            >
              {resending ? "Sending..." : "Resend code"}
            </a>
          </span>
          <span>
            Wrong email?{" "}
            <a href="#" onClick={() => setPage("register")}>Go back to register</a>
          </span>
        </div>
      </div>
    </div>
  );
}
