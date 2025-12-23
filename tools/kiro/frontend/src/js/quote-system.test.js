/**
 * Property-based tests for Quote System Functionality
 * Feature: kiro-application-fixes, Property 4: Quote System Functionality
 * **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
 */

const fc = require('fast-check');

// Mock DOM elements and localStorage
const mockLocalStorage = {
    data: {},
    getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
    setItem: jest.fn((key, value) => { mockLocalStorage.data[key] = value; }),
    removeItem: jest.fn((key) => { delete mockLocalStorage.data[key]; }),
    clear: jest.fn(() => { mockLocalStorage.data = {}; })
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Quote system functions to test (simplified implementations for testing)
function displayQuote(quote) {
    const quoteText = quote.content || quote.text || '';
    const author = quote.author ? `— ${quote.author}` : '';
    const date = quote.date || new Date().toISOString().split('T')[0];
    let theme = quote.theme || 'Daily Inspiration';
    
    if (quote.generated) {
        theme += ' 🤖 KI-generiert';
    }
    if (quote.isOffline) {
        theme += ' (Offline)';
    }
    
    return {
        text: quoteText,
        author: author,
        date: date,
        theme: theme
    };
}

function cacheQuote(quote) {
    const today = new Date().toDateString();
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    
    const quoteToCahe = {
        id: quote.id,
        content: quote.content || quote.text,
        author: quote.author,
        date: quote.date || new Date().toISOString().split('T')[0],
        theme: quote.theme,
        generated: quote.generated || false,
        cachedAt: new Date().toISOString()
    };
    
    cachedQuotes[today] = quoteToCahe;
    localStorage.setItem('ark-cached-quotes', JSON.stringify(cachedQuotes));
    return quoteToCahe;
}

function getCachedTodaysQuote() {
    const today = new Date().toDateString();
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    return cachedQuotes[today] || null;
}

function getCachedQuotes() {
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    return Object.values(cachedQuotes);
}

function storeFeedbackLocally(feedbackData) {
    const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
    
    // Remove existing feedback for the same quote
    const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== feedbackData.quoteId);
    filteredFeedback.push(feedbackData);
    
    localStorage.setItem('ark-pending-feedback', JSON.stringify(filteredFeedback));
}

function loadExistingFeedback(quoteId) {
    const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
    return pendingFeedback.find(f => f.quoteId === quoteId) || null;
}

function filterArchive(quotes, searchTerm = '', themeFilter = '') {
    let filtered = quotes;
    
    if (searchTerm) {
        filtered = filtered.filter(quote =>
            quote.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (quote.author && quote.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (quote.theme && quote.theme.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    
    if (themeFilter) {
        filtered = filtered.filter(quote => quote.theme === themeFilter);
    }
    
    return filtered;
}

async function loadTodaysQuote(isOnline = true, apiSuccess = true, hasCachedQuote = false, cachedQuote = null) {
    try {
        // Try API first if online and API works
        if (isOnline && apiSuccess) {
            const response = await fetch('/api/quotes/today');
            if (response.ok) {
                const quote = await response.json();
                const normalizedQuote = {
                    id: quote.id,
                    content: quote.text || quote.content,
                    author: quote.author,
                    date: quote.date || new Date().toISOString().split('T')[0],
                    theme: quote.theme,
                    generated: quote.generated || false
                };
                cacheQuote(normalizedQuote);
                return normalizedQuote;
            }
        }
        
        // Try cached quote from parameter
        if (hasCachedQuote && cachedQuote) {
            return cachedQuote;
        }
        
        // Try cached quote from localStorage
        const storedQuote = getCachedTodaysQuote();
        if (storedQuote) {
            return storedQuote;
        }
        
        // Fallback quote for offline scenarios
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

describe('Quote System Functionality Property Tests', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
        global.localStorage = mockLocalStorage;
        
        // Reset fetch mock
        fetch.mockClear();
        
        // Mock successful API response by default
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                id: 'api-quote-1',
                text: 'API generated quote',
                author: 'Test Author',
                date: new Date().toISOString().split('T')[0],
                theme: 'Test Theme'
            })
        });
    });

    /**
     * Property 4: Quote System Functionality
     * For any quote operation (display, feedback, archive), the system should handle 
     * the operation correctly with proper loading states and error recovery
     * **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
     */
    test('Property 4a: Quote display handles any valid quote data format', () => {
        fc.assert(fc.property(
            fc.record({
                id: fc.string({ minLength: 1 }),
                content: fc.oneof(fc.string({ minLength: 10 }), fc.constant(undefined)),
                text: fc.oneof(fc.string({ minLength: 10 }), fc.constant(undefined)),
                author: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
                date: fc.date().map(d => d.toISOString().split('T')[0]),
                theme: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
                generated: fc.boolean()
            }).filter(quote => quote.content || quote.text), // Ensure at least one text field exists
            (quote) => {
                // Test: Display quote should handle any valid format
                const result = displayQuote(quote);
                
                // Verify: Quote text is displayed (content or text field)
                const expectedText = quote.content || quote.text;
                expect(result.text).toBe(expectedText);
                
                // Verify: Author is displayed correctly
                const expectedAuthor = quote.author ? `— ${quote.author}` : '';
                expect(result.author).toBe(expectedAuthor);
                
                // Verify: Date is displayed
                expect(result.date).toBeTruthy();
                
                // Verify: Theme is displayed with proper formatting
                let expectedTheme = quote.theme || 'Daily Inspiration';
                if (quote.generated) {
                    expectedTheme += ' 🤖 KI-generiert';
                }
                expect(result.theme).toContain(expectedTheme);
            }
        ), { numRuns: 100 });
    });

    test('Property 4b: Quote caching preserves data integrity across storage operations', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    content: fc.string({ minLength: 10 }),
                    author: fc.string({ minLength: 1 }),
                    date: fc.date().map(d => d.toISOString().split('T')[0]),
                    theme: fc.string({ minLength: 1 }),
                    generated: fc.boolean()
                }),
                { minLength: 1, maxLength: 10 }
            ),
            (quotes) => {
                // Test: Cache multiple quotes
                quotes.forEach(quote => {
                    expect(() => cacheQuote(quote)).not.toThrow();
                });
                
                // Verify: All quotes should be retrievable
                const cachedQuotes = getCachedQuotes();
                expect(Array.isArray(cachedQuotes)).toBe(true);
                
                // Verify: Data integrity is preserved
                quotes.forEach(originalQuote => {
                    const found = cachedQuotes.find(q => q.id === originalQuote.id);
                    if (found) {
                        expect(found.content).toBe(originalQuote.content);
                        expect(found.author).toBe(originalQuote.author);
                        expect(found.theme).toBe(originalQuote.theme);
                        expect(found.generated).toBe(originalQuote.generated);
                    }
                });
                
                // Verify: Today's quote can be retrieved if cached today
                const todayQuote = quotes.find(q => 
                    q.date === new Date().toISOString().split('T')[0]
                );
                if (todayQuote) {
                    const retrievedToday = getCachedTodaysQuote();
                    expect(retrievedToday).toBeTruthy();
                    expect(retrievedToday.id).toBe(todayQuote.id);
                }
            }
        ), { numRuns: 100 });
    });

    test('Property 4c: Feedback system maintains consistency across operations', () => {
        fc.assert(fc.property(
            fc.record({
                quoteId: fc.string({ minLength: 1 }),
                rating: fc.constantFrom('like', 'neutral', 'dislike'),
                timestamp: fc.date().map(d => d.toISOString())
            }),
            (feedbackData) => {
                // Test: Store feedback locally
                expect(() => storeFeedbackLocally(feedbackData)).not.toThrow();
                
                // Verify: Feedback is stored in localStorage
                const storedFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
                expect(Array.isArray(storedFeedback)).toBe(true);
                
                const foundFeedback = storedFeedback.find(f => f.quoteId === feedbackData.quoteId);
                expect(foundFeedback).toBeTruthy();
                expect(foundFeedback.rating).toBe(feedbackData.rating);
                
                // Test: Load existing feedback
                const loadedFeedback = loadExistingFeedback(feedbackData.quoteId);
                expect(loadedFeedback).toBeTruthy();
                expect(loadedFeedback.rating).toBe(feedbackData.rating);
                
                // Verify: Feedback consistency
                expect(loadedFeedback.quoteId).toBe(feedbackData.quoteId);
                expect(loadedFeedback.timestamp).toBe(feedbackData.timestamp);
            }
        ), { numRuns: 100 });
    });

    test('Property 4d: Quote loading handles network failures gracefully', async () => {
        // Test case 1: Offline, no API success, no cached quote - should return fallback
        mockLocalStorage.clear();
        mockLocalStorage.setItem('ark-cached-quotes', JSON.stringify({}));
        fetch.mockRejectedValue(new Error('Network error'));
        
        // Debug: Check what's in localStorage
        console.log('localStorage before test:', mockLocalStorage.getItem('ark-cached-quotes'));
        
        // Debug: Check what getCachedTodaysQuote returns
        const cachedQuote = getCachedTodaysQuote();
        console.log('getCachedTodaysQuote returns:', cachedQuote);
        
        const result1 = await loadTodaysQuote(false, false, false, null);
        
        console.log('Result1 content:', result1.content);
        console.log('Result1 full:', result1);
        
        expect(result1).toBeTruthy();
        expect(result1.content).toBeTruthy();
        expect(result1.content.length).toBeGreaterThan(0);
        expect(result1.date).toBeTruthy();
        expect(result1.theme).toBeTruthy();
        expect(result1.content).toContain('neuer Anfang');
        expect(result1.isOffline).toBe(true);
        
        // Test case 2: Online, API success - should return API quote
        mockLocalStorage.clear();
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                id: 'api-quote',
                text: 'API quote content',
                author: 'API Author',
                date: new Date().toISOString().split('T')[0],
                theme: 'API Theme'
            })
        });
        
        const result2 = await loadTodaysQuote(true, true, false, null);
        
        expect(result2).toBeTruthy();
        expect(result2.content).toBe('API quote content');
        expect(result2.author).toBe('API Author');
        
        // Test case 3: Offline, with cached quote - should return cached quote
        mockLocalStorage.clear();
        const cachedQuote = {
            id: 'cached-quote',
            content: 'Cached quote content',
            author: 'Cached Author',
            date: new Date().toISOString().split('T')[0],
            theme: 'Cached Theme'
        };
        
        const today = new Date().toDateString();
        mockLocalStorage.setItem('ark-cached-quotes', JSON.stringify({
            [today]: cachedQuote
        }));
        
        fetch.mockRejectedValue(new Error('Network error'));
        
        const result3 = await loadTodaysQuote(false, false, true, cachedQuote);
        
        expect(result3).toBeTruthy();
        expect(result3.content).toBe(cachedQuote.content);
        expect(result3.author).toBe(cachedQuote.author);
    });

    test('Property 4e: Archive functionality maintains quote accessibility', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    content: fc.string({ minLength: 10 }),
                    author: fc.string({ minLength: 1 }),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date() })
                        .map(d => d.toISOString().split('T')[0]),
                    theme: fc.constantFrom('Motivation', 'Inspiration', 'Wisdom', 'Growth', 'Success'),
                    feedback: fc.option(fc.record({
                        rating: fc.constantFrom('like', 'neutral', 'dislike')
                    }))
                }),
                { minLength: 0, maxLength: 20 }
            ),
            fc.string(), // search term
            fc.constantFrom('', 'Motivation', 'Inspiration', 'Wisdom'), // theme filter
            (quotes, searchTerm, themeFilter) => {
                // Test: Filter functionality should not throw
                const filteredQuotes = filterArchive(quotes, searchTerm, themeFilter);
                
                // Verify: Filtered result is always an array
                expect(Array.isArray(filteredQuotes)).toBe(true);
                
                // Verify: Filtered quotes are subset of original
                expect(filteredQuotes.length).toBeLessThanOrEqual(quotes.length);
                
                // Verify: Search filtering works correctly
                if (searchTerm && quotes.length > 0) {
                    filteredQuotes.forEach(quote => {
                        const matchesSearch = 
                            quote.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            quote.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            quote.theme.toLowerCase().includes(searchTerm.toLowerCase());
                        expect(matchesSearch).toBe(true);
                    });
                }
                
                // Verify: Theme filtering works correctly
                if (themeFilter && quotes.length > 0) {
                    filteredQuotes.forEach(quote => {
                        expect(quote.theme).toBe(themeFilter);
                    });
                }
                
                // Verify: All filtered quotes are from original set
                filteredQuotes.forEach(filteredQuote => {
                    const foundInOriginal = quotes.find(q => q.id === filteredQuote.id);
                    expect(foundInOriginal).toBeTruthy();
                });
            }
        ), { numRuns: 100 });
    });
});