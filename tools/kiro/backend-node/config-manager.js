/**
 * Configuration Manager
 * Centralized configuration loading, validation, and management
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = {};
        this.validationErrors = [];
        this.isLoaded = false;
    }

    /**
     * Load configuration from environment variables and .env files
     */
    loadConfiguration() {
        try {
            // Load .env files in order of precedence
            this.loadEnvFiles();
            
            // Parse and validate configuration
            this.parseConfiguration();
            this.validateConfiguration();
            
            this.isLoaded = true;
            return {
                success: true,
                config: this.config,
                errors: this.validationErrors
            };
        } catch (error) {
            this.validationErrors.push({
                type: 'critical',
                message: `Configuration loading failed: ${error.message}`,
                code: 'LOAD_FAILED'
            });
            
            return {
                success: false,
                config: this.config,
                errors: this.validationErrors
            };
        }
    }

    /**
     * Load .env files with proper precedence
     */
    loadEnvFiles() {
        const envFiles = [
            path.join(__dirname, '../.env.example'),  // Default values
            path.join(__dirname, '../.env'),          // Local overrides
            path.join(__dirname, '.env')              // Backend-specific
        ];

        envFiles.forEach(envFile => {
            if (fs.existsSync(envFile)) {
                try {
                    require('dotenv').config({ path: envFile });
                    console.log(`✅ Loaded environment file: ${path.basename(envFile)}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to load ${envFile}: ${error.message}`);
                }
            }
        });
    }

    /**
     * Parse configuration from environment variables
     */
    parseConfiguration() {
        this.config = {
            // Server Configuration
            server: {
                port: this.parseInteger('PORT', 8000),
                nodeEnv: process.env.NODE_ENV || 'development',
                corsOrigins: this.parseArray('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:8080']),
                requestTimeout: this.parseInteger('REQUEST_TIMEOUT', 30000), // 30 seconds
                maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
                rateLimitWindow: this.parseInteger('RATE_LIMIT_WINDOW', 900000), // 15 minutes
                rateLimitMax: this.parseInteger('RATE_LIMIT_MAX', 100) // requests per window
            },

            // OpenAI Configuration
            openai: {
                apiKey: this.sanitizeApiKey(process.env.OPENAI_API_KEY),
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                enabled: this.parseBoolean('ENABLE_AI_GENERATION', false),
                timeout: this.parseInteger('OPENAI_TIMEOUT', 30000),
                maxRetries: this.parseInteger('OPENAI_MAX_RETRIES', 2)
            },

            // Quote Configuration
            quotes: {
                defaultLength: process.env.DEFAULT_QUOTE_LENGTH || 'medium',
                defaultTheme: process.env.DEFAULT_THEME || 'Motivation',
                perDay: this.parseInteger('QUOTES_PER_DAY', 1),
                cacheSize: this.parseInteger('QUOTE_CACHE_SIZE', 100)
            },

            // Notification Configuration
            notifications: {
                enabled: this.parseBoolean('ENABLE_NOTIFICATIONS', true),
                defaultTime: process.env.DEFAULT_NOTIFICATION_TIME || '09:00',
                vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
                vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || ''
            },

            // Feature Flags
            features: {
                userAccounts: this.parseBoolean('ENABLE_USER_ACCOUNTS', false),
                socialFeatures: this.parseBoolean('ENABLE_SOCIAL_FEATURES', false),
                analytics: this.parseBoolean('ENABLE_ANALYTICS', false),
                debugging: this.parseBoolean('ENABLE_DEBUG_MODE', false)
            },

            // Database Configuration (for future use)
            database: {
                url: process.env.DATABASE_URL || 'sqlite:./data/ark.db',
                maxConnections: this.parseInteger('DB_MAX_CONNECTIONS', 10),
                timeout: this.parseInteger('DB_TIMEOUT', 5000)
            },

            // Security Configuration
            security: {
                sessionSecret: process.env.SESSION_SECRET || '',
                jwtSecret: process.env.JWT_SECRET || '',
                rateLimitWindow: this.parseInteger('RATE_LIMIT_WINDOW', 15),
                rateLimitMaxRequests: this.parseInteger('RATE_LIMIT_MAX_REQUESTS', 100)
            },

            // Logging Configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE || './logs/ark.log',
                enableConsole: this.parseBoolean('LOG_CONSOLE', true),
                enableFile: this.parseBoolean('LOG_FILE_ENABLED', false)
            },

            // Cache Configuration
            cache: {
                ttl: this.parseInteger('CACHE_TTL', 3600),
                enabled: this.parseBoolean('ENABLE_CACHE', true),
                maxSize: this.parseInteger('CACHE_MAX_SIZE', 1000),
                cleanupInterval: this.parseInteger('CACHE_CLEANUP_INTERVAL', 300000)
            }
        };
    }

    /**
     * Validate configuration values
     */
    validateConfiguration() {
        this.validationErrors = [];

        // Validate server configuration
        this.validateServer();
        
        // Validate OpenAI configuration
        this.validateOpenAI();
        
        // Validate quotes configuration
        this.validateQuotes();
        
        // Validate notifications configuration
        this.validateNotifications();
        
        // Validate security configuration
        this.validateSecurity();

        // Check for critical errors
        const criticalErrors = this.validationErrors.filter(e => e.type === 'critical');
        if (criticalErrors.length > 0) {
            throw new Error(`Critical configuration errors: ${criticalErrors.map(e => e.message).join(', ')}`);
        }
    }

    /**
     * Validate server configuration
     */
    validateServer() {
        const { server } = this.config;

        // Validate port - port 0 is invalid
        if (server.port <= 0 || server.port > 65535) {
            this.addError('critical', `PORT must be between 1 and 65535 (got ${server.port})`, 'INVALID_PORT');
        }

        // Validate NODE_ENV
        const validEnvs = ['development', 'production', 'test'];
        if (!validEnvs.includes(server.nodeEnv)) {
            this.addError('warning', `NODE_ENV should be one of: ${validEnvs.join(', ')} (got '${server.nodeEnv}')`, 'INVALID_NODE_ENV');
        }

        // Validate CORS origins
        if (!Array.isArray(server.corsOrigins) || server.corsOrigins.length === 0) {
            this.addError('warning', 'CORS_ORIGINS should contain at least one origin', 'INVALID_CORS');
        }
    }

    /**
     * Validate OpenAI configuration
     */
    validateOpenAI() {
        const { openai } = this.config;

        if (openai.enabled) {
            // API key is required when AI is enabled
            if (!openai.apiKey) {
                this.addError('critical', 'OPENAI_API_KEY is required when ENABLE_AI_GENERATION is true', 'MISSING_API_KEY');
            } else {
                // Validate API key format
                if (!openai.apiKey.startsWith('sk-')) {
                    this.addError('critical', 'OPENAI_API_KEY must start with "sk-"', 'INVALID_API_KEY_FORMAT');
                } else if (openai.apiKey.length < 20) {
                    this.addError('critical', 'OPENAI_API_KEY appears to be too short', 'INVALID_API_KEY_LENGTH');
                } else if (openai.apiKey === 'sk-' || /^sk-\s*$/.test(openai.apiKey)) {
                    this.addError('critical', 'OPENAI_API_KEY appears to be incomplete', 'INCOMPLETE_API_KEY');
                }
                
                // Check for common placeholder patterns
                const suspiciousPatterns = [
                    'your_openai_api_key',
                    'placeholder',
                    'example',
                    'test_key',
                    'dummy'
                ];
                
                const lowerKey = openai.apiKey.toLowerCase();
                for (const pattern of suspiciousPatterns) {
                    if (lowerKey.includes(pattern)) {
                        this.addError('critical', `OPENAI_API_KEY appears to contain placeholder text: ${pattern}`, 'PLACEHOLDER_API_KEY');
                        break;
                    }
                }
            }

            // Validate model
            const validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
            if (!validModels.includes(openai.model)) {
                this.addError('warning', `OPENAI_MODEL should be one of: ${validModels.join(', ')} (got '${openai.model}')`, 'INVALID_MODEL');
            }

            // Validate timeout and retries
            if (openai.timeout < 5000) {
                this.addError('warning', 'OPENAI_TIMEOUT should be at least 5000ms for reliable API calls', 'LOW_TIMEOUT');
            }

            if (openai.maxRetries < 0 || openai.maxRetries > 5) {
                this.addError('warning', 'OPENAI_MAX_RETRIES should be between 0 and 5', 'INVALID_RETRIES');
            }
        } else {
            // When AI is disabled, warn if API key is still present
            if (openai.apiKey) {
                this.addError('info', 'OPENAI_API_KEY is set but ENABLE_AI_GENERATION is false', 'UNUSED_API_KEY');
            }
        }
    }

    /**
     * Validate quotes configuration
     */
    validateQuotes() {
        const { quotes } = this.config;

        // Validate quote length
        const validLengths = ['kurz', 'medium', 'lang'];
        if (!validLengths.includes(quotes.defaultLength)) {
            this.addError('warning', `DEFAULT_QUOTE_LENGTH should be one of: ${validLengths.join(', ')}`, 'INVALID_QUOTE_LENGTH');
        }

        // Validate quotes per day
        if (quotes.perDay < 1 || quotes.perDay > 10) {
            this.addError('warning', 'QUOTES_PER_DAY should be between 1 and 10', 'INVALID_QUOTES_PER_DAY');
        }

        // Validate cache size
        if (quotes.cacheSize < 10 || quotes.cacheSize > 1000) {
            this.addError('warning', 'QUOTE_CACHE_SIZE should be between 10 and 1000', 'INVALID_CACHE_SIZE');
        }
    }

    /**
     * Validate notifications configuration
     */
    validateNotifications() {
        const { notifications } = this.config;

        // Validate notification time format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(notifications.defaultTime)) {
            this.addError('warning', 'DEFAULT_NOTIFICATION_TIME should be in HH:MM format', 'INVALID_TIME_FORMAT');
        }

        // Validate VAPID keys if notifications are enabled
        if (notifications.enabled) {
            if (!notifications.vapidPublicKey) {
                this.addError('info', 'VAPID_PUBLIC_KEY not set - push notifications will use mock key', 'MISSING_VAPID_PUBLIC');
            }
            if (!notifications.vapidPrivateKey) {
                this.addError('info', 'VAPID_PRIVATE_KEY not set - push notifications will use mock key', 'MISSING_VAPID_PRIVATE');
            }
        }
    }

    /**
     * Validate security configuration
     */
    validateSecurity() {
        const { security, server } = this.config;

        // Validate secrets in production
        if (server.nodeEnv === 'production') {
            if (!security.sessionSecret || security.sessionSecret.length < 32) {
                this.addError('critical', 'SESSION_SECRET must be at least 32 characters in production', 'WEAK_SESSION_SECRET');
            }

            if (!security.jwtSecret || security.jwtSecret.length < 32) {
                this.addError('critical', 'JWT_SECRET must be at least 32 characters in production', 'WEAK_JWT_SECRET');
            }
        }

        // Validate rate limiting
        if (security.rateLimitWindow < 1 || security.rateLimitWindow > 60) {
            this.addError('warning', 'RATE_LIMIT_WINDOW should be between 1 and 60 minutes', 'INVALID_RATE_LIMIT_WINDOW');
        }

        if (security.rateLimitMaxRequests < 10 || security.rateLimitMaxRequests > 1000) {
            this.addError('warning', 'RATE_LIMIT_MAX_REQUESTS should be between 10 and 1000', 'INVALID_RATE_LIMIT_MAX');
        }
    }

    /**
     * Add validation error
     */
    addError(type, message, code) {
        this.validationErrors.push({
            type,
            message,
            code,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Sanitize and validate API key
     */
    sanitizeApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return '';
        }
        
        // Trim whitespace
        const trimmed = apiKey.trim();
        
        // Basic validation - should not be empty after trimming
        if (trimmed.length === 0) {
            return '';
        }
        
        // Check for suspicious patterns (placeholder text, etc.)
        if (trimmed.toLowerCase().includes('your_api_key') ||
            trimmed.toLowerCase().includes('placeholder') ||
            trimmed === 'sk-' ||
            trimmed.length < 10) {
            return '';
        }
        
        return trimmed;
    }

    /**
     * Parse integer with default value
     */
    parseInteger(envVar, defaultValue) {
        const value = process.env[envVar];
        if (!value || value.trim() === '') return defaultValue;
        
        const parsed = parseInt(value.trim(), 10);
        // Ensure parsed value is valid and greater than 0 for ports
        if (isNaN(parsed)) return defaultValue;
        
        // Special handling for PORT - must be > 0
        if (envVar === 'PORT' && parsed <= 0) {
            return defaultValue;
        }
        
        return parsed;
    }

    /**
     * Parse boolean with default value
     */
    parseBoolean(envVar, defaultValue) {
        const value = process.env[envVar];
        if (!value || value.trim() === '') return defaultValue;
        
        const trimmed = value.trim().toLowerCase();
        return trimmed === 'true' || trimmed === '1' || trimmed === 'yes';
    }

    /**
     * Parse array from comma-separated string
     */
    parseArray(envVar, defaultValue) {
        const value = process.env[envVar];
        if (!value || value.trim() === '') return defaultValue;
        
        return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }

    /**
     * Get configuration value by path
     */
    get(path, defaultValue = null) {
        if (!this.isLoaded) {
            throw new Error('Configuration not loaded. Call loadConfiguration() first.');
        }

        const keys = path.split('.');
        let current = this.config;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    }

    /**
     * Check if configuration is valid (no critical errors)
     */
    isValid() {
        return this.validationErrors.filter(e => e.type === 'critical').length === 0;
    }

    /**
     * Get configuration summary for logging
     */
    getSummary() {
        if (!this.isLoaded) {
            return { status: 'not_loaded' };
        }

        const criticalErrors = this.validationErrors.filter(e => e.type === 'critical').length;
        const warnings = this.validationErrors.filter(e => e.type === 'warning').length;
        const info = this.validationErrors.filter(e => e.type === 'info').length;

        return {
            status: criticalErrors > 0 ? 'invalid' : 'valid',
            server: {
                port: this.config.server.port,
                nodeEnv: this.config.server.nodeEnv
            },
            openai: {
                enabled: this.config.openai.enabled,
                hasApiKey: !!this.config.openai.apiKey,
                model: this.config.openai.model
            },
            features: this.config.features,
            errors: {
                critical: criticalErrors,
                warnings: warnings,
                info: info
            },
            validationErrors: this.validationErrors
        };
    }

    /**
     * Reload configuration (useful for configuration changes)
     */
    reload() {
        this.config = {};
        this.validationErrors = [];
        this.isLoaded = false;
        
        return this.loadConfiguration();
    }

    /**
     * Validate configuration change
     */
    validateConfigurationChange(newConfig) {
        const changes = [];
        const securityIssues = [];
        
        if (!this.isLoaded) {
            throw new Error('Cannot validate changes - configuration not loaded');
        }
        
        // Check for sensitive configuration changes
        if (newConfig.openai && newConfig.openai.apiKey !== this.config.openai.apiKey) {
            changes.push('OpenAI API key changed');
            
            // Validate new API key
            const sanitized = this.sanitizeApiKey(newConfig.openai.apiKey);
            if (!sanitized) {
                securityIssues.push('New OpenAI API key is invalid or empty');
            } else if (!sanitized.startsWith('sk-')) {
                securityIssues.push('New OpenAI API key does not have valid format');
            }
        }
        
        if (newConfig.server && newConfig.server.port !== this.config.server.port) {
            changes.push(`Server port changed from ${this.config.server.port} to ${newConfig.server.port}`);
            
            if (newConfig.server.port <= 0 || newConfig.server.port > 65535) {
                securityIssues.push('New server port is invalid');
            }
        }
        
        if (newConfig.server && newConfig.server.nodeEnv !== this.config.server.nodeEnv) {
            changes.push(`Environment changed from ${this.config.server.nodeEnv} to ${newConfig.server.nodeEnv}`);
            
            // Warn about production changes
            if (newConfig.server.nodeEnv === 'production' && this.config.server.nodeEnv !== 'production') {
                securityIssues.push('Switching to production environment - ensure all security settings are configured');
            }
        }
        
        return {
            changes,
            securityIssues,
            isValid: securityIssues.length === 0
        };
    }

    /**
     * Apply configuration changes securely
     */
    applyConfigurationChanges(changes) {
        if (!this.isLoaded) {
            throw new Error('Cannot apply changes - configuration not loaded');
        }
        
        const validation = this.validateConfigurationChange(changes);
        
        if (!validation.isValid) {
            throw new Error(`Configuration changes rejected: ${validation.securityIssues.join(', ')}`);
        }
        
        // Apply changes to environment variables
        if (changes.openai && changes.openai.apiKey) {
            process.env.OPENAI_API_KEY = changes.openai.apiKey;
        }
        
        if (changes.server && changes.server.port) {
            process.env.PORT = changes.server.port.toString();
        }
        
        if (changes.server && changes.server.nodeEnv) {
            process.env.NODE_ENV = changes.server.nodeEnv;
        }
        
        // Reload configuration
        const result = this.reload();
        
        return {
            success: result.success,
            changes: validation.changes,
            newConfig: this.config,
            errors: result.errors
        };
    }
}

// Export singleton instance
const configManager = new ConfigManager();

module.exports = {
    ConfigManager,
    configManager
};