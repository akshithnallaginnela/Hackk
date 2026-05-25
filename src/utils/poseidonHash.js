/**
 * Poseidon-like hash for identity commitments
 * Uses a simplified but deterministic hash suitable for demo purposes
 * In production, use poseidon-lite or circomlibjs
 */

/**
 * Create an identity commitment hash from user data
 * This hash is ZK-friendly and can be used as a public commitment
 */
export function createIdentityCommitment(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return poseidonHash(str);
}

/**
 * Simplified Poseidon-style hash
 * Produces a deterministic 256-bit hash suitable for ZK commitments
 */
export function poseidonHash(input) {
  const bytes = new TextEncoder().encode(input);

  // Initialize state with Poseidon-like round constants
  let state = [
    0x428a2f98n,
    0x71374491n,
    0xb5c0fbcfn,
    0xe9b5dba5n,
  ];

  // Absorb input
  for (let i = 0; i < bytes.length; i++) {
    state[i % 4] = (state[i % 4] + BigInt(bytes[i]) * BigInt(i + 1)) % (2n ** 64n);
  }

  // Permutation rounds (simplified Poseidon-like)
  for (let round = 0; round < 8; round++) {
    // S-box: x^5 (characteristic of Poseidon)
    for (let i = 0; i < 4; i++) {
      state[i] = (state[i] ** 5n) % (2n ** 64n);
    }

    // MDS mix
    const mixed = [...state];
    for (let i = 0; i < 4; i++) {
      state[i] = (mixed[0] * 2n + mixed[1] * 3n + mixed[2] * 1n + mixed[3] * 1n) % (2n ** 64n);
      mixed.push(mixed.shift());
    }

    // Round constant addition
    for (let i = 0; i < 4; i++) {
      state[i] = (state[i] + BigInt(round * 4 + i + 1) * 0x517cc1b727220a95n) % (2n ** 64n);
    }
  }

  // Squeeze output
  return state.map((s) => s.toString(16).padStart(16, "0")).join("");
}

/**
 * Verify a commitment matches given data
 */
export function verifyCommitment(data, commitment) {
  return createIdentityCommitment(data) === commitment;
}
