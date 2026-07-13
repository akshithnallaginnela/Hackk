import { useState, useRef, useEffect } from 'react';
import { loadModels, captureEnrollment, captureSingleDescriptor } from '../utils/faceBiometrics';

const STEPS = {
  EMAIL_INPUT: 'EMAIL_INPUT',
  REGISTER: 'REGISTER',
  PIN_INPUT: 'PIN_INPUT',
  FACE_PREPARE: 'FACE_PREPARE',
  FACE_ENROLL: 'FACE_ENROLL',
  FACE_LOGIN: 'FACE_LOGIN',
  SUCCESS: 'SUCCESS'
};

const getBackendUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default function AuthScreen({ onLogin, theme = 'vault', title = 'ZeroVault' }) {
  const [step, setStep] = useState(STEPS.EMAIL_INPUT);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [hasFaceId, setHasFaceId] = useState(false);
  const [demoCode, setDemoCode] = useState(null);

  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);

  const isGov = theme === 'gov';
  const accentHex = isGov ? '#f97316' : '#4f46e5';

  useEffect(() => {
    return () => stopWebcam();
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, step]);

  const stopWebcam = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      setVideoStream(null);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } });
      setVideoStream(stream);
    } catch {
      setError('Camera access denied.');
    }
  };

  const checkEmail = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) { setError('Enter a valid email.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/wallet/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin: '000000' })
      });
      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'No wallet found for this email.') {
          setStep(STEPS.REGISTER);
        } else {
          setStep(STEPS.PIN_INPUT);
        }
      } else if (res.ok) {
        setStep(STEPS.PIN_INPUT);
      }
    } catch {
      setError('Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !mobile) { setError('Please fill all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/wallet/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDemoCode(data.demoCode);
      setStep(STEPS.PIN_INPUT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (!pin) { setError('Enter your PIN.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/wallet/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('zerovault_token', data.token);
      setHasFaceId(data.hasFaceId);
      if (data.hasFaceId) {
        setStep(STEPS.FACE_PREPARE);
        await startWebcam();
        setLoading(false);
        setStep(STEPS.FACE_LOGIN);
      } else {
        setStep(STEPS.FACE_PREPARE);
        await startWebcam();
        setLoading(false);
        setStep(STEPS.FACE_ENROLL);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const doFaceEnrollment = async () => {
    setError('');
    setScanProgress(0);
    await loadModels();
    try {
      const descriptor = await captureEnrollment(videoRef.current, (p) => setScanProgress(p));
      const token = localStorage.getItem('zerovault_token');
      const res = await fetch(`${getBackendUrl()}/api/auth/wallet/face/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ faceTemplate: descriptor })
      });
      if (!res.ok) throw new Error('Failed to enroll face.');
      handleSuccess({ name, email });
    } catch (err) {
      setError(err.message);
    }
  };

  const doFaceLogin = async () => {
    setError('');
    setScanProgress(30);
    await loadModels();
    try {
      const descriptor = await captureSingleDescriptor(videoRef.current);
      const res = await fetch(`${getBackendUrl()}/api/auth/wallet/face/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, faceTemplate: descriptor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('zerovault_token', data.token);
      setScanProgress(100);
      handleSuccess(data.user);
    } catch (err) {
      setError(err.message);
      setScanProgress(0);
    }
  };

  const handleSuccess = (user) => {
    stopWebcam();
    setStep(STEPS.SUCCESS);
    setTimeout(() => onLogin(user), 800);
  };

  return (
    <div className={`auth-screen ${step === STEPS.SUCCESS ? 'auth-exit' : ''}`}
         style={{ background: isGov ? 'linear-gradient(145deg, #faf9f6 0%, #fff7ed 30%, #f5f4ef 60%, #ecfdf5 100%)' : 'linear-gradient(145deg, #09090e 0%, #111122 30%, #080812 60%, #0f172a 100%)' }}>
      <div className="auth-container">
        <div className="auth-card" style={{ background: isGov ? 'rgba(255, 255, 255, 0.85)' : 'rgba(17, 17, 27, 0.65)', color: isGov ? '#0f172a' : '#f8fafc' }}>
          <div className="auth-brand" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 className="auth-title" style={{ background: `linear-gradient(135deg, ${accentHex}, ${isGov ? '#ea580c' : '#818cf8'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</h1>
            <p style={{ color: isGov ? '#475569' : '#94a3b8', fontSize: '0.85rem' }}>Secure JWT Identity Portal</p>
          </div>

          {demoCode && (
            <div className="dev-mail-helper" style={{ marginBottom: '1rem' }}>
              <div className="dev-mail-header">DEVELOPER CONSOLE</div>
              <div className="dev-mail-body">Your initial PIN: <strong>{demoCode}</strong></div>
            </div>
          )}

          {error && <div className="auth-error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

          {step === STEPS.EMAIL_INPUT && (
            <form onSubmit={checkEmail}>
              <div className="auth-input-group">
                <label className="auth-input-label">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-text-input" placeholder="you@example.com" required autoFocus />
              </div>
              <button type="submit" className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%', marginTop: '1.5rem', padding: '0.75rem', borderRadius: '8px', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} disabled={loading}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          )}

          {step === STEPS.REGISTER && (
            <form onSubmit={handleRegister}>
              <h3 style={{ marginBottom: '1rem' }}>Create Wallet</h3>
              <div className="auth-input-group">
                <label className="auth-input-label">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="auth-text-input" placeholder="Your name" required />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Mobile Number</label>
                <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="auth-text-input" placeholder="+91 XXXXX XXXXX" required />
              </div>
              <button type="submit" className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%', marginTop: '1.5rem', padding: '0.75rem', borderRadius: '8px', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} disabled={loading}>
                {loading ? 'Registering...' : 'Register & Get PIN'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={() => setStep(STEPS.EMAIL_INPUT)} style={{ background: 'none', border: 'none', color: accentHex, cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
              </div>
            </form>
          )}

          {step === STEPS.PIN_INPUT && (
            <form onSubmit={handlePinLogin}>
              <h3 style={{ marginBottom: '1rem' }}>Enter Your PIN</h3>
              <div className="auth-input-group">
                <input type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="auth-code-input auth-pin-input" placeholder="• • • • • •" style={{ letterSpacing: '12px', fontSize: '1.5rem', padding: '10px', textAlign: 'center' }} autoFocus required />
              </div>
              <button type="submit" className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%', marginTop: '1.5rem', padding: '0.75rem', borderRadius: '8px', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Unlock'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setStep(STEPS.EMAIL_INPUT); setDemoCode(null); }} style={{ background: 'none', border: 'none', color: accentHex, cursor: 'pointer', fontSize: '0.85rem' }}>← Different email</button>
              </div>
            </form>
          )}

          {step === STEPS.FACE_PREPARE && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: `3px solid rgba(0,0,0,0.1)`, borderTopColor: accentHex, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p>Preparing biometrics...</p>
            </div>
          )}

          {(step === STEPS.FACE_ENROLL || step === STEPS.FACE_LOGIN) && (
            <div className="auth-scan-view" style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>{step === STEPS.FACE_ENROLL ? 'Enroll Face ID' : 'Face Verification'}</h3>
              <div className="auth-face-camera-container" style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 1rem', borderRadius: '50%', overflow: 'hidden', border: `4px solid ${scanProgress === 100 ? '#10b981' : accentHex}` }}>
                {videoStream ? (
                  <video ref={videoRef} autoPlay playsInline muted width="320" height="320" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                ) : (
                  <div style={{ background: '#334155', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                )}
              </div>
              <div className="auth-progress-bar" style={{ width: '80%', margin: '0 auto 1rem', height: '4px', background: 'rgba(150,150,150,0.2)', borderRadius: '2px' }}>
                <div style={{ width: `${scanProgress}%`, background: accentHex, height: '100%', transition: 'width 0.3s ease' }} />
              </div>
              {step === STEPS.FACE_ENROLL && (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Look straight at the camera. We'll capture 4 frames.</p>
                  <button onClick={doFaceEnrollment} className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%' }}>Start Enrollment</button>
                </>
              )}
              {step === STEPS.FACE_LOGIN && (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Verify your identity with Face ID.</p>
                  <button onClick={doFaceLogin} className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%' }}>Verify Now</button>
                </>
              )}
            </div>
          )}

          {step === STEPS.SUCCESS && (
            <div className="auth-success" style={{ textAlign: 'center', padding: '2rem' }}>
              <span style={{ fontSize: '3rem' }}>✅</span>
              <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Identity Verified</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
