#!/bin/bash
echo "==================================================="
echo "🔐 Starting Invisible Identity ZK System..."
echo "==================================================="

# Function to handle cleanup on Ctrl+C
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $BACKEND_PID $WALLET_PID $ISSUER_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

echo "1. Starting ZK Node Backend (Port 8080)..."
node server/verifyProof.js &
BACKEND_PID=$!

echo "2. Starting ZK Wallet & Store Terminal (Port 5174)..."
npm run dev &
WALLET_PID=$!

echo "3. Starting Government Issuer Portal (Port 5175)..."
cd issuer-portal
npm run dev &
ISSUER_PID=$!
cd ..

echo "==================================================="
echo "🚀 All systems running in the background!"
echo "   - Backend: http://localhost:8080"
echo "   - Wallet & Store: http://localhost:5174"
echo "   - Government Portal: http://localhost:5175"
echo ""
echo "Press Ctrl+C to stop all services."
echo "==================================================="

# Keep the script running to monitor processes
wait
