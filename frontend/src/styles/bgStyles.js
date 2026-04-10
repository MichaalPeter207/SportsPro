// bgStyles.js
// Reusable blue gradients + SVG watermark background for all pages

const watermarkSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
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
  </svg>`);

export const bgSportsPro = {
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
};
