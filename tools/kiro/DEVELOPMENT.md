# ARK Digital Calendar - Development Guide

This guide provides detailed instructions for setting up and developing the ARK Digital Calendar application.

## Project Structure

```
tools/kiro/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application entry point
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic services
│   │   ├── api/           # API route handlers
│   │   ├── core/          # Core configuration and utilities
│   │   └── database/      # Database configuration
│   ├── tests/             # Backend tests
│   ├── alembic/           # Database migrations
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment configuration template
├── frontend/              # PWA frontend
│   ├── src/
│   │   ├── js/           # JavaScript modules
│   │   └── css/          # Stylesheets
│   ├── public/           # Static assets and built files
│   ├── package.json      # Node.js dependencies and scripts
│   └── rollup.config.js  # Build configuration
├── database/             # SQLite database files (development)
├── scripts/              # Development setup scripts
└── docs/                # Documentation
```

## Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git** for version control

## Quick Setup

### Automated Setup (Recommended)

**Windows:**
```cmd
cd tools/kiro
scripts\setup-dev.bat
```

**Linux/macOS:**
```bash
cd tools/kiro
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd tools/kiro/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Create environment configuration:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Initialize the database:
   ```bash
   alembic upgrade head
   ```

6. Start the development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd tools/kiro/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the assets:
   ```bash
   npm run build
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Backend Development

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative docs**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

### Frontend Development

- **Development server**: http://localhost:3000
- **PWA features**: Service worker, offline support, installable

### Database Management

- **Create migration**: `alembic revision --autogenerate -m "description"`
- **Apply migrations**: `alembic upgrade head`
- **Rollback**: `alembic downgrade -1`

### Testing

**Backend tests:**
```bash
cd backend
pytest
pytest --cov=app  # With coverage
```

**Frontend tests:**
```bash
cd frontend
npm test
npm run test:coverage
```

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=sqlite:///./database/ark.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# AI Service
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Application
APP_NAME=ARK Digital Calendar
DEBUG=True

# Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CLAIMS_EMAIL=admin@arkapp.com
```

### Required API Keys

1. **OpenAI API Key**: Required for quote generation
   - Sign up at https://platform.openai.com/
   - Create an API key in your dashboard
   - Add to `.env` as `OPENAI_API_KEY`

2. **VAPID Keys**: Required for push notifications
   - Generate using web-push library or online tools
   - Add both public and private keys to `.env`

## Code Style and Standards

### Backend (Python)

- **Formatter**: Black
- **Linter**: Flake8
- **Type checking**: MyPy
- **Import sorting**: isort

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type check
mypy app/

# Sort imports
isort app/
```

### Frontend (JavaScript)

- **Linter**: ESLint
- **Code style**: Standard JavaScript style

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Debugging

### Backend Debugging

1. Set `DEBUG=True` in `.env`
2. Use Python debugger: `import pdb; pdb.set_trace()`
3. Check logs in console output
4. Use FastAPI's automatic validation errors

### Frontend Debugging

1. Open browser developer tools
2. Check console for JavaScript errors
3. Use Network tab to monitor API calls
4. Service Worker debugging in Application tab

## Common Issues

### Backend Issues

**Database locked error:**
- Stop all running instances
- Delete `database/ark.db` and recreate with `alembic upgrade head`

**Import errors:**
- Ensure virtual environment is activated
- Check that all dependencies are installed

**CORS errors:**
- Verify `CORS_ORIGINS` in `.env` includes your frontend URL

### Frontend Issues

**Build failures:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility

**Service Worker not updating:**
- Clear browser cache and storage
- Use "Update on reload" in DevTools Application tab

**PWA not installable:**
- Ensure HTTPS (or localhost)
- Check manifest.json is valid
- Verify service worker is registered

## Production Deployment

### Backend Deployment

1. Use PostgreSQL instead of SQLite
2. Set production environment variables
3. Use a WSGI server like Gunicorn
4. Configure reverse proxy (Nginx)
5. Set up SSL/TLS certificates

### Frontend Deployment

1. Build production assets: `npm run build`
2. Serve static files from CDN or static hosting
3. Configure proper caching headers
4. Ensure HTTPS for PWA features

## Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation as needed
4. Test both online and offline functionality
5. Ensure PWA features work correctly

## Support

For development questions or issues:
1. Check this documentation
2. Review the API documentation at `/docs`
3. Check the browser console for errors
4. Verify environment configuration