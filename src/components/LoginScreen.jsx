import { useState, useEffect, useRef } from "react";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("idle"); // idle | scanning | pin | success
  const [pin, setPin] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState("");
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Floating particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79, 70, 229, ${d.opacity})`;
        ctx.fill();
      });

      // Draw connecting lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.04 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Passkey scanner animation
  const startPasskeyScan = () => {
    setMode("scanning");
    setError("");
    setScanProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 6 + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setScanProgress(100);
        setTimeout(() => {
          setMode("success");
          setTimeout(() => onLogin(), 800);
        }, 400);
      }
      setScanProgress(Math.min(progress, 100));
    }, 80);
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError("Enter at least 4 digits");
      return;
    }
    setError("");
    setMode("success");
    setTimeout(() => onLogin(), 800);
  };

  const handlePinKeyDown = (e) => {
    if (e.key === "Enter") handlePinSubmit(e);
  };

  return (
    <div className={`login-screen ${mode === "success" ? "login-exit" : ""}`}>
      <canvas ref={canvasRef} className="login-particles" />

      <div className="login-container">
        {/* Glowing orb behind the card */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          {/* Logo & Brand */}
          <div className="login-brand">
            <div className="login-logo">
              <div className="login-logo-shield">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path
                    d="M20 2L4 10V20C4 30 12 38 20 38C28 38 36 30 36 20V10L20 2Z"
                    fill="url(#shieldGrad)"
                    stroke="rgba(79,70,229,0.3)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="20"
                    y="25"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="700"
                    fontFamily="Inter, sans-serif"
                  >
                    ZV
                  </text>
                  <defs>
                    <linearGradient
                      id="shieldGrad"
                      x1="4"
                      y1="2"
                      x2="36"
                      y2="38"
                    >
                      <stop stopColor="#4f46e5" />
                      <stop offset="1" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="login-logo-ring" />
            </div>
            <h1 className="login-title">ZeroVault</h1>
            <p className="login-tagline">
              Prove who you are — without exposing what you are.
            </p>
          </div>

          {/* Auth methods */}
          {mode === "idle" && (
            <div className="login-actions" style={{ animation: "fadeIn 0.5s ease-out" }}>
              <button
                className="login-btn login-btn-primary"
                onClick={startPasskeyScan}
              >
                <span className="login-btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                Unlock with Passkey
                <span className="login-btn-shimmer" />
              </button>

              <div className="login-divider">
                <span>or</span>
              </div>

              <button
                className="login-btn login-btn-secondary"
                onClick={() => { setMode("pin"); setError(""); }}
              >
                <span className="login-btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>
                  </svg>
                </span>
                Enter PIN Code
              </button>

              <div className="login-tech-badges">
                <span className="login-tech-badge">ZK Proofs</span>
                <span className="login-tech-badge">Groth16</span>
                <span className="login-tech-badge">Gemini AI</span>
              </div>
            </div>
          )}

          {/* Passkey scanner */}
          {mode === "scanning" && (
            <div className="login-scanner" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="scanner-ring-container">
                <div className="scanner-ring">
                  <svg viewBox="0 0 120 120" className="scanner-svg">
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(79,70,229,0.1)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="url(#scanGrad)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${scanProgress * 3.27} 327`}
                      style={{ transition: "stroke-dasharray 0.1s ease-out" }}
                    />
                    <defs>
                      <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop stopColor="#4f46e5" />
                        <stop offset="1" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="scanner-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 10a2.5 2.5 0 0 0-2.5 2.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5S13.38 10 12 10z"/>
                      <path d="M12 6c-3.5 0-6.5 2-8 5 1.5 3 4.5 5 8 5s6.5-2 8-5c-1.5-3-4.5-5-8-5z"/>
                    </svg>
                  </div>
                </div>
                <div className="scanner-sweep" />
              </div>
              <p className="scanner-label">
                {scanProgress < 100
                  ? "Authenticating identity..."
                  : "✓ Identity verified"}
              </p>
              <div className="scanner-progress-bar">
                <div
                  className="scanner-progress-fill"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* PIN entry */}
          {mode === "pin" && (
            <form
              className="login-pin-form"
              onSubmit={handlePinSubmit}
              style={{ animation: "fadeIn 0.3s ease-out" }}
            >
              <label className="login-pin-label">Enter your vault PIN</label>
              <div className="login-pin-input-row">
                <input
                  type="password"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={handlePinKeyDown}
                  className="login-pin-input"
                  placeholder="• • • •"
                  autoFocus
                />
              </div>
              {error && (
                <p className="login-error">{error}</p>
              )}
              <div className="login-pin-actions">
                <button
                  type="button"
                  className="login-btn login-btn-ghost"
                  onClick={() => { setMode("idle"); setPin(""); setError(""); }}
                >
                  Back
                </button>
                <button type="submit" className="login-btn login-btn-primary" style={{ flex: 2 }}>
                  Unlock Vault
                </button>
              </div>
            </form>
          )}

          {/* Success state */}
          {mode === "success" && (
            <div className="login-success" style={{ animation: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
              <div className="login-success-check">
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="22" fill="none" stroke="#059669" strokeWidth="2.5" />
                  <path
                    d="M14 25L21 32L34 18"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="check-path"
                  />
                </svg>
              </div>
              <p className="login-success-text">Welcome to ZeroVault</p>
            </div>
          )}
        </div>

        {/* Bottom credits */}
        <p className="login-footer">
          Privacy-preserving identity verification · Zero-Knowledge Proofs + Gemini AI
        </p>
      </div>
    </div>
  );
}
