import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { captureEnrollment, verifyFace, loadModels } from '../utils/faceBiometrics';

// State Machine Steps
const STEPS = {
  EMAIL_INPUT: 'EMAIL_INPUT',
  OTP_VERIFY: 'OTP_VERIFY',
  FACE_PREPARE: 'FACE_PREPARE', // loading models
  FACE_ENROLL: 'FACE_ENROLL',
  FACE_LOGIN: 'FACE_LOGIN',
  SUCCESS: 'SUCCESS'
};

export default function AuthScreen({ onLogin, theme = 'vault', title = 'ZeroVault' }) {
  const [step, setStep] = useState(STEPS.EMAIL_INPUT);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);
  const otpRefs = useRef([]);

  const isGov = theme === 'gov';
  const accentHex = isGov ? '#f97316' : '#4f46e5';

  // Handle Supabase Auth State changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // OTP succeeded, check if face is enrolled
        setStep(STEPS.FACE_PREPARE);
        await checkFaceEnrollment(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        stopWebcam();
        setStep(STEPS.EMAIL_INPUT);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopWebcam();
    };
  }, []);

  // OTP Cooldown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Ensure video stream is attached when the video element renders
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, step]);

  const stopWebcam = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } });
      setVideoStream(stream);
    } catch (err) {
      setError('Camera access denied. Please grant permission to continue.');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) { setError('Enter a valid email.'); return; }
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({ email });
      if (signInError) throw signInError;
      
      setCountdown(30);
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      setError(`OTP Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({ email });
      if (resendError) throw resendError;
      setCountdown(30);
    } catch (err) {
      setError(`Resend Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
    
    if (newOtp.every(d => d !== '')) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const verifyOtp = async (token) => {
    setError('');
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (verifyError) throw verifyError;
      // onAuthStateChange will catch the SIGNED_IN event
    } catch (err) {
      setError('Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const checkFaceEnrollment = async (userId) => {
    try {
      setLoading(true);
      await loadModels(); // load face-api models
      
      const { data, error: fetchError } = await supabase
        .from('user_face_descriptors')
        .select('descriptor')
        .eq('user_id', userId)
        .single();
        
      await startWebcam();
      setLoading(false);

      if (data && data.descriptor) {
        setStep(STEPS.FACE_LOGIN);
        doFaceLogin(data.descriptor);
      } else {
        setStep(STEPS.FACE_ENROLL);
      }
    } catch (err) {
      setError(`Biometric setup failed: ${err.message}`);
      setLoading(false);
    }
  };

  const doFaceEnrollment = async () => {
    setError('');
    setScanProgress(0);
    try {
      // Capture 4 frames over 2 seconds
      const descriptorArray = await captureEnrollment(videoRef.current, (prog) => {
        setScanProgress(prog);
      });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // Store in Supabase
      const { error: insertError } = await supabase
        .from('user_face_descriptors')
        .insert({ user_id: session.user.id, descriptor: descriptorArray });

      if (insertError) throw insertError;
      
      handleSuccess(session.user);
    } catch (err) {
      setError(`Enrollment failed: ${err.message}`);
      setScanProgress(0);
    }
  };

  const doFaceLogin = async (storedDescriptor) => {
    if (retryCount >= 3) {
      setError('Max retries exceeded. Please contact support or use account recovery.');
      return;
    }
    
    setError('');
    setScanProgress(30); // Show some visual feedback that matching started
    
    try {
      const result = await verifyFace(videoRef.current, storedDescriptor);
      if (result.matched) {
        setScanProgress(100);
        const { data: { session } } = await supabase.auth.getSession();
        handleSuccess(session.user);
      }
    } catch (err) {
      setRetryCount(prev => prev + 1);
      setError(`${err.message} (Attempt ${retryCount + 1} of 3)`);
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
            <p style={{ color: isGov ? '#475569' : '#94a3b8', fontSize: '0.85rem' }}>Secure Two-Factor Identity Portal</p>
          </div>

          {error && <div className="auth-error-box" style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

          {/* Step 1: Email Input */}
          {step === STEPS.EMAIL_INPUT && (
            <form onSubmit={handleEmailSubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-text-input" placeholder="you@example.com" required autoFocus 
                  style={{ background: isGov ? '#fff' : 'rgba(255,255,255,0.05)', color: isGov ? '#000' : '#fff', border: '1px solid rgba(150,150,150,0.2)' }}/>
              </div>
              <button type="submit" className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === STEPS.OTP_VERIFY && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Enter the 6-digit code sent to <strong>{email}</strong></p>
              
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {otp.map((digit, idx) => (
                  <input key={idx} ref={el => otpRefs.current[idx] = el} type="text" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    style={{ width: '40px', height: '48px', textAlign: 'center', fontSize: '1.25rem', borderRadius: '8px', background: isGov ? '#fff' : 'rgba(255,255,255,0.05)', color: isGov ? '#000' : '#fff', border: `1px solid ${accentHex}` }}
                  />
                ))}
              </div>
              
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {countdown > 0 ? `Resend code in ${countdown}s` : <button onClick={handleResendOtp} style={{ background: 'none', border: 'none', color: accentHex, cursor: 'pointer' }}>Resend Code</button>}
              </div>
              
              <button onClick={() => setStep(STEPS.EMAIL_INPUT)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: '1rem', fontSize: '0.8rem' }}>Change Email</button>
            </div>
          )}

          {/* Step 3: Face Loading */}
          {step === STEPS.FACE_PREPARE && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: `3px solid rgba(0,0,0,0.1)`, borderTopColor: accentHex, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p>Initializing AI Biometrics...</p>
            </div>
          )}

          {/* Step 4: Face Enroll / Login */}
          {(step === STEPS.FACE_ENROLL || step === STEPS.FACE_LOGIN) && (
            <div className="auth-scan-view" style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>{step === STEPS.FACE_ENROLL ? 'Face Enrollment' : 'Face Verification'}</h3>
              
              <div className="auth-face-camera-container" style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 1rem', borderRadius: '50%', overflow: 'hidden', border: `4px solid ${scanProgress === 100 ? '#10b981' : accentHex}` }}>
                {videoStream ? (
                  <video ref={videoRef} autoPlay playsInline muted width="320" height="320" onLoadedMetadata={() => videoRef.current && videoRef.current.play()} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                ) : (
                  <div style={{ background: '#334155', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                )}
              </div>
              
              <div className="auth-progress-bar" style={{ width: '80%', margin: '0 auto 1rem', height: '4px', background: 'rgba(150,150,150,0.2)', borderRadius: '2px' }}>
                <div style={{ width: `${scanProgress}%`, background: accentHex, height: '100%', transition: 'width 0.3s ease' }} />
              </div>

              {step === STEPS.FACE_ENROLL && (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>We'll capture 4 frames to build a stable mathematical descriptor. Look straight at the camera.</p>
                  <button onClick={doFaceEnrollment} className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%' }}>Start Scan</button>
                </>
              )}

              {step === STEPS.FACE_LOGIN && (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Please verify your identity. A liveness check requires slight natural movement.</p>
                  <button onClick={() => {
                    const checkFace = async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      const { data } = await supabase.from('user_face_descriptors').select('descriptor').eq('user_id', session.user.id).single();
                      if(data) doFaceLogin(data.descriptor);
                    };
                    checkFace();
                  }} className="auth-btn auth-btn-primary" style={{ background: accentHex, width: '100%' }}>Verify Now</button>
                </>
              )}
            </div>
          )}

          {/* Step 5: Success */}
          {step === STEPS.SUCCESS && (
            <div className="auth-success" style={{ textAlign: 'center', padding: '2rem' }}>
              <span style={{ fontSize: '3rem' }}>✅</span>
              <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Identity Verified</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
