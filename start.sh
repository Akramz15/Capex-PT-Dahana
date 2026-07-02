#!/bin/bash
# ======================================================
# Script untuk menjalankan Backend + Frontend sekaligus
# Jalankan: bash start.sh
# ======================================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Memulai Aplikasi Monitoring Capex PT Dahana..."
echo ""

# Jalankan Backend
echo "▶️  Menjalankan Backend (FastAPI) di port 8000..."
cd "$ROOT_DIR/backend"
uvicorn main:app --port 8000 --env-file .env &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

sleep 2

# Cek apakah backend berhasil start
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "❌ Backend gagal dijalankan! Periksa error di atas."
  exit 1
fi
echo "✅ Backend berjalan di http://localhost:8000"
echo ""

# Jalankan Frontend
echo "▶️  Menjalankan Frontend (Vite) di port 5173..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

sleep 3
echo "✅ Frontend berjalan di http://localhost:5173"
echo ""
echo "=================================================="
echo "✅ APLIKASI SIAP DIGUNAKAN!"
echo "   Buka browser: http://localhost:5173"
echo ""
echo "   Tekan Ctrl+C untuk menghentikan semua server."
echo "=================================================="

# Tunggu hingga user tekan Ctrl+C
trap "echo ''; echo 'Menghentikan server...'; kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null; exit 0" INT
wait
