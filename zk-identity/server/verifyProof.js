/**
 * Express API Server — Proof Verification Endpoint
 * POST /verify — accepts proof + publicSignals, returns verification result
 */
import express from "express";
import cors from "cors";
import * as snarkjs from "snarkjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8080;

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "zk-identity-verifier",
    timestamp: new Date().toISOString(),
  });
});

// Verify proof endpoint
app.post("/verify", async (req, res) => {
  try {
    const { proof, publicSignals, claim } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({
        valid: false,
        error: "Missing proof or publicSignals",
      });
    }

    // Try to load real verification key
    let vkey;
    try {
      const vkeyPath = join(__dirname, "../public/circuits/verification_key.json");
      vkey = JSON.parse(readFileSync(vkeyPath, "utf8"));
    } catch {
      // No real verification key — use simulation mode
      return res.json({
        valid: publicSignals[0] === "1",
        mode: "simulation",
        claim: claim || "unknown",
        verifiedAt: new Date().toISOString(),
        message: "Verified in simulation mode (no compiled circuit artifacts)",
      });
    }

    // Real verification
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    res.json({
      valid: isValid,
      mode: "real",
      claim: claim || "unknown",
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({
      valid: false,
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🔐 ZK Identity Verifier API running at http://localhost:${PORT}`);
  console.log(`   POST /verify — Submit proof for verification`);
  console.log(`   GET  /health — Health check\n`);
});
