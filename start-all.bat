@echo off
echo ===================================================
echo [ZK] Starting Invisible Identity ZK System...
echo ===================================================

echo 1. Starting ZK Node Backend (Port 8080)...
start "ZK Backend Server" cmd /k "node server/verifyProof.js"

echo 2. Starting ZK Wallet and Store Terminal (Port 5174)...
start "ZK Wallet App" cmd /k "npm run dev"

echo 3. Starting Government Issuer Portal (Port 5175)...
cd issuer-portal
start "ZK Gov Issuer" cmd /k "npm run dev"
cd ..

echo ===================================================
echo [ZK] All systems initiated!
echo    - Backend: http://localhost:8080
echo    - Wallet and Store: http://localhost:5174
echo    - Government Portal: http://localhost:5175
echo ===================================================
pause
