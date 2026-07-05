import { useState, useEffect, useRef } from "react";

export default function Settings({ user, onUpdateUser }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Webcam settings
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError("");
    setSuccess("");
    setCapturedPhoto(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error(err);
      setError("Failed to access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleEnrollFace = async () => {
    if (!capturedPhoto) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/employee/save-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          faceIdPhoto: capturedPhoto
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save biometric Face ID template.");
      }

      setSuccess("✓ Biometric Face ID enrolled successfully!");
      onUpdateUser({ ...user, hasFaceId: true });
      setCapturedPhoto(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError("");
    setSuccess("");

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/employee/save-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          pin
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save PIN changes.");
      }

      setSuccess("✓ Security PIN updated successfully!");
      onUpdateUser({ ...user, isTemporaryPin: false });
      setPin("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="card-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <h2 className="card-title">🏛️ Officer Security Settings</h2>
            <p className="card-description">Verify, enroll, and modify official credentials for the UIDAI Secure Gateway network.</p>
          </div>
          <span className="ws-indicator connected" style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
            Officer Secure Session
          </span>
        </div>
      </div>

      {success && <div className="auth-success-box" style={{ margin: "1rem 0" }}>{success}</div>}
      {error && <div className="auth-error-box" style={{ margin: "1rem 0" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem", marginTop: "1rem" }}>
        
        {/* Face ID Section */}
        <div style={{ padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)", background: "#ffffff" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", color: "#1e3a8a" }}>
            👤 Biometric Face Verification Enrollment
          </h3>
          <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#475569" }}>
            Enrolling your face details enables instant biometric authentication bypassing OTP entries. Your biometric data is cryptographically protected.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            {showCamera && (
              <div className="auth-face-camera-container" style={{ width: "240px", height: "240px" }}>
                <video ref={videoRef} autoPlay playsInline muted className="auth-face-camera-video" style={{ objectFit: "cover" }} />
                <div className="auth-face-scanline" />
                <div className="auth-face-corner tl" style={{ borderColor: "#f97316" }} />
                <div className="auth-face-corner tr" style={{ borderColor: "#f97316" }} />
                <div className="auth-face-corner bl" style={{ borderColor: "#f97316" }} />
                <div className="auth-face-corner br" style={{ borderColor: "#f97316" }} />
              </div>
            )}

            {capturedPhoto && !showCamera && (
              <div style={{ position: "relative", width: "160px", height: "160px", borderRadius: "50%", overflow: "hidden", border: "3px solid #f97316" }}>
                <img src={capturedPhoto} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!showCamera && !capturedPhoto && (
                <button type="button" className="gov-nav-link active" onClick={startCamera} style={{ background: "#f97316", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  📸 Enlist Web Camera
                </button>
              )}
              {showCamera && (
                <>
                  <button type="button" className="gov-nav-link active" onClick={capturePhoto} style={{ background: "#059669", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Capture Reference Image
                  </button>
                  <button type="button" className="gov-nav-link logout-btn" onClick={stopCamera} style={{ background: "#94a3b8", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Cancel
                  </button>
                </>
              )}
              {capturedPhoto && (
                <>
                  <button type="button" className="gov-nav-link active" onClick={handleEnrollFace} disabled={loading} style={{ background: "#f97316", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    {loading ? "Enrolling..." : "💾 Save Enrolled Biometrics"}
                  </button>
                  <button type="button" className="gov-nav-link logout-btn" onClick={() => setCapturedPhoto(null)} style={{ background: "#94a3b8", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Retake
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <span className={`ws-indicator ${user?.hasFaceId ? "connected" : "disconnected"}`} style={{ fontSize: "0.8rem", padding: "4px 10px", color: user?.hasFaceId ? "#047857" : "#b91c1c" }}>
              {user?.hasFaceId ? "✓ Face Verification Enabled" : "✗ Face Verification Enrolled"}
            </span>
          </div>
        </div>

        {/* Security Settings Form */}
        <form onSubmit={handleSaveSecurity} style={{ display: "flex", flexDirection: "column", gap: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem" }}>
          <div className="input-group" style={{ maxWidth: "320px" }}>
            <label className="input-label" style={{ color: "#334155" }}>Update Security Access PIN Code</label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter new PIN (4-6 digits)"
              className="text-input"
              style={{ background: "#ffffff", border: "1px solid #cbd5e1" }}
              required
            />
          </div>

          {user?.isTemporaryPin && (
            <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "10px", borderRadius: "6px", fontSize: "0.8rem", color: "#b45309" }}>
              ⚠️ You are currently using a temporary onboarding PIN. Please update to a permanent PIN immediately.
            </div>
          )}

          <button type="submit" className="gov-nav-link active" disabled={loading} style={{ background: "#f97316", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, width: "fit-content", alignSelf: "flex-start" }}>
            {loading ? "Saving..." : "💾 Update PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
