/**
 * Express API Server with WebSocket Support — ZK Identity System
 * Supports:
 * - Asymmetric Cryptographic Credential Issuance (ECDSA secp256k1)
 * - Zero-Knowledge Proof verification (real or simulation)
 * - Live WebSocket communication for instant proof verification matching
 */
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import * as snarkjs from "snarkjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory tables for real email auth validation
const pendingRegistrations = new Map(); // email -> { tempId, otp, timestamp }
const activeOtps = new Map(); // email -> { otp, timestamp }

// Initialize Nodemailer Transport
let transporter;
const initNodemailer = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port === "465",
      auth: { user, pass }
    });
    console.log("📨 Nodemailer configured with custom SMTP");
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`\n📨 Ethereal SMTP test account generated:`);
      console.log(`   User: ${testAccount.user}`);
      console.log(`   Pass: ${testAccount.pass}`);
      console.log(`   Read logs or login at https://ethereal.email/ to preview sent emails!\n`);
    } catch (err) {
      console.error("❌ Failed to generate Ethereal SMTP test account:", err);
    }
  }
};
initNodemailer();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;

// Generate mock Issuer Key Pair (secp256k1) for government signing simulation
const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "secp256k1",
});
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

console.log("🏛️  Issuer Keypair generated successfully (secp256k1)");

// WebSocket Connection Management
// Map of sessionId -> { verifier: ws, prover: ws, issuer: ws }
const activeSessions = new Map();

wss.on("connection", (ws) => {
  let clientSession = null;
  let clientRole = null;

  console.log("🔌 New WS connection established");

  ws.on("message", async (message) => {
    try {
      const payload = JSON.parse(message);
      console.log("📥 WS Message received:", payload.type, "Session:", payload.sessionId);

      switch (payload.type) {
        case "register": {
          const { role, sessionId } = payload;
          if (!sessionId) return;

          clientSession = sessionId;
          clientRole = role;

          if (!activeSessions.has(sessionId)) {
            activeSessions.set(sessionId, { verifier: null, prover: null, issuer: null });
          }

          const session = activeSessions.get(sessionId);
          session[role] = ws;

          console.log(`👤 Registered ${role} for session ${sessionId}`);
          
          // Notify the other side if they are already connected
          if (role === "prover") {
            if (session.verifier) {
              session.verifier.send(JSON.stringify({ type: "prover_connected" }));
            }
            if (session.issuer) {
              session.issuer.send(JSON.stringify({ type: "prover_connected" }));
            }
          } else if (role === "verifier" && session.prover) {
            ws.send(JSON.stringify({ type: "prover_connected" }));
          } else if (role === "issuer" && session.prover) {
            ws.send(JSON.stringify({ type: "prover_connected" }));
          }

          ws.send(JSON.stringify({ type: "registered", status: "success", role }));
          break;
        }

        case "submit_proof": {
          const { sessionId, proof } = payload;
          if (!sessionId || !proof) return;

          console.log(`⚙️  Verifying proof submitted via WS for session ${sessionId}...`);
          const session = activeSessions.get(sessionId);

          if (!session || !session.verifier) {
            ws.send(JSON.stringify({ type: "error", message: "Verifier not active in this session" }));
            return;
          }

          // Verify the ZK proof
          const verification = await verifyZKProofInternal(proof);

          // Relay result in real-time to the verifier
          session.verifier.send(JSON.stringify({
            type: "verification_result",
            valid: verification.valid,
            mode: verification.mode,
            claim: proof.claim,
            details: verification.details,
            verifiedAt: new Date().toISOString()
          }));

          // Send confirmation back to the prover
          ws.send(JSON.stringify({ type: "submit_status", status: "success", valid: verification.valid }));
          break;
        }

        case "issue_credential": {
          const { sessionId, credential } = payload;
          if (!sessionId || !credential) return;

          console.log(`🏛️  Relaying credential from Issuer to Prover for session ${sessionId}...`);
          const session = activeSessions.get(sessionId);

          if (!session || !session.prover) {
            ws.send(JSON.stringify({ type: "error", message: "Prover wallet not synced to this session" }));
            return;
          }

          // Push credential directly to Prover Wallet
          session.prover.send(JSON.stringify({
            type: "credential_issued",
            credential
          }));

          ws.send(JSON.stringify({ type: "issue_status", status: "success" }));
          break;
        }
      }
    } catch (err) {
      console.error("❌ Error handling WS message:", err);
      ws.send(JSON.stringify({ type: "error", message: "Failed to process request" }));
    }
  });

  ws.on("close", () => {
    if (clientSession && activeSessions.has(clientSession)) {
      const session = activeSessions.get(clientSession);
      if (clientRole === "verifier") {
        if (session.prover) {
          session.prover.send(JSON.stringify({ type: "verifier_disconnected" }));
        }
        session.verifier = null;
      } else if (clientRole === "prover") {
        if (session.verifier) {
          session.verifier.send(JSON.stringify({ type: "prover_disconnected" }));
        }
        if (session.issuer) {
          session.issuer.send(JSON.stringify({ type: "prover_disconnected" }));
        }
        session.prover = null;
      } else if (clientRole === "issuer") {
        if (session.prover) {
          session.prover.send(JSON.stringify({ type: "issuer_disconnected" }));
        }
        session.issuer = null;
      }

      // Cleanup empty session
      if (!session.verifier && !session.prover && !session.issuer) {
        activeSessions.delete(clientSession);
        console.log(`🗑️  Cleaned up empty session ${clientSession}`);
      }
    }
    console.log("🔌 WS Connection closed");
  });
});

// Helper function to verify ZK proof
async function verifyZKProofInternal(incomingProof) {
  try {
    const { proof, publicSignals } = incomingProof;

    if (!proof || !publicSignals) {
      return { valid: false, error: "Missing proof or publicSignals" };
    }

    // Check if cryptographic credential signature verification is requested
    if (incomingProof.credential) {
      const { subject, signature } = incomingProof.credential;
      
      // Verify signature on the credential
      const verify = crypto.createVerify("SHA256");
      verify.update(JSON.stringify(subject));
      const isSignatureValid = verify.verify(publicKey, signature, "hex");
      
      if (!isSignatureValid) {
        console.log("❌ ZK Verification failed: Invalid credential signature");
        return { valid: false, error: "Invalid credential signature from Issuer" };
      }
    }

    // Try to load real verification key
    let vkey;
    try {
      const vkeyPath = join(__dirname, "../public/circuits/verification_key.json");
      vkey = JSON.parse(readFileSync(vkeyPath, "utf8"));
    } catch {
      // Simulation mode
      return {
        valid: publicSignals[0] === "1",
        mode: "simulation",
        details: {
          simulation: true,
          checks: "Public signal 1 matched",
          sigStatus: incomingProof.credential ? "Issuer Signature Verified ✅" : "N/A"
        }
      };
    }

    // Real ZK proof verification
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    return {
      valid: isValid,
      mode: "real",
      details: {
        curve: "BN128",
        protocol: "Groth16",
        sigStatus: incomingProof.credential ? "Issuer Signature Verified ✅" : "N/A"
      }
    };
  } catch (err) {
    console.error("Verification helper error:", err);
    return { valid: false, error: err.message };
  }
}

// HTTP API: Get Issuer Public Key
app.get("/api/issuer-key", (req, res) => {
  res.json({ publicKey: publicKeyPem });
});

// HTTP API: Issue Signed Credential
app.post("/api/issue", (req, res) => {
  try {
    const { name, birthYear, aadhaarNumber, income } = req.body;

    if (!name || !birthYear || !aadhaarNumber || !income) {
      return res.status(400).json({ error: "Missing identity inputs" });
    }

    const subject = {
      name,
      birthYear: parseInt(birthYear),
      aadhaarNumber: aadhaarNumber.toString(),
      income: parseInt(income),
      issuedAt: new Date().toISOString()
    };

    // Create cryptographic ECDSA signature
    const sign = crypto.createSign("SHA256");
    sign.update(JSON.stringify(subject));
    const signature = sign.sign(privateKey, "hex");

    res.json({
      id: "cred_" + crypto.randomBytes(4).toString("hex"),
      issuer: "Digital India Identity Authority (Mock UIDAI)",
      subject,
      signature,
      issuedAt: subject.issuedAt
    });
  } catch (err) {
    console.error("Issuance error:", err);
    res.status(500).json({ error: err.message });
  }
});

// HTTP API: Verify proof fallback (HTTP POST)
app.post("/api/verify", async (req, res) => {
  const result = await verifyZKProofInternal(req.body);
  res.json({
    ...result,
    claim: req.body.claim || "unknown",
    verifiedAt: new Date().toISOString(),
  });
});

// Helper: Generate a random 6-digit passcode
const generatePasscode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// HTTP API: Register Government Temp ID & Send Passcode
app.post("/api/register-temp-id", async (req, res) => {
  try {
    const { tempId, email } = req.body;
    if (!tempId || !email) {
      return res.status(400).json({ error: "Temporary ID and Email are required." });
    }

    const passcode = generatePasscode();
    
    // Store in-memory
    pendingRegistrations.set(email.toLowerCase(), {
      tempId,
      otp: passcode,
      timestamp: Date.now()
    });

    console.log(`\n🔑 [Gov Onboarding] Generated Code for ${email}: ${passcode} (Temp ID: ${tempId})`);

    // Prepare email
    let testUrl = null;
    if (transporter) {
      const mailOptions = {
        from: '"ZeroVault Authority" <auth@zerovault.gov.in>',
        to: email,
        subject: "ZeroVault Government Access Authorization Credentials",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c, #059669); padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 1.5rem; letter-spacing: 0.5px;">UIDAI Issuer Portal</h2>
              <p style="margin: 4px 0 0; opacity: 0.9; font-size: 0.85rem;">Official Security Credentials</p>
            </div>
            <div style="padding: 24px; background: white;">
              <p style="margin-top: 0; color: #4a5568; font-size: 0.95rem;">An access request has been initiated for Officer Temp ID: <strong>${tempId}</strong>.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.75rem; text-transform: uppercase; color: #718096; letter-spacing: 0.5px; font-weight: 700;">Your Security Authorization Passcode</p>
                <h1 style="margin: 8px 0 0; font-size: 2.2rem; letter-spacing: 4px; color: #ea580c; font-family: monospace;">${passcode}</h1>
              </div>
              <p style="color: #718096; font-size: 0.8rem; line-height: 1.4; margin-bottom: 0;">This security code is temporary and valid for single use only. If you did not request this, please contact the network administrator immediately.</p>
            </div>
            <div style="background: #f7fafc; padding: 12px; text-align: center; border-top: 1px solid #edf2f7; font-size: 0.7rem; color: #a0aec0;">
              Government of India · Ministry of Electronics & IT
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        console.log(`📩 Ethereal Email Preview: ${testUrl}`);
      } else {
        console.log(`📩 Email sent successfully to ${email}`);
      }
    }

    res.json({
      success: true,
      emailSent: true,
      testPreviewUrl: testUrl,
      // Fallback for UI alert if SMTP is not ethereal
      demoCode: passcode
    });

  } catch (err) {
    console.error("Temp ID registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// HTTP API: Verify Government Passcode
app.post("/api/verify-gov-auth", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and passcode are required." });
  }

  const record = pendingRegistrations.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: "No pending authorization found for this email." });
  }

  // Code expiration (e.g., 10 minutes)
  if (Date.now() - record.timestamp > 10 * 60 * 1000) {
    pendingRegistrations.delete(email.toLowerCase());
    return res.status(400).json({ error: "Passcode has expired. Please register again." });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: "Invalid passcode. Please try again." });
  }

  // Clear OTP on success
  pendingRegistrations.delete(email.toLowerCase());
  res.json({ success: true });
});

// HTTP API: Send General Client OTP (ZeroVault Web)
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const passcode = generatePasscode();
    
    // Store in-memory
    activeOtps.set(email.toLowerCase(), {
      otp: passcode,
      timestamp: Date.now()
    });

    console.log(`\n🔑 [ZeroVault Web] Generated Code for ${email}: ${passcode}`);

    let testUrl = null;
    if (transporter) {
      const mailOptions = {
        from: '"ZeroVault Security" <security@zerovault.id>',
        to: email,
        subject: "ZeroVault Verification Passcode",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 1.5rem; letter-spacing: 0.5px;">ZeroVault Secure Lock</h2>
              <p style="margin: 4px 0 0; opacity: 0.9; font-size: 0.85rem;">Identity Wallet Unlock</p>
            </div>
            <div style="padding: 24px; background: white;">
              <p style="margin-top: 0; color: #4a5568; font-size: 0.95rem;">You requested a temporary verification code to unlock your ZeroVault identity credentials.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.75rem; text-transform: uppercase; color: #718096; letter-spacing: 0.5px; font-weight: 700;">Verification Code</p>
                <h1 style="margin: 8px 0 0; font-size: 2.2rem; letter-spacing: 4px; color: #4f46e5; font-family: monospace;">${passcode}</h1>
              </div>
              <p style="color: #718096; font-size: 0.8rem; line-height: 1.4; margin-bottom: 0;">This code will expire in 10 minutes. If you did not initiate this lock screen request, please secure your credentials immediately.</p>
            </div>
            <div style="background: #f7fafc; padding: 12px; text-align: center; border-top: 1px solid #edf2f7; font-size: 0.7rem; color: #a0aec0;">
              ZeroVault Identity Wallet · 100% Cryptographic ZK
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        console.log(`📩 Ethereal Email Preview: ${testUrl}`);
      } else {
        console.log(`📩 Email sent successfully to ${email}`);
      }
    }

    res.json({
      success: true,
      emailSent: true,
      testPreviewUrl: testUrl,
      demoCode: passcode
    });

  } catch (err) {
    console.error("General OTP sending error:", err);
    res.status(500).json({ error: err.message });
  }
});

// HTTP API: Verify General OTP
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP passcode are required." });
  }

  const record = activeOtps.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: "No active verification code found for this email." });
  }

  if (Date.now() - record.timestamp > 10 * 60 * 1000) {
    activeOtps.delete(email.toLowerCase());
    return res.status(400).json({ error: "Verification code has expired. Please send a new one." });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: "Invalid verification code. Please try again." });
  }

  activeOtps.delete(email.toLowerCase());
  res.json({ success: true });
});

// Root landing page
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>🔐 ZK SSI Network API</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #faf9f6; padding: 3rem; color: #1e1b18; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08); }
          h1 { color: #ea580c; font-size: 1.5rem; margin-top: 0; }
          .status { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 99px; font-size: 0.8rem; font-weight: 700; }
          ul { padding-left: 1.25rem; }
          li { margin-bottom: 0.5rem; }
          code { font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 ZK Identity System API Node</h1>
          <p><span class="status">● ONLINE</span></p>
          <p>The backend node is running successfully. This server handles cryptographic ECDSA signatures and real-time WebSockets sync.</p>
          <h3>Active Endpoints:</h3>
          <ul>
            <li><code>GET /health</code> - Check server health</li>
            <li><code>GET /api/issuer-key</code> - Fetch Issuer public key</li>
            <li><code>POST /api/issue</code> - Generate signed credentials</li>
            <li><code>POST /api/verify</code> - Verify ZK proof via HTTP</li>
            <li><code>WS ws://localhost:8080</code> - WebSockets connection entry point</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    wsActiveSessions: activeSessions.size,
    timestamp: new Date().toISOString(),
  });
});

// Bind to 0.0.0.0 in production (so Render's router can reach it) and 127.0.0.1 locally (to bypass Windows socket conflicts)
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

server.listen(PORT, HOST, () => {
  console.log(`\n🔐 ZK SSI Network Server running at http://${HOST}:${PORT}`);
  console.log(`   WS URL: ws://${HOST}:${PORT}`);
  console.log(`   POST /api/issue - Issue signed credentials`);
  console.log(`   POST /api/verify - Verify ZK proof via HTTP`);
  console.log(`   GET  /api/issuer-key - Public verification key`);
  console.log(`   GET  /health - Server health details\n`);
});
