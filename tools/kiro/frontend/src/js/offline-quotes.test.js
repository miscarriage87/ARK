/**
 * Property-based tests for Offline Quote Availability
 * Feature: kiro-application-fixes, Property 5: Offline Quote Availability
 * **Validates: Requirements 3.2, 6.3**
 */

const fc = require('fast-check');

// Mock localStorage
const mockLocalStorage = {
    data: {},
    getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
    setItem: jest.fn((key, value) => { mockLocalStorage.data[key] = value; }),
    removeItem: jest.fn((key) => { delete mockLocalStorage.data[key]; }),
    clear: jest.fn(() => { mockLocalStorage.data = {}; })
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Offline quote system functions to test
function getCachedQuotes(isOnline = true) {
    try {
        const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '[]');
        
        // If no cached quotes and we're offline, provide fallback quotes
        if (cachedQuotes.length === 0 && !isOnline) {
            return getOfflineFallbackQuotes();
        }
        
        // Mark cached quotes as offline when in offline mode
        if (!isOnline) {
            return cachedQuotes.map(quote => ({
                ...quote,
                isOffline: true
            }));
        }
        
        return cachedQuotes;
    } catch (error) {
        // Return fallback quotes on error
        if (!isOnline) {
            return getOfflineFallbackQuotes();
        }
        
        return [];
    }
}

function getCachedTodaysQuote() {
    try {
        const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '[]');
        const today = new Date().toDateString();
        return cachedQuotes.find(quote => quote.date === new Date().toISOString().split('T')[0]) || null;
    } catch (error) {
        return null;
    }
}

function cacheQuote(quote) {
    try {
        const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '[]');
        
        const quoteToCahe = {
            id: quote.id,
            content: quote.content || quote.text,
            author: quote.author,
            date: quote.date || new Date().toISOString().split('T')[0],
            theme: quote.theme,
            generated: quote.generated || false,
            isOffline: quote.isOffline || false,
            cachedAt: new Date().toISOString()
        };
        
        // Remove existing quote with same ID to avoid duplicates
        const filteredQuotes = cachedQuotes.filter(q => q.id !== quote.id);
        filteredQuotes.push(quoteToCahe);
        
        localStorage.setItem('ark-cached-quotes', JSON.stringify(filteredQuotes));
        return quoteToCahe;
    } catch (error) {
        console.error('Error caching quote:', error);
        return null;
    }
}

function getOfflineFallbackQuotes() {
    return [
        {
            id: 'offline-1',
            content: "Auch ohne Verbindung zur Welt bleibst du mit dir selbst verbunden.",
            author: "ARK Offline",
            date: new Date().toISOString().split('T')[0],
            theme: "Offline Weisheit",
            isOffline: true
        },
        {
            id: 'offline-2', 
            content: "Stille Momente offline sind oft die lautesten für die Seele.",
            author: "ARK Offline",
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            theme: "Innere Ruhe",
            isOffline: true
        },
        {
            id: 'offline-3',
            content: "Deine Gedanken brauchen kein Internet, um kraftvoll zu sein.",
            author: "ARK Offline", 
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            theme: "Mentale Stärke",
            isOffline: true
        }
    ];
}

async function loadTodaysQuoteOffline(isOnline = false, hasCachedQuote = false, cachedQuote = null) {
    try {
        // If online, try API (but we're testing offline scenarios)
        if (isOnline) {
            const response = await fetch('/api/quotes/today');
            if (response.ok) {
                const quote = await response.json();
                return {
                    id: quote.id,
                    content: quote.text || quote.content,
                    author: quote.author,
                    date: quote.date || new Date().toISOString().split('T')[0],
                    theme: quote.theme,
                    generated: quote.generated || false
                };
            }
        }
        
        // Try cached quote
        if (hasCachedQuote && cachedQuote) {
            return {
                ...cachedQuote,
                isOffline: !isOnline // Set isOffline based on current online status
            };
        }
        
        // Get cached quotes from storage
        const todayQuote = getCachedTodaysQuote();
        if (todayQuote) {
            return {
                ...todayQuote,
                isOffline: !isOnline // Set isOffline based on current online status
            };
        }
        
        // Fallback quote for offline
        return {
            id: 'fallback-' + new Date().toDateString(),
            content: "Jeder Tag ist ein neuer Anfang. Atme tief durch, lächle und fang noch einmal an.",
            author: "Unbekannt",
            date: new Date().toISOString().split('T')[0],
            theme: "Tägliche Inspiration",
            isOffline: true
        };
    } catch (error) {
        // Return fallback on error
        return {
            id: 'error-fallback',
            content: "Auch in schwierigen Zeiten gibt es Hoffnung.",
            author: "ARK",
            date: new Date().toISOString().split('T')[0],
            theme: "Hoffnung",
            isOffline: true
        };
    }
}

function ensureOfflineContent() {
    try {
        // Check if we have cached quotes
        const cachedQuotes = getCachedQuotes(false); // offline mode
        
        // Check if we have today's quote cached
        const todayQuote = getCachedTodaysQuote();
        if (!todayQuote) {
            // Create a fallback quote for today
            const fallbackQuote = {
                id: 'offline-fallback-' + new Date().toDateString(),
                content: "Auch offline bleibst du stark. Jeder Moment ist eine Chance zu wachsen.",
                author: "ARK Offline",
                date: new Date().toISOString().split('T')[0],
                theme: "Offline Inspiration",
                isOffline: true,
                cachedAt: new Date().toISOString()
            };
            
            cacheQuote(fallbackQuote);
        }
        
        return {
            hasTodayQuote: !!getCachedTodaysQuote(),
            archiveCount: cachedQuotes.length,
            fallbackAvailable: true
        };
    } catch (error) {
        return {
            hasTodayQuote: false,
            archiveCount: 0,
            fallbackAvailable: true
        };
    }
}

describe('Offline Quote Availability Property Tests', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
        global.localStorage = mockLocalStorage;
        
        // Reset fetch mock
        fetch.mockClear();
        fetch.mockRejectedValue(new Error('Network error - offline'));
    });

    /**
     * Property 5: Offline Quote Availability
     * For any offline scenario, the quote system should display cached quotes or 
     * appropriate fallback content
     * **Validates: Requirements 3.2, 6.3**
     */
    test('Property 5a: Cached quotes are always available when offline', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    content: fc.string({ minLength: 10 }),
                    author: fc.string({ minLength: 1 }),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date() })
                        .map(d => d.toISOString().split('T')[0]),
                    theme: fc.string({ minLength: 1 }),
                    generated: fc.boolean()
                }),
                { minLength: 0, maxLength: 10 }
            ),
            (quotesToCache) => {
                // Setup: Cache quotes
                quotesToCache.forEach(quote => {
                    cacheQuote(quote);
                });
                
                // Test: Get cached quotes while offline
                const cachedQuotes = getCachedQuotes(false); // offline mode
                
                // Verify: Some quotes are always available (cached or fallback)
                expect(Array.isArray(cachedQuotes)).toBe(true);
                expect(cachedQuotes.length).toBeGreaterThan(0);
                
                // Verify: If we cached quotes, they should be retrievable
                if (quotesToCache.length > 0) {
                    quotesToCache.forEach(originalQuote => {
                        const found = cachedQuotes.find(q => q.id === originalQuote.id);
                        if (found) {
                            expect(found.content).toBe(originalQuote.content);
                            expect(found.author).toBe(originalQuote.author);
                            expect(found.theme).toBe(originalQuote.theme);
                        }
                    });
                } else {
                    // If no quotes were cached, fallback quotes should be provided
                    expect(cachedQuotes.length).toBeGreaterThan(0);
                    cachedQuotes.forEach(quote => {
                        expect(quote.content).toBeTruthy();
                        expect(quote.content.length).toBeGreaterThanOrEqual(10);
                        expect(quote.isOffline).toBe(true);
                    });
                }
            }
        ), { numRuns: 100 });
    });

    test('Property 5b: Today\'s quote is always available offline', async () => {
        // Test case 1: No cached quote
        mockLocalStorage.clear();
        const todayQuote1 = await loadTodaysQuoteOffline(false, false, null);
        
        expect(todayQuote1).toBeTruthy();
        expect(todayQuote1.content).toBeTruthy();
        expect(todayQuote1.content.length).toBeGreaterThan(0);
        expect(todayQuote1.date).toBeTruthy();
        expect(todayQuote1.theme).toBeTruthy();
        expect(todayQuote1.isOffline).toBe(true);
        
        // Test case 2: With cached quote
        const cachedQuote = {
            id: 'test-quote',
            content: 'Test quote content for today',
            author: 'Test Author',
            date: new Date().toISOString().split('T')[0],
            theme: 'Test Theme'
        };
        
        mockLocalStorage.clear();
        cacheQuote(cachedQuote);
        
        const todayQuote2 = await loadTodaysQuoteOffline(false, true, cachedQuote);
        
        expect(todayQuote2).toBeTruthy();
        expect(todayQuote2.content).toBe(cachedQuote.content);
        expect(todayQuote2.author).toBe(cachedQuote.author);
        expect(todayQuote2.isOffline).toBe(true);
    });

    test('Property 5c: Offline content is always ensured when going offline', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    content: fc.string({ minLength: 10 }),
                    author: fc.string({ minLength: 1 }),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date() })
                        .map(d => d.toISOString().split('T')[0]),
                    theme: fc.string({ minLength: 1 })
                }),
                { minLength: 0, maxLength: 5 }
            ),
            (existingQuotes) => {
                // Setup: Cache existing quotes
                existingQuotes.forEach(quote => {
                    cacheQuote(quote);
                });
                
                // Test: Ensure offline content
                const offlineStatus = ensureOfflineContent();
                
                // Verify: Offline content is always available
                expect(offlineStatus).toBeTruthy();
                expect(offlineStatus.fallbackAvailable).toBe(true);
                
                // Verify: Today's quote is ensured
                expect(offlineStatus.hasTodayQuote).toBe(true);
                
                // Verify: Archive content is available
                expect(offlineStatus.archiveCount).toBeGreaterThan(0);
                
                // Verify: Can retrieve today's quote after ensuring content
                const todayQuote = getCachedTodaysQuote();
                expect(todayQuote).toBeTruthy();
                expect(todayQuote.content).toBeTruthy();
            }
        ), { numRuns: 100 });
    });

    test('Property 5d: Fallback quotes are meaningful and consistent', () => {
        fc.assert(fc.property(
            fc.constant(null), // No input needed for fallback quotes
            () => {
                // Test: Get fallback quotes
                const fallbackQuotes = getOfflineFallbackQuotes();
                
                // Verify: Fallback quotes are always available
                expect(Array.isArray(fallbackQuotes)).toBe(true);
                expect(fallbackQuotes.length).toBeGreaterThan(0);
                
                // Verify: Each fallback quote has required properties
                fallbackQuotes.forEach(quote => {
                    expect(quote.id).toBeTruthy();
                    expect(quote.content).toBeTruthy();
                    expect(quote.content.length).toBeGreaterThan(10);
                    expect(quote.author).toBeTruthy();
                    expect(quote.date).toBeTruthy();
                    expect(quote.theme).toBeTruthy();
                    expect(quote.isOffline).toBe(true);
                });
                
                // Verify: Fallback quotes are unique
                const ids = fallbackQuotes.map(q => q.id);
                const uniqueIds = [...new Set(ids)];
                expect(uniqueIds.length).toBe(ids.length);
                
                // Verify: Content is meaningful (contains common inspirational words)
                const allContent = fallbackQuotes.map(q => q.content.toLowerCase()).join(' ');
                const inspirationalWords = ['stark', 'wachsen', 'verbunden', 'seele', 'gedanken', 'kraft'];
                const hasInspirationalContent = inspirationalWords.some(word => allContent.includes(word));
                expect(hasInspirationalContent).toBe(true);
            }
        ), { numRuns: 50 });
    });

    test('Property 5e: Offline mode gracefully handles storage errors', () => {
        fc.assert(fc.property(
            fc.boolean(), // Whether localStorage should fail
            (shouldFailStorage) => {
                // Setup: Mock localStorage failure if needed
                if (shouldFailStorage) {
                    mockLocalStorage.getItem.mockImplementation(() => {
                        throw new Error('Storage error');
                    });
                }
                
                // Test: Get cached quotes with potential storage error
                const quotes = getCachedQuotes(false); // offline mode
                
                // Verify: Always returns an array
                expect(Array.isArray(quotes)).toBe(true);
                
                // Verify: Always provides some content
                expect(quotes.length).toBeGreaterThan(0);
                
                // Verify: If storage failed, fallback quotes are provided
                if (shouldFailStorage) {
                    quotes.forEach(quote => {
                        expect(quote.isOffline).toBe(true);
                        expect(quote.content).toBeTruthy();
                    });
                }
                
                // Reset mock for next iteration
                mockLocalStorage.getItem.mockImplementation((key) => mockLocalStorage.data[key] || null);
            }
        ), { numRuns: 100 });
    });
});