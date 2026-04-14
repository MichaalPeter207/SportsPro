// =============================================================
//  App.jsx
//  - Unauthenticated users see landing page only (no nav links)
//  - Session persists on refresh via /api/auth/me
//  - Idle logout after 30 min of inactivity
//  - Tab-hidden logout after 2 hours away
// =============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import "./styles/main.css";
import Navbar             from "./components/Navbar";
import Home              from "./pages/Home";
import Login             from "./pages/Login";
import Register          from "./pages/Register";
import ResetPassword     from "./pages/ResetPassword";
import VerifyEmail       from "./pages/VerifyEmail";
import AdminPanel        from "./pages/AdminPanel";
import ManagePage        from "./pages/ManagePage";
import AnalyticsDashboard from "./pages/analyticsdashboard";
import TournamentsPage   from "./pages/TournamentsPage";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const IDLE_MS      = 30 * 60 * 1000;   // 30 min idle â†’ logout
const HIDDEN_MS    = 2  * 60 * 60 * 1000; // 2 hr tab hidden â†’ logout

export default function App() {
  const initialPage = (() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("token")) return "reset-password";
    if (params.has("verify") || params.has("email")) return "verify-email";
    return "home";
  })();
  const [page,        setPage]        = useState(initialPage);
  const [user,        setUser]        = useState(null);
  const [hydrated,    setHydrated]    = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyFallback, setVerifyFallback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const em = params.get("email");
    if (em) setVerifyEmail(em);
  }, []);

  const idleTimer   = useRef(null);
  const hiddenAt    = useRef(null);
  const feedbackTimer = useRef(null);

  // â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogout = useCallback((reason = "") => {
    localStorage.removeItem("token");
    setUser(null);
    setPage("home");
    if (reason) console.info("Auto-logout:", reason);
  }, []);

  // Global 401 handler â€” catches expired tokens from any fetch
  useEffect(() => {
    const origFetch = window.fetch;
    window._fetchPatched = true;
    window.fetch = async (...args) => {
      const res = await origFetch(...args);
      if (res.status === 401) {
        const url = typeof args[0] === "string" ? args[0] : "";
        // Don't logout on login/register endpoints
        if (!url.includes("/auth/login") && !url.includes("/auth/register") && !url.includes("/auth/verify")) {
          const clone = res.clone();
          try {
            const data = await clone.json();
            // Only force logout if it's a JWT error, not a permission error
            if (data?.msg?.toLowerCase().includes("token") || data?.msg?.toLowerCase().includes("expired")) {
              localStorage.removeItem("token");
            }
          } catch(e) {}
        }
      }
      return res;
    };
    return () => { if (window._fetchPatched) window.fetch = origFetch; };
  }, []);

  // â”€â”€ Restore session on page refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setHydrated(true); return; }
    fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401 || r.status === 422) {
          localStorage.removeItem("token");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(d => {
        if (d?.user) setUser(d.user);
        else localStorage.removeItem("token");
      })
      .catch(() => { localStorage.removeItem("token"); })
      .finally(() => setHydrated(true));
  }, []);

  // â”€â”€ Feedback prompt after 3 minutes of use â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!user) {
      clearTimeout(feedbackTimer.current);
      return;
    }
    const submitted = localStorage.getItem("feedback_submitted") === "1";
    const lastPrompt = Number(localStorage.getItem("feedback_prompted_at") || "0");
    const now = Date.now();
    if (submitted) return;
    if ((now - lastPrompt) < 24 * 60 * 60 * 1000) return;
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      localStorage.setItem("feedback_prompted_at", String(Date.now()));
      setShowFeedback(true);
    }, 3 * 60 * 1000);
    return () => clearTimeout(feedbackTimer.current);
  }, [user]);

  // â”€â”€ Idle logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const resetIdle = useCallback(() => {
    if (!user) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => handleLogout("idle"), IDLE_MS);
  }, [user, handleLogout]);

  useEffect(() => {
    if (!user) return;
    const events = ["mousemove","keydown","mousedown","touchstart","scroll","click"];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer.current);
    };
  }, [user, resetIdle]);

  // â”€â”€ Tab-hidden logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onVisibility = () => {
      if (!user) return;
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else {
        if (hiddenAt.current && Date.now() - hiddenAt.current > HIDDEN_MS) {
          handleLogout("long absence");
        }
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [user, handleLogout]);

  // â”€â”€ Role helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const roles          = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const isAdminOrCoach = roles.includes("admin") || roles.includes("coach")
                         || user?.role === "admin" || user?.role === "coach";
  const isAdmin        = roles.includes("admin") || user?.role === "admin";

  const guard = (allowed, el) => {
    if (!allowed) { setTimeout(() => setPage(user ? "tournaments" : "home"), 0); return null; }
    return el;
  };

  // â”€â”€ Auth pages (no navbar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const authPages = ["login","register","verify-email","reset-password"];
  const hideNavbar = authPages.includes(page) || !user;

  if (!hydrated) return null; // wait for session restore

  // â”€â”€ Guest: only show landing page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!user) {
    return (
      <main>
        {page === "login"          && <Login    setPage={setPage} setUser={setUser} setVerifyEmail={setVerifyEmail} />}
        {page === "register"       && <Register setPage={setPage} setVerifyEmail={setVerifyEmail} />}
        {page === "verify-email"   && <VerifyEmail setPage={setPage} verifyEmail={verifyEmail} fallbackCode={verifyFallback} />}
        {page === "reset-password" && <ResetPassword setPage={setPage} />}
        {!authPages.includes(page) && <Home setPage={setPage} user={null} />}
      </main>
    );
  }

  // â”€â”€ Authenticated: full app â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderPage = () => {
    switch (page) {
      case "tournaments":
        return (
          <div style={{ padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
            <TournamentsPage user={user} setPage={setPage} />
          </div>
        );
      case "analytics":
        return (
          <div style={{ padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
            <AnalyticsDashboard />
          </div>
        );
      case "manage":
        return guard(isAdminOrCoach, <ManagePage user={user} />);
      case "admin":
        return guard(isAdmin, <AdminPanel user={user} />);
      default:
        // Default post-login page = tournaments
        return (
          <div style={{ padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
            <TournamentsPage user={user} setPage={setPage} />
          </div>
        );
    }
  };

  return (
    <div>
      {showFeedback && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:2000, backdropFilter:"blur(3px)"
        }}>
          <div style={{
            width:"min(520px,92vw)", background:"#12122b", border:"1px solid #ffffff18",
            borderRadius:"16px", padding:"22px 24px", color:"#fff"
          }}>
            <div style={{ fontWeight:"800", fontSize:"18px", marginBottom:"6px" }}>Weâ€™d love your feedback</div>
            <div style={{ color:"#777", fontSize:"12px", marginBottom:"16px" }}>
              Howâ€™s your experience so far? This helps us improve.
            </div>

            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"11px", color:"#777", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase" }}>Rating</div>
              <div style={{ display:"flex", gap:"8px" }}>
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setFeedbackRating(n)}
                    style={{
                      width:"36px", height:"36px", borderRadius:"8px",
                      border:`1px solid ${feedbackRating>=n ? "#7c3aed" : "#ffffff18"}`,
                      background: feedbackRating>=n ? "rgba(124,58,237,0.25)" : "#0f0f1a",
                      color: feedbackRating>=n ? "#c4b5fd" : "#777",
                      cursor:"pointer", fontWeight:"700"
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"11px", color:"#777", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase" }}>Feedback</div>
              <textarea
                value={feedbackText}
                onChange={e=>setFeedbackText(e.target.value)}
                rows={4}
                placeholder="Tell us whatâ€™s working or whatâ€™s missing..."
                style={{
                  width:"100%", background:"#0f0f1a", border:"1px solid #ffffff18",
                  borderRadius:"10px", padding:"10px 12px", color:"#fff", fontSize:"13px",
                  resize:"vertical"
                }}
              />
            </div>

            {feedbackMsg && <div style={{ fontSize:"12px", color:"#a78bfa", marginBottom:"10px" }}>{feedbackMsg}</div>}

            <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end" }}>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  // Do NOT set feedback_submitted, so popup can reappear after 24h
                }}
                style={{
                  padding:"8px 14px", background:"transparent", border:"1px solid #ffffff18",
                  color:"#777", borderRadius:"8px", cursor:"pointer", fontSize:"12px"
                }}
              >
                Later
              </button>
              <button
                onClick={async () => {
                  if (!feedbackRating) { setFeedbackMsg("Please choose a rating."); return; }
                  setFeedbackSending(true);
                  setFeedbackMsg("");
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(`${BASE}/feedback/`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        rating: feedbackRating,
                        message: feedbackText.trim(),
                        page,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      localStorage.setItem("feedback_submitted", "1");
                      setShowFeedback(false);
                      setFeedbackRating(0);
                      setFeedbackText("");
                    } else {
                      setFeedbackMsg(data.error || "Failed to submit feedback.");
                    }
                  } catch {
                    setFeedbackMsg("Network error. Please try again.");
                  } finally {
                    setFeedbackSending(false);
                  }
                }}
                disabled={feedbackSending}
                style={{
                  padding:"8px 14px", background:"linear-gradient(135deg,#7c3aed,#3b82f6)",
                  border:"none", color:"#fff", borderRadius:"8px", cursor:"pointer",
                  fontSize:"12px", fontWeight:"700", opacity: feedbackSending ? 0.7 : 1
                }}
              >
                {feedbackSending ? "Sending..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      <Navbar
        currentPage={page}
        setPage={setPage}
        user={user}
        onLogout={handleLogout}
      />
      <main style={{ paddingTop: "70px" }}>
        {renderPage()}
      </main>
    </div>
  );
}

