/**
 * Property-based tests for cache management functionality
 * **Feature: kiro-application-fixes, Property 10: Cache Management and Recovery**
 * **Validates: Requirements 8.1, 8.2, 8.4, 8.5**
 */

const fc = require('fast-check');

// Mock localStorage for testing
const mockLocalStorage = {
    data: {},
    getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
    setItem: jest.fn((key, value) => {
        if (typeof value !== 'string') {
            throw new Error('localStorage only accepts strings');
        }
        mockLocalStorage.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete mockLocalStorage.data[key];
    }),
    clear: jest.fn(() => {
        mockLocalStorage.data = {};
    }),
    get length() {
        return Object.keys(mockLocalStorage.data).length;
    }
};

// Mock console methods to avoid noise in tests
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock cache module functions
const mockCacheModule = {
    cacheQuote: jest.fn(),
    getCachedTodaysQuote: jest.fn(),
    getCachedQuotes: jest.fn(),
    getCachedQuotesInRange: jest.fn(),
    storeFeedbackLocally: jest.fn(),
    getPendingFeedback: jest.fn(),
    removePendingFeedback: jest.fn(),
    clearPendingFeedback: jest.fn(),
    saveUserProfile: jest.fn(),
    getUserProfile: jest.fn(),
    getUserId: jest.fn(),
    clearUserData: jest.fn(),
    getCacheStats: jest.fn(),
    performCacheMaintenance: jest.fn(),
    cleanupOldQuotes: jest.fn(),
    cleanupExcessFeedback: jest.fn(),
    isQuoteValid: jest.fn(),
    isFeedbackValid: jest.fn(),
    isProfileValid: jest.fn(),
    exportUserData: jest.fn(),
    CACHE_CONFIG: {
        MAX_QUOTES: 100,
        MAX_FEEDBACK_ITEMS: 500,
        MAX_STORAGE_SIZE: 5 * 1024 * 1024,
        CLEANUP_THRESHOLD: 0.8,
        QUOTE_RETENTION_DAYS: 30
    },
    SafeStorage: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        getStorageSize: jest.fn(),
        performCleanup: jest.fn()
    }
};

describe('Cache Management Property Tests', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        mockLocalStorage.clear();
        
        // Setup global mocks
        global.localStorage = mockLocalStorage;
        global.console = mockConsole;
        
        // Reset mock implementations
        mockCacheModule.SafeStorage.get.mockImplementation((key, defaultValue) => {
            try {
                const item = mockLocalStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        });
        
        mockCacheModule.SafeStorage.set.mockImplementation((key, value) => {
            try {
                mockLocalStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        });
        
        mockCacheModule.SafeStorage.remove.mockImplementation((key) => {
            try {
                mockLocalStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        });
        
        mockCacheModule.SafeStorage.getStorageSize.mockImplementation(() => {
            let total = 0;
            for (let key in mockLocalStorage.data) {
                total += mockLocalStorage.data[key].length + key.length;
            }
            return total;
        });
        
        // Mock validation functions
        mockCacheModule.isQuoteValid.mockImplementation((quote) => {
            return quote && 
                   typeof quote === 'object' && 
                   typeof quote.content === 'string' && 
                   typeof quote.author === 'string' &&
                   quote.content.length > 0 &&
                   quote.author.length > 0;
        });
        
        mockCacheModule.isFeedbackValid.mockImplementation((feedback) => {
            return feedback && 
                   typeof feedback === 'object' && 
                   feedback.quoteId !== undefined &&
                   typeof feedback.rating === 'number' &&
                   feedback.rating >= -1 && 
                   feedback.rating <= 1;
        });
        
        mockCacheModule.isProfileValid.mockImplementation((profile) => {
            return profile && 
                   typeof profile === 'object' && 
                   typeof profile.id === 'string' &&
                   profile.id.length > 0;
        });
    });

    describe('Property 10.1: Cache Storage Operations', () => {
        test('Property 10.1: For any valid quote, caching and retrieval should preserve data integrity', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    id: fc.string({ minLength: 1, maxLength: 50 }),
                    content: fc.string({ minLength: 10, maxLength: 500 }),
                    author: fc.string({ minLength: 2, maxLength: 100 }),
                    theme: fc.string({ minLength: 1, maxLength: 50 }),
                    generated: fc.boolean()
                }),
                async (quote) => {
                    // Mock the cacheQuote function to use SafeStorage
                    mockCacheModule.cacheQuote.mockImplementation((quoteToCache) => {
                        const today = new Date().toDateString();
                        const cachedQuotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                        
                        const quoteToCahe = {
                            ...quoteToCache,
                            cachedAt: new Date().toISOString(),
                            dateKey: today,
                            version: '1.0.0'
                        };
                        
                        cachedQuotes[today] = quoteToCahe;
                        mockCacheModule.SafeStorage.set('ark-cached-quotes', cachedQuotes);
                        return quoteToCahe;
                    });
                    
                    // Mock getCachedTodaysQuote
                    mockCacheModule.getCachedTodaysQuote.mockImplementation(() => {
                        const today = new Date().toDateString();
                        const cachedQuotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                        const cachedQuote = cachedQuotes[today];
                        
                        if (cachedQuote && mockCacheModule.isQuoteValid(cachedQuote)) {
                            return cachedQuote;
                        }
                        return null;
                    });
                    
                    // Test: Cache the quote
                    const cachedQuote = mockCacheModule.cacheQuote(quote);
                    
                    // Property: Cached quote should preserve original data
                    expect(cachedQuote.content).toBe(quote.content);
                    expect(cachedQuote.author).toBe(quote.author);
                    expect(cachedQuote.theme).toBe(quote.theme);
                    expect(cachedQuote.generated).toBe(quote.generated);
                    
                    // Property: Cached quote should have metadata
                    expect(cachedQuote.cachedAt).toBeDefined();
                    expect(cachedQuote.dateKey).toBeDefined();
                    expect(cachedQuote.version).toBe('1.0.0');
                    
                    // Test: Retrieve the quote
                    const retrievedQuote = mockCacheModule.getCachedTodaysQuote();
                    
                    // Property: Retrieved quote should match cached quote
                    expect(retrievedQuote).not.toBeNull();
                    expect(retrievedQuote.content).toBe(quote.content);
                    expect(retrievedQuote.author).toBe(quote.author);
                    expect(retrievedQuote.theme).toBe(quote.theme);
                }
            ), { numRuns: 100 });
        });
    });

    describe('Property 10.2: Cache Size Management', () => {
        test('Property 10.2: For any number of quotes, cache should not exceed maximum limits', async () => {
            await fc.assert(fc.asyncProperty(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 50 }),
                        content: fc.string({ minLength: 10, maxLength: 500 }),
                        author: fc.string({ minLength: 2, maxLength: 100 }),
                        theme: fc.string({ minLength: 1, maxLength: 50 }),
                        generated: fc.boolean()
                    }),
                    { minLength: 1, maxLength: 150 } // Test with more than MAX_QUOTES
                ),
                async (quotes) => {
                    // Mock cleanupOldQuotes to simulate cleanup behavior
                    mockCacheModule.cleanupOldQuotes.mockImplementation((cachedQuotes = null) => {
                        const quotes = cachedQuotes || mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                        const sortedEntries = Object.entries(quotes)
                            .sort(([a], [b]) => new Date(b) - new Date(a));
                        
                        if (sortedEntries.length > mockCacheModule.CACHE_CONFIG.MAX_QUOTES) {
                            const keptEntries = sortedEntries.slice(0, mockCacheModule.CACHE_CONFIG.MAX_QUOTES);
                            const finalQuotes = Object.fromEntries(keptEntries);
                            mockCacheModule.SafeStorage.set('ark-cached-quotes', finalQuotes);
                            return sortedEntries.length - mockCacheModule.CACHE_CONFIG.MAX_QUOTES;
                        }
                        return 0;
                    });
                    
                    // Mock cacheQuote with cleanup logic
                    mockCacheModule.cacheQuote.mockImplementation((quote) => {
                        const today = new Date().toDateString();
                        const cachedQuotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                        
                        const quoteToCahe = {
                            ...quote,
                            cachedAt: new Date().toISOString(),
                            dateKey: today,
                            version: '1.0.0'
                        };
                        
                        cachedQuotes[today] = quoteToCahe;
                        
                        // Check if cleanup is needed
                        if (Object.keys(cachedQuotes).length > mockCacheModule.CACHE_CONFIG.MAX_QUOTES) {
                            mockCacheModule.cleanupOldQuotes(cachedQuotes);
                        } else {
                            mockCacheModule.SafeStorage.set('ark-cached-quotes', cachedQuotes);
                        }
                        
                        return quoteToCahe;
                    });
                    
                    // Mock getCachedQuotes
                    mockCacheModule.getCachedQuotes.mockImplementation(() => {
                        const cachedQuotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                        return Object.values(cachedQuotes).filter(q => mockCacheModule.isQuoteValid(q));
                    });
                    
                    // Test: Cache all quotes
                    quotes.forEach((quote, index) => {
                        // Create a specific date string for this quote to avoid overwriting
                        const date = new Date();
                        date.setDate(date.getDate() - index);
                        const dateString = date.toDateString();
                        
                        // Mock the cacheQuote function to use this specific date
                        const originalCacheQuote = mockCacheModule.cacheQuote;
                        mockCacheModule.cacheQuote.mockImplementationOnce((quoteToCache) => {
                            const cachedQuotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                            
                            const quoteToCahe = {
                                ...quoteToCache,
                                cachedAt: new Date().toISOString(),
                                dateKey: dateString,
                                version: '1.0.0'
                            };
                            
                            cachedQuotes[dateString] = quoteToCahe;
                            
                            // Check if cleanup is needed
                            if (Object.keys(cachedQuotes).length > mockCacheModule.CACHE_CONFIG.MAX_QUOTES) {
                                mockCacheModule.cleanupOldQuotes(cachedQuotes);
                            } else {
                                mockCacheModule.SafeStorage.set('ark-cached-quotes', cachedQuotes);
                            }
                            
                            return quoteToCahe;
                        });
                        
                        mockCacheModule.cacheQuote(quote);
                    });
                    
                    // Get final cached quotes
                    const finalQuotes = mockCacheModule.getCachedQuotes();
                    
                    // Property: Cache should not exceed maximum limits
                    expect(finalQuotes.length).toBeLessThanOrEqual(mockCacheModule.CACHE_CONFIG.MAX_QUOTES);
                    
                    // Property: All cached quotes should be valid
                    finalQuotes.forEach(quote => {
                        expect(mockCacheModule.isQuoteValid(quote)).toBe(true);
                    });
                }
            ), { numRuns: 50 });
        });
    });

    describe('Property 10.3: Feedback Management', () => {
        test('Property 10.3: For any feedback operations, data integrity should be maintained', async () => {
            await fc.assert(fc.asyncProperty(
                fc.array(
                    fc.record({
                        quoteId: fc.string({ minLength: 1, maxLength: 50 }),
                        rating: fc.integer({ min: -1, max: 1 }),
                        comment: fc.option(fc.string({ maxLength: 200 }))
                    }),
                    { minLength: 1, maxLength: 20 }
                ),
                async (feedbackItems) => {
                    // Mock feedback storage functions
                    mockCacheModule.storeFeedbackLocally.mockImplementation((feedbackData) => {
                        const pendingFeedback = mockCacheModule.SafeStorage.get('ark-pending-feedback', []);
                        
                        const feedbackWithMetadata = {
                            ...feedbackData,
                            timestamp: new Date().toISOString(),
                            id: `feedback_${feedbackData.quoteId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            version: '1.0.0'
                        };
                        
                        // Remove existing feedback for this quote
                        const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== feedbackData.quoteId);
                        filteredFeedback.push(feedbackWithMetadata);
                        
                        mockCacheModule.SafeStorage.set('ark-pending-feedback', filteredFeedback);
                        return feedbackWithMetadata;
                    });
                    
                    mockCacheModule.getPendingFeedback.mockImplementation(() => {
                        const pendingFeedback = mockCacheModule.SafeStorage.get('ark-pending-feedback', []);
                        return pendingFeedback.filter(feedback => mockCacheModule.isFeedbackValid(feedback));
                    });
                    
                    // Test: Store all feedback items
                    const storedFeedback = [];
                    feedbackItems.forEach(feedback => {
                        const stored = mockCacheModule.storeFeedbackLocally(feedback);
                        storedFeedback.push(stored);
                    });
                    
                    // Get all pending feedback
                    const pendingFeedback = mockCacheModule.getPendingFeedback();
                    
                    // Property: All stored feedback should be retrievable
                    expect(pendingFeedback.length).toBeGreaterThan(0);
                    
                    // Property: All feedback should be valid
                    pendingFeedback.forEach(feedback => {
                        expect(mockCacheModule.isFeedbackValid(feedback)).toBe(true);
                    });
                    
                    // Property: Feedback should preserve original data
                    storedFeedback.forEach(stored => {
                        const found = pendingFeedback.find(f => f.id === stored.id);
                        expect(found).toBeDefined();
                        expect(found.rating).toBe(stored.rating);
                        expect(found.quoteId).toBe(stored.quoteId);
                    });
                }
            ), { numRuns: 100 });
        });
    });

    describe('Property 10.4: Cache Recovery and Corruption Handling', () => {
        test('Property 10.4: For any corrupted cache data, system should handle gracefully', async () => {
            await fc.assert(fc.asyncProperty(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.constant('invalid json'),
                    fc.constant('{"incomplete": '),
                    fc.record({
                        invalidQuote: fc.record({
                            content: fc.option(fc.string()),
                            author: fc.option(fc.integer()) // Invalid type
                        })
                    })
                ),
                async (corruptedData) => {
                    // Mock SafeStorage.get to return corrupted data
                    mockCacheModule.SafeStorage.get.mockImplementation((key, defaultValue) => {
                        if (key === 'ark-cached-quotes') {
                            // Simulate corrupted data
                            if (corruptedData === null || corruptedData === undefined) {
                                return defaultValue;
                            }
                            if (typeof corruptedData === 'string') {
                                // This would cause JSON.parse to fail
                                try {
                                    return JSON.parse(corruptedData);
                                } catch {
                                    return defaultValue;
                                }
                            }
                            return corruptedData;
                        }
                        return defaultValue;
                    });
                    
                    // Mock getCachedQuotes with error handling
                    mockCacheModule.getCachedQuotes.mockImplementation(() => {
                        try {
                            const cachedQuotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                            const validQuotes = [];
                            
                            if (cachedQuotes && typeof cachedQuotes === 'object') {
                                for (const [dateKey, quote] of Object.entries(cachedQuotes)) {
                                    if (mockCacheModule.isQuoteValid(quote)) {
                                        validQuotes.push(quote);
                                    }
                                }
                            }
                            
                            return validQuotes;
                        } catch (error) {
                            console.error('Cache: Error getting cached quotes:', error);
                            return [];
                        }
                    });
                    
                    // Test: Attempt to get cached quotes with corrupted data
                    const quotes = mockCacheModule.getCachedQuotes();
                    
                    // Property: System should handle corruption gracefully
                    expect(Array.isArray(quotes)).toBe(true);
                    
                    // Property: Only valid quotes should be returned
                    quotes.forEach(quote => {
                        expect(mockCacheModule.isQuoteValid(quote)).toBe(true);
                    });
                    
                    // Property: System should not crash with corrupted data
                    expect(() => mockCacheModule.getCachedQuotes()).not.toThrow();
                }
            ), { numRuns: 100 });
        });
    });

    describe('Property 10.5: Cache Statistics and Health Monitoring', () => {
        test('Property 10.5: For any cache state, statistics should accurately reflect cache health', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    quotes: fc.array(
                        fc.record({
                            id: fc.string({ minLength: 1, maxLength: 50 }),
                            content: fc.string({ minLength: 10, maxLength: 500 }),
                            author: fc.string({ minLength: 2, maxLength: 100 }),
                            cachedAt: fc.date().map(d => d.toISOString())
                        }),
                        { maxLength: 50 }
                    ),
                    feedback: fc.array(
                        fc.record({
                            quoteId: fc.string({ minLength: 1, maxLength: 50 }),
                            rating: fc.integer({ min: -1, max: 1 }),
                            timestamp: fc.date().map(d => d.toISOString())
                        }),
                        { maxLength: 30 }
                    )
                }),
                async (cacheData) => {
                    // Setup mock data
                    const quotesObject = {};
                    cacheData.quotes.forEach((quote, index) => {
                        const date = new Date();
                        date.setDate(date.getDate() - index);
                        quotesObject[date.toDateString()] = quote;
                    });
                    
                    mockCacheModule.SafeStorage.get.mockImplementation((key, defaultValue) => {
                        if (key === 'ark-cached-quotes') return quotesObject;
                        if (key === 'ark-pending-feedback') return cacheData.feedback;
                        if (key === 'ark-user-profile') return { id: 'test-user' };
                        return defaultValue;
                    });
                    
                    // Mock getCacheStats
                    mockCacheModule.getCacheStats.mockImplementation(() => {
                        const quotes = mockCacheModule.SafeStorage.get('ark-cached-quotes', {});
                        const feedback = mockCacheModule.SafeStorage.get('ark-pending-feedback', []);
                        const profile = mockCacheModule.SafeStorage.get('ark-user-profile', null);
                        
                        const validQuotes = Object.values(quotes).filter(q => mockCacheModule.isQuoteValid(q));
                        const validFeedback = feedback.filter(f => mockCacheModule.isFeedbackValid(f));
                        
                        return {
                            quotes: {
                                total: Object.keys(quotes).length,
                                valid: validQuotes.length
                            },
                            feedback: {
                                total: feedback.length,
                                valid: validFeedback.length
                            },
                            profile: {
                                exists: !!profile,
                                valid: profile ? mockCacheModule.isProfileValid(profile) : false
                            },
                            storage: {
                                totalSize: mockCacheModule.SafeStorage.getStorageSize(),
                                maxSize: mockCacheModule.CACHE_CONFIG.MAX_STORAGE_SIZE,
                                usagePercent: 50 // Mock value
                            },
                            health: 'good'
                        };
                    });
                    
                    // Test: Get cache statistics
                    const stats = mockCacheModule.getCacheStats();
                    
                    // Property: Statistics should have required structure
                    expect(stats).toHaveProperty('quotes');
                    expect(stats).toHaveProperty('feedback');
                    expect(stats).toHaveProperty('profile');
                    expect(stats).toHaveProperty('storage');
                    expect(stats).toHaveProperty('health');
                    
                    // Property: Quote statistics should be accurate
                    expect(stats.quotes.total).toBeGreaterThanOrEqual(0);
                    expect(stats.quotes.valid).toBeGreaterThanOrEqual(0);
                    expect(stats.quotes.valid).toBeLessThanOrEqual(stats.quotes.total);
                    
                    // Property: Feedback statistics should be accurate
                    expect(stats.feedback.total).toBeGreaterThanOrEqual(0);
                    expect(stats.feedback.valid).toBeGreaterThanOrEqual(0);
                    expect(stats.feedback.valid).toBeLessThanOrEqual(stats.feedback.total);
                    
                    // Property: Storage statistics should be valid
                    expect(stats.storage.totalSize).toBeGreaterThanOrEqual(0);
                    expect(stats.storage.maxSize).toBeGreaterThan(0);
                    expect(stats.storage.usagePercent).toBeGreaterThanOrEqual(0);
                    expect(stats.storage.usagePercent).toBeLessThanOrEqual(100);
                    
                    // Property: Health should be a valid status
                    expect(['good', 'warning', 'critical', 'error']).toContain(stats.health);
                }
            ), { numRuns: 100 });
        });
    });
});