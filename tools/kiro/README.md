# ARK Digital Calendar

A Progressive Web Application that delivers personalized, AI-generated daily quotes through a clean, mobile-first interface. ARK combines the nostalgic charm of traditional tear-off calendars with modern personalization technology, delivering daily content tailored to individual user preferences and personality profiles.

## 🌟 Features

- **Daily Personalized Quotes**: AI-generated inspirational content tailored to your personality
- **Smart Personalization**: Learns from your feedback to improve quote relevance over time
- **Thematic Organization**: Monthly and weekly themes provide coherent inspiration periods
- **Quote Archive**: Browse and search through your complete quote history
- **Offline-First PWA**: Works seamlessly offline with full app-like experience
- **Push Notifications**: Daily reminders at your preferred time
- **Cross-Device Sync**: Access your quotes and preferences across all devices
- **Mobile-First Design**: Optimized for mobile with responsive desktop support

## 🏗️ Project Structure

```
tools/kiro/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI application entry point
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic services
│   │   ├── api/           # API route handlers
│   │   ├── core/          # Core configuration and utilities
│   │   └── database/      # Database configuration and migrations
│   ├── tests/             # Backend tests
│   ├── requirements.txt   # Python dependencies
│   └── alembic.ini       # Database migration configuration
├── frontend/              # PWA frontend
│   ├── src/
│   │   ├── js/           # JavaScript modules
│   │   ├── css/          # Stylesheets
│   │   ├── components/   # UI components
│   │   └── sw.js         # Service worker
│   ├── public/           # Static assets
│   ├── index.html        # Main HTML file
│   └── manifest.json     # PWA manifest
├── database/             # SQLite database files
└── docs/                # Documentation
```

## Technology Stack

- **Backend**: Python FastAPI, SQLAlchemy, Alembic
- **Frontend**: Vanilla JavaScript, CSS3, Service Workers
- **Database**: SQLite (development), PostgreSQL (production)
- **AI Integration**: OpenAI API
- **Testing**: pytest (backend), Fast-check (frontend property tests)

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- Node.js 16+ (for frontend development)
- OpenAI API key (for AI quote generation)

### 1. Clone and Setup Backend

```bash
cd tools/kiro/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your OpenAI API key and other settings

# Initialize database
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Setup Frontend

```bash
cd tools/kiro/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Alternative API docs**: http://localhost:8000/redoc

## 🛠️ Development Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd tools/kiro/backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Initialize the database:
   ```bash
   alembic upgrade head
   ```

5. Start the development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd tools/kiro/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=sqlite:///./database/ark.db
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_secret_key_here
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## API Documentation

Once the backend is running, visit:
- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test categories
pytest tests/test_quote_properties.py  # Property-based tests
pytest tests/test_integration.py       # Integration tests
```

### Frontend Tests
```bash
cd frontend

# Run unit tests
npm test

# Run browser compatibility tests
# Open: http://localhost:3000/test-browser-compatibility.html

# Run end-to-end tests
npm run test:e2e
```

### End-to-End System Validation
```bash
cd backend
python tests/run_e2e_validation.py
```

## 📚 API Documentation

### Core Endpoints

#### Quote Management
- `GET /api/quotes/today?user_id={id}` - Get today's personalized quote
- `GET /api/quotes/archive?user_id={id}` - Get user's quote history
- `POST /api/quotes/feedback` - Submit quote feedback (like/neutral/dislike)
- `GET /api/quotes/search?user_id={id}&q={query}` - Search archived quotes

#### User Management  
- `POST /api/users/profile` - Create user profile from questionnaire
- `GET /api/users/profile?user_id={id}` - Get user profile and preferences
- `PUT /api/users/profile?user_id={id}` - Update user preferences
- `GET /api/users/export?user_id={id}` - Export all user data

#### Theme Management
- `GET /api/themes/current` - Get current monthly and weekly themes
- `GET /api/themes/calendar?year={year}` - Get theme calendar for year

#### Notifications
- `POST /api/notifications/schedule?user_id={id}` - Schedule daily notifications
- `PUT /api/notifications/preferences?user_id={id}` - Update notification settings

### Authentication
Currently uses simple user ID-based authentication. Production deployment should implement proper JWT-based authentication.

### Rate Limiting
- Quote generation: 10 requests per minute per user
- Feedback submission: 100 requests per minute per user
- Profile updates: 20 requests per minute per user

## 🚀 Production Deployment

### Environment Setup

#### Backend Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_USER=ark_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=ark_production

# AI Service
OPENAI_API_KEY=your_production_openai_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=150

# Security
SECRET_KEY=your_256_bit_secret_key
JWT_SECRET_KEY=your_jwt_secret_key
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Application
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Caching
REDIS_URL=redis://localhost:6379/0

# Monitoring
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

### Docker Deployment

#### 1. Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. Frontend Dockerfile
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://ark_user:${POSTGRES_PASSWORD}@db:5432/ark_production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=ark_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=ark_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Cloud Deployment Options

#### Option 1: AWS Deployment
```bash
# 1. Backend on AWS ECS/Fargate
aws ecs create-cluster --cluster-name ark-production

# 2. Frontend on AWS S3 + CloudFront
aws s3 mb s3://ark-frontend-production
aws s3 sync ./frontend/dist s3://ark-frontend-production

# 3. Database on AWS RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier ark-production \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username arkuser \
  --master-user-password ${DB_PASSWORD}
```

#### Option 2: Heroku Deployment
```bash
# Backend
heroku create ark-backend-production
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set OPENAI_API_KEY=${OPENAI_API_KEY}
git push heroku main

# Frontend
heroku create ark-frontend-production
heroku buildpacks:set heroku/nodejs
git push heroku main
```

#### Option 3: DigitalOcean App Platform
```yaml
# .do/app.yaml
name: ark-digital-calendar
services:
- name: backend
  source_dir: /backend
  github:
    repo: your-username/ark
    branch: main
  run_command: uvicorn app.main:app --host 0.0.0.0 --port 8080
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  
- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/ark
    branch: main
  build_command: npm run build
  environment_slug: node-js
  
databases:
- engine: PG
  name: ark-db
  num_nodes: 1
  size: db-s-dev-database
```

### Database Migration for Production

```bash
# 1. Backup existing data (if migrating)
pg_dump $OLD_DATABASE_URL > backup.sql

# 2. Run migrations
alembic upgrade head

# 3. Restore data (if needed)
psql $DATABASE_URL < backup.sql

# 4. Verify migration
python -c "
from app.database.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM users'))
    print(f'Users: {result.scalar()}')
"
```

### Performance Optimization

#### Backend Optimizations
```python
# Add to app/main.py
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add caching
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="ark-cache")
```

#### Frontend Optimizations
```javascript
// Service Worker caching strategy
const CACHE_NAME = 'ark-v1';
const urlsToCache = [
  '/',
  '/css/main.css',
  '/js/app.js',
  '/manifest.json'
];

// Implement cache-first strategy for static assets
self.addEventListener('fetch', event => {
  if (event.request.destination === 'image' || 
      event.request.url.includes('.css') || 
      event.request.url.includes('.js')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

### Monitoring and Logging

#### Application Monitoring
```python
# Add to requirements.txt
sentry-sdk[fastapi]==1.32.0
prometheus-fastapi-instrumentator==6.1.0

# Add to app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from prometheus_fastapi_instrumentator import Instrumentator

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
)

Instrumentator().instrument(app).expose(app)
```

#### Health Checks
```python
# Add to app/api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute("SELECT 1")
        
        # Check external services
        # ... add OpenAI API check
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow()
        }
```

### Security Considerations

#### 1. API Security
```python
# Add rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/quotes/feedback")
@limiter.limit("10/minute")
async def submit_feedback(request: Request, ...):
    pass
```

#### 2. Input Validation
```python
from pydantic import BaseModel, validator
from typing import Literal

class FeedbackRequest(BaseModel):
    rating: Literal["like", "neutral", "dislike"]
    quote_id: str
    
    @validator('quote_id')
    def validate_quote_id(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Invalid quote ID')
        return v
```

#### 3. Environment Security
```bash
# Use secrets management
export OPENAI_API_KEY=$(aws secretsmanager get-secret-value --secret-id prod/ark/openai-key --query SecretString --output text)

# Set proper file permissions
chmod 600 .env
chown app:app .env
```

### Backup and Recovery

#### Database Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ark_backup_$DATE.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://ark-backups/

# Keep only last 30 days of backups
find . -name "ark_backup_*.sql" -mtime +30 -delete
```

#### Application Recovery
```bash
# 1. Restore database
psql $DATABASE_URL < ark_backup_20241221_120000.sql

# 2. Restart services
docker-compose restart

# 3. Verify functionality
curl -f http://localhost:8000/health || exit 1
```

## 📱 User Guide

### Getting Started
1. **First Visit**: Complete the 5-question personality questionnaire
2. **Daily Routine**: Check your personalized quote each morning
3. **Provide Feedback**: Like, neutral, or dislike quotes to improve personalization
4. **Explore Archive**: Browse and search your quote history
5. **Customize**: Adjust notification settings and preferences

### Features Guide

#### Personalization System
- **Initial Setup**: Answer 5 personality questions to create your profile
- **Continuous Learning**: The system adapts based on your feedback patterns
- **Categories**: Quotes are personalized across spirituality, education, philosophy, health, humor, and sports

#### Theme System
- **Monthly Themes**: Each month focuses on a specific area (e.g., "Personal Growth")
- **Weekly Sub-themes**: Weeks within months have related sub-themes
- **Seasonal Variation**: Themes change throughout the year for variety

#### Offline Usage
- **Cached Quotes**: Recent quotes are available offline
- **Sync When Online**: Feedback and preferences sync when connection returns
- **Full PWA**: Install as an app on mobile devices

#### Notifications
- **Daily Reminders**: Set your preferred time for daily quote notifications
- **Preview Text**: Notifications include a preview of your quote
- **Easy Access**: Tap notifications to go directly to your quote

### Troubleshooting

#### Common Issues
1. **Quotes Not Loading**: Check internet connection, try refreshing
2. **Notifications Not Working**: Ensure notifications are enabled in browser/device settings
3. **Sync Issues**: Check if you're logged in and have internet connection
4. **Performance Issues**: Clear browser cache, ensure sufficient device storage

#### Browser Compatibility
- **Recommended**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Android Chrome 90+
- **Features**: Full PWA support requires modern browser with service worker support

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `pytest` (backend) and `npm test` (frontend)
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards
- **Backend**: Follow PEP 8, use type hints, write docstrings
- **Frontend**: Use ESLint configuration, write JSDoc comments
- **Testing**: Maintain >90% test coverage, write both unit and integration tests
- **Documentation**: Update README and API docs for any changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT API powering quote generation
- FastAPI for the excellent Python web framework
- The open-source community for the tools and libraries used

---

**ARK Digital Calendar** - Bringing personalized inspiration to your daily routine 🌅