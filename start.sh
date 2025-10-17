#!/bin/bash

# AI Email Assistant Launcher Script

echo "========================================="
echo "   AI Email Assistant - Starting...     "
echo "========================================="
echo ""

# Check if credentials exist
if [ ! -f "credentials/credentials.json" ]; then
    echo "⚠️  WARNING: credentials.json not found!"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a project and enable Gmail API"
    echo "3. Create OAuth 2.0 credentials (Desktop app)"
    echo "4. Download the credentials file"
    echo "5. Save it as: credentials/credentials.json"
    echo ""
    echo "See README.md for detailed instructions."
    echo ""
    read -p "Press Enter to continue anyway (will fail without credentials)..."
fi

# Create necessary directories
mkdir -p data/tokens
mkdir -p data/chroma

echo "Starting backend server..."
echo ""
echo "Once started, open your browser to:"
echo "  👉 http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================="
echo ""

cd backend
python3.11 server.py

