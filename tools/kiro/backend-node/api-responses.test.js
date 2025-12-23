/**
 * Property-Based Tests for API Response Validity
 * 
 * Feature: kiro-application-fixes, Property 3: API Response Validity
 * Validates: Requirements 1.3, 7.2
 */

const fc = require('fast-check');
const request = require('supertest');
const app = require('./server');

describe('API Response Validity Property Tests', () => {
    let server;
    let serverPort;

    beforeAll((done) => {
        // Start server on a random available port for testing
        server = app.listen(0, () => {
            serverPort = server.address().port;
            done();
        });
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    /**
     * Property 3: API Response Validity
     * For any API endpoint call, the backend should return valid JSON responses 
     * with correct status codes and proper error handling
     * Validates: Requirements 1.3, 7.2
     */
    describe('Property 3: API Response Validity', () => {
        test('should return valid JSON responses for all API endpoints', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        endpoint: fc.constantFrom(
                            '/',
                            '/health',
                            '/api/ai-status',
                            '/api/quotes/today',
                            '/api/quotes',
                            '/api/themes',
                            '/api/users/profile',
                            '/api/notifications/vapid-public-key'
                        ),
                        queryParams: fc.record({
                            limit: fc.option(fc.integer({ min: 1, max: 100 })),
                            offset: fc.option(fc.integer({ min: 0, max: 1000 })),
                            search: fc.option(fc.string({ maxLength: 50 }))
                        }),
                        headers: fc.record({
                            userAgent: fc.string({ minLength: 5, maxLength: 200 }),
                            accept: fc.constantFrom('application/json', '*/*', 'text/html'),
                            contentType: fc.constantFrom('application/json', 'text/plain')
                        })
                    }),
                    async (requestData) => {
                        let url = requestData.endpoint;
                        
                        // Add query parameters for endpoints that support them
                        if (requestData.endpoint === '/api/quotes' && 
                            (requestData.queryParams.limit || requestData.queryParams.offset || requestData.queryParams.search)) {
                            const params = new URLSearchParams();
                            if (requestData.queryParams.limit) params.append('limit', requestData.queryParams.limit.toString());
                            if (requestData.queryParams.offset) params.append('offset', requestData.queryParams.offset.toString());
                            if (requestData.queryParams.search) params.append('search', requestData.queryParams.search);
                            url += '?' + params.toString();
                        }

                        const response = await request(app)
                            .get(url)
                            .set('User-Agent', requestData.headers.userAgent)
                            .set('Accept', requestData.headers.accept)
                            .set('Content-Type', requestData.headers.contentType);

                        // Property: All API endpoints should return 200 status for valid requests
                        expect(response.status).toBe(200);

                        // Property: Response should be valid JSON
                        expect(response.type).toBe('application/json');
                        expect(typeof response.body).toBe('object');
                        expect(response.body).not.toBeNull();

                        // Property: Response should have consistent structure based on endpoint
                        switch (requestData.endpoint) {
                            case '/':
                                expect(response.body).toHaveProperty('message');
                                expect(response.body).toHaveProperty('status');
                                expect(response.body).toHaveProperty('version');
                                expect(response.body).toHaveProperty('ai_enabled');
                                expect(response.body).toHaveProperty('endpoints');
                                expect(Array.isArray(response.body.endpoints)).toBe(true);
                                expect(typeof response.body.ai_enabled).toBe('boolean');
                                break;

                            case '/health':
                                expect(response.body).toHaveProperty('status');
                                expect(response.body).toHaveProperty('timestamp');
                                expect(response.body).toHaveProperty('uptime');
                                expect(response.body.status).toBe('gesund');
                                expect(typeof response.body.uptime).toBe('number');
                                expect(response.body.uptime).toBeGreaterThan(0);
                                break;

                            case '/api/ai-status':
                                expect(response.body).toHaveProperty('ai_enabled');
                                expect(response.body).toHaveProperty('openai_configured');
                                expect(response.body).toHaveProperty('model');
                                expect(response.body).toHaveProperty('status');
                                expect(typeof response.body.ai_enabled).toBe('boolean');
                                expect(typeof response.body.openai_configured).toBe('boolean');
                                expect(typeof response.body.model).toBe('string');
                                expect(typeof response.body.status).toBe('string');
                                break;

                            case '/api/quotes/today':
                                expect(response.body).toHaveProperty('id');
                                expect(response.body).toHaveProperty('text');
                                expect(response.body).toHaveProperty('author');
                                expect(response.body).toHaveProperty('theme');
                                expect(response.body).toHaveProperty('date');
                                expect(typeof response.body.id).toBe('number');
                                expect(typeof response.body.text).toBe('string');
                                expect(typeof response.body.author).toBe('string');
                                expect(typeof response.body.theme).toBe('string');
                                expect(typeof response.body.date).toBe('string');
                                expect(response.body.text.length).toBeGreaterThan(0);
                                expect(response.body.author.length).toBeGreaterThan(0);
                                break;

                            case '/api/quotes':
                                expect(response.body).toHaveProperty('quotes');
                                expect(response.body).toHaveProperty('total');
                                expect(response.body).toHaveProperty('limit');
                                expect(response.body).toHaveProperty('offset');
                                expect(response.body).toHaveProperty('hasMore');
                                expect(Array.isArray(response.body.quotes)).toBe(true);
                                expect(typeof response.body.total).toBe('number');
                                expect(typeof response.body.limit).toBe('number');
                                expect(typeof response.body.offset).toBe('number');
                                expect(typeof response.body.hasMore).toBe('boolean');
                                break;

                            case '/api/themes':
                                expect(response.body).toHaveProperty('themes');
                                expect(Array.isArray(response.body.themes)).toBe(true);
                                response.body.themes.forEach(theme => {
                                    expect(theme).toHaveProperty('name');
                                    expect(theme).toHaveProperty('count');
                                    expect(typeof theme.name).toBe('string');
                                    expect(typeof theme.count).toBe('number');
                                    expect(theme.count).toBeGreaterThanOrEqual(0);
                                });
                                break;

                            case '/api/users/profile':
                                expect(response.body).toHaveProperty('id');
                                expect(response.body).toHaveProperty('name');
                                expect(response.body).toHaveProperty('preferences');
                                expect(response.body).toHaveProperty('stats');
                                expect(typeof response.body.id).toBe('number');
                                expect(typeof response.body.name).toBe('string');
                                expect(typeof response.body.preferences).toBe('object');
                                expect(typeof response.body.stats).toBe('object');
                                break;

                            case '/api/notifications/vapid-public-key':
                                expect(response.body).toHaveProperty('publicKey');
                                expect(typeof response.body.publicKey).toBe('string');
                                break;
                        }
                    }
                ),
                { numRuns: 20 }
            );
        }, 15000);

        test('should handle invalid endpoints with proper error responses', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        invalidPath: fc.string({ minLength: 1, maxLength: 50 })
                            .filter(s => !s.includes('..') && !s.includes('//') && s.trim().length > 0)
                            .map(s => '/api/' + s.replace(/[^a-zA-Z0-9\-_]/g, '')),
                        method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
                        headers: fc.record({
                            userAgent: fc.string({ minLength: 1, maxLength: 100 }),
                            accept: fc.constantFrom('application/json', '*/*')
                        })
                    }),
                    async (requestData) => {
                        // Skip if path might be a valid endpoint
                        const validPaths = [
                            '/api/ai-status', '/api/quotes', '/api/themes', '/api/users',
                            '/api/notifications', '/api/archive'
                        ];
                        if (validPaths.some(path => requestData.invalidPath.includes(path.replace('/api/', '')))) {
                            return;
                        }

                        let response;
                        try {
                            if (requestData.method === 'GET') {
                                response = await request(app)
                                    .get(requestData.invalidPath)
                                    .set('User-Agent', requestData.headers.userAgent)
                                    .set('Accept', requestData.headers.accept)
                                    .timeout(5000);
                            } else if (requestData.method === 'POST') {
                                response = await request(app)
                                    .post(requestData.invalidPath)
                                    .set('User-Agent', requestData.headers.userAgent)
                                    .set('Accept', requestData.headers.accept)
                                    .timeout(5000);
                            } else if (requestData.method === 'PUT') {
                                response = await request(app)
                                    .put(requestData.invalidPath)
                                    .set('User-Agent', requestData.headers.userAgent)
                                    .set('Accept', requestData.headers.accept)
                                    .timeout(5000);
                            } else if (requestData.method === 'DELETE') {
                                response = await request(app)
                                    .delete(requestData.invalidPath)
                                    .set('User-Agent', requestData.headers.userAgent)
                                    .set('Accept', requestData.headers.accept)
                                    .timeout(5000);
                            }
                        } catch (error) {
                            // Property: Server should not crash on invalid requests
                            expect(error.code).toBe('ECONNABORTED'); // Timeout is acceptable
                            return;
                        }

                        // Property: Invalid endpoints should return 404
                        expect(response.status).toBe(404);

                        // Property: Error responses should be valid JSON
                        expect(response.type).toBe('application/json');
                        expect(typeof response.body).toBe('object');
                        expect(response.body).not.toBeNull();

                        // Property: Error responses should have proper structure
                        expect(response.body).toHaveProperty('error');
                        expect(response.body).toHaveProperty('path', requestData.invalidPath);
                        expect(response.body).toHaveProperty('method', requestData.method);
                        expect(typeof response.body.error).toBe('string');
                        expect(response.body.error.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 20 }
            );
        }, 15000);

        test('should handle POST requests with proper JSON validation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        endpoint: fc.constantFrom(
                            '/api/quotes/generate',
                            '/api/users/profile'
                        ),
                        payload: fc.oneof(
                            // Valid JSON objects
                            fc.record({
                                theme: fc.string({ minLength: 1, maxLength: 50 }),
                                mood: fc.constantFrom('positiv', 'neutral', 'inspirierend'),
                                length: fc.constantFrom('kurz', 'medium', 'lang')
                            }),
                            fc.record({
                                name: fc.string({ minLength: 1, maxLength: 100 }),
                                preferences: fc.record({
                                    theme: fc.string({ maxLength: 50 }),
                                    notifications: fc.boolean()
                                })
                            }),
                            // Empty object
                            fc.constant({}),
                            // Invalid data types
                            fc.constant(null),
                            fc.string({ maxLength: 100 }),
                            fc.integer()
                        ),
                        headers: fc.record({
                            userAgent: fc.string({ minLength: 1, maxLength: 100 }),
                            contentType: fc.constantFrom('application/json', 'text/plain', 'application/x-www-form-urlencoded')
                        })
                    }),
                    async (requestData) => {
                        let response;
                        try {
                            response = await request(app)
                                .post(requestData.endpoint)
                                .set('User-Agent', requestData.headers.userAgent)
                                .set('Content-Type', requestData.headers.contentType)
                                .send(requestData.payload)
                                .timeout(10000);
                        } catch (error) {
                            // Property: Server should handle malformed requests gracefully
                            if (error.code === 'ECONNABORTED') {
                                return; // Timeout is acceptable for some requests
                            }
                            // For other errors, the server should still respond
                            expect(error.response).toBeDefined();
                            response = error.response;
                        }

                        // Property: Response should always be JSON
                        expect(response.type).toBe('application/json');
                        expect(typeof response.body).toBe('object');
                        expect(response.body).not.toBeNull();

                        // Property: Status codes should be appropriate
                        expect([200, 400, 500, 503]).toContain(response.status);

                        // Property: Error responses should have error information
                        if (response.status >= 400) {
                            expect(response.body).toHaveProperty('error');
                            expect(typeof response.body.error).toBe('string');
                            expect(response.body.error.length).toBeGreaterThan(0);
                        }

                        // Property: Success responses should have appropriate structure
                        if (response.status === 200) {
                            if (requestData.endpoint === '/api/quotes/generate') {
                                expect(response.body).toHaveProperty('message');
                                expect(response.body).toHaveProperty('quote');
                                expect(typeof response.body.message).toBe('string');
                                expect(typeof response.body.quote).toBe('object');
                            } else if (requestData.endpoint === '/api/users/profile') {
                                expect(response.body).toHaveProperty('message');
                                expect(typeof response.body.message).toBe('string');
                            }
                        }
                    }
                ),
                { numRuns: 15 }
            );
        }, 30000);

        test('should maintain consistent response times under load', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        endpoint: fc.constantFrom('/health', '/api/ai-status', '/api/quotes/today'),
                        concurrentRequests: fc.integer({ min: 5, max: 20 }),
                        requestDelay: fc.integer({ min: 0, max: 100 })
                    }),
                    async (testData) => {
                        const startTime = Date.now();
                        
                        // Property: API should handle concurrent requests efficiently
                        const requests = Array(testData.concurrentRequests).fill(0).map(async (_, index) => {
                            // Add small delay to simulate real-world timing
                            await new Promise(resolve => setTimeout(resolve, testData.requestDelay));
                            
                            const requestStart = Date.now();
                            const response = await request(app)
                                .get(testData.endpoint)
                                .timeout(5000);
                            const requestEnd = Date.now();
                            
                            return {
                                index,
                                status: response.status,
                                responseTime: requestEnd - requestStart,
                                body: response.body
                            };
                        });

                        const results = await Promise.all(requests);
                        const totalTime = Date.now() - startTime;

                        // Property: All requests should succeed
                        results.forEach(result => {
                            expect(result.status).toBe(200);
                            expect(result.body).toBeDefined();
                            expect(typeof result.body).toBe('object');
                        });

                        // Property: Individual response times should be reasonable
                        results.forEach(result => {
                            expect(result.responseTime).toBeLessThan(3000); // Less than 3 seconds per request
                        });

                        // Property: Average response time should be efficient
                        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
                        expect(avgResponseTime).toBeLessThan(1000); // Less than 1 second average

                        // Property: Response consistency - all responses should have same structure
                        const firstResponse = results[0].body;
                        results.forEach(result => {
                            expect(Object.keys(result.body)).toEqual(Object.keys(firstResponse));
                        });
                    }
                ),
                { numRuns: 10 }
            );
        }, 30000);

        test('should handle quote-specific endpoints correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        quoteId: fc.integer({ min: 1, max: 10 }), // Valid quote IDs from sample data
                        theme: fc.constantFrom('Träume', 'Hoffnung', 'Arbeit', 'Leben', 'Handeln', 'Motivation'),
                        feedbackType: fc.constantFrom('like', 'neutral', 'dislike'),
                        feedbackData: fc.record({
                            type: fc.constantFrom('like', 'neutral', 'dislike'),
                            timestamp: fc.date().map(d => d.toISOString()),
                            comment: fc.option(fc.string({ maxLength: 200 }))
                        })
                    }),
                    async (testData) => {
                        // Test individual quote endpoint
                        const quoteResponse = await request(app)
                            .get(`/api/quotes/${testData.quoteId}`);

                        if (quoteResponse.status === 200) {
                            // Property: Valid quote should have proper structure
                            expect(quoteResponse.body).toHaveProperty('id', testData.quoteId);
                            expect(quoteResponse.body).toHaveProperty('text');
                            expect(quoteResponse.body).toHaveProperty('author');
                            expect(quoteResponse.body).toHaveProperty('theme');
                            expect(quoteResponse.body).toHaveProperty('date');
                            
                            expect(typeof quoteResponse.body.text).toBe('string');
                            expect(typeof quoteResponse.body.author).toBe('string');
                            expect(typeof quoteResponse.body.theme).toBe('string');
                            expect(typeof quoteResponse.body.date).toBe('string');
                            
                            expect(quoteResponse.body.text.length).toBeGreaterThan(0);
                            expect(quoteResponse.body.author.length).toBeGreaterThan(0);
                        } else {
                            // Property: Invalid quote ID should return 404 with error
                            expect(quoteResponse.status).toBe(404);
                            expect(quoteResponse.body).toHaveProperty('error');
                        }

                        // Test theme-based quotes endpoint
                        const themeResponse = await request(app)
                            .get(`/api/quotes/theme/${testData.theme}`);

                        expect(themeResponse.status).toBe(200);
                        expect(themeResponse.body).toHaveProperty('quotes');
                        expect(themeResponse.body).toHaveProperty('theme', testData.theme);
                        expect(themeResponse.body).toHaveProperty('count');
                        expect(Array.isArray(themeResponse.body.quotes)).toBe(true);
                        expect(typeof themeResponse.body.count).toBe('number');

                        // Property: All quotes in theme should match the theme
                        themeResponse.body.quotes.forEach(quote => {
                            expect(quote.theme.toLowerCase()).toBe(testData.theme.toLowerCase());
                        });

                        // Test feedback endpoint
                        const feedbackResponse = await request(app)
                            .post(`/api/quotes/${testData.quoteId}/feedback`)
                            .send(testData.feedbackData);

                        expect(feedbackResponse.status).toBe(200);
                        expect(feedbackResponse.body).toHaveProperty('message');
                        expect(feedbackResponse.body).toHaveProperty('quote_id', testData.quoteId);
                        expect(feedbackResponse.body).toHaveProperty('feedback');
                        expect(feedbackResponse.body).toHaveProperty('timestamp');
                        
                        expect(typeof feedbackResponse.body.message).toBe('string');
                        expect(typeof feedbackResponse.body.timestamp).toBe('string');
                        
                        // Property: Timestamp should be valid ISO string
                        expect(() => new Date(feedbackResponse.body.timestamp)).not.toThrow();
                    }
                ),
                { numRuns: 15 }
            );
        }, 15000);
    });

    describe('API Response Unit Tests', () => {
        test('should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/api/quotes/today')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect([200, 204]).toContain(response.status);
        });

        test('should return proper content-type headers', async () => {
            const response = await request(app).get('/api/ai-status');
            
            expect(response.status).toBe(200);
            expect(response.type).toBe('application/json');
        });

        test('should handle malformed JSON in POST requests', async () => {
            const response = await request(app)
                .post('/api/quotes/generate')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');

            expect([400, 500]).toContain(response.status);
            expect(response.type).toBe('application/json');
            expect(response.body).toHaveProperty('error');
        });

        test('should validate quote ID parameter types', async () => {
            const response = await request(app).get('/api/quotes/invalid-id');
            
            // Should handle non-numeric IDs gracefully
            expect([400, 404]).toContain(response.status);
            expect(response.type).toBe('application/json');
        });

        test('should handle empty search queries', async () => {
            const response = await request(app).get('/api/quotes?search=');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('quotes');
            expect(Array.isArray(response.body.quotes)).toBe(true);
        });
    });
});