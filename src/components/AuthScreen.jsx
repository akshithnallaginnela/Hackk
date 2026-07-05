import { useState, useEffect, useRef } from "react";

/**
 * AuthScreen — Multi-method authentication with real biometrics, 
 * live webcam Face ID matching, SMTP OTP verification, and secure PIN validation.
 */
export default function AuthScreen({
  onLogin,
  theme = "vault",
  title = "ZeroVault",
  subtitle = "Prove who you are — without exposing what you are.",
}) {
  const [screen, setScreen] = useState("methods"); // methods | fingerprint | face | email | pin | register | success
  const [scanProgress, setScanProgress] = useState(0);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem("zerovault_user_email") || "");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [tempId, setTempId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Target email capture if not cached
  const [emailInput, setEmailInput] = useState("");
  const [emailLocked, setEmailLocked] = useState(!!localStorage.getItem("zerovault_user_email"));
  
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

  // Start Real Webcam & Perform Biometric Verification
  const startWebcamVerification = async (targetEmail) => {
    setError("");
    setScanProgress(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" }
      });
      setVideoStream(stream);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);

      // Perform a simulated progressive visual scan, then capture and verify!
      let p = 0;
      const interval = setInterval(async () => {
        p += Math.random() * 8 + 4;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setScanProgress(100);
          
          // Capture photo from video stream
          if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 320;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0, 320, 320);
            const capturedFrame = canvas.toDataURL("image/jpeg");

            // Stop camera stream immediately
            stream.getTracks().forEach((track) => track.stop());
            setVideoStream(null);

            // Call Face Verification API
            try {
              const endpoint = isGov ? "/api/auth/employee/login-face" : "/api/auth/wallet/login-face";
              const response = await fetch(`${getBackendUrl()}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail, capturedPhoto: capturedFrame })
              });

              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || "Biometric validation mismatch.");
              }

              setScreen("success");
              localStorage.setItem("zerovault_user_email", data.user.email);
              setTimeout(() => onLogin(data.user), 700);
            } catch (err) {
              console.error(err);
              setError(`❌ Face ID Verification Failed: ${err.message}`);
              setScreen("methods");
            }
          }
        } else {
          setScanProgress(Math.min(p, 100));
        }
      }, 100);

    } catch (err) {
      console.error("Camera access failed:", err);
      setError("❌ Camera Error: Camera access denied or webcam already in use.");
      setScreen("methods");
    }
  };

  const handleMethodSelect = (method) => {
    setError("");
    setDevMailLink(null);
    setDevMailCode(null);

    const activeEmail = email || emailInput;
    if (!activeEmail && method !== "register") {
      setError("Please input your registered email address first.");
      return;
    }

    if (method === "face") {
      setScreen("face");
      startWebcamVerification(activeEmail);
    } else {
      setScreen(method);
    }
  };

  // PIN authentication submission
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const activeEmail = email || emailInput;
    if (!activeEmail) { setError("Email address is required."); setIsLoading(false); return; }
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); setIsLoading(false); return; }

    try {
      const endpoint = isGov ? "/api/auth/employee/login-pin" : "/api/auth/wallet/login-pin";
      const response = await fetch(`${getBackendUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, pin })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Access Denied: PIN verification mismatch.");
      }

      setScreen("success");
      localStorage.setItem("zerovault_user_email", data.user.email);
      setTimeout(() => onLogin(data.user), 700);
    } catch (err) {
      setError(`❌ Login Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send login OTP (hits server API)
  const handleEmailSend = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const activeEmail = email || emailInput;
    if (!activeEmail || !activeEmail.includes("@")) { setError("Enter a valid email address."); setIsLoading(false); return; }
    setError("");
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/send-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, portalType: isGov ? "gov" : "wallet" })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to dispatch authentication code.");
      }

      setEmailSent(true);
      if (data.testPreviewUrl) setDevMailLink(data.testPreviewUrl);
      if (data.demoCode) setDevMailCode(data.demoCode);
    } catch (err) {
      setError(`❌ OTP Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP submission
  const handleEmailVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const activeEmail = email || emailInput;
    if (emailOtp.length !== 6) { setError("Enter 6-digit verification code."); setIsLoading(false); return; }
    setError("");

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, otp: emailOtp, portalType: isGov ? "gov" : "wallet" })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification code mismatch.");
      }

      setScreen("success");
      localStorage.setItem("zerovault_user_email", data.user.email);
      setTimeout(() => onLogin(data.user), 700);
    } catch (err) {
      setError(`❌ Verification Failed: ${err.message}`);
    }
  };

  // First Onboarding (Gov only, Temp ID -> Temp PIN)
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    const activeEmail = email || emailInput;
    if (!tempId.trim()) { setError("Access ID is required."); return; }
    if (!activeEmail || !activeEmail.includes("@")) { setError("Official email is required."); return; }
    setError("");

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/employee/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempId: tempId.trim(), email: activeEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process onboarding registration.");
      }

      setEmailSent(true);
      setScreen("email"); // Redirect to the passcode input page
      if (data.testPreviewUrl) setDevMailLink(data.testPreviewUrl);
      if (data.demoCode) setDevMailCode(data.demoCode);
    } catch (err) {
      setError(`❌ Onboarding Failed: ${err.message}`);
    }
  };

  const handleLockReset = () => {
    localStorage.removeItem("zerovault_user_email");
    setEmail("");
    setEmailInput("");
    setEmailLocked(false);
    setError("");
  };

  const goBack = () => {
    stopWebcam();
    setScreen("methods");
    setError("");
    setPin("");
    setEmailOtp("");
    setEmailSent(false);
    setScanProgress(0);
    setDevMailLink(null);
    setDevMailCode(null);
  };

  return (
    <div className={`auth-screen ${screen === "success" ? "auth-exit" : ""}`}
         style={{ background: isGov
           ? "linear-gradient(145deg, #faf9f6 0%, #fff7ed 30%, #f5f4ef 60%, #ecfdf5 100%)"
           : "linear-gradient(145deg, #09090e 0%, #111122 30%, #080812 60%, #0f172a 100%)"
         }}>


      <div className="auth-container">
        <div className="auth-orb auth-orb-1" style={{ background: `rgba(${accentColor}, 0.1)` }} />
        <div className="auth-orb auth-orb-2" style={{ background: `rgba(${accentColor}, 0.06)` }} />


        <div className="auth-card" style={{ background: isGov ? "rgba(255, 255, 255, 0.85)" : "rgba(17, 17, 27, 0.65)", color: isGov ? "#0f172a" : "#f8fafc" }}>
          
          {/* Brand Header */}
          <div className="auth-brand">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                {isGov ? <span style={{ fontSize: "2rem" }}>🏛️</span> : <span style={{ fontSize: "2rem" }}>🔐</span>}
              </div>
              <div className="auth-logo-ring" style={{ borderColor: `rgba(${accentColor}, 0.15)` }} />
            </div>
            <h1 className="auth-title" style={{
              background: isGov
                ? "linear-gradient(135deg, #f97316, #ea580c, #059669)"
                : "linear-gradient(135deg, #a5b4fc, #818cf8, #22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>{title}</h1>
            <p className="auth-tagline" style={{ color: isGov ? "#475569" : "#94a3b8" }}>{subtitle}</p>
          </div>

          {error && <div className="auth-error-box" style={{ marginBottom: "1rem" }}>{error}</div>}

          {/* Email input field if not cached */}
          {screen === "methods" && !emailLocked && (
            <div style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="auth-input-label" style={{ color: isGov ? "#334155" : "#94a3b8" }}>Verify Profile Email Address</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="auth-text-input"
                placeholder="officer@zerovault.gov.in"
                style={{ background: isGov ? "#ffffff" : "rgba(255,255,255,0.02)", color: isGov ? "#0f172a" : "#ffffff", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
          )}

          {screen === "methods" && emailLocked && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isGov ? "#f1f5f9" : "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", marginBottom: "1.25rem", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "0.85rem", color: isGov ? "#475569" : "#a5b4fc" }}>📧 Profile: <strong>{email}</strong></span>
              <button onClick={handleLockReset} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>Switch</button>
            </div>
          )}

          {/* ===== Method Selection ===== */}
          {screen === "methods" && (
            <div className="auth-methods-grid" style={{ animation: "fadeIn 0.4s ease-out" }}>
              <button className="auth-method-btn" onClick={() => handleMethodSelect("face")} style={{ "--accent": accentHex, color: isGov ? "#0f172a" : "#ffffff" }}>
                <div className="auth-method-icon">👤</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Biometric Face ID</span>
                  <span className="auth-method-desc">Live camera analysis</span>
                </div>
              </button>

              <button className="auth-method-btn" onClick={() => handleMethodSelect("email")} style={{ "--accent": accentHex, color: isGov ? "#0f172a" : "#ffffff" }}>
                <div className="auth-method-icon">✉️</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Email OTP Lock</span>
                  <span className="auth-method-desc">6-digit SMTP passcode</span>
                </div>
              </button>

              <button className="auth-method-btn" onClick={() => handleMethodSelect("pin")} style={{ "--accent": accentHex, color: isGov ? "#0f172a" : "#ffffff" }}>
                <div className="auth-method-icon">🔑</div>
                <div className="auth-method-info">
                  <span className="auth-method-label">Numeric Vault PIN</span>
                  <span className="auth-method-desc">Local security key</span>
                </div>
              </button>

              {isGov && (
                <div style={{ marginTop: "1rem", textAlign: "center", width: "100%" }}>
                  <button className="auth-btn-link" onClick={() => setScreen("register")} style={{ color: accentHex, background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>
                    🇮🇳 First Onboarding? Click Here
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== Webcam Face ID ===== */}
          {screen === "face" && (
            <div className="auth-scan-view" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="auth-face-camera-container">
                {videoStream ? (
                  <video ref={videoRef} autoPlay playsInline muted className="auth-face-camera-video" />
                ) : (
                  <div className="auth-face-camera-placeholder">👤</div>
                )}
                
                <div className="auth-face-scanline" style={{ background: `linear-gradient(180deg, transparent, rgba(${accentColor}, 0.25), transparent)` }} />
                <div className="auth-face-corner tl" style={{ borderColor: accentHex }} />
                <div className="auth-face-corner tr" style={{ borderColor: accentHex }} />
                <div className="auth-face-corner bl" style={{ borderColor: accentHex }} />
                <div className="auth-face-corner br" style={{ borderColor: accentHex }} />
              </div>
              <p className="auth-scan-label">
                {scanProgress < 100 ? `Analyzing facial geometry (${Math.floor(scanProgress)}%)...` : "Processing AI biometrics verification..."}
              </p>
              <div className="auth-progress-bar" style={{ width: "80%", marginBottom: "1rem" }}>
                <div className="auth-progress-fill" style={{ width: `${scanProgress}%`, background: `linear-gradient(90deg, ${accentHex}, ${secondaryHex})` }} />
              </div>
              
              <div style={{ background: isGov ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.75rem", color: isGov ? "#475569" : "#94a3b8", textAlign: "left", lineHeight: 1.5, width: "100%", maxWidth: "320px" }}>
                <strong>Enrollment:</strong> Your first scan is converted into a mathematical descriptor number set. We store this descriptor, never your photo. <br />
                <strong>Login:</strong> Each login takes a fresh scan and compares it mathematically to your descriptor. If it doesn't match closely enough, access is denied. <br />
                <strong>Tips:</strong> Ensure good lighting • Look directly at camera • Remove sunglasses/masks • Only one face in frame.
              </div>

              <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack} style={{ marginTop: "1rem" }}>Cancel</button>
            </div>
          )}

          {/* ===== Government Employee First Onboarding ===== */}
          {screen === "register" && (
            <form className="auth-code-form" onSubmit={handleOnboardSubmit} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <p className="auth-code-label">Request Official Authentication Credentials</p>
              
              <div className="auth-input-group">
                <label className="auth-input-label">Gov Temp Access ID</label>
                <input 
                  type="text" 
                  value={tempId} 
                  onChange={(e) => setTempId(e.target.value.toUpperCase())}
                  className="auth-text-input" 
                  placeholder="e.g. GOV-EMP-101" 
                  style={{ background: "#ffffff", color: "#0f172a" }}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Official Mail Address</label>
                <input 
                  type="email" 
                  value={email || emailInput} 
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmail(e.target.value);
                  }}
                  className="auth-text-input" 
                  placeholder="officer@zerovault.gov.in" 
                  style={{ background: "#ffffff", color: "#0f172a" }}
                  required
                />
              </div>

              <div className="auth-btn-row" style={{ marginTop: "1rem" }}>
                <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack}>Back</button>
                <button type="submit" className="auth-btn auth-btn-primary" style={{ background: accentHex, flex: 2 }}>
                  Request PIN Credentials
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
                  <p className="auth-code-label" style={{ marginBottom: "0.25rem" }}>We'll send a quick-expiring code to confirm you control this email.</p>
                  <p style={{ fontSize: "0.75rem", color: isGov ? "#64748b" : "#94a3b8", marginBottom: "1rem", lineHeight: 1.4, textAlign: "center" }}>
                    If it isn't arriving, check your spam and confirm the email is typed correctly.
                    <br />(We verify the code directly — we will never ask you to read it back.)
                  </p>
                  <input type="email" value={email || emailInput} onChange={(e) => setEmailInput(e.target.value)}
                    className="auth-email-input" placeholder="you@example.com" autoFocus
                    style={{ "--accent": accentHex, background: isGov ? "#ffffff" : "rgba(0,0,0,0.2)", color: isGov ? "#0f172a" : "#ffffff" }}
                  />
                  <div className="auth-btn-row">
                    <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack} disabled={isLoading}>Back</button>
                    <button type="submit" className="auth-btn auth-btn-primary"
                      style={{ background: accentHex, flex: 2 }} disabled={isLoading}>{isLoading ? "Processing..." : "Send OTP Code"}</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEmailVerify}>
                  <div className="auth-email-sent">
                    <div className="auth-email-sent-icon">📬</div>
                    <p className="auth-email-sent-text">Passcode generated and dispatched to <strong>{email || emailInput}</strong></p>
                  </div>
                  <p className="auth-code-label" style={{ marginTop: "1rem" }}>Enter 6-digit passcode</p>
                  <div className="auth-code-input-row">
                    <input type="text" maxLength={6} value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                      className="auth-code-input" placeholder="000000" autoFocus
                      style={{ "--accent": accentHex, background: isGov ? "#ffffff" : "rgba(0,0,0,0.2)", color: isGov ? "#0f172a" : "#ffffff" }}
                    />
                  </div>
                  <div className="auth-btn-row" style={{ marginTop: "1.5rem" }}>
                    <button type="button" className="auth-btn auth-btn-ghost" onClick={goBack} disabled={isLoading}>Back</button>
                    <button type="submit" className="auth-btn auth-btn-primary"
                      style={{ background: accentHex, flex: 2 }} disabled={isLoading}>{isLoading ? "Verifying..." : "Unlock Portal"}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ===== PIN Code Login ===== */}
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
                  style={{ "--accent": accentHex, background: isGov ? "#ffffff" : "rgba(0,0,0,0.2)", color: isGov ? "#0f172a" : "#ffffff" }}
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
                  <circle cx="26" cy="26" r="24" fill="none" stroke="#059669" strokeWidth="2.5" />
                  <path d="M15 27L23 35L37 20" fill="none" stroke="#059669" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" className="auth-check-path" />
                </svg>
              </div>
              <p className="auth-success-text">Welcome to {title}</p>
            </div>
          )}
        </div>

        <p className="auth-footer" style={{ color: isGov ? "#475569" : "#64748b" }}>
          {isGov
            ? "Government of India · Ministry of Electronics & IT · Secure UIDAI Network"
            : "Privacy-preserving identity verification · Zero-Knowledge Proofs + Gemini AI"
          }
        </p>
      </div>
    </div>
  );
}
