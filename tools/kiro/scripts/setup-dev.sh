#!/bin/bash

# ARK Digital Calendar - Development Setup Script
# This script sets up the development environment for both backend and frontend

set -e

echo "🚀 Setting up ARK Digital Calendar development environment..."

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the tools/kiro directory"
    exit 1
fi

# Backend setup
echo "📦 Setting up Python backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration values"
fi

# Initialize database
echo "Initializing database..."
alembic upgrade head

echo "✅ Backend setup complete!"

# Frontend setup
cd ../frontend
echo "📦 Setting up frontend..."

# Install Node.js dependencies
if command -v npm &> /dev/null; then
    echo "Installing Node.js dependencies..."
    npm install
    
    # Build CSS and JS
    echo "Building frontend assets..."
    npm run build
    
    echo "✅ Frontend setup complete!"
else
    echo "⚠️  npm not found. Please install Node.js to set up the frontend."
    echo "   You can download it from: https://nodejs.org/"
fi

cd ..

echo ""
echo "🎉 ARK Digital Calendar setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "📚 API Documentation will be available at: http://localhost:8000/docs"
echo "🌐 Frontend will be available at: http://localhost:3000"
echo ""
echo "Don't forget to:"
echo "  1. Update backend/.env with your OpenAI API key"
echo "  2. Configure any other environment variables as needed"