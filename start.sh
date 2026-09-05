#!/bin/bash
# start.sh - Run both INCOIS Backend and Frontend concurrently

echo "🌊 Starting INCOIS 3D Ocean Visualization..."

# Start Backend
echo "📡 Starting FastAPI Backend on port 8000..."
cd backend || exit
if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
fi
python3 -m uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "🌐 Starting Vite Frontend on port 5173..."
cd frontend || exit
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both processes
echo "✅ Both servers are running!"
echo "➡️  Frontend: http://localhost:5173"
echo "➡️  API Docs: http://localhost:8000/api/docs"
echo "Press Ctrl+C to stop."

trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
