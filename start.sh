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
python3 -m uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "🌐 Starting Vite Frontend on port 5173..."
cd frontend || exit
npm run dev &
FRONTEND_PID=$!
cd ..

# Start Data Pipeline
echo "⚙️ Starting Data Pipeline Service on port 8001..."
cd data-pipeline || exit
if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
fi
python3 -m uvicorn pipeline.main:app --port 8001 &
PIPELINE_PID=$!
cd ..

# Wait for all processes
echo "✅ All servers are running!"
echo "➡️  Frontend: http://localhost:5173"
echo "➡️  Backend API Docs: http://localhost:8000/api/docs"
echo "➡️  Pipeline API Docs: http://localhost:8001/docs"
echo "Press Ctrl+C to stop."

trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID $PIPELINE_PID 2>/dev/null" EXIT

wait
