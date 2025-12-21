# ARK Digital Calendar - Quick Start Guide

## 🚀 Start the Application

### Option 1: Frontend Only (Quickest - Works Now!)

Simply double-click the `run-simple.bat` file in the `tools/kiro` folder, or run:

```cmd
run-simple.bat
```

This will start the frontend at http://localhost:8080 with static content.

**Note**: This runs without the backend, so AI-generated quotes won't work, but you can see the UI and test the PWA features.

### Option 2: Full Application (Requires Backend Fix)

The backend has a dependency compatibility issue that needs to be resolved. Once fixed, use:

```cmd
start-dev.bat
```

## 📍 Access Points

- **Frontend Application**: http://localhost:8080 (simple mode) or http://localhost:3000 (full mode)
- **Backend API**: http://localhost:8000 (when backend is running)
- **API Documentation**: http://localhost:8000/docs (when backend is running)

## ⚙️ Configuration

The application is pre-configured for development. If you want to customize:

1. Edit `backend/.env` for backend settings
2. The frontend automatically connects to the backend at localhost:8000

## 🔑 API Keys (Optional)

For full functionality, you can add your OpenAI API key:

1. Open `backend/.env`
2. Replace `your-openai-api-key-here` with your actual API key
3. Restart the backend server

Without an API key, the app will work but quote generation will use fallback content.

## 🛑 Stop the Servers

Simply close the terminal windows that were opened by the start script.

## 📱 Features to Try

1. **View Today's Quote**: The main page shows the daily quote
2. **Browse Archive**: Click "Archive" to see past quotes
3. **User Profile**: Set your preferences for personalized quotes
4. **Offline Mode**: The app works offline after the first visit
5. **Install as App**: Click the install button to add to your home screen

## 🐛 Troubleshooting

### Backend won't start
- Make sure Python virtual environment is activated
- Check that port 8000 is not in use
- Verify `.env` file exists in `backend/` folder

### Frontend won't start
- Make sure `npm install` was run in the frontend folder
- Check that port 3000 is not in use
- Try running `npm run build` first

### Database errors
- Delete `database/ark.db` and run `alembic upgrade head` in the backend folder

### CORS errors
- Verify `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000`

## 📚 More Information

- Full documentation: See `DEVELOPMENT.md`
- API documentation: See `API_DOCUMENTATION.md`
- User guide: See `USER_GUIDE.md`
