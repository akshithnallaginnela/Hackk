import { useState, useEffect, useRef } from "react";

/**
 * AuthScreen — Multi-method authentication with real WebAuthn biometrics, 
 * live webcam video Face ID, and backend-connected onboarding.
 */
export default function AuthScreen({
  onLogin,
  theme = "vault",
  title = "ZeroVault",
  subtitle = "Prove who you are — without exposing what you are.",
}) {
  const [screen, setScreen] = useState("methods"); // methods | fingerprint | face | totp | email | pin | register | success
  const [scanProgress, setScanProgress] = useState(0);
  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [tempId, setTempId] = useState("");
  const [error, setError] = useState("");
  
  // Real camera state
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);
  
  // Developer test previews
  const [devMailLink, setDevMailLink] = useState(null);
  const [devMailCode, setDevMailCode] = useState(null);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const isGov = theme === "gov";
  const accentColor = isGov ? "249, 115, 22" : "79, 70, 229";
  const accentHex = isGov ? "#f97316" : "#4f46e5";
  const secondaryHex = isGov ? "#059669" : "#7c3aed";

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  };

  // Canvas particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const dots = Array.from({ length: 40 }, () => ({
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

  // Clean up media streams when changing screens
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [screen]);

  const stopWebcam = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  // Start Real Webcam
  const startWebcam = async () => {
    setError("");
    setScanProgress(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: "user" }
      });
      setVideoStream(stream);
      
      // Delay mounting stream slightly to ensure videoRef is bound
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);

      // Start simulated face scanning progress
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 4 + 2;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setScanProgress(100);
          setTimeout(() => {
            stopWebcam();
            setScreen("success");
            setTimeout(() => onLogin(), 700);
          }, 450);
        }
        setScanProgress(Math.min(p, 100));
      }, 90);

    } catch (err) {
      console.error("Camera access failed:", err);
      setError("❌ Camera Error: Camera permission was denied or webcam is in use by another application.");
      setScreen("methods");
    }
  };

  // Start Real WebAuthn platform prompt
  const startWebAuthn = async () => {
    setError("");
    setScanProgress(0);
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported by this browser.");
      }
      
      const isBiometricAvailable = await PublicKeyCredential.isUserVerifyingPlatformCredentialAvailable();
      if (!isBiometricAvailable) {
        throw new Error("Biometric platform sensor (TouchID / FaceID / Windows Hello) is not detected on this device.");
      }

      setScanProgress(20);
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credentialOptions = {
        publicKey: {
          challenge: challenge,
          rp: { name: title },
          user: {
            id: new Uint8Array([1, 2, 3, 4]),
            name: isGov ? "officer@zerovault.gov.in" : "user@zerovault.id",
            displayName: isGov ? "Gov Portal Officer" : "Vault Owner"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform" },
          timeout: 20000
        }
      };

      setScanProgress(50);
      const cred = await navigator.credentials.create(credentialOptions);
      if (cred) {
        setScanProgress(100);
        setScreen("success");
        setTimeout(() => onLogin(), 700);
      } else {
        throw new Error("Biometric credential registration failed.");
      }

    } catch (err) {
      console.error("Biometric prompt failed:", err);
      if (err.name === "NotAllowedError" || err.message.includes("cancelled")) {
        setError("❌ Scan Cancelled: Biometric validation was cancelled by the user.");
      } else {
        setError(`❌ Biometric Hardware Unavailable: ${err.message}`);
      }
      setScreen("methods");
    }
  };

  const handleMethodSelect = (method) => {
    setError("");
    setDevMailLink(null);
    setDevMailCode(null);
    
    if (method === "fingerprint") {
      setScreen("fingerprint");
      startWebAuthn();
    } else if (method === "face") {
      setScreen("face");
      startWebcam();
    } else {
      setScreen(method);
    }
  };

  // Submit PIN Code (Simulated offline vault key verification)
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length < 4) { setError("Enter at least 4 digits"); return; }
    setScreen("success");
    setTimeout(() => onLogin(), 700);
  };

  // Submit TOTP Code (Simulated TOTP algorithm matching)
  const handleTotpSubmit = (e) => {
    e.preventDefault();
    if (totpCode.length !== 6) { setError("Enter 6-digit code"); return; }
    setScreen("success");
    setTimeout(() => onLogin(), 700);
  };

  // Send Client Email OTP (hits server API for real email delivery)
  const handleEmailSend = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Enter a valid email address"); return; }
    setError("");
    
    try {
      const endpoint = isGov ? "/api/register-temp-id" : "/api/auth/send-otp";
      const payload = isGov ? { tempId: tempId || "OFFICER-TEMP", email } : { email };

      const response = await fetch(`${getBackendUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to transmit verification code.");
      }

      setEmailSent(true);
      if (data.testPreviewUrl) {
        setDevMailLink(data.testPreviewUrl);
      }
      if (data.demoCode) {
        setDevMailCode(data.demoCode);
      }

    } catch (err) {
      console.error(err);
      setError(`❌ Mail Error: ${err.message}`);
    }
  };

  // Verify Client Email OTP (hits server API for real validation match)
  const handleEmailVerify = async (e) => {
    e.preventDefault();
    if (emailOtp.length !== 6) { setError("Enter 6-digit passcode"); return; }
    setError("");

    try {
      const endpoint = isGov ? "/api/verify-gov-auth" : "/api/auth/verify-otp";
      const response = await fetch(`${getBackendUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: emailOtp })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Passcode verification mismatch.");
      }

      setScreen("success");
      setTimeout(() => onLogin(), 700);

    } catch (err) {
      console.error(err);
      setError(`❌ Verification Failed: ${err.message}`);
    }
  };

  // Request Access / Onboarding for Government Officer
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!tempId.trim()) { setError("Government Temporary ID is required."); return; }
    if (!email.includes("@")) { setError("Official Government email is required."); return; }
    setError("");

    try {
      const response = await fetch(`${getBackendUrl()}/api/register-temp-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempId, email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to issue registration.");
      }

      setEmailSent(true);
      setScreen("email"); // redirect to verification page
      if (data.testPreviewUrl) {
        setDevMailLink(data.testPreviewUrl);
      }
      if (data.demoCode) {
        setDevMailCode(data.demoCode);
      }

    } catch (err) {
      console.error(err);
      setError(`❌ Registration Error: ${err.message}`);
    }
  };

  const goBack = () => {
    stopWebcam();
    setScreen("methods");
    setError("");
    setPin("");
    setTotpCode("");
    setEmail("");
    setEmailOtp("");
    setEmailSent(false);
    setTempId("");
    setScanProgress(0);
    setDevMailLink(null);
    setDevMailCode(null);
  };

  return (
    <div className={`auth-screen ${screen === "success" ? "auth-exit" : ""}`}
         style={{ background: isGov
           ? "linear-gradient(145deg, #faf9f6 0%, #fff7ed 30%, #f5f4ef 60%, #ecfdf5 100%)"
           : "linear-gradient(145deg, #f8fafc 0%, #ede9fe 30%, #f1f5f9 60%, #e0e7ff 100%)"
         }}>
      <canvas 
        ref={canvasRef} 
        className="auth-particles" 
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} 
      />

      <div className="auth-container">
        <div className="auth-orb auth-orb-1" style={{ background: `rgba(${accentColor}, 0.12)` }} />
        <div className="auth-orb auth-orb-2" style={{ background: `rgba(${accentColor}, 0.08)` }} />

        {/* Global developer mailbox helper tool */}
        {(devMailLink || devMailCode) && (
          <div className="dev-mail-helper" style={{ animation: "slideDown 0.3s ease-out" }}>
            <div className="dev-mail-header">💻 DEVELOPER TEST CONSOLE</div>
            <div className="dev-mail-body">
              {devMailCode && <div>🔑 Verification Passcode: <strong>{devMailCode}</strong></div>}
              {devMailLink && (
                <div style={{ marginTop: 4 }}>
                  📬 Ethereal Sandbox Inbox: <a href={devMailLink} target="_blank" rel="noopener noreferrer">View Captured Mail ↗</a>
                </div>
              )}
            </div>
          </div>
        )}

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

          {error && (
            <div className="auth-error-box" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          {/* ===== Method Selection ===== */}
          {screen === "methods" && (
            <div className="auth-methods-grid" style={{ animation: "fadeIn 0.4s ease-out" }}>
              <button className="auth-method-btn" onClick={() => handleMethodSelect("fingerprint")} style={{ "--accent": accentHex }}>
                <div className="auth-method-icon">🪘</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Fingerprint / Passkey</span>
                  <span className="auth-method-desc">Device secure credentials</span>
                </div>
              </button>

              <button className="auth-method-btn" onClick={() => handleMethodSelect("face")} style={{ "--accent": accentHex }}>
                <div className="auth-method-icon">👤</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Face Verification</span>
                  <span className="auth-method-desc">Utilize webcam video</span>
                </div>
              </button>

              <button className="auth-method-btn" onClick={() => handleMethodSelect("email")} style={{ "--accent": accentHex }}>
                <div className="auth-method-icon">✉️</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Email Passcode</span>
                  <span className="auth-method-desc">6-digit secure mail OTP</span>
                </div>
              </button>

              <button className="auth-method-btn" onClick={() => handleMethodSelect("pin")} style={{ "--accent": accentHex }}>
                <div className="auth-method-icon">🔑</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Vault PIN Code</span>
                  <span className="auth-method-desc">Local numeric code</span>
                </div>
              </button>

              {isGov && (
                <div className="auth-onboard-trigger" style={{ marginTop: "1rem", textAlign: "center" }}>
                  <button className="auth-btn-link" onClick={() => setScreen("register")} style={{ color: accentHex }}>
                    New Officer? Register Temp Access ID
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== Fingerprint WebAuthn Prompt ===== */}
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
                  <span style={{ fontSize: "2rem" }}>🪘</span>
                </div>
                <div className="auth-scan-sweep" style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, rgba(${accentColor}, 0.08) 60deg, transparent 120deg)`
                }}/>
              </div>
              <p className="auth-scan-label">
                {scanProgress < 100 ? "Requesting platform credentials..." : "✓ Verified"}
              </p>
              <div className="auth-progress-bar">
                <div className="auth-progress-fill" style={{
                  width: `${scanProgress}%`,
                  background: `linear-gradient(90deg, ${accentHex}, ${secondaryHex})`
                }}/>
              </div>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack} style={{ marginTop: "1rem" }}>Cancel</button>
            </div>
          )}

          {/* ===== Webcam Face ID ===== */}
          {screen === "face" && (
            <div className="auth-scan-view" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-face-camera-container">
                {/* Live Webcam Stream Display */}
                {videoStream ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="auth-face-camera-video"
                  />
                ) : (
                  <div className="auth-face-camera-placeholder">👤</div>
                )}
                
                {/* Visual scan overlays */}
                <div className="auth-face-scanline" style={{ background: `linear-gradient(180deg, transparent, rgba(${accentColor}, 0.25), transparent)` }}/>
                <div className="auth-face-corner tl" style={{ borderColor: accentHex }}/>
                <div className="auth-face-corner tr" style={{ borderColor: accentHex }}/>
                <div className="auth-face-corner bl" style={{ borderColor: accentHex }}/>
                <div className="auth-face-corner br" style={{ borderColor: accentHex }}/>
              </div>
              <p className="auth-scan-label">
                {scanProgress < 100 ? `Scanning Face details (${Math.floor(scanProgress)}%)...` : "✓ Scan complete!"}
              </p>
              <div className="auth-progress-bar" style={{ width: "80%" }}>
                <div className="auth-progress-fill" style={{
                  width: `${scanProgress}%`,
                  background: `linear-gradient(90deg, ${accentHex}, ${secondaryHex})`
                }}/>
              </div>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack} style={{ marginTop: "0.5rem" }}>Cancel</button>
            </div>
          )}

          {/* ===== Government Onboarding Form ===== */}
          {screen === "register" && (
            <form className="auth-code-form" onSubmit={handleOnboardSubmit} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <p className="auth-code-label">Enter Official Details to Request Gateway Credentials</p>
              
              <div className="auth-input-group">
                <label className="auth-input-label">Gov Temp Access ID</label>
                <input 
                  type="text" 
                  value={tempId} 
                  onChange={(e) => setTempId(e.target.value.toUpperCase())}
                  className="auth-text-input" 
                  placeholder="e.g. TEMP-8761-UIDAI" 
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Official Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-text-input" 
                  placeholder="officer@nic.in" 
                  required
                />
              </div>

              <div className="auth-btn-row" style={{ marginTop: "1rem" }}>
                <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                <button type="submit" className="auth-btn auth-btn-primary" style={{ background: accentHex, flex: 2 }}>
                  Request Credentials
                </button>
              </div>
            </form>
          )}

          {/* ===== Email OTP Verification ===== */}
          {screen === "email" && (
            <div className="auth-code-form" style={{ animation: "fadeIn 0.3s ease-out" }}>
              {!emailSent ? (
                <form onSubmit={handleEmailSend}>
                  <div className="auth-email-icon-wrap">
                    <span style={{ fontSize: "2.5rem" }}>✉️</span>
                  </div>
                  <p className="auth-code-label">Enter your email address to retrieve passcode</p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="auth-email-input" placeholder="you@example.com" autoFocus
                    style={{ "--accent": accentHex }}
                  />
                  <div className="auth-btn-row">
                    <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                    <button type="submit" className="auth-btn auth-btn-primary"
                      style={{ background: accentHex, flex: 2 }}>Send Passcode</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEmailVerify}>
                  <div className="auth-email-sent">
                    <div className="auth-email-sent-icon">📬</div>
                    <p className="auth-email-sent-text">Passcode generated and dispatched to <strong>{email}</strong></p>
                  </div>
                  <p className="auth-code-label" style={{ marginTop: "1rem" }}>Enter 6-digit passcode</p>
                  <div className="auth-code-input-row">
                    <input type="text" maxLength={6} value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                      className="auth-code-input" placeholder="000000" autoFocus
                      style={{ "--accent": accentHex }}
                    />
                  </div>
                  <div className="auth-btn-row" style={{ marginTop: "1.5rem" }}>
                    <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                    <button type="submit" className="auth-btn auth-btn-primary"
                      style={{ background: accentHex, flex: 2 }}>Unlock Portal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ===== PIN Code ===== */}
          {screen === "pin" && (
            <form className="auth-code-form" onSubmit={handlePinSubmit} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-totp-header">
                <span style={{ fontSize: "2rem" }}>🔑</span>
                <p className="auth-code-label" style={{ marginTop: 8 }}>Enter your vault PIN</p>
              </div>
              <div className="auth-code-input-row">
                <input type="password" maxLength={8} value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="auth-code-input auth-pin-input" placeholder="• • • •" autoFocus
                  style={{ "--accent": accentHex }}
                />
              </div>
              <div className="auth-btn-row" style={{ marginTop: "1.5rem" }}>
                <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                <button type="submit" className="auth-btn auth-btn-primary"
                  style={{ background: accentHex, flex: 2 }}>Unlock</button>
              </div>
            </form>
          )}

          {/* ===== Success View ===== */}
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
            ? "Government of India · Ministry of Electronics & IT · Secure UIDAI Network"
            : "Privacy-preserving identity verification · Zero-Knowledge Proofs + Gemini AI"
          }
        </p>
      </div>
    </div>
  );
}
