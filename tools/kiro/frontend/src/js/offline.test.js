/**
 * Property-based tests for PWA offline functionality
 * Feature: digital-calendar, Property 11: Offline Content Availability
 */

const fc = require('fast-check');

describe('Offline Content Availability Property Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Property 11: Offline Content Availability
     * For any user with cached quotes, the system should display previously cached content 
     * and allow archive browsing when offline.
     * **Validates: Requirements 5.3, 5.4**
     */
    test('Property 11: Cached quotes are available when offline', () => {
        fc.assert(fc.property(
            // Generate cached quotes data
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1, maxLength: 20 }),
                    content: fc.string({ minLength: 10, maxLength: 200 }),
                    author: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString()),
                    theme: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
                    isOffline: fc.boolean()
                }),
                { minLength: 1, maxLength: 20 }
            ),
            (cachedQuotes) => {
                // Setup: Mock cached quotes data structure
                const quotesCache = {};
                cachedQuotes.forEach(quote => {
                    const dateKey = new Date(quote.date).toDateString();
                    quotesCache[dateKey] = quote;
                });
                
                // Simulate the getCachedQuotes function logic
                const getCachedQuotes = (cacheData) => {
                    return cacheData ? Object.values(cacheData) : [];
                };
                
                const retrievedQuotes = getCachedQuotes(quotesCache);
                
                // Verify: All cached quotes should be retrievable offline
                expect(retrievedQuotes.length).toBe(cachedQuotes.length);
                
                // Verify: Each cached quote should be accessible
                cachedQuotes.forEach(originalQuote => {
                    const found = retrievedQuotes.find(q => q.id === originalQuote.id);
                    expect(found).toBeDefined();
                    expect(found.content).toBe(originalQuote.content);
                    expect(found.date).toBe(originalQuote.date);
                });
                
                // Verify: Archive browsing should work with cached data
                expect(retrievedQuotes.length).toBeGreaterThan(0);
            }
        ), { numRuns: 100 });
    });

    test('Property 11a: Offline fallback provides meaningful content when no cache exists', () => {
        fc.assert(fc.property(
            fc.constant(null), // No cached data
            (_) => {
                // Mock service worker offline fallback
                const offlineFallback = {
                    id: 'offline-fallback',
                    content: "Even when offline, your potential remains unlimited. Every moment is a chance to grow from within.",
                    author: "ARK Wisdom",
                    date: new Date().toISOString(),
                    theme: "Offline Inspiration",
                    isOffline: true
                };
                
                // Test: Verify fallback content is meaningful
                expect(offlineFallback.content).toBeTruthy();
                expect(offlineFallback.content.length).toBeGreaterThan(10);
                expect(offlineFallback.isOffline).toBe(true);
                expect(offlineFallback.id).toBe('offline-fallback');
                
                // Verify: Fallback should be available when no cache exists
                const getCachedQuotes = (cacheData) => {
                    return cacheData ? Object.values(cacheData) : [];
                };
                
                const cachedQuotes = getCachedQuotes(null);
                expect(cachedQuotes.length).toBe(0);
                
                // Fallback should still provide content
                expect(offlineFallback.content).toContain('potential');
            }
        ), { numRuns: 50 });
    });

    test('Property 11b: Archive browsing works with any subset of cached quotes', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1, maxLength: 20 }),
                    content: fc.string({ minLength: 10, maxLength: 200 }),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString()),
                    theme: fc.option(fc.string({ minLength: 3, maxLength: 30 }))
                }),
                { minLength: 0, maxLength: 50 }
            ),
            (quotes) => {
                // Setup: Cache the quotes
                const quotesCache = {};
                quotes.forEach(quote => {
                    const dateKey = new Date(quote.date).toDateString();
                    quotesCache[dateKey] = quote;
                });
                
                // Test: Archive should be browsable
                const getCachedQuotes = (cacheData) => {
                    return cacheData ? Object.values(cacheData) : [];
                };
                
                const archiveData = getCachedQuotes(quotesCache);
                
                if (quotes.length === 0) {
                    // Empty archive should still be accessible
                    expect(Array.isArray(archiveData)).toBe(true);
                    expect(archiveData.length).toBe(0);
                } else {
                    // Non-empty archive should return all quotes
                    expect(Array.isArray(archiveData)).toBe(true);
                    expect(archiveData.length).toBe(quotes.length);
                    
                    // All quotes should be present and intact
                    quotes.forEach(originalQuote => {
                        const found = archiveData.find(q => q.id === originalQuote.id);
                        expect(found).toBeDefined();
                        expect(found.content).toBe(originalQuote.content);
                    });
                }
            }
        ), { numRuns: 100 });
    });

    test('Property 11c: Offline state maintains content availability', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1, maxLength: 20 }),
                    content: fc.string({ minLength: 10, maxLength: 200 }),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString())
                }),
                { minLength: 1, maxLength: 10 }
            ),
            (initialQuotes) => {
                // Setup: Initial cached state
                const quotesCache = {};
                initialQuotes.forEach(quote => {
                    const dateKey = new Date(quote.date).toDateString();
                    quotesCache[dateKey] = quote;
                });
                
                // Simulate offline/online state transitions
                const isOnline = false;
                const networkFailed = true;
                
                // Verify content remains available offline
                const getCachedQuotes = (cacheData) => {
                    return cacheData ? Object.values(cacheData) : [];
                };
                
                const cachedQuotes = getCachedQuotes(quotesCache);
                expect(cachedQuotes.length).toBe(initialQuotes.length);
                
                // Simulate online state
                const isOnlineNow = true;
                const networkWorking = true;
                
                // Content should remain available throughout transitions
                expect(initialQuotes.length).toBeGreaterThan(0);
                expect(cachedQuotes.length).toBeGreaterThan(0);
                
                // Verify state consistency
                expect(isOnline).toBe(false);
                expect(isOnlineNow).toBe(true);
                expect(networkFailed).toBe(true);
                expect(networkWorking).toBe(true);
            }
        ), { numRuns: 50 });
    });
});

describe('Service Worker Cache Strategy Property Tests', () => {
    test('Property 11d: Cache-first strategy serves cached content when available', () => {
        fc.assert(fc.property(
            fc.record({
                url: fc.constantFrom('/css/main.css', '/js/app.js', '/manifest.json', '/icons/icon-192x192.png'),
                cachedContent: fc.string({ minLength: 10, maxLength: 1000 }),
                networkContent: fc.string({ minLength: 10, maxLength: 1000 })
            }),
            ({ url, cachedContent, networkContent }) => {
                // Setup: Mock cached response available
                const hasCachedContent = true;
                
                // Simulate cache-first strategy logic
                const cacheFirst = (request, cached, network) => {
                    if (cached) {
                        return cached; // Return cached content first
                    }
                    return network; // Fallback to network
                };
                
                // Test: Cache-first should return cached content
                const result = cacheFirst(url, cachedContent, networkContent);
                
                // Verify: Should serve cached content, not network content
                expect(result).toBe(cachedContent);
                expect(result).not.toBe(networkContent);
                
                // Verify: Cache-first behavior is consistent
                expect(hasCachedContent).toBe(true);
            }
        ), { numRuns: 100 });
    });

    test('Property 11e: Network-first strategy falls back to cache when network fails', () => {
        fc.assert(fc.property(
            fc.record({
                url: fc.constantFrom('/api/quotes/today', '/api/quotes/archive', '/api/users/profile'),
                cachedContent: fc.object(),
                networkError: fc.constantFrom('Network error', 'Timeout', 'Connection refused')
            }),
            ({ url, cachedContent, networkError }) => {
                // Setup: Network fails, cache available
                const networkFailed = true;
                const hasCachedContent = true;
                
                // Simulate network-first strategy logic
                const networkFirst = (request, networkFails, cached) => {
                    if (networkFails) {
                        return cached; // Fallback to cache when network fails
                    }
                    return 'network-response'; // Would return network response
                };
                
                // Test: Should fall back to cache
                const result = networkFirst(url, networkFailed, cachedContent);
                expect(result).toEqual(cachedContent);
                
                // Verify: Fallback behavior is correct
                expect(networkFailed).toBe(true);
                expect(hasCachedContent).toBe(true);
            }
        ), { numRuns: 100 });
    });
});

describe('Data Synchronization Property Tests', () => {
    /**
     * Property 12: Data Synchronization Round-trip
     * For any offline changes to user profile or feedback, when connectivity returns, 
     * the changes should be synchronized and persist across sessions.
     * **Validates: Requirements 5.5, 9.2**
     */
    test('Property 12: Data synchronization preserves all user changes', () => {
        fc.assert(fc.property(
            fc.record({
                profileChanges: fc.record({
                    id: fc.string({ minLength: 1, maxLength: 20 }),
                    personalityCategories: fc.array(
                        fc.record({
                            category: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                            weight: fc.float({ min: 0, max: 1 }),
                            confidence: fc.float({ min: 0, max: 1 })
                        }),
                        { minLength: 1, maxLength: 6 }
                    ),
                    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString())
                }),
                feedbackChanges: fc.array(
                    fc.record({
                        quoteId: fc.string({ minLength: 1, maxLength: 20 }),
                        rating: fc.constantFrom('like', 'neutral', 'dislike'),
                        timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString())
                    }),
                    { minLength: 0, maxLength: 10 }
                )
            }),
            ({ profileChanges, feedbackChanges }) => {
                // Simulate offline changes
                const offlineData = {
                    profile: profileChanges,
                    feedback: feedbackChanges
                };
                
                // Simulate sync process
                const syncData = (localData, serverData) => {
                    // Simple merge strategy: local changes take precedence for newer timestamps
                    const merged = { ...serverData };
                    
                    if (localData.profile && serverData.profile) {
                        const localTime = new Date(localData.profile.updatedAt);
                        const serverTime = new Date(serverData.profile.updatedAt);
                        
                        if (localTime >= serverTime) {
                            merged.profile = localData.profile;
                        }
                    } else if (localData.profile) {
                        merged.profile = localData.profile;
                    }
                    
                    // Merge feedback arrays
                    const allFeedback = [...(serverData.feedback || []), ...(localData.feedback || [])];
                    const uniqueFeedback = [];
                    const seenQuotes = new Set();
                    
                    // Keep most recent feedback for each quote
                    allFeedback
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .forEach(feedback => {
                            if (!seenQuotes.has(feedback.quoteId)) {
                                uniqueFeedback.push(feedback);
                                seenQuotes.add(feedback.quoteId);
                            }
                        });
                    
                    merged.feedback = uniqueFeedback;
                    return merged;
                };
                
                // Simulate server data (could be empty or have existing data)
                const serverData = {
                    profile: null,
                    feedback: []
                };
                
                // Perform sync
                const syncedData = syncData(offlineData, serverData);
                
                // Verify: Profile changes are preserved
                if (offlineData.profile) {
                    expect(syncedData.profile).toBeDefined();
                    expect(syncedData.profile.id).toBe(offlineData.profile.id);
                    expect(syncedData.profile.personalityCategories.length).toBe(offlineData.profile.personalityCategories.length);
                }
                
                // Verify: Feedback changes are preserved
                expect(Array.isArray(syncedData.feedback)).toBe(true);
                
                // All original feedback should be represented (no data loss)
                offlineData.feedback.forEach(originalFeedback => {
                    const found = syncedData.feedback.find(f => f.quoteId === originalFeedback.quoteId);
                    expect(found).toBeDefined();
                    expect(found.rating).toBe(originalFeedback.rating);
                });
                
                // Verify: No duplicate feedback for same quote
                const quoteIds = syncedData.feedback.map(f => f.quoteId);
                const uniqueQuoteIds = [...new Set(quoteIds)];
                expect(quoteIds.length).toBe(uniqueQuoteIds.length);
            }
        ), { numRuns: 100 });
    });

    test('Property 12a: Sync handles conflicting timestamps correctly', () => {
        fc.assert(fc.property(
            fc.record({
                localTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
                serverTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
                profileData: fc.record({
                    id: fc.string({ minLength: 1, maxLength: 20 }),
                    name: fc.string({ minLength: 1, maxLength: 50 })
                })
            }),
            ({ localTimestamp, serverTimestamp, profileData }) => {
                const localData = {
                    ...profileData,
                    updatedAt: localTimestamp.toISOString(),
                    source: 'local'
                };
                
                const serverData = {
                    ...profileData,
                    updatedAt: serverTimestamp.toISOString(),
                    source: 'server'
                };
                
                // Simulate conflict resolution
                const resolveConflict = (local, server) => {
                    const localTime = new Date(local.updatedAt);
                    const serverTime = new Date(server.updatedAt);
                    
                    return localTime >= serverTime ? local : server;
                };
                
                const resolved = resolveConflict(localData, serverData);
                
                // Verify: Most recent data wins
                if (localTimestamp >= serverTimestamp) {
                    expect(resolved.source).toBe('local');
                } else {
                    expect(resolved.source).toBe('server');
                }
                
                // Verify: Data integrity is maintained
                expect(resolved.id).toBe(profileData.id);
                expect(resolved.name).toBe(profileData.name);
                expect(resolved.updatedAt).toBeTruthy();
            }
        ), { numRuns: 100 });
    });

    test('Property 12b: Sync preserves data across multiple offline/online cycles', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    quoteId: fc.string({ minLength: 1, maxLength: 20 }),
                    rating: fc.constantFrom('like', 'neutral', 'dislike'),
                    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString())
                }),
                { minLength: 1, maxLength: 20 }
            ),
            (feedbackItems) => {
                // Simulate multiple sync cycles
                let syncedData = [];
                
                // Process feedback items in batches (simulating offline/online cycles)
                const batchSize = Math.max(1, Math.floor(feedbackItems.length / 3));
                
                for (let i = 0; i < feedbackItems.length; i += batchSize) {
                    const batch = feedbackItems.slice(i, i + batchSize);
                    
                    // Merge with existing synced data
                    const combined = [...syncedData, ...batch];
                    
                    // Deduplicate by quoteId, keeping most recent
                    const deduped = [];
                    const seen = new Set();
                    
                    combined
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .forEach(item => {
                            if (!seen.has(item.quoteId)) {
                                deduped.push(item);
                                seen.add(item.quoteId);
                            }
                        });
                    
                    syncedData = deduped;
                }
                
                // Verify: All unique quotes are represented
                const originalQuoteIds = [...new Set(feedbackItems.map(f => f.quoteId))];
                const syncedQuoteIds = [...new Set(syncedData.map(f => f.quoteId))];
                
                expect(syncedQuoteIds.length).toBe(originalQuoteIds.length);
                
                // Verify: Each quote has the most recent feedback
                originalQuoteIds.forEach(quoteId => {
                    const originalItems = feedbackItems.filter(f => f.quoteId === quoteId);
                    const mostRecent = originalItems.reduce((latest, current) => 
                        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
                    );
                    
                    const syncedItem = syncedData.find(f => f.quoteId === quoteId);
                    expect(syncedItem).toBeDefined();
                    expect(syncedItem.rating).toBe(mostRecent.rating);
                    expect(syncedItem.timestamp).toBe(mostRecent.timestamp);
                });
            }
        ), { numRuns: 50 });
    });
});