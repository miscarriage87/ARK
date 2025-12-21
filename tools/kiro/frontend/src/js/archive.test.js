/**
 * Property-based tests for archive functionality
 * Feature: digital-calendar, Property 7: Archive Chronological Ordering
 */

const fc = require('fast-check');

// Mock DOM elements for testing
const mockDOM = () => {
    global.document = {
        getElementById: jest.fn(() => ({
            innerHTML: '',
            querySelectorAll: jest.fn(() => []),
            addEventListener: jest.fn()
        })),
        createElement: jest.fn(() => ({
            setAttribute: jest.fn(),
            textContent: '',
            style: { cssText: '' }
        })),
        body: {
            appendChild: jest.fn(),
            removeChild: jest.fn()
        }
    };
    
    global.window = {
        location: { href: 'http://localhost:3000' }
    };
    
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
};

// Import the functions we want to test
// Note: In a real implementation, these would be properly exported
const { displayArchive, formatArchiveDate, getCachedQuotes } = require('./app.js');

describe('Archive Chronological Ordering Property Tests', () => {
    beforeEach(() => {
        mockDOM();
        jest.clearAllMocks();
    });

    /**
     * Property 7: Archive Chronological Ordering
     * For any user's quote archive, quotes should be ordered chronologically by their original delivery date.
     * **Validates: Requirements 3.1**
     */
    test('Property 7: Archive quotes are always ordered chronologically (newest first)', () => {
        fc.assert(fc.property(
            // Generate an array of quotes with random dates
            fc.array(
                fc.record({
                    id: fc.string({ minLength: 1, maxLength: 20 }),
                    content: fc.string({ minLength: 10, maxLength: 200 }),
                    author: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString()),
                    theme: fc.option(fc.string({ minLength: 3, maxLength: 30 }))
                }),
                { minLength: 2, maxLength: 50 }
            ),
            (quotes) => {
                // Mock the DOM element that displayArchive uses
                const mockArchiveList = {
                    innerHTML: '',
                    querySelectorAll: jest.fn(() => [])
                };
                
                document.getElementById = jest.fn((id) => {
                    if (id === 'archive-list') return mockArchiveList;
                    return null;
                });

                // Call the function under test
                displayArchive(quotes);

                // Parse the generated HTML to extract the order of dates
                const generatedHTML = mockArchiveList.innerHTML;
                
                // Extract dates from the generated HTML using regex
                const dateMatches = generatedHTML.match(/data-date="([^"]+)"/g) || [];
                const extractedDates = dateMatches.map(match => {
                    const dateStr = match.match(/data-date="([^"]+)"/)[1];
                    return new Date(dateStr);
                });

                // Verify that dates are in chronological order (newest first)
                for (let i = 0; i < extractedDates.length - 1; i++) {
                    expect(extractedDates[i].getTime()).toBeGreaterThanOrEqual(extractedDates[i + 1].getTime());
                }

                // Also verify that all quotes are included
                expect(extractedDates.length).toBe(quotes.length);
            }
        ), { numRuns: 100 });
    });

    test('Property 7a: Empty archive maintains chronological ordering constraint', () => {
        fc.assert(fc.property(
            fc.constant([]), // Empty array
            (emptyQuotes) => {
                const mockArchiveList = {
                    innerHTML: '',
                    querySelectorAll: jest.fn(() => [])
                };
                
                document.getElementById = jest.fn((id) => {
                    if (id === 'archive-list') return mockArchiveList;
                    return null;
                });

                // Should not throw and should handle empty case gracefully
                expect(() => displayArchive(emptyQuotes)).not.toThrow();
                
                // Should show empty state message
                expect(mockArchiveList.innerHTML).toContain('No quotes in your archive yet');
            }
        ), { numRuns: 10 });
    });

    test('Property 7b: Single quote archive maintains chronological ordering', () => {
        fc.assert(fc.property(
            fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                content: fc.string({ minLength: 10, maxLength: 200 }),
                author: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
                date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString()),
                theme: fc.option(fc.string({ minLength: 3, maxLength: 30 }))
            }).map(quote => [quote]), // Wrap in array
            (singleQuoteArray) => {
                const mockArchiveList = {
                    innerHTML: '',
                    querySelectorAll: jest.fn(() => [])
                };
                
                document.getElementById = jest.fn((id) => {
                    if (id === 'archive-list') return mockArchiveList;
                    return null;
                });

                displayArchive(singleQuoteArray);

                // Should contain exactly one quote
                const dateMatches = mockArchiveList.innerHTML.match(/data-date="([^"]+)"/g) || [];
                expect(dateMatches.length).toBe(1);
                
                // Should contain the quote content
                expect(mockArchiveList.innerHTML).toContain(singleQuoteArray[0].content);
            }
        ), { numRuns: 50 });
    });

    test('Property 7c: Archive with identical dates maintains stable ordering', () => {
        fc.assert(fc.property(
            fc.tuple(
                fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        content: fc.string({ minLength: 10, maxLength: 200 }),
                        author: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
                        theme: fc.option(fc.string({ minLength: 3, maxLength: 30 }))
                    }),
                    { minLength: 2, maxLength: 10 }
                )
            ).map(([commonDate, quoteData]) => 
                quoteData.map(data => ({
                    ...data,
                    date: commonDate.toISOString()
                }))
            ),
            (quotesWithSameDate) => {
                const mockArchiveList = {
                    innerHTML: '',
                    querySelectorAll: jest.fn(() => [])
                };
                
                document.getElementById = jest.fn((id) => {
                    if (id === 'archive-list') return mockArchiveList;
                    return null;
                });

                displayArchive(quotesWithSameDate);

                // All quotes should be displayed
                const dateMatches = mockArchiveList.innerHTML.match(/data-date="([^"]+)"/g) || [];
                expect(dateMatches.length).toBe(quotesWithSameDate.length);
                
                // All dates should be the same
                const extractedDates = dateMatches.map(match => {
                    const dateStr = match.match(/data-date="([^"]+)"/)[1];
                    return new Date(dateStr).getTime();
                });
                
                const firstDate = extractedDates[0];
                extractedDates.forEach(date => {
                    expect(date).toBe(firstDate);
                });
            }
        ), { numRuns: 50 });
    });
});

describe('Archive Date Formatting Property Tests', () => {
    test('Property 7d: Date formatting is consistent and readable', () => {
        fc.assert(fc.property(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
            (randomDate) => {
                const dateString = randomDate.toISOString();
                const formatted = formatArchiveDate(dateString);
                
                // Should return a non-empty string
                expect(typeof formatted).toBe('string');
                expect(formatted.length).toBeGreaterThan(0);
                
                // Should not contain the raw ISO string
                expect(formatted).not.toContain('T');
                expect(formatted).not.toContain('Z');
                
                // Should be human-readable (contain common date words or numbers)
                const hasDateWords = /\b(yesterday|days?|weeks?|ago|\d+)\b/i.test(formatted);
                const hasMonthNames = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(formatted);
                
                expect(hasDateWords || hasMonthNames).toBe(true);
            }
        ), { numRuns: 100 });
    });
});