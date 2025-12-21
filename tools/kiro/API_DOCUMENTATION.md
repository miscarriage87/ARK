# ARK Digital Calendar - API Documentation

## Overview

The ARK Digital Calendar API provides endpoints for managing personalized daily quotes, user profiles, themes, and notifications. The API follows REST principles and returns JSON responses.

**Base URL**: `http://localhost:8000` (development) / `https://api.yourdomain.com` (production)

**API Version**: v1

## Authentication

Currently uses simple user ID-based authentication. Production deployment should implement JWT-based authentication.

### Headers
```
Content-Type: application/json
Accept: application/json
```

## Rate Limits

- Quote generation: 10 requests per minute per user
- Feedback submission: 100 requests per minute per user  
- Profile updates: 20 requests per minute per user
- Archive access: 50 requests per minute per user

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "rating",
      "issue": "Must be one of: like, neutral, dislike"
    }
  },
  "timestamp": "2024-12-21T10:30:00Z",
  "request_id": "req_123456789"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Endpoints

### Quote Management

#### Get Today's Quote
Get the personalized daily quote for a user.

```http
GET /api/quotes/today?user_id={user_id}
```

**Parameters:**
- `user_id` (string, required): User identifier

**Response:**
```json
{
  "id": "quote_123456789",
  "user_id": "user_987654321",
  "content": "The journey of a thousand miles begins with a single step, and your unique perspective makes each step meaningful.",
  "author": "AI Generated",
  "date": "2024-12-21",
  "theme": {
    "id": "theme_456789",
    "name": "Personal Growth",
    "type": "monthly",
    "description": "Focus on self-improvement and development"
  },
  "personalization_context": {
    "dominant_categories": ["education", "philosophy"],
    "theme_alignment": 0.85,
    "style_preferences": ["reflective", "encouraging"]
  },
  "created_at": "2024-12-21T06:00:00Z"
}
```

**Errors:**
- `404` - User not found
- `500` - Quote generation failed

---

#### Get Quote Archive
Retrieve user's historical quotes with pagination.

```http
GET /api/quotes/archive?user_id={user_id}&page={page}&limit={limit}&theme={theme_id}
```

**Parameters:**
- `user_id` (string, required): User identifier
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `theme` (string, optional): Filter by theme ID

**Response:**
```json
{
  "quotes": [
    {
      "id": "quote_123456789",
      "content": "Every challenge is an opportunity to grow stronger.",
      "date": "2024-12-20",
      "theme": {
        "name": "Personal Growth",
        "type": "monthly"
      },
      "feedback": {
        "rating": "like",
        "timestamp": "2024-12-20T08:15:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

---

#### Search Quotes
Search through user's quote archive.

```http
GET /api/quotes/search?user_id={user_id}&q={query}&theme={theme}&date_from={date}&date_to={date}
```

**Parameters:**
- `user_id` (string, required): User identifier
- `q` (string, required): Search query (minimum 3 characters)
- `theme` (string, optional): Filter by theme name
- `date_from` (string, optional): Start date (YYYY-MM-DD)
- `date_to` (string, optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "quotes": [
    {
      "id": "quote_789012345",
      "content": "Growth happens when you step outside your comfort zone.",
      "date": "2024-12-15",
      "relevance_score": 0.92,
      "theme": {
        "name": "Personal Growth"
      },
      "highlight": "**Growth** happens when you step outside your comfort zone."
    }
  ],
  "total_results": 8,
  "search_time_ms": 45
}
```

---

#### Submit Quote Feedback
Provide feedback on a quote to improve personalization.

```http
POST /api/quotes/feedback
```

**Request Body:**
```json
{
  "quote_id": "quote_123456789",
  "user_id": "user_987654321",
  "rating": "like"
}
```

**Parameters:**
- `quote_id` (string, required): Quote identifier
- `user_id` (string, required): User identifier  
- `rating` (string, required): One of "like", "neutral", "dislike"

**Response:**
```json
{
  "success": true,
  "feedback_id": "feedback_456789012",
  "message": "Feedback recorded successfully",
  "personalization_updated": true
}
```

**Errors:**
- `400` - Invalid rating value
- `404` - Quote or user not found
- `409` - Feedback already exists for this quote

---

### User Management

#### Create User Profile
Create a new user profile from questionnaire responses.

```http
POST /api/users/profile
```

**Request Body:**
```json
{
  "responses": [
    {
      "question": "What motivates you most?",
      "answer": "Learning new things and growing personally"
    },
    {
      "question": "How do you prefer to start your day?",
      "answer": "With quiet reflection and planning"
    },
    {
      "question": "What type of content inspires you?",
      "answer": "Educational and philosophical insights"
    },
    {
      "question": "How do you handle challenges?",
      "answer": "With patience and systematic thinking"
    },
    {
      "question": "What's your ideal mindset?",
      "answer": "Growth-oriented and curious"
    }
  ]
}
```

**Response:**
```json
{
  "id": "user_987654321",
  "personality_categories": [
    {
      "category": "education",
      "weight": 0.35,
      "confidence": 0.82
    },
    {
      "category": "philosophy", 
      "weight": 0.28,
      "confidence": 0.75
    },
    {
      "category": "spirituality",
      "weight": 0.20,
      "confidence": 0.68
    },
    {
      "category": "health",
      "weight": 0.10,
      "confidence": 0.45
    },
    {
      "category": "humor",
      "weight": 0.05,
      "confidence": 0.30
    },
    {
      "category": "sport",
      "weight": 0.02,
      "confidence": 0.25
    }
  ],
  "created_at": "2024-12-21T10:30:00Z",
  "notification_settings": {
    "enabled": false,
    "time": "08:00",
    "timezone": "UTC",
    "include_preview": true
  }
}
```

---

#### Get User Profile
Retrieve user profile and preferences.

```http
GET /api/users/profile?user_id={user_id}
```

**Response:**
```json
{
  "id": "user_987654321",
  "personality_categories": [...],
  "preferences": {
    "quote_length": "medium",
    "style_preference": ["reflective", "encouraging"],
    "avoid_topics": ["politics", "controversial"]
  },
  "notification_settings": {
    "enabled": true,
    "time": "07:30",
    "timezone": "America/New_York",
    "include_preview": true
  },
  "stats": {
    "total_quotes": 45,
    "feedback_given": 38,
    "favorite_themes": ["Personal Growth", "Learning"],
    "streak_days": 12
  },
  "created_at": "2024-11-15T10:30:00Z",
  "updated_at": "2024-12-21T08:15:00Z"
}
```

---

#### Update User Profile
Update user preferences and settings.

```http
PUT /api/users/profile?user_id={user_id}
```

**Request Body:**
```json
{
  "preferences": {
    "quote_length": "long",
    "style_preference": ["inspiring", "practical"]
  },
  "notification_settings": {
    "enabled": true,
    "time": "07:00",
    "timezone": "America/New_York",
    "include_preview": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "updated_fields": ["preferences", "notification_settings"],
  "updated_at": "2024-12-21T10:45:00Z"
}
```

---

#### Export User Data
Export all user data for portability/backup.

```http
GET /api/users/export?user_id={user_id}&format={format}
```

**Parameters:**
- `user_id` (string, required): User identifier
- `format` (string, optional): Export format ("json" or "csv", default: "json")

**Response:**
```json
{
  "export_id": "export_123456789",
  "user_profile": {
    "id": "user_987654321",
    "personality_categories": [...],
    "preferences": {...},
    "created_at": "2024-11-15T10:30:00Z"
  },
  "quotes": [
    {
      "id": "quote_123456789",
      "content": "...",
      "date": "2024-12-21",
      "theme": {...}
    }
  ],
  "feedback_history": [
    {
      "quote_id": "quote_123456789",
      "rating": "like",
      "timestamp": "2024-12-21T08:15:00Z"
    }
  ],
  "themes": [...],
  "export_metadata": {
    "generated_at": "2024-12-21T10:50:00Z",
    "total_quotes": 45,
    "total_feedback": 38,
    "data_version": "1.0"
  }
}
```

---

### Theme Management

#### Get Current Theme
Get the current monthly and weekly themes.

```http
GET /api/themes/current
```

**Response:**
```json
{
  "monthly_theme": {
    "id": "theme_456789",
    "name": "Personal Growth",
    "description": "Focus on self-improvement and development throughout December",
    "type": "monthly",
    "start_date": "2024-12-01",
    "end_date": "2024-12-31",
    "keywords": ["growth", "improvement", "development", "learning"],
    "personality_alignment": {
      "spirituality": 0.3,
      "education": 0.4,
      "philosophy": 0.3
    }
  },
  "weekly_theme": {
    "id": "theme_789012",
    "name": "Growth Week 3",
    "description": "Week 3 of personal growth focus - Building sustainable habits",
    "type": "weekly",
    "start_date": "2024-12-15",
    "end_date": "2024-12-21",
    "parent_theme_id": "theme_456789",
    "keywords": ["habits", "consistency", "progress"]
  }
}
```

---

#### Get Theme Calendar
Get theme calendar for a specific year.

```http
GET /api/themes/calendar?year={year}
```

**Parameters:**
- `year` (integer, required): Year (e.g., 2024)

**Response:**
```json
{
  "year": 2024,
  "monthly_themes": [
    {
      "month": 1,
      "theme": {
        "name": "New Beginnings",
        "description": "Starting fresh with new goals and perspectives"
      }
    },
    {
      "month": 2,
      "theme": {
        "name": "Relationships",
        "description": "Focusing on connections and community"
      }
    }
  ],
  "special_periods": [
    {
      "name": "Spring Renewal",
      "start_date": "2024-03-20",
      "end_date": "2024-04-20",
      "description": "Special focus on renewal and fresh starts"
    }
  ]
}
```

---

### Notification Management

#### Schedule Notifications
Set up daily notification schedule for a user.

```http
POST /api/notifications/schedule?user_id={user_id}
```

**Request Body:**
```json
{
  "enabled": true,
  "time": "07:30",
  "timezone": "America/New_York",
  "include_preview": true,
  "days_of_week": [1, 2, 3, 4, 5, 6, 7]
}
```

**Response:**
```json
{
  "success": true,
  "schedule_id": "schedule_123456789",
  "message": "Notifications scheduled successfully",
  "next_notification": "2024-12-22T07:30:00-05:00"
}
```

---

#### Update Notification Preferences
Update notification settings for a user.

```http
PUT /api/notifications/preferences?user_id={user_id}
```

**Request Body:**
```json
{
  "enabled": false,
  "time": "08:00",
  "timezone": "UTC",
  "include_preview": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification preferences updated",
  "updated_at": "2024-12-21T10:55:00Z"
}
```

---

### System Endpoints

#### Health Check
Check API health and status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T10:55:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "ai_service": "healthy",
    "cache": "healthy"
  },
  "metrics": {
    "uptime_seconds": 86400,
    "total_requests": 15420,
    "active_users": 1250
  }
}
```

---

#### API Information
Get API version and capabilities.

```http
GET /api/info
```

**Response:**
```json
{
  "name": "ARK Digital Calendar API",
  "version": "1.0.0",
  "description": "Personalized daily quotes and inspiration",
  "documentation": "https://api.yourdomain.com/docs",
  "capabilities": [
    "quote_generation",
    "personalization",
    "theme_management",
    "notifications",
    "data_export"
  ],
  "rate_limits": {
    "quote_generation": "10/minute",
    "feedback_submission": "100/minute",
    "profile_updates": "20/minute"
  }
}
```

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;
  personality_categories: PersonalityCategory[];
  preferences: UserPreferences;
  notification_settings: NotificationSettings;
  stats: UserStats;
  created_at: string;
  updated_at: string;
}

interface PersonalityCategory {
  category: 'spirituality' | 'sport' | 'education' | 'health' | 'humor' | 'philosophy';
  weight: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
}
```

### Quote
```typescript
interface Quote {
  id: string;
  user_id: string;
  content: string;
  author?: string;
  date: string; // YYYY-MM-DD
  theme: Theme;
  personalization_context: PersonalizationContext;
  feedback?: Feedback;
  created_at: string;
}
```

### Theme
```typescript
interface Theme {
  id: string;
  name: string;
  description: string;
  type: 'monthly' | 'weekly';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  parent_theme_id?: string;
  keywords: string[];
  personality_alignment: Record<string, number>;
}
```

## SDK Examples

### JavaScript/TypeScript
```javascript
class ARKClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getTodaysQuote(userId) {
    const response = await fetch(`${this.baseUrl}/api/quotes/today?user_id=${userId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async submitFeedback(quoteId, userId, rating) {
    const response = await fetch(`${this.baseUrl}/api/quotes/feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quote_id: quoteId,
        user_id: userId,
        rating: rating
      })
    });
    return response.json();
  }
}

// Usage
const client = new ARKClient('https://api.yourdomain.com', 'your-api-key');
const quote = await client.getTodaysQuote('user_123');
await client.submitFeedback(quote.id, 'user_123', 'like');
```

### Python
```python
import requests
from typing import Dict, Any

class ARKClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def get_todays_quote(self, user_id: str) -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/api/quotes/today',
            params={'user_id': user_id},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def submit_feedback(self, quote_id: str, user_id: str, rating: str) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/quotes/feedback',
            json={
                'quote_id': quote_id,
                'user_id': user_id,
                'rating': rating
            },
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
client = ARKClient('https://api.yourdomain.com', 'your-api-key')
quote = client.get_todays_quote('user_123')
client.submit_feedback(quote['id'], 'user_123', 'like')
```

## Webhooks

### Quote Generated
Triggered when a new quote is generated for a user.

```json
{
  "event": "quote.generated",
  "timestamp": "2024-12-21T06:00:00Z",
  "data": {
    "quote_id": "quote_123456789",
    "user_id": "user_987654321",
    "content": "Today brings new opportunities for growth.",
    "theme": "Personal Growth"
  }
}
```

### Feedback Received
Triggered when a user provides feedback on a quote.

```json
{
  "event": "feedback.received",
  "timestamp": "2024-12-21T08:15:00Z",
  "data": {
    "feedback_id": "feedback_456789012",
    "quote_id": "quote_123456789",
    "user_id": "user_987654321",
    "rating": "like",
    "personalization_impact": "high"
  }
}
```

## Testing

### Test Environment
- **Base URL**: `http://localhost:8000` (development)
- **Test User ID**: `test_user_123456789`
- **Rate Limits**: Disabled for testing

### Example Test Requests
```bash
# Get today's quote
curl -X GET "http://localhost:8000/api/quotes/today?user_id=test_user_123456789"

# Submit feedback
curl -X POST "http://localhost:8000/api/quotes/feedback" \
  -H "Content-Type: application/json" \
  -d '{"quote_id":"quote_123","user_id":"test_user_123456789","rating":"like"}'

# Create user profile
curl -X POST "http://localhost:8000/api/users/profile" \
  -H "Content-Type: application/json" \
  -d '{"responses":[{"question":"What motivates you?","answer":"Learning"}]}'
```

---

For more information, visit the interactive API documentation at `/docs` when running the server.