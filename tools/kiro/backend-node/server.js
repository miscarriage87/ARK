const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const { configManager } = require('./config-manager');
const errorHandler = require('./error-handler');

// Load and validate configuration
console.log('🔧 Loading configuration...');
const configResult = configManager.loadConfiguration();

if (!configResult.success) {
    console.error('❌ Configuration loading failed:');
    configResult.errors.forEach(error => {
        const icon = error.type === 'critical' ? '❌' : '⚠️';
        console.error(`  ${icon} ${error.message}`);
        
        // Log configuration errors to error handler
        errorHandler.logError(
            error.type === 'critical' ? 'critical' : 'medium',
            'configuration',
            error.message,
            null,
            { configurationStep: 'loading', errorType: error.type }
        );
    });
    
    errorHandler.handleCriticalError('configuration', 'Configuration loading failed', null, {
        errors: configResult.errors
    });
    
    process.exit(1);
}

const config = configManager.config;
const app = express();
const PORT = config.server.port;

// Initialize OpenAI with proper error handling
let openai = null;
let AI_ENABLED = config.openai.enabled;

try {
    if (config.openai.apiKey && AI_ENABLED) {
        openai = new OpenAI({
            apiKey: config.openai.apiKey,
            timeout: config.openai.timeout,
            maxRetries: config.openai.maxRetries
        });
        
        console.log('🤖 OpenAI client initialized successfully');
        console.log(`🎯 AI Generation: Enabled with model ${config.openai.model}`);
    } else {
        console.warn('⚠️ OpenAI API key not configured or AI features disabled');
        AI_ENABLED = false;
        
        errorHandler.logError('medium', 'openai', 'OpenAI not configured', null, {
            hasApiKey: !!config.openai.apiKey,
            aiEnabled: AI_ENABLED
        });
    }
} catch (error) {
    console.error('❌ Failed to initialize OpenAI client:', error.message);
    AI_ENABLED = false;
    
    errorHandler.logError('high', 'openai', 'Failed to initialize OpenAI client', error, {
        apiKeyPresent: !!config.openai.apiKey,
        model: config.openai.model
    });
}

// Middleware
app.use(cors({
    origin: config.server.corsOrigins,
    credentials: true
}));
app.use(express.json());

// Request timeout middleware
app.use((req, res, next) => {
    // Set timeout for all requests (default 30 seconds)
    const timeout = config.server.requestTimeout || 30000;
    
    req.setTimeout(timeout, () => {
        console.warn(`⏰ Request timeout: ${req.method} ${req.url}`);
        if (!res.headersSent) {
            res.status(408).json({
                error: 'Request timeout',
                message: 'The request took too long to process',
                timeout: timeout
            });
        }
    });
    
    res.setTimeout(timeout, () => {
        console.warn(`⏰ Response timeout: ${req.method} ${req.url}`);
        if (!res.headersSent) {
            res.status(504).json({
                error: 'Response timeout',
                message: 'The server took too long to respond',
                timeout: timeout
            });
        }
    });
    
    next();
});

// Performance monitoring middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Log slow requests
        if (duration > 1000) {
            console.warn(`🐌 Slow request: ${req.method} ${req.url} took ${duration}ms`);
        }
        
        // Log to performance metrics
        if (duration > 5000) {
            errorHandler.logError('medium', 'performance', `Slow API request: ${req.method} ${req.url}`, null, {
                duration: duration,
                endpoint: req.url,
                method: req.method,
                statusCode: res.statusCode
            });
        }
    });
    
    next();
});

// API Routes (before static file serving)
app.get('/', (req, res) => {
    const summary = configManager.getSummary();
    res.json({ 
        message: "ARK Digitaler Kalender API", 
        status: "läuft",
        version: "1.0.0",
        ai_enabled: AI_ENABLED,
        configuration: {
            server: summary.server,
            openai: summary.openai,
            features: summary.features,
            validation_status: summary.status
        },
        endpoints: [
            "GET /health",
            "GET /api/config",
            "GET /api/ai-status",
            "GET /api/quotes/today",
            "GET /api/quotes",
            "GET /api/quotes/:id",
            "GET /api/themes",
            "GET /api/quotes/theme/:theme",
            "POST /api/quotes/:id/feedback",
            "POST /api/quotes/generate",
            "GET /api/users/profile",
            "POST /api/users/profile"
        ]
    });
});

// Serve static files from frontend/public (after API routes)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve source files from frontend/src (for development)
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));

// Serve the main app at /app route
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
    try {
        const summary = configManager.getSummary();
        
        // Return safe configuration information (no secrets)
        res.json({
            server: {
                port: summary.server.port,
                nodeEnv: summary.server.nodeEnv
            },
            openai: {
                enabled: summary.openai.enabled,
                hasApiKey: summary.openai.hasApiKey,
                model: summary.openai.model
            },
            features: summary.features,
            quotes: {
                defaultLength: config.quotes.defaultLength,
                defaultTheme: config.quotes.defaultTheme,
                perDay: config.quotes.perDay
            },
            notifications: {
                enabled: config.notifications.enabled,
                defaultTime: config.notifications.defaultTime
            },
            validation: {
                status: summary.status,
                errors: summary.errors
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting configuration:', error);
        
        errorHandler.logError('medium', 'api', 'Configuration endpoint error', error, {
            endpoint: '/api/config',
            method: 'GET'
        });
        
        res.status(500).json({
            error: 'Failed to get configuration',
            message: error.message
        });
    }
});

// Error reporting endpoint for frontend
app.post('/api/errors', (req, res) => {
    try {
        const frontendError = req.body;
        
        // Log frontend error with backend error handler
        errorHandler.logError(
            frontendError.level || 'medium',
            'frontend',
            `Frontend Error: ${frontendError.message}`,
            frontendError.error ? new Error(frontendError.error.message) : null,
            {
                frontendErrorId: frontendError.id,
                category: frontendError.category,
                browser: frontendError.browser,
                page: frontendError.page,
                context: frontendError.context
            }
        );
        
        res.json({
            success: true,
            message: 'Error reported successfully',
            errorId: frontendError.id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error processing frontend error report:', error);
        
        errorHandler.logError('high', 'api', 'Failed to process frontend error report', error, {
            endpoint: '/api/errors',
            method: 'POST'
        });
        
        res.status(500).json({
            error: 'Failed to process error report',
            message: error.message
        });
    }
});

// Diagnostic endpoint
app.get('/api/diagnostics', (req, res) => {
    try {
        const diagnosticReport = errorHandler.generateDiagnosticReport();
        
        res.json({
            success: true,
            diagnostics: diagnosticReport,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error generating diagnostic report:', error);
        
        errorHandler.logError('medium', 'api', 'Diagnostic endpoint error', error, {
            endpoint: '/api/diagnostics',
            method: 'GET'
        });
        
        res.status(500).json({
            error: 'Failed to generate diagnostic report',
            message: error.message
        });
    }
});

// Error statistics endpoint
app.get('/api/errors/stats', (req, res) => {
    try {
        const stats = errorHandler.getErrorStats();
        const recentErrors = errorHandler.getRecentErrors(10);
        
        res.json({
            success: true,
            stats: stats,
            recentErrors: recentErrors,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting error statistics:', error);
        
        errorHandler.logError('medium', 'api', 'Error stats endpoint error', error, {
            endpoint: '/api/errors/stats',
            method: 'GET'
        });
        
        res.status(500).json({
            error: 'Failed to get error statistics',
            message: error.message
        });
    }
});

// Configuration reload endpoint (for development)
app.post('/api/config/reload', (req, res) => {
    try {
        if (config.server.nodeEnv === 'production') {
            return res.status(403).json({
                error: 'Configuration reload not allowed in production'
            });
        }

        console.log('🔄 Reloading configuration...');
        const result = configManager.reload();
        
        if (result.success) {
            console.log('✅ Configuration reloaded successfully');
            res.json({
                success: true,
                message: 'Configuration reloaded successfully',
                summary: configManager.getSummary()
            });
        } else {
            console.log('❌ Configuration reload failed');
            res.status(400).json({
                success: false,
                message: 'Configuration reload failed',
                errors: result.errors
            });
        }
    } catch (error) {
        console.error('Error reloading configuration:', error);
        res.status(500).json({
            error: 'Failed to reload configuration',
            message: error.message
        });
    }
});

// Configuration update endpoint (secure)
app.post('/api/config/update', (req, res) => {
    try {
        if (config.server.nodeEnv === 'production') {
            return res.status(403).json({
                error: 'Configuration updates not allowed in production'
            });
        }

        const changes = req.body;
        
        if (!changes || typeof changes !== 'object') {
            return res.status(400).json({
                error: 'Invalid configuration changes provided'
            });
        }

        console.log('🔧 Applying configuration changes...');
        const result = configManager.applyConfigurationChanges(changes);
        
        if (result.success) {
            console.log('✅ Configuration updated successfully');
            res.json({
                success: true,
                message: 'Configuration updated successfully',
                changes: result.changes,
                summary: configManager.getSummary()
            });
        } else {
            console.log('❌ Configuration update failed');
            res.status(400).json({
                success: false,
                message: 'Configuration update failed',
                errors: result.errors
            });
        }
    } catch (error) {
        console.error('Error updating configuration:', error);
        res.status(400).json({
            error: 'Failed to update configuration',
            message: error.message
        });
    }
});

// Configuration validation endpoint
app.post('/api/config/validate', (req, res) => {
    try {
        const testConfig = req.body;
        
        if (!testConfig || typeof testConfig !== 'object') {
            return res.status(400).json({
                error: 'Invalid configuration provided for validation'
            });
        }

        const validation = configManager.validateConfigurationChange(testConfig);
        
        res.json({
            valid: validation.isValid,
            changes: validation.changes,
            securityIssues: validation.securityIssues,
            message: validation.isValid ? 'Configuration is valid' : 'Configuration has issues'
        });
    } catch (error) {
        console.error('Error validating configuration:', error);
        res.status(500).json({
            error: 'Failed to validate configuration',
            message: error.message
        });
    }
});

// Sample quotes data
const SAMPLE_QUOTES = [
    {
        id: 1,
        text: "Die Zukunft gehört denen, die an die Schönheit ihrer Träume glauben.",
        author: "Eleanor Roosevelt",
        theme: "Träume",
        date: "2024-12-21"
    },
    {
        id: 2,
        text: "In unseren dunkelsten Momenten müssen wir uns darauf konzentrieren, das Licht zu sehen.",
        author: "Aristoteles",
        theme: "Hoffnung",
        date: "2024-12-20"
    },
    {
        id: 3,
        text: "Der einzige Weg, großartige Arbeit zu leisten, ist zu lieben, was du tust.",
        author: "Steve Jobs",
        theme: "Arbeit",
        date: "2024-12-19"
    },
    {
        id: 4,
        text: "Das Leben ist das, was dir passiert, während du eifrig dabei bist, andere Pläne zu machen.",
        author: "John Lennon",
        theme: "Leben",
        date: "2024-12-18"
    },
    {
        id: 5,
        text: "Der Weg zum Erfolg ist, aufzuhören zu reden und anzufangen zu handeln.",
        author: "Walt Disney",
        theme: "Handeln",
        date: "2024-12-17"
    },
    {
        id: 6,
        text: "Deine Begrenzung - das ist nur deine Vorstellungskraft.",
        author: "Unbekannt",
        theme: "Motivation",
        date: "2024-12-16"
    },
    {
        id: 7,
        text: "Fordere dich selbst heraus, denn niemand sonst wird es für dich tun.",
        author: "Unbekannt",
        theme: "Selbstverbesserung",
        date: "2024-12-15"
    },
    {
        id: 8,
        text: "Großartige Dinge entstehen niemals in der Komfortzone.",
        author: "Unbekannt",
        theme: "Wachstum",
        date: "2024-12-14"
    },
    {
        id: 9,
        text: "Träume es. Wünsche es. Tu es.",
        author: "Unbekannt",
        theme: "Erfolg",
        date: "2024-12-13"
    },
    {
        id: 10,
        text: "Erfolg findet dich nicht einfach. Du musst rausgehen und ihn dir holen.",
        author: "Unbekannt",
        theme: "Erfolg",
        date: "2024-12-12"
    }
];

// Test OpenAI connection endpoint
app.post('/api/ai-test', async (req, res) => {
    try {
        if (!AI_ENABLED || !openai) {
            return res.status(503).json({
                error: 'KI-Generierung nicht verfügbar',
                message: 'OpenAI nicht konfiguriert'
            });
        }
        
        // Test API connectivity
        console.log('🧪 Testing OpenAI API connectivity...');
        const testStart = Date.now();
        
        try {
            // Simple API test - list models
            const models = await openai.models.list();
            const testDuration = Date.now() - testStart;
            
            console.log(`✅ OpenAI API test successful (${testDuration}ms)`);
            
            res.json({
                success: true,
                message: 'OpenAI API-Verbindung erfolgreich',
                response_time: testDuration,
                models_available: models.data.length,
                timestamp: new Date().toISOString()
            });
        } catch (apiError) {
            console.error('❌ OpenAI API test failed:', apiError.message);
            
            let errorMessage = 'OpenAI API-Test fehlgeschlagen';
            let errorCode = 'api_error';
            
            if (apiError.code === 'invalid_api_key') {
                errorMessage = 'Ungültiger API-Schlüssel';
                errorCode = 'invalid_key';
            } else if (apiError.code === 'insufficient_quota') {
                errorMessage = 'API-Kontingent erschöpft';
                errorCode = 'quota_exceeded';
            } else if (apiError.code === 'rate_limit_exceeded') {
                errorMessage = 'Rate-Limit erreicht';
                errorCode = 'rate_limit';
            }
            
            res.status(503).json({
                success: false,
                error: errorMessage,
                error_code: errorCode,
                details: apiError.message,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error testing OpenAI API:', error);
        res.status(500).json({
            success: false,
            error: 'Interner Serverfehler beim API-Test',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai-status', async (req, res) => {
    try {
        const status = {
            ai_enabled: Boolean(AI_ENABLED),
            openai_configured: Boolean(config.openai.apiKey),
            model: config.openai.model,
            timeout: config.openai.timeout,
            maxRetries: config.openai.maxRetries,
            status: AI_ENABLED ? 'Bereit für KI-Generierung' : 'KI-Generierung deaktiviert'
        };
        
        // Test OpenAI connectivity if enabled
        if (AI_ENABLED && openai) {
            try {
                // Simple test to verify API connectivity
                await openai.models.list();
                status.connectivity = 'connected';
                status.last_test = new Date().toISOString();
            } catch (testError) {
                console.error('OpenAI connectivity test failed:', testError.message);
                status.connectivity = 'error';
                status.error = testError.message;
                status.last_test = new Date().toISOString();
            }
        } else {
            status.connectivity = 'disabled';
        }
        
        res.json(status);
    } catch (error) {
        console.error('Error checking AI status:', error);
        res.status(500).json({
            error: 'Failed to check AI status',
            message: error.message
        });
    }
});

// VAPID public key endpoint (mock for now)
app.get('/api/notifications/vapid-public-key', (req, res) => {
    res.json({
        publicKey: 'mock-vapid-key-for-development'
    });
});

app.get('/health', (req, res) => {
    const summary = configManager.getSummary();
    res.json({ 
        status: summary.status === 'valid' ? "gesund" : "konfigurationsfehler", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        configuration: {
            valid: summary.status === 'valid',
            errors: summary.errors
        },
        ai_status: AI_ENABLED ? 'enabled' : 'disabled'
    });
});

app.get('/api/quotes/today', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let todayQuote = SAMPLE_QUOTES.find(q => q.date === today);
    
    if (!todayQuote && AI_ENABLED && openai) {
        try {
            console.log('🤖 Generating AI quote for today...');
            // Generate AI quote for today
            const aiQuote = await generateAIQuote('Motivation', 'inspirierend', 'medium');
            todayQuote = {
                id: Date.now(),
                text: aiQuote.text,
                author: aiQuote.author || 'KI-Assistent',
                theme: aiQuote.theme || 'Motivation',
                date: today,
                generated: true
            };
            console.log('✅ AI quote generated for today');
        } catch (error) {
            console.error('❌ Error generating AI quote for today:', error.message);
            // Fallback to random sample quote
            todayQuote = SAMPLE_QUOTES[Math.floor(Math.random() * SAMPLE_QUOTES.length)];
            todayQuote = { ...todayQuote, date: today, fallback: true };
        }
    } else if (!todayQuote) {
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
        return res.status(404).json({ error: "Spruch nicht gefunden" });
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
        return res.status(404).json({ error: "Spruch nicht gefunden" });
    }
    
    console.log(`Feedback für Spruch ${quoteId} erhalten:`, feedback);
    
    res.json({ 
        message: "Feedback erfolgreich erhalten", 
        quote_id: quoteId, 
        feedback: feedback,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/users/profile', (req, res) => {
    res.json({
        id: 1,
        name: "ARK Benutzer",
        preferences: {
            themes: ["Träume", "Hoffnung", "Arbeit", "Motivation"],
            quote_length: "medium",
            notification_time: "09:00",
            notifications_enabled: true
        },
        stats: {
            quotes_viewed: 42,
            favorite_themes: ["Träume", "Hoffnung"],
            streak_days: 7
        },
        created_at: "2024-01-01T00:00:00Z",
        last_active: new Date().toISOString()
    });
});

app.post('/api/users/profile', (req, res) => {
    const profile = req.body;
    console.log('Profil-Update erhalten:', profile);
    
    res.json({ 
        message: "Profil erfolgreich aktualisiert", 
        profile: profile,
        updated_at: new Date().toISOString()
    });
});

// Generate new quote endpoint (real AI generation)
app.post('/api/quotes/generate', async (req, res) => {
    const { theme, mood, length } = req.body;
    
    if (!AI_ENABLED || !openai) {
        return res.status(503).json({
            error: "KI-Generierung ist nicht verfügbar",
            message: "OpenAI API-Key nicht konfiguriert oder KI-Features deaktiviert",
            fallback_available: true
        });
    }
    
    try {
        console.log(`🤖 Generating quote: theme=${theme}, mood=${mood}, length=${length}`);
        
        const aiQuote = await generateAIQuote(theme || 'Leben', mood || 'positiv', length || 'medium');
        
        const newQuote = {
            id: Date.now(),
            text: aiQuote.text,
            author: aiQuote.author || "KI-Assistent",
            theme: aiQuote.theme || theme || "KI-Generiert",
            date: new Date().toISOString().split('T')[0],
            generated: true,
            generation_params: {
                theme: theme || 'Leben',
                mood: mood || 'positiv',
                length: length || 'medium'
            }
        };
        
        console.log('✅ Quote generated successfully:', newQuote.id);
        
        res.json({
            success: true,
            message: "Spruch erfolgreich generiert",
            quote: newQuote
        });
    } catch (error) {
        console.error('❌ Error generating quote:', error.message);
        
        // Provide specific error responses
        let statusCode = 500;
        let errorResponse = {
            success: false,
            error: "Fehler bei der Spruch-Generierung",
            message: error.message,
            fallback_available: true
        };
        
        if (error.message.includes('API-Kontingent')) {
            statusCode = 429;
            errorResponse.error_code = 'quota_exceeded';
        } else if (error.message.includes('Rate-Limit')) {
            statusCode = 429;
            errorResponse.error_code = 'rate_limit';
        } else if (error.message.includes('API-Schlüssel')) {
            statusCode = 401;
            errorResponse.error_code = 'invalid_key';
        } else if (error.message.includes('Timeout')) {
            statusCode = 504;
            errorResponse.error_code = 'timeout';
        }
        
        res.status(statusCode).json(errorResponse);
    }
});

// AI Quote Generation Function with retry logic
async function generateAIQuote(theme = 'Leben', mood = 'positiv', length = 'medium', retryCount = 0) {
    if (!AI_ENABLED || !openai) {
        throw new Error('KI-Generierung nicht verfügbar - OpenAI nicht konfiguriert');
    }
    
    // Validate API key format
    if (!config.openai.apiKey || !config.openai.apiKey.startsWith('sk-')) {
        throw new Error('Ungültiger OpenAI API-Schlüssel');
    }
    
    const maxRetries = config.openai.maxRetries || 3;
    const baseTimeout = config.openai.timeout || 30000;
    
    // Exponential backoff for retries
    const timeout = baseTimeout + (retryCount * 5000);
    
    const lengthMap = {
        'kurz': 'kurzen (max. 50 Zeichen)',
        'medium': 'mittellangen (50-100 Zeichen)', 
        'lang': 'längeren (100-150 Zeichen)'
    };
    
    const prompt = `Erstelle einen ${mood}en, inspirierenden deutschen Spruch zum Thema "${theme}". 
    Der Spruch soll ${lengthMap[length] || lengthMap.medium} sein.
    
    Antworte im folgenden JSON-Format:
    {
        "text": "Der inspirierende Spruch hier",
        "author": "Autor (falls bekannt, sonst 'Unbekannt')",
        "theme": "${theme}"
    }
    
    Der Spruch soll motivierend, authentisch und auf Deutsch sein.`;
    
    try {
        console.log(`🤖 Generating AI quote (attempt ${retryCount + 1}/${maxRetries + 1}): theme=${theme}, mood=${mood}, length=${length}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const completion = await openai.chat.completions.create({
            model: config.openai.model,
            messages: [
                {
                    role: 'system',
                    content: 'Du bist ein Experte für inspirierende deutsche Sprüche und Zitate. Du antwortest immer im angeforderten JSON-Format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 200,
            temperature: 0.8
        }, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!completion.choices || completion.choices.length === 0) {
            throw new Error('Keine Antwort von OpenAI erhalten');
        }
        
        const responseContent = completion.choices[0].message.content;
        console.log('🤖 OpenAI response received:', responseContent);
        
        try {
            const response = JSON.parse(responseContent);
            
            // Validate response structure
            if (!response.text || typeof response.text !== 'string') {
                throw new Error('Ungültige Antwortstruktur von OpenAI');
            }
            
            return {
                text: response.text.trim(),
                author: response.author || 'KI-Assistent',
                theme: response.theme || theme
            };
        } catch (parseError) {
            console.warn('🤖 JSON parsing failed, using fallback parsing:', parseError.message);
            
            // Fallback if JSON parsing fails
            const text = responseContent.replace(/[{}"\[\]]/g, '').trim();
            if (text.length === 0) {
                throw new Error('Leere Antwort von OpenAI erhalten');
            }
            
            return {
                text: text,
                author: 'KI-Assistent',
                theme: theme
            };
        }
    } catch (error) {
        console.error(`🤖 OpenAI API error (attempt ${retryCount + 1}):`, error);
        
        // Check if we should retry
        const shouldRetry = retryCount < maxRetries && (
            error.name === 'AbortError' ||
            error.code === 'rate_limit_exceeded' ||
            error.message.includes('timeout') ||
            error.message.includes('network') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('ETIMEDOUT')
        );
        
        if (shouldRetry) {
            console.log(`🔄 Retrying OpenAI request in ${(retryCount + 1) * 1000}ms...`);
            
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
            
            return generateAIQuote(theme, mood, length, retryCount + 1);
        }
        
        // Provide more specific error messages
        if (error.code === 'insufficient_quota') {
            throw new Error('OpenAI API-Kontingent erschöpft');
        } else if (error.code === 'invalid_api_key') {
            throw new Error('Ungültiger OpenAI API-Schlüssel');
        } else if (error.code === 'rate_limit_exceeded') {
            throw new Error('OpenAI Rate-Limit erreicht - bitte später versuchen');
        } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
            throw new Error('OpenAI API-Timeout - bitte später versuchen');
        } else {
            throw new Error(`OpenAI API-Fehler: ${error.message}`);
        }
    }
}

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
    
    const errorId = errorHandler.logError('high', 'express', 'Unhandled Express error', err, {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query
    });
    
    res.status(500).json({ 
        error: "Etwas ist schief gelaufen!",
        message: err.message,
        errorId: errorId,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    errorHandler.logError('low', 'express', '404 - Endpoint not found', null, {
        method: req.method,
        url: req.url,
        headers: req.headers
    });
    
    res.status(404).json({ 
        error: "Endpunkt nicht gefunden",
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    const summary = configManager.getSummary();
    
    console.log(`🚀 ARK Digitaler Kalender API läuft auf http://localhost:${PORT}`);
    console.log(`📚 API Dokumentation: http://localhost:${PORT}/`);
    console.log(`❤️  Gesundheitscheck: http://localhost:${PORT}/health`);
    console.log(`⚙️  Konfiguration: http://localhost:${PORT}/api/config`);
    console.log(`📅 Heutiger Spruch: http://localhost:${PORT}/api/quotes/today`);
    console.log(`🤖 KI-Status: ${AI_ENABLED ? '✅ Aktiviert' : '❌ Deaktiviert'}`);
    if (AI_ENABLED) {
        console.log(`🎯 OpenAI Modell: ${config.openai.model}`);
    }
    console.log(`🌐 Vollständige App: http://localhost:${PORT}/app`);
    
    // Display configuration status
    if (summary.status === 'valid') {
        console.log('✅ Konfiguration: Alle Einstellungen sind gültig');
    } else {
        console.log('⚠️ Konfiguration: Es gibt Validierungsfehler');
        if (summary.errors.critical > 0) {
            console.log(`   ❌ Kritische Fehler: ${summary.errors.critical}`);
        }
        if (summary.errors.warnings > 0) {
            console.log(`   ⚠️  Warnungen: ${summary.errors.warnings}`);
        }
    }
});

module.exports = app;