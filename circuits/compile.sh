#!/bin/bash
# ZK Circuit Compilation & Trusted Setup Script
# Requires: circom (Rust-based compiler) and snarkjs (npm)
#
# This script:
# 1. Compiles the circom circuit to R1CS + WASM
# 2. Downloads Powers of Tau (phase 1)
# 3. Generates proving key (phase 2)
# 4. Exports verification key
# 5. Copies artifacts to public/circuits/

set -e

echo "🔐 ZK Circuit Compilation & Trusted Setup"
echo "=========================================="
echo ""

CIRCUIT_NAME="age_check"
PTAU_FILE="powersOfTau28_hez_final_12.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/${PTAU_FILE}"

# Step 1: Compile circuit
echo "⚙️  Step 1: Compiling ${CIRCUIT_NAME}.circom..."
circom ${CIRCUIT_NAME}.circom --r1cs --wasm --sym
echo "   ✅ Circuit compiled (R1CS + WASM generated)"
echo ""

# Step 2: Download Powers of Tau (if not already present)
if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Step 2: Downloading Powers of Tau (phase 1)..."
    wget -q --show-progress "$PTAU_URL"
    echo "   ✅ Powers of Tau downloaded"
else
    echo "📥 Step 2: Powers of Tau already present, skipping download"
fi
echo ""

# Step 3: Generate proving key (phase 2)
echo "🔑 Step 3: Generating proving key (Groth16 setup)..."
snarkjs groth16 setup ${CIRCUIT_NAME}.r1cs ${PTAU_FILE} ${CIRCUIT_NAME}_0000.zkey
echo "   ✅ Initial zkey generated"

echo "🔑 Step 3b: Contributing to ceremony..."
snarkjs zkey contribute ${CIRCUIT_NAME}_0000.zkey ${CIRCUIT_NAME}_final.zkey \
    --name="Hackathon Contributor" -v -e="invisible identity hackathon"
echo "   ✅ Final zkey generated"
echo ""

# Step 4: Export verification key
echo "📄 Step 4: Exporting verification key..."
snarkjs zkey export verificationkey ${CIRCUIT_NAME}_final.zkey verification_key.json
echo "   ✅ Verification key exported"
echo ""

# Step 5: Copy to public folder
echo "📁 Step 5: Copying artifacts to public/circuits/..."
mkdir -p ../public/circuits
cp ${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm ../public/circuits/
cp ${CIRCUIT_NAME}_final.zkey ../public/circuits/
cp verification_key.json ../public/circuits/
echo "   ✅ Artifacts copied"
echo ""

# Cleanup
echo "🧹 Cleaning up intermediate files..."
rm -f ${CIRCUIT_NAME}_0000.zkey
echo ""

echo "=========================================="
echo "✅ Done! Circuit artifacts are in public/circuits/"
echo ""
echo "Files generated:"
ls -lh ../public/circuits/
echo ""
echo "🚀 You can now run 'npm run dev' to start the app with real ZK proofs!"
