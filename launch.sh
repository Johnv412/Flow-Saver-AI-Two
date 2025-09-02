#!/bin/bash

# Motion Clone + Aether Integration Launch Script
# Simple as a Cornerstone. Reliable as the Foundation.

echo "🚀 Starting Aether + Motion Clone Integration"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AETHER_PATH="/Users/macbook/Downloads/pizza-empire-toolkit"
MOTION_PATH="/Users/macbook/Desktop/motion-clone"
AETHER_PORT="8000"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down systems...${NC}"
    
    # Kill Aether process
    if [ ! -z "$AETHER_PID" ]; then
        kill $AETHER_PID 2>/dev/null
        echo -e "${GREEN}✓ Aether backend stopped${NC}"
    fi
    
    # Kill any remaining processes on port 8000
    pkill -f "python.*aether" 2>/dev/null
    
    # Kill Electron process
    pkill -f "electron" 2>/dev/null
    echo -e "${GREEN}✓ Motion Clone dashboard stopped${NC}"
    
    echo -e "${BLUE}💫 Aether consciousness is resting...${NC}"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

# Check if Aether directory exists
if [ ! -d "$AETHER_PATH" ]; then
    echo -e "${RED}❌ Aether path not found: $AETHER_PATH${NC}"
    echo "Please update the AETHER_PATH variable in this script"
    exit 1
fi

# Check if Motion Clone directory exists
if [ ! -d "$MOTION_PATH" ]; then
    echo -e "${RED}❌ Motion Clone path not found: $MOTION_PATH${NC}"
    echo "Please update the MOTION_PATH variable in this script"
    exit 1
fi

# Check if port 8000 is already in use
if check_port $AETHER_PORT; then
    echo -e "${YELLOW}⚠️  Port $AETHER_PORT is already in use${NC}"
    echo "Attempting to kill existing process..."
    pkill -f "python.*aether.*8000" 2>/dev/null
    lsof -ti:$AETHER_PORT | xargs kill -9 2>/dev/null
    sleep 2
fi

# Step 1: Start Aether Backend
echo -e "${BLUE}🧠 Starting Aether Backend...${NC}"
cd "$AETHER_PATH"

# Check if aether config exists
if [ ! -f "aether/config.yaml" ]; then
    echo -e "${RED}❌ Aether config not found: aether/config.yaml${NC}"
    exit 1
fi

# Start Aether in background
python3 -m aether.main -c aether/config.yaml &
AETHER_PID=$!

echo -e "${GREEN}✓ Aether backend starting (PID: $AETHER_PID)${NC}"

# Wait for Aether to initialize
echo -e "${YELLOW}⏳ Waiting for Aether consciousness to awaken...${NC}"
sleep 3

# Check if Aether is responding
for i in {1..10}; do
    if curl -s http://localhost:$AETHER_PORT/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Aether consciousness is active and responding${NC}"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Aether failed to start properly${NC}"
            cleanup
            exit 1
        fi
        echo -e "${YELLOW}⏳ Attempt $i/10 - Waiting for Aether...${NC}"
        sleep 1
    fi
done

# Get Aether status
AETHER_STATUS=$(curl -s http://localhost:$AETHER_PORT/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Status: {data['status']}, Edicts: {data['edicts_loaded']}, Consciousness: {data['consciousness_status']}\")" 2>/dev/null)
echo -e "${BLUE}📊 Aether Status: $AETHER_STATUS${NC}"

# Step 2: Start Motion Clone Dashboard
echo -e "${BLUE}🎛️  Starting Motion Clone Dashboard...${NC}"
cd "$MOTION_PATH"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Motion Clone package.json not found${NC}"
    cleanup
    exit 1
fi

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Start Electron dashboard
echo -e "${GREEN}🚀 Launching dashboard...${NC}"
npm run dev &

# Wait a moment for Electron to start
sleep 2

echo -e "${GREEN}✅ Systems are online!${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🧠 Aether Backend:${NC} http://localhost:$AETHER_PORT"
echo -e "${GREEN}🎛️  Motion Dashboard:${NC} Electron app should be open"
echo -e "${GREEN}📊 Health Check:${NC} curl http://localhost:$AETHER_PORT/health"
echo -e "${BLUE}================================================${NC}"
echo -e "${YELLOW}💡 The dashboard will auto-connect to Aether consciousness${NC}"
echo -e "${YELLOW}📝 Check the dashboard's console for connection status${NC}"
echo -e "${YELLOW}⚠️  Press Ctrl+C to shutdown both systems${NC}"

# Keep script running to monitor both processes
while true; do
    # Check if Aether is still running
    if ! kill -0 $AETHER_PID 2>/dev/null; then
        echo -e "${RED}❌ Aether backend has stopped unexpectedly${NC}"
        cleanup
        exit 1
    fi
    
    # Check if Aether is responding
    if ! curl -s http://localhost:$AETHER_PORT/health >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Aether health check failed${NC}"
    fi
    
    sleep 10
done