/**
 * Property-Based Tests for Configuration Manager
 * Feature: kiro-application-fixes, Property 11: Configuration Validation and Application
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

const fc = require('fast-check');
const { ConfigManager } = require('./config-manager');

describe('Configuration Manager Property Tests', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    /**
     * Property 11: Configuration Validation and Application
     * For any configuration setting, the system should validate, apply, and report 
     * missing or invalid configuration appropriately
     * Validates: Requirements 10.1, 10.2, 10.3, 10.4
     */
    test('Property 11: Configuration Validation and Application', () => {
        return fc.assert(
            fc.asyncProperty(
                fc.record({
                    // Server configuration
                    port: fc.oneof(
                        fc.integer({ min: 1, max: 65535 }), // Valid ports
                        fc.integer({ min: -1000, max: 0 }), // Invalid ports (negative)
                        fc.integer({ min: 65536, max: 100000 }), // Invalid ports (too high)
                        fc.constant(undefined) // Missing port
                    ),
                    nodeEnv: fc.oneof(
                        fc.constantFrom('development', 'production', 'test'), // Valid environments
                        fc.string({ minLength: 1, maxLength: 20 }), // Invalid environments
                        fc.constant(undefined) // Missing environment
                    ),
                    
                    // OpenAI configuration
                    openaiApiKey: fc.oneof(
                        fc.string({ minLength: 20, maxLength: 100 }).map(s => `sk-${s}`), // Valid format
                        fc.string({ minLength: 10, maxLength: 50 }), // Invalid format
                        fc.constant(''), // Empty key
                        fc.constant(undefined) // Missing key
                    ),
                    enableAiGeneration: fc.oneof(
                        fc.boolean(), // Valid boolean
                        fc.constantFrom('true', 'false', 'yes', 'no', '1', '0'), // String representations
                        fc.string({ minLength: 1, maxLength: 10 }), // Invalid strings
                        fc.constant(undefined) // Missing value
                    ),
                    openaiModel: fc.oneof(
                        fc.constantFrom('gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'), // Valid models
                        fc.string({ minLength: 1, maxLength: 30 }), // Invalid models
                        fc.constant(undefined) // Missing model
                    ),
                    
                    // Quote configuration
                    defaultQuoteLength: fc.oneof(
                        fc.constantFrom('kurz', 'medium', 'lang'), // Valid lengths
                        fc.string({ minLength: 1, maxLength: 20 }), // Invalid lengths
                        fc.constant(undefined) // Missing length
                    ),
                    quotesPerDay: fc.oneof(
                        fc.integer({ min: 1, max: 10 }), // Valid range
                        fc.integer({ min: -5, max: 0 }), // Invalid (negative/zero)
                        fc.integer({ min: 11, max: 100 }), // Invalid (too high)
                        fc.constant(undefined) // Missing value
                    ),
                    
                    // Notification configuration
                    enableNotifications: fc.oneof(
                        fc.boolean(), // Valid boolean
                        fc.constantFrom('true', 'false'), // String representations
                        fc.string({ minLength: 1, maxLength: 10 }), // Invalid strings
                        fc.constant(undefined) // Missing value
                    ),
                    defaultNotificationTime: fc.oneof(
                        fc.constantFrom('09:00', '12:30', '18:45', '23:59'), // Valid times
                        fc.constantFrom('25:00', '12:60', '9:5', 'invalid'), // Invalid times
                        fc.constant(undefined) // Missing time
                    ),
                    
                    // Security configuration (production-specific)
                    sessionSecret: fc.oneof(
                        fc.string({ minLength: 32, maxLength: 128 }), // Valid secrets
                        fc.string({ minLength: 1, maxLength: 31 }), // Too short
                        fc.constant(''), // Empty
                        fc.constant(undefined) // Missing
                    ),
                    jwtSecret: fc.oneof(
                        fc.string({ minLength: 32, maxLength: 128 }), // Valid secrets
                        fc.string({ minLength: 1, maxLength: 31 }), // Too short
                        fc.constant(''), // Empty
                        fc.constant(undefined) // Missing
                    )
                }),
                async (configData) => {
                    // Setup environment variables based on test data
                    if (configData.port !== undefined) {
                        process.env.PORT = configData.port.toString();
                    } else {
                        delete process.env.PORT;
                    }
                    
                    if (configData.nodeEnv !== undefined) {
                        process.env.NODE_ENV = configData.nodeEnv;
                    } else {
                        delete process.env.NODE_ENV;
                    }
                    
                    if (configData.openaiApiKey !== undefined) {
                        process.env.OPENAI_API_KEY = configData.openaiApiKey;
                    } else {
                        delete process.env.OPENAI_API_KEY;
                    }
                    
                    if (configData.enableAiGeneration !== undefined) {
                        process.env.ENABLE_AI_GENERATION = configData.enableAiGeneration.toString();
                    } else {
                        delete process.env.ENABLE_AI_GENERATION;
                    }
                    
                    if (configData.openaiModel !== undefined) {
                        process.env.OPENAI_MODEL = configData.openaiModel;
                    } else {
                        delete process.env.OPENAI_MODEL;
                    }
                    
                    if (configData.defaultQuoteLength !== undefined) {
                        process.env.DEFAULT_QUOTE_LENGTH = configData.defaultQuoteLength;
                    } else {
                        delete process.env.DEFAULT_QUOTE_LENGTH;
                    }
                    
                    if (configData.quotesPerDay !== undefined) {
                        process.env.QUOTES_PER_DAY = configData.quotesPerDay.toString();
                    } else {
                        delete process.env.QUOTES_PER_DAY;
                    }
                    
                    if (configData.enableNotifications !== undefined) {
                        process.env.ENABLE_NOTIFICATIONS = configData.enableNotifications.toString();
                    } else {
                        delete process.env.ENABLE_NOTIFICATIONS;
                    }
                    
                    if (configData.defaultNotificationTime !== undefined) {
                        process.env.DEFAULT_NOTIFICATION_TIME = configData.defaultNotificationTime;
                    } else {
                        delete process.env.DEFAULT_NOTIFICATION_TIME;
                    }
                    
                    if (configData.sessionSecret !== undefined) {
                        process.env.SESSION_SECRET = configData.sessionSecret;
                    } else {
                        delete process.env.SESSION_SECRET;
                    }
                    
                    if (configData.jwtSecret !== undefined) {
                        process.env.JWT_SECRET = configData.jwtSecret;
                    } else {
                        delete process.env.JWT_SECRET;
                    }

                    // Create new ConfigManager instance for this test
                    const configManager = new ConfigManager();
                    
                    try {
                        // Attempt to load configuration
                        const result = configManager.loadConfiguration();
                        
                        // Property: Configuration loading should always return a result object
                        expect(result).toBeDefined();
                        expect(result).toHaveProperty('success');
                        expect(result).toHaveProperty('config');
                        expect(result).toHaveProperty('errors');
                        expect(Array.isArray(result.errors)).toBe(true);
                        
                        // Property: Configuration should be parsed regardless of validity
                        expect(result.config).toBeDefined();
                        expect(typeof result.config).toBe('object');
                        
                        // Property: Configuration should have all expected sections
                        expect(result.config).toHaveProperty('server');
                        expect(result.config).toHaveProperty('openai');
                        expect(result.config).toHaveProperty('quotes');
                        expect(result.config).toHaveProperty('notifications');
                        expect(result.config).toHaveProperty('security');
                        
                        // Property: Server port should be within valid range or use default
                        const serverPort = result.config.server.port;
                        expect(typeof serverPort).toBe('number');
                        expect(serverPort).toBeGreaterThan(0);
                        expect(serverPort).toBeLessThanOrEqual(65535);
                        
                        // Property: Boolean values should be properly parsed
                        expect(typeof result.config.openai.enabled).toBe('boolean');
                        expect(typeof result.config.notifications.enabled).toBe('boolean');
                        
                        // Property: Default values should be applied when configuration is missing
                        if (configData.nodeEnv === undefined) {
                            expect(result.config.server.nodeEnv).toBe('development');
                        }
                        
                        if (configData.openaiModel === undefined) {
                            expect(result.config.openai.model).toBe('gpt-3.5-turbo');
                        }
                        
                        if (configData.defaultQuoteLength === undefined) {
                            expect(result.config.quotes.defaultLength).toBe('medium');
                        }
                        
                        // Property: Validation errors should be categorized correctly
                        result.errors.forEach(error => {
                            expect(error).toHaveProperty('type');
                            expect(error).toHaveProperty('message');
                            expect(error).toHaveProperty('code');
                            expect(['critical', 'warning', 'info']).toContain(error.type);
                            expect(typeof error.message).toBe('string');
                            expect(error.message.length).toBeGreaterThan(0);
                        });
                        
                        // Property: Critical errors should prevent successful loading
                        const criticalErrors = result.errors.filter(e => e.type === 'critical');
                        if (criticalErrors.length > 0) {
                            expect(result.success).toBe(false);
                        }
                        
                        // Property: Invalid port should generate critical error
                        if (configData.port !== undefined && 
                            (configData.port < 1 || configData.port > 65535)) {
                            const portErrors = result.errors.filter(e => e.code === 'INVALID_PORT');
                            expect(portErrors.length).toBeGreaterThan(0);
                            expect(portErrors[0].type).toBe('critical');
                        }
                        
                        // Property: AI enabled without API key should generate critical error
                        const aiEnabled = configData.enableAiGeneration === true || 
                                         configData.enableAiGeneration === 'true';
                        const hasValidApiKey = configData.openaiApiKey && 
                                             typeof configData.openaiApiKey === 'string' &&
                                             configData.openaiApiKey.startsWith('sk-');
                        
                        if (aiEnabled && !hasValidApiKey) {
                            const apiKeyErrors = result.errors.filter(e => e.code === 'MISSING_API_KEY');
                            expect(apiKeyErrors.length).toBeGreaterThan(0);
                            expect(apiKeyErrors[0].type).toBe('critical');
                        }
                        
                        // Property: Production environment should require strong secrets
                        if (configData.nodeEnv === 'production') {
                            if (!configData.sessionSecret || configData.sessionSecret.length < 32) {
                                const secretErrors = result.errors.filter(e => e.code === 'WEAK_SESSION_SECRET');
                                expect(secretErrors.length).toBeGreaterThan(0);
                                expect(secretErrors[0].type).toBe('critical');
                            }
                            
                            if (!configData.jwtSecret || configData.jwtSecret.length < 32) {
                                const jwtErrors = result.errors.filter(e => e.code === 'WEAK_JWT_SECRET');
                                expect(jwtErrors.length).toBeGreaterThan(0);
                                expect(jwtErrors[0].type).toBe('critical');
                            }
                        }
                        
                        // Property: Configuration manager should provide access methods
                        if (result.success) {
                            expect(configManager.isValid()).toBe(true);
                            expect(configManager.get('server.port')).toBe(serverPort);
                            expect(configManager.get('nonexistent.path', 'default')).toBe('default');
                        }
                        
                        // Property: Summary should reflect configuration state
                        const summary = configManager.getSummary();
                        expect(summary).toHaveProperty('status');
                        expect(summary).toHaveProperty('errors');
                        expect(['valid', 'invalid', 'not_loaded']).toContain(summary.status);
                        
                        if (result.success && criticalErrors.length === 0) {
                            expect(summary.status).toBe('valid');
                        } else if (criticalErrors.length > 0) {
                            expect(summary.status).toBe('invalid');
                        }
                        
                    } catch (error) {
                        // Property: Configuration loading should handle errors gracefully
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toBeDefined();
                        expect(typeof error.message).toBe('string');
                        
                        // Property: Critical configuration errors should be thrown
                        expect(error.message).toContain('Critical configuration errors');
                    }
                }
            ),
            { 
                numRuns: 100,
                timeout: 10000,
                verbose: true
            }
        );
    });

    /**
     * Additional property test for configuration reload functionality
     */
    test('Property: Configuration reload should maintain consistency', () => {
        return fc.assert(
            fc.asyncProperty(
                fc.record({
                    initialPort: fc.integer({ min: 3000, max: 9000 }),
                    updatedPort: fc.integer({ min: 3000, max: 9000 }),
                    initialApiKey: fc.string({ minLength: 20, maxLength: 50 }).map(s => `sk-${s}`),
                    updatedApiKey: fc.string({ minLength: 20, maxLength: 50 }).map(s => `sk-${s}`)
                }),
                async (testData) => {
                    const configManager = new ConfigManager();
                    
                    // Set initial configuration
                    process.env.PORT = testData.initialPort.toString();
                    process.env.OPENAI_API_KEY = testData.initialApiKey;
                    process.env.NODE_ENV = 'development';
                    
                    // Load initial configuration
                    const initialResult = configManager.loadConfiguration();
                    expect(initialResult.success).toBe(true);
                    
                    const initialPort = configManager.get('server.port');
                    const initialApiKey = configManager.get('openai.apiKey');
                    
                    // Update environment
                    process.env.PORT = testData.updatedPort.toString();
                    process.env.OPENAI_API_KEY = testData.updatedApiKey;
                    
                    // Reload configuration
                    const reloadResult = configManager.reload();
                    expect(reloadResult.success).toBe(true);
                    
                    const updatedPort = configManager.get('server.port');
                    const updatedApiKey = configManager.get('openai.apiKey');
                    
                    // Property: Reload should pick up new values
                    expect(updatedPort).toBe(testData.updatedPort);
                    expect(updatedApiKey).toBe(testData.updatedApiKey);
                    
                    // Property: Values should be different if inputs were different
                    if (testData.initialPort !== testData.updatedPort) {
                        expect(initialPort).not.toBe(updatedPort);
                    }
                    
                    if (testData.initialApiKey !== testData.updatedApiKey) {
                        expect(initialApiKey).not.toBe(updatedApiKey);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property test for configuration parsing edge cases
     */
    test('Property: Configuration parsing should handle edge cases gracefully', () => {
        return fc.assert(
            fc.asyncProperty(
                fc.record({
                    portValue: fc.oneof(
                        fc.string({ minLength: 1, maxLength: 10 }), // Non-numeric strings
                        fc.constant(''), // Empty string
                        fc.constant('abc123'), // Mixed alphanumeric
                        fc.constant('3000.5') // Decimal number
                    ),
                    booleanValue: fc.oneof(
                        fc.constantFrom('TRUE', 'FALSE', 'Yes', 'No', '1', '0'), // Various boolean representations
                        fc.string({ minLength: 1, maxLength: 10 }), // Random strings
                        fc.constant('') // Empty string
                    )
                }),
                async (testData) => {
                    const configManager = new ConfigManager();
                    
                    // Set edge case values
                    process.env.PORT = testData.portValue;
                    process.env.ENABLE_AI_GENERATION = testData.booleanValue;
                    process.env.NODE_ENV = 'development';
                    
                    const result = configManager.loadConfiguration();
                    
                    // Property: Configuration should always load (may have errors)
                    expect(result).toBeDefined();
                    expect(result.config).toBeDefined();
                    
                    // Property: Port should be a valid number (default if invalid)
                    const port = result.config.server.port;
                    expect(typeof port).toBe('number');
                    expect(port).toBeGreaterThan(0);
                    expect(port).toBeLessThanOrEqual(65535);
                    
                    // Property: Boolean should be parsed to actual boolean
                    const aiEnabled = result.config.openai.enabled;
                    expect(typeof aiEnabled).toBe('boolean');
                    
                    // Property: Invalid values should generate appropriate errors
                    if (isNaN(parseInt(testData.portValue)) || testData.portValue === '') {
                        // Should use default port
                        expect(port).toBe(8000);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });
});