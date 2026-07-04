import { useState, useEffect, useRef } from "react";

/**
 * AuthScreen — Multi-method authentication with premium animations.
 * Props:
 *   onLogin()        — called after successful auth
 *   theme            — "vault" (indigo, default) or "gov" (saffron/emerald)
 *   title            — brand title (default "ZeroVault")
 *   subtitle         — tagline
 */
export default function AuthScreen({
  onLogin,
  theme = "vault",
  title = "ZeroVault",
  subtitle = "Prove who you are — without exposing what you are.",
}) {
  const [screen, setScreen] = useState("methods"); // methods | fingerprint | face | totp | email | pin | success
  const [scanProgress, setScanProgress] = useState(0);
  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const isGov = theme === "gov";
  const accentColor = isGov ? "249, 115, 22" : "79, 70, 229";
  const accentHex = isGov ? "#f97316" : "#4f46e5";
  const accentDarkHex = isGov ? "#ea580c" : "#3730a3";
  const secondaryHex = isGov ? "#059669" : "#7c3aed";

  // Canvas particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const dots = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.35 + 0.1,
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
        ctx.fillStyle = `rgba(${accentColor}, ${d.opacity})`;
        ctx.fill();
      });
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${accentColor}, ${0.04 * (1 - dist / 110)})`;
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
  }, [accentColor]);

  // Simulate a scan progression (used by fingerprint & face)
  const runScanAnimation = (successScreen = "success") => {
    setScanProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 5 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setScanProgress(100);
        setTimeout(() => {
          setScreen("success");
          setTimeout(() => onLogin(), 700);
        }, 400);
      }
      setScanProgress(Math.min(p, 100));
    }, 70);
  };

  const handleMethodSelect = (method) => {
    setError("");
    setScreen(method);
    if (method === "fingerprint" || method === "face") {
      setTimeout(() => runScanAnimation(), 300);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length < 4) { setError("Enter at least 4 digits"); return; }
    setScreen("success");
    setTimeout(() => onLogin(), 700);
  };

  const handleTotpSubmit = (e) => {
    e.preventDefault();
    if (totpCode.length !== 6) { setError("Enter 6-digit code"); return; }
    setScreen("success");
    setTimeout(() => onLogin(), 700);
  };

  const handleEmailSend = (e) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Enter a valid email"); return; }
    setError("");
    setEmailSent(true);
  };

  const handleEmailVerify = (e) => {
    e.preventDefault();
    if (emailOtp.length !== 6) { setError("Enter 6-digit OTP"); return; }
    setScreen("success");
    setTimeout(() => onLogin(), 700);
  };

  const goBack = () => {
    setScreen("methods");
    setError("");
    setPin("");
    setTotpCode("");
    setEmail("");
    setEmailOtp("");
    setEmailSent(false);
    setScanProgress(0);
  };

  // Auth method definitions
  const authMethods = [
    {
      id: "fingerprint",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
          <path d="M5 19.5C5.5 18 6 15 6 12c0-3.3 2.7-6 6-6s6 2.7 6 6c0 1.5-.2 3-.7 4.5"/>
          <path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3c0 2-.3 4-1 6"/>
          <path d="M12 12v4"/>
        </svg>
      ),
      label: "Fingerprint",
      desc: "Biometric scan",
    },
    {
      id: "face",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 10h.01"/><path d="M15 10h.01"/>
          <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      ),
      label: "Face ID",
      desc: "Facial recognition",
    },
    {
      id: "totp",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <path d="M12 18h.01"/>
        </svg>
      ),
      label: "Auth App",
      desc: "TOTP authenticator",
    },
    {
      id: "email",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      ),
      label: "Email OTP",
      desc: "One-time passcode",
    },
    {
      id: "pin",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      label: "PIN Code",
      desc: "Numeric passcode",
    },
  ];

  return (
    <div className={`auth-screen ${screen === "success" ? "auth-exit" : ""}`}
         style={{ background: isGov
           ? "linear-gradient(145deg, #faf9f6 0%, #fff7ed 30%, #f5f4ef 60%, #ecfdf5 100%)"
           : "linear-gradient(145deg, #f8fafc 0%, #ede9fe 30%, #f1f5f9 60%, #e0e7ff 100%)"
         }}>
      <canvas ref={canvasRef} className="auth-particles" />

      <div className="auth-container">
        <div className="auth-orb auth-orb-1" style={{ background: `rgba(${accentColor}, 0.12)` }} />
        <div className="auth-orb auth-orb-2" style={{ background: `rgba(${accentColor}, 0.08)` }} />

        <div className="auth-card">
          {/* Brand Header */}
          <div className="auth-brand">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                {isGov ? (
                  <span style={{ fontSize: "2rem" }}>🏛️</span>
                ) : (
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 2L4 10V20C4 30 12 38 20 38C28 38 36 30 36 20V10L20 2Z"
                      fill={`url(#authShield)`} stroke={`rgba(${accentColor},0.3)`} strokeWidth="1.5"/>
                    <text x="20" y="25" textAnchor="middle" fill="white" fontSize="14"
                      fontWeight="700" fontFamily="Inter, sans-serif">ZV</text>
                    <defs>
                      <linearGradient id="authShield" x1="4" y1="2" x2="36" y2="38">
                        <stop stopColor={accentHex}/><stop offset="1" stopColor={secondaryHex}/>
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </div>
              <div className="auth-logo-ring" style={{ borderColor: `rgba(${accentColor}, 0.15)` }} />
            </div>
            <h1 className="auth-title" style={{
              background: isGov
                ? "linear-gradient(135deg, #f97316, #ea580c, #059669)"
                : "linear-gradient(135deg, #4f46e5, #7c3aed, #0891b2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>{title}</h1>
            <p className="auth-tagline">{subtitle}</p>
          </div>

          {/* ===== Method Selection ===== */}
          {screen === "methods" && (
            <div className="auth-methods-grid" style={{ animation: "fadeIn 0.4s ease-out" }}>
              {authMethods.map((m) => (
                <button
                  key={m.id}
                  className="auth-method-btn"
                  onClick={() => handleMethodSelect(m.id)}
                  style={{ "--accent": accentHex }}
                >
                  <div className="auth-method-icon">{m.icon}</div>
                  <div className="auth-method-info">
                    <span className="auth-method-label">{m.label}</span>
                    <span className="auth-method-desc">{m.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ===== Fingerprint Scanner ===== */}
          {screen === "fingerprint" && (
            <div className="auth-scan-view" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-scan-ring-wrap">
                <svg viewBox="0 0 120 120" className="auth-scan-svg">
                  <circle cx="60" cy="60" r="52" fill="none" stroke={`rgba(${accentColor},0.1)`} strokeWidth="4"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke={`url(#fpGrad)`} strokeWidth="4"
                    strokeLinecap="round" strokeDasharray={`${scanProgress * 3.27} 327`}
                    style={{ transition: "stroke-dasharray 0.1s ease-out" }}/>
                  <defs>
                    <linearGradient id="fpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop stopColor={accentHex}/><stop offset="1" stopColor={secondaryHex}/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="auth-scan-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accentHex}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="auth-fingerprint-svg">
                    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
                    <path d="M5 19.5C5.5 18 6 15 6 12c0-3.3 2.7-6 6-6s6 2.7 6 6c0 1.5-.2 3-.7 4.5"/>
                    <path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3c0 2-.3 4-1 6"/>
                    <path d="M12 12v4"/>
                  </svg>
                </div>
                <div className="auth-scan-sweep" style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, rgba(${accentColor}, 0.08) 60deg, transparent 120deg)`
                }}/>
              </div>
              <p className="auth-scan-label">
                {scanProgress < 100 ? "Scanning fingerprint..." : "✓ Fingerprint verified"}
              </p>
              <div className="auth-progress-bar">
                <div className="auth-progress-fill" style={{
                  width: `${scanProgress}%`,
                  background: `linear-gradient(90deg, ${accentHex}, ${secondaryHex})`
                }}/>
              </div>
            </div>
          )}

          {/* ===== Face Scanner ===== */}
          {screen === "face" && (
            <div className="auth-scan-view" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-face-frame">
                <div className="auth-face-outline">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <ellipse cx="40" cy="42" rx="28" ry="34" stroke={accentHex} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5"/>
                    <circle cx="30" cy="35" r="3" fill={accentHex} opacity="0.6"/>
                    <circle cx="50" cy="35" r="3" fill={accentHex} opacity="0.6"/>
                    <path d="M32 50 Q40 56 48 50" stroke={accentHex} strokeWidth="1.5" fill="none" opacity="0.5"/>
                  </svg>
                  {/* Mesh dots */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="auth-face-dot" style={{
                      top: `${20 + Math.sin(i * 0.52) * 30 + 15}%`,
                      left: `${20 + Math.cos(i * 0.52) * 30 + 15}%`,
                      animationDelay: `${i * 0.1}s`,
                      background: accentHex,
                    }}/>
                  ))}
                </div>
                <div className="auth-face-scanline" style={{ background: `linear-gradient(180deg, transparent, rgba(${accentColor}, 0.15), transparent)` }}/>
                {/* Corner brackets */}
                <div className="auth-face-corner tl" style={{ borderColor: accentHex }}/>
                <div className="auth-face-corner tr" style={{ borderColor: accentHex }}/>
                <div className="auth-face-corner bl" style={{ borderColor: accentHex }}/>
                <div className="auth-face-corner br" style={{ borderColor: accentHex }}/>
              </div>
              <p className="auth-scan-label">
                {scanProgress < 100 ? "Analyzing facial features..." : "✓ Face verified"}
              </p>
              <div className="auth-progress-bar">
                <div className="auth-progress-fill" style={{
                  width: `${scanProgress}%`,
                  background: `linear-gradient(90deg, ${accentHex}, ${secondaryHex})`
                }}/>
              </div>
            </div>
          )}

          {/* ===== TOTP Authenticator ===== */}
          {screen === "totp" && (
            <form className="auth-code-form" onSubmit={handleTotpSubmit} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-totp-header">
                <div className="auth-totp-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentHex}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <path d="M12 18h.01"/>
                  </svg>
                </div>
                <p className="auth-code-label">Enter 6-digit code from your authenticator app</p>
              </div>
              <div className="auth-code-input-row">
                <input type="text" maxLength={6} value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="auth-code-input" placeholder="000000" autoFocus
                  style={{ "--accent": accentHex }}
                />
              </div>
              <div className="auth-totp-timer">
                <svg width="16" height="16" viewBox="0 0 16 16" className="auth-totp-timer-svg">
                  <circle cx="8" cy="8" r="6" fill="none" stroke={`rgba(${accentColor},0.15)`} strokeWidth="2"/>
                  <circle cx="8" cy="8" r="6" fill="none" stroke={accentHex} strokeWidth="2"
                    strokeDasharray="37.7" strokeDashoffset="0" strokeLinecap="round"
                    className="auth-totp-countdown"/>
                </svg>
                <span style={{ color: accentHex }}>Code refreshes in 30s</span>
              </div>
              {error && <p className="auth-error">{error}</p>}
              <div className="auth-btn-row">
                <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                <button type="submit" className="auth-btn auth-btn-primary"
                  style={{ background: accentHex, flex: 2 }}>Verify Code</button>
              </div>
            </form>
          )}

          {/* ===== Email OTP ===== */}
          {screen === "email" && (
            <div className="auth-code-form" style={{ animation: "fadeIn 0.3s ease-out" }}>
              {!emailSent ? (
                <form onSubmit={handleEmailSend}>
                  <div className="auth-email-icon-wrap">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accentHex}
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <p className="auth-code-label">Enter your email to receive an OTP</p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="auth-email-input" placeholder="you@example.com" autoFocus
                    style={{ "--accent": accentHex }}
                  />
                  {error && <p className="auth-error">{error}</p>}
                  <div className="auth-btn-row">
                    <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                    <button type="submit" className="auth-btn auth-btn-primary"
                      style={{ background: accentHex, flex: 2 }}>Send OTP</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEmailVerify}>
                  <div className="auth-email-sent">
                    <div className="auth-email-sent-icon">✉️</div>
                    <p className="auth-email-sent-text">OTP sent to <strong>{email}</strong></p>
                  </div>
                  <p className="auth-code-label" style={{ marginTop: "1rem" }}>Enter 6-digit OTP</p>
                  <div className="auth-code-input-row">
                    <input type="text" maxLength={6} value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                      className="auth-code-input" placeholder="000000" autoFocus
                      style={{ "--accent": accentHex }}
                    />
                  </div>
                  {error && <p className="auth-error">{error}</p>}
                  <div className="auth-btn-row">
                    <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                    <button type="submit" className="auth-btn auth-btn-primary"
                      style={{ background: accentHex, flex: 2 }}>Verify OTP</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ===== PIN Code ===== */}
          {screen === "pin" && (
            <form className="auth-code-form" onSubmit={handlePinSubmit} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-totp-header">
                <div className="auth-totp-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentHex}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <p className="auth-code-label">Enter your vault PIN</p>
              </div>
              <div className="auth-code-input-row">
                <input type="password" maxLength={8} value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="auth-code-input auth-pin-input" placeholder="• • • •" autoFocus
                  style={{ "--accent": accentHex }}
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <div className="auth-btn-row">
                <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                <button type="submit" className="auth-btn auth-btn-primary"
                  style={{ background: accentHex, flex: 2 }}>Unlock</button>
              </div>
            </form>
          )}

          {/* ===== Success ===== */}
          {screen === "success" && (
            <div className="auth-success" style={{ animation: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
              <div className="auth-success-check">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="24" fill="none" stroke="#059669" strokeWidth="2.5"/>
                  <path d="M15 27L23 35L37 20" fill="none" stroke="#059669" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" className="auth-check-path"/>
                </svg>
              </div>
              <p className="auth-success-text">Welcome to {title}</p>
            </div>
          )}
        </div>

        <p className="auth-footer">
          {isGov
            ? "Government of India · Ministry of Electronics & IT · Secure Portal"
            : "Privacy-preserving identity verification · Zero-Knowledge Proofs + Gemini AI"
          }
        </p>
      </div>
    </div>
  );
}
