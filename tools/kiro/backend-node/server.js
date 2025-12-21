const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve the main app at root
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Sample quotes data
const SAMPLE_QUOTES = [
    {
        id: 1,
        text: "The future belongs to those who believe in the beauty of their dreams.",
        author: "Eleanor Roosevelt",
        theme: "Dreams",
        date: "2024-12-21"
    },
    {
        id: 2,
        text: "It is during our darkest moments that we must focus to see the light.",
        author: "Aristotle",
        theme: "Hope",
        date: "2024-12-20"
    },
    {
        id: 3,
        text: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        theme: "Work",
        date: "2024-12-19"
    },
    {
        id: 4,
        text: "Life is what happens to you while you're busy making other plans.",
        author: "John Lennon",
        theme: "Life",
        date: "2024-12-18"
    },
    {
        id: 5,
        text: "The way to get started is to quit talking and begin doing.",
        author: "Walt Disney",
        theme: "Action",
        date: "2024-12-17"
    },
    {
        id: 6,
        text: "Your limitation—it's only your imagination.",
        author: "Unknown",
        theme: "Motivation",
        date: "2024-12-16"
    },
    {
        id: 7,
        text: "Push yourself, because no one else is going to do it for you.",
        author: "Unknown",
        theme: "Self-Improvement",
        date: "2024-12-15"
    },
    {
        id: 8,
        text: "Great things never come from comfort zones.",
        author: "Unknown",
        theme: "Growth",
        date: "2024-12-14"
    },
    {
        id: 9,
        text: "Dream it. Wish it. Do it.",
        author: "Unknown",
        theme: "Achievement",
        date: "2024-12-13"
    },
    {
        id: 10,
        text: "Success doesn't just find you. You have to go out and get it.",
        author: "Unknown",
        theme: "Success",
        date: "2024-12-12"
    }
];

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: "ARK Digital Calendar API", 
        status: "running",
        version: "1.0.0",
        endpoints: [
            "GET /health",
            "GET /api/quotes/today",
            "GET /api/quotes",
            "GET /api/quotes/:id",
            "GET /api/themes",
            "GET /api/quotes/theme/:theme",
            "POST /api/quotes/:id/feedback",
            "GET /api/users/profile",
            "POST /api/users/profile"
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/api/quotes/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let todayQuote = SAMPLE_QUOTES.find(q => q.date === today);
    
    if (!todayQuote) {
        // Return a random quote for today
        todayQuote = SAMPLE_QUOTES[Math.floor(Math.random() * SAMPLE_QUOTES.length)];
        todayQuote = { ...todayQuote, date: today };
    }
    
    res.json(todayQuote);
});

app.get('/api/quotes', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    
    let quotes = SAMPLE_QUOTES;
    
    // Filter by search term
    if (search) {
        quotes = quotes.filter(q => 
            q.text.toLowerCase().includes(search.toLowerCase()) ||
            q.author.toLowerCase().includes(search.toLowerCase()) ||
            q.theme.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    const start = offset;
    const end = offset + limit;
    const paginatedQuotes = quotes.slice(start, end);
    
    res.json({
        quotes: paginatedQuotes,
        total: quotes.length,
        limit: limit,
        offset: offset,
        hasMore: end < quotes.length
    });
});

app.get('/api/quotes/:id', (req, res) => {
    const quoteId = parseInt(req.params.id);
    const quote = SAMPLE_QUOTES.find(q => q.id === quoteId);
    
    if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
    }
    
    res.json(quote);
});

app.get('/api/themes', (req, res) => {
    const themes = [...new Set(SAMPLE_QUOTES.map(q => q.theme))];
    res.json({ 
        themes: themes.map(theme => ({
            name: theme,
            count: SAMPLE_QUOTES.filter(q => q.theme === theme).length
        }))
    });
});

app.get('/api/quotes/theme/:theme', (req, res) => {
    const theme = req.params.theme;
    const themeQuotes = SAMPLE_QUOTES.filter(q => 
        q.theme.toLowerCase() === theme.toLowerCase()
    );
    
    res.json({ 
        quotes: themeQuotes, 
        theme: theme,
        count: themeQuotes.length
    });
});

app.post('/api/quotes/:id/feedback', (req, res) => {
    const quoteId = parseInt(req.params.id);
    const feedback = req.body;
    
    const quote = SAMPLE_QUOTES.find(q => q.id === quoteId);
    if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
    }
    
    console.log(`Feedback received for quote ${quoteId}:`, feedback);
    
    res.json({ 
        message: "Feedback received successfully", 
        quote_id: quoteId, 
        feedback: feedback,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/users/profile', (req, res) => {
    res.json({
        id: 1,
        name: "ARK User",
        preferences: {
            themes: ["Dreams", "Hope", "Work", "Motivation"],
            quote_length: "medium",
            notification_time: "09:00",
            notifications_enabled: true
        },
        stats: {
            quotes_viewed: 42,
            favorite_themes: ["Dreams", "Hope"],
            streak_days: 7
        },
        created_at: "2024-01-01T00:00:00Z",
        last_active: new Date().toISOString()
    });
});

app.post('/api/users/profile', (req, res) => {
    const profile = req.body;
    console.log('Profile update received:', profile);
    
    res.json({ 
        message: "Profile updated successfully", 
        profile: profile,
        updated_at: new Date().toISOString()
    });
});

// Generate new quote endpoint (mock AI generation)
app.post('/api/quotes/generate', (req, res) => {
    const { theme, mood, length } = req.body;
    
    // Mock AI-generated quote
    const newQuote = {
        id: SAMPLE_QUOTES.length + 1,
        text: `This is a ${length || 'medium'} AI-generated quote about ${theme || 'life'} with a ${mood || 'positive'} mood.`,
        author: "AI Assistant",
        theme: theme || "AI Generated",
        date: new Date().toISOString().split('T')[0],
        generated: true
    };
    
    res.json({
        message: "Quote generated successfully",
        quote: newQuote
    });
});

// Archive endpoint
app.get('/api/archive', (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month;
    
    let quotes = SAMPLE_QUOTES;
    
    if (month) {
        quotes = quotes.filter(q => {
            const quoteDate = new Date(q.date);
            return quoteDate.getFullYear() == year && quoteDate.getMonth() == month - 1;
        });
    }
    
    res.json({
        quotes: quotes,
        year: year,
        month: month,
        total: quotes.length
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: "Something went wrong!",
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: "Endpoint not found",
        path: req.path,
        method: req.method
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ARK Digital Calendar API running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log(`📅 Today's Quote: http://localhost:${PORT}/api/quotes/today`);
});

module.exports = app;