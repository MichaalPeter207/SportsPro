// pages/ResetPassword.jsx
import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function ResetPassword({ setPage }) {
  const [stage,    setStage]    = useState("request"); // request | sent | reset | done
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [token,    setToken]    = useState("");
  const [msg,      setMsg]      = useState("");
  const [err,      setErr]      = useState("");
  const [busy,     setBusy]     = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConfirm,setShowConfirm] = useState(false);

  // Check if page loaded with ?token= in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) { setToken(t); setStage("reset"); }
  }, []);

  const flash = (ok, text) => {
    ok ? setMsg(text) : setErr(text);
    setTimeout(() => { setMsg(""); setErr(""); }, 6000);
  };

  // Step 1 — request reset email
  const requestReset = async () => {
    if (!email.trim()) return flash(false, "Please enter your email address");
    setBusy(true);
    try {
      const res  = await fetch(`${BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      setBusy(false);
      if (res.ok || res.status === 200) {
        setStage("sent");
      } else {
        flash(false, data.error || "Request failed. Please try again.");
      }
    } catch (e) {
      setBusy(false);
      flash(false, "Network error. Is the backend running?");
    }
  };

  // Step 2 — submit new password
  const submitReset = async () => {
    if (!password) return flash(false, "Enter a new password");
    if (password.length < 6) return flash(false, "Password must be at least 6 characters");
    if (password !== confirm) return flash(false, "Passwords do not match");
    setBusy(true);
    try {
      const res  = await fetch(`${BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setBusy(false);
      if (res.ok) {
        setStage("done");
      } else {
        flash(false, data.error || "Reset failed. The link may have expired.");
      }
    } catch (e) {
      setBusy(false);
      flash(false, "Network error. Is the backend running?");
    }
  };

  const S = {
    wrap: { minHeight:"100vh", background:"#0a0a14", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", padding:"20px" },
    box:  { background:"#12122b", border:"1px solid #ffffff12", borderRadius:"20px", padding:"40px 36px", width:"min(420px,100%)" },
    logo: { textAlign:"center", marginBottom:"28px" },
    title:{ fontWeight:"900", fontSize:"22px", color:"#fff", marginBottom:"6px" },
    sub:  { fontSize:"13px", color:"#555", lineHeight:"1.5" },
    label:{ fontSize:"11px", color:"#666", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginTop:"16px" },
    input:{ width:"100%", padding:"11px 14px", background:"#1a1a2e", border:"1px solid #ffffff12", borderRadius:"10px", color:"#fff", fontSize:"13px", boxSizing:"border-box", outline:"none" },
    btn:  { width:"100%", padding:"12px", background:"linear-gradient(135deg,#7c3aed,#3b82f6)", border:"none", borderRadius:"10px", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", marginTop:"20px" },
    back: { display:"block", textAlign:"center", marginTop:"16px", color:"#555", fontSize:"13px", cursor:"pointer", background:"none", border:"none", width:"100%" },
    ok:   { background:"#22c55e18", border:"1px solid #22c55e44", color:"#22c55e", borderRadius:"8px", padding:"12px 16px", fontSize:"13px", marginBottom:"16px" },
    er:   { background:"#ef444418", border:"1px solid #ef444444", color:"#ef4444", borderRadius:"8px", padding:"12px 16px", fontSize:"13px", marginBottom:"16px" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        {/* Logo */}
        <div style={S.logo}>
          <div style={{ width:"48px", height:"48px", background:"linear-gradient(135deg,#7c3aed,#3b82f6)", borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"900", fontSize:"18px", color:"#fff", margin:"0 auto 12px" }}>SP</div>
          <div style={{ fontWeight:"800", fontSize:"20px", color:"#fff" }}>Sports<span style={{ color:"#7c3aed" }}>Pro</span></div>
        </div>

        {msg && <div style={S.ok}>{msg}</div>}
        {err && <div style={S.er}>{err}</div>}

        {/* ── Stage: Request ── */}
        {stage === "request" && (
          <>
            <div style={S.title}>Reset Password</div>
            <div style={S.sub}>Enter your account email and we'll send you a reset link.</div>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && requestReset()}
              onFocus={e => e.target.style.borderColor="#7c3aed55"}
              onBlur={e => e.target.style.borderColor="#ffffff12"} />
            <button style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} onClick={requestReset} disabled={busy}>
              {busy ? "Sending..." : "Send Reset Link"}
            </button>
            <button style={S.back} onClick={() => setPage("login")}>← Back to Sign In</button>
          </>
        )}

        {/* ── Stage: Sent ── */}
        {stage === "sent" && (
          <>
            <div style={{ textAlign:"center", marginBottom:"20px" }}>
              <div style={{ fontSize:"48px", marginBottom:"12px" }}>📧</div>
              <div style={S.title}>Check Your Email</div>
              <div style={S.sub}>
                We sent a password reset link to <strong style={{ color:"#fff" }}>{email}</strong>.<br /><br />
                Click the link in the email to reset your password. If you don't see it, check your spam folder.
              </div>
            </div>
            <button style={S.btn} onClick={() => setStage("request")}>Resend Email</button>
            <button style={S.back} onClick={() => setPage("login")}>← Back to Sign In</button>
          </>
        )}

        {/* ── Stage: Reset (came from email link) ── */}
        {stage === "reset" && (
          <>
            <div style={S.title}>Set New Password</div>
            <div style={S.sub}>Choose a strong new password for your account.</div>
            <label style={S.label}>New Password</label>
            <div style={{ position:"relative" }}>
              <input style={{ ...S.input, paddingRight:"44px" }}
                type={showPwd ? "text" : "password"} placeholder="Min. 6 characters"
                value={password} onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor="#7c3aed55"}
                onBlur={e => e.target.style.borderColor="#ffffff12"} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"16px", color:"#555", padding:0 }}>
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
            <label style={S.label}>Confirm Password</label>
            <div style={{ position:"relative" }}>
              <input style={{ ...S.input, paddingRight:"44px" }}
                type={showConfirm ? "text" : "password"} placeholder="Repeat new password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitReset()}
                onFocus={e => e.target.style.borderColor="#7c3aed55"}
                onBlur={e => e.target.style.borderColor="#ffffff12"} />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"16px", color:"#555", padding:0 }}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && (
              <div style={{ marginTop:"8px" }}>
                <div style={{ height:"3px", borderRadius:"2px", background:"#ffffff0d", overflow:"hidden" }}>
                  <div style={{ height:"100%", width: password.length >= 10 ? "100%" : password.length >= 8 ? "66%" : password.length >= 6 ? "33%" : "10%",
                    background: password.length >= 10 ? "#22c55e" : password.length >= 8 ? "#f59e0b" : "#ef4444", transition:"all 0.3s" }} />
                </div>
                <div style={{ fontSize:"10px", color: password.length >= 10 ? "#22c55e" : password.length >= 8 ? "#f59e0b" : "#ef4444", marginTop:"3px" }}>
                  {password.length >= 10 ? "Strong" : password.length >= 8 ? "Medium" : "Weak"}
                </div>
              </div>
            )}

            <button style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} onClick={submitReset} disabled={busy}>
              {busy ? "Updating..." : "Set New Password"}
            </button>
            <button style={S.back} onClick={() => setPage("login")}>← Back to Sign In</button>
          </>
        )}

        {/* ── Stage: Done ── */}
        {stage === "done" && (
          <>
            <div style={{ textAlign:"center", marginBottom:"20px" }}>
              <div style={{ fontSize:"48px", marginBottom:"12px" }}>✅</div>
              <div style={S.title}>Password Updated!</div>
              <div style={S.sub}>Your password has been successfully reset. You can now sign in with your new password.</div>
            </div>
            <button style={S.btn} onClick={() => setPage("login")}>Sign In Now</button>
          </>
        )}
      </div>
    </div>
  );
}
