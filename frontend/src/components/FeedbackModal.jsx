// FeedbackModal.jsx
// Pops up after 3 minutes, lets user rate and comment, submits to backend
import { useState, useEffect } from "react";

export default function FeedbackModal({ open, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) { setRating(0); setComment(""); setError(""); }
  }, [open]);

  const handleSubmit = async () => {
    if (!rating) { setError("Please select a rating."); return; }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ rating, comment });
      setSubmitting(false);
      onClose();
    } catch (e) {
      setError("Failed to submit feedback.");
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 2000,
      background: "rgba(10,14,26,0.85)", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#181e2a", borderRadius: 16, padding: 28, minWidth: 320, maxWidth: "90vw", boxShadow: "0 8px 32px #000a" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 10, color: "#fff" }}>We value your feedback!</div>
        <div style={{ color: "#aaa", fontSize: 14, marginBottom: 18 }}>How would you rate your experience?</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[1,2,3,4,5].map(n => (
            <span key={n} onClick={() => setRating(n)} style={{
              fontSize: 28, cursor: "pointer", color: rating >= n ? "#f59e0b" : "#333"
            }}>★</span>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Any comments or suggestions?"
          style={{ width: "100%", minHeight: 60, borderRadius: 8, border: "1px solid #222", padding: 10, fontSize: 14, marginBottom: 12, background: "#232a3a", color: "#fff" }}
        />
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: "none", color: "#aaa", border: "none", fontSize: 15, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            background: "linear-gradient(90deg,#7c3aed,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: submitting ? 0.7 : 1
          }}>Submit</button>
        </div>
      </div>
    </div>
  );
}
