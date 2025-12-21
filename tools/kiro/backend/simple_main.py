"""
Simple FastAPI app that works with basic dependencies
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
from datetime import datetime, date
import random

app = FastAPI(title="ARK Digital Calendar API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sample quotes data
SAMPLE_QUOTES = [
    {
        "id": 1,
        "text": "The future belongs to those who believe in the beauty of their dreams.",
        "author": "Eleanor Roosevelt",
        "theme": "Dreams",
        "date": "2024-12-21"
    },
    {
        "id": 2,
        "text": "It is during our darkest moments that we must focus to see the light.",
        "author": "Aristotle",
        "theme": "Hope",
        "date": "2024-12-20"
    },
    {
        "id": 3,
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "theme": "Work",
        "date": "2024-12-19"
    },
    {
        "id": 4,
        "text": "Life is what happens to you while you're busy making other plans.",
        "author": "John Lennon",
        "theme": "Life",
        "date": "2024-12-18"
    },
    {
        "id": 5,
        "text": "The way to get started is to quit talking and begin doing.",
        "author": "Walt Disney",
        "theme": "Action",
        "date": "2024-12-17"
    }
]

@app.get("/")
async def root():
    return {"message": "ARK Digital Calendar API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/quotes/today")
async def get_today_quote():
    """Get today's quote"""
    today = date.today().isoformat()
    # Find quote for today or return a random one
    today_quote = next((q for q in SAMPLE_QUOTES if q["date"] == today), None)
    if not today_quote:
        today_quote = random.choice(SAMPLE_QUOTES)
        today_quote["date"] = today
    
    return today_quote

@app.get("/api/quotes")
async def get_quotes(limit: int = 10, offset: int = 0):
    """Get quotes with pagination"""
    start = offset
    end = offset + limit
    quotes = SAMPLE_QUOTES[start:end]
    
    return {
        "quotes": quotes,
        "total": len(SAMPLE_QUOTES),
        "limit": limit,
        "offset": offset
    }

@app.get("/api/quotes/{quote_id}")
async def get_quote(quote_id: int):
    """Get a specific quote by ID"""
    quote = next((q for q in SAMPLE_QUOTES if q["id"] == quote_id), None)
    if not quote:
        return JSONResponse(status_code=404, content={"error": "Quote not found"})
    return quote

@app.get("/api/themes")
async def get_themes():
    """Get available themes"""
    themes = list(set(q["theme"] for q in SAMPLE_QUOTES))
    return {"themes": themes}

@app.get("/api/quotes/theme/{theme}")
async def get_quotes_by_theme(theme: str):
    """Get quotes by theme"""
    theme_quotes = [q for q in SAMPLE_QUOTES if q["theme"].lower() == theme.lower()]
    return {"quotes": theme_quotes, "theme": theme}

@app.post("/api/quotes/{quote_id}/feedback")
async def submit_feedback(quote_id: int, feedback: dict):
    """Submit feedback for a quote"""
    quote = next((q for q in SAMPLE_QUOTES if q["id"] == quote_id), None)
    if not quote:
        return JSONResponse(status_code=404, content={"error": "Quote not found"})
    
    return {"message": "Feedback received", "quote_id": quote_id, "feedback": feedback}

@app.get("/api/users/profile")
async def get_user_profile():
    """Get user profile (mock)"""
    return {
        "id": 1,
        "preferences": {
            "themes": ["Dreams", "Hope", "Work"],
            "quote_length": "medium",
            "notification_time": "09:00"
        },
        "created_at": "2024-01-01T00:00:00Z"
    }

@app.post("/api/users/profile")
async def update_user_profile(profile: dict):
    """Update user profile (mock)"""
    return {"message": "Profile updated", "profile": profile}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)