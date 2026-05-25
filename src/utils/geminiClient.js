/**
 * Gemini AI Client — powers the privacy guide assistant and fraud detection
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
let isConfigured = false;

function getGenAI() {
  if (!genAI) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey && apiKey !== "your_gemini_api_key_here") {
      genAI = new GoogleGenerativeAI(apiKey);
      isConfigured = true;
    }
  }
  return genAI;
}

export function isGeminiConfigured() {
  getGenAI();
  return isConfigured;
}

const SYSTEM_CONTEXT = `You are a privacy guide inside "Invisible Identity" — a Zero-Knowledge Identity verification app.

Your role:
- Explain ZK proofs in simple, friendly terms
- Help users understand why their raw data is NEVER shared
- Explain what each claim type means (age verification, income range, Aadhaar validity)
- Clarify how the proof/verify flow works
- Be enthusiastic about privacy technology

Key concepts to explain when asked:
- ZK Proofs: Mathematical proofs that verify a claim is true WITHOUT revealing the underlying data
- Groth16: A specific ZK proof protocol used in this app (fast verification, small proof size)
- Public Signals: The ONLY outputs visible to the verifier (e.g., "YES, age >= 18")
- Private Inputs: Data that NEVER leaves the user's device (e.g., birth year, exact income)
- Trusted Setup: A one-time ceremony that generates the cryptographic parameters

Keep responses concise (2-4 sentences). Use emojis sparingly. Be encouraging and clear.`;

/**
 * Chat with the Gemini privacy guide
 */
export async function askGemini(userMessage, conversationHistory = []) {
  const ai = getGenAI();

  if (!ai) {
    return getFallbackResponse(userMessage);
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    const chat = model.startChat({
      history: conversationHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      generationConfig: { maxOutputTokens: 300 },
    });

    const result = await chat.sendMessage(
      SYSTEM_CONTEXT + "\n\nUser: " + userMessage
    );
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    return getFallbackResponse(userMessage);
  }
}

/**
 * Fraud pattern detection via Gemini
 */
export async function detectFraudPattern(claimsLog) {
  const ai = getGenAI();

  if (!ai || claimsLog.length < 2) {
    return { suspicious: false, reason: "Insufficient data for analysis" };
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are a fraud analyst for a Zero-Knowledge identity verification system.
    
Review this sequence of identity verification claims made by a user:
${JSON.stringify(claimsLog, null, 2)}

Analyze for suspicious patterns such as:
- Same proof being reused multiple times
- Claims changing too frequently (e.g., age claims with different results)
- Impossible values (future birth years, negative incomes)
- Rapid-fire claims (many claims in seconds)
- Contradictory claims

Respond ONLY with a JSON object in this exact format:
{ "suspicious": true/false, "reason": "explanation", "riskLevel": "low/medium/high" }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { suspicious: false, reason: "Analysis complete — no issues found", riskLevel: "low" };
  } catch (err) {
    console.error("Fraud detection error:", err);
    return { suspicious: false, reason: "Could not complete analysis", riskLevel: "low" };
  }
}

/**
 * Fallback responses when Gemini is not configured
 */
function getFallbackResponse(userMessage) {
  const lower = userMessage.toLowerCase();

  if (lower.includes("zk") || lower.includes("zero-knowledge") || lower.includes("zero knowledge")) {
    return "Zero-Knowledge Proofs let you prove a statement is true without revealing the underlying data. For example, you can prove you're over 18 without sharing your birth date! 🔐 The math guarantees the verifier learns NOTHING beyond the yes/no answer.";
  }

  if (lower.includes("how") && (lower.includes("work") || lower.includes("use"))) {
    return "Here's how it works: 1️⃣ Enter your private data (it stays on YOUR device). 2️⃣ Click 'Generate Proof' — math creates a cryptographic proof. 3️⃣ Send the proof to a verifier — they see YES or NO, never your actual data. It's like proving you have the key to a door without showing the key! 🔑";
  }

  if (lower.includes("safe") || lower.includes("secure") || lower.includes("privacy")) {
    return "Your data is cryptographically protected! 🛡️ Private inputs (birth year, income, Aadhaar) NEVER leave your device. The ZK proof is a mathematical object that's computationally impossible to reverse-engineer back to your data. Even the verifier can't learn anything beyond the claim result.";
  }

  if (lower.includes("age")) {
    return "The age verification proves you're 18 or older using a ZK circuit. You enter your birth year (private), and the system creates a Groth16 proof. The verifier only sees '✅ Adult' or '❌ Not adult' — your birth year remains completely hidden! 🎂";
  }

  if (lower.includes("income")) {
    return "Income range verification proves your income falls within a bracket (e.g., ₹3L–₹10L) without revealing the exact amount. Perfect for loan applications or subsidies where you need to prove eligibility without financial exposure! 💰";
  }

  if (lower.includes("aadhaar")) {
    return "Aadhaar verification proves you hold a valid Aadhaar number without exposing the actual 12-digit ID. A Poseidon hash commitment is created on your device — the verifier only sees the hash and the validity result. 🪪";
  }

  if (lower.includes("fraud")) {
    return "Our AI-powered fraud detection analyzes patterns in verification claims. It can flag suspicious activity like rapid resubmissions, contradictory claims, or impossible values — all without ever accessing your private data! 🔍";
  }

  return "I'm your privacy guide for this ZK Identity app! 🔐 I can explain how zero-knowledge proofs work, what each claim type does, and why your data stays completely private. Try asking 'What is a ZK proof?' or 'How does age verification work?'";
}
