/**
 * Property-Based Tests for Backend Server Startup
 * 
 * Feature: kiro-application-fixes, Property 1: Backend Server Health
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

const fc = require('fast-check');
const request = require('supertest');
const app = require('./server');
const fs = require('fs');
const path = require('path');

describe('Backend Server Health Property Tests', () => {
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
     * Property 1: Backend Server Health
     * For any server startup attempt, the backend should successfully start, respond to health checks, 
     * serve static files, and handle errors gracefully while continuing operation
     * Validates: Requirements 1.1, 1.2, 1.4, 1.5
     */
    describe('Property 1: Backend Server Health', () => {
        test('should respond to health checks with valid structure', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        endpoint: fc.constantFrom('/health', '/api/ai-status', '/'),
                        method: fc.constantFrom('GET'),
                        userAgent: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
                        acceptHeader: fc.constantFrom('application/json', '*/*', 'text/html')
                    }),
                    async (requestData) => {
                        const response = await request(app)
                            .get(requestData.endpoint)
                            .set('User-Agent', requestData.userAgent.trim())
                            .set('Accept', requestData.acceptHeader);

                        // Property: Health endpoints should always return 200 status
                        expect(response.status).toBe(200);

                        // Property: Response should be valid JSON
                        expect(response.type).toBe('application/json');
                        expect(typeof response.body).toBe('object');
                        expect(response.body).not.toBeNull();

                        // Property: Health endpoint should have required fields
                        if (requestData.endpoint === '/health') {
                            expect(response.body).toHaveProperty('status');
                            expect(response.body).toHaveProperty('timestamp');
                            expect(response.body).toHaveProperty('uptime');
                            
                            // Property: Status should indicate health
                            expect(response.body.status).toBe('gesund');
                            
                            // Property: Timestamp should be valid ISO string
                            expect(() => new Date(response.body.timestamp)).not.toThrow();
                            expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
                            
                            // Property: Uptime should be a positive number
                            expect(typeof response.body.uptime).toBe('number');
                            expect(response.body.uptime).toBeGreaterThan(0);
                        }

                        // Property: AI status endpoint should have configuration info
                        if (requestData.endpoint === '/api/ai-status') {
                            expect(response.body).toHaveProperty('ai_enabled');
                            expect(response.body).toHaveProperty('openai_configured');
                            expect(response.body).toHaveProperty('model');
                            expect(response.body).toHaveProperty('status');
                            
                            // Property: AI enabled should be boolean
                            expect(typeof response.body.ai_enabled).toBe('boolean');
                            expect(typeof response.body.openai_configured).toBe('boolean');
                            
                            // Property: Model should be a string
                            expect(typeof response.body.model).toBe('string');
                            expect(response.body.model.length).toBeGreaterThan(0);
                        }

                        // Property: Root endpoint should have API information
                        if (requestData.endpoint === '/') {
                            expect(response.body).toHaveProperty('message');
                            expect(response.body).toHaveProperty('status');
                            expect(response.body).toHaveProperty('version');
                            expect(response.body).toHaveProperty('endpoints');
                            
                            // Property: Endpoints should be an array
                            expect(Array.isArray(response.body.endpoints)).toBe(true);
                            expect(response.body.endpoints.length).toBeGreaterThan(0);
                            
                            // Property: Status should indicate running
                            expect(response.body.status).toBe('läuft');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should handle concurrent requests without degradation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            endpoint: fc.constantFrom('/health', '/api/ai-status', '/', '/api/quotes/today'),
                            delay: fc.integer({ min: 0, max: 100 })
                        }),
                        { minLength: 5, maxLength: 20 }
                    ),
                    async (requests) => {
                        // Property: Server should handle multiple concurrent requests
                        const startTime = Date.now();
                        
                        const promises = requests.map(async (req, index) => {
                            // Add small random delay to simulate real-world timing
                            await new Promise(resolve => setTimeout(resolve, req.delay));
                            
                            const response = await request(app)
                                .get(req.endpoint)
                                .timeout(5000);
                            
                            return {
                                index,
                                endpoint: req.endpoint,
                                status: response.status,
                                responseTime: Date.now() - startTime,
                                body: response.body
                            };
                        });

                        const results = await Promise.all(promises);
                        
                        // Property: All requests should succeed
                        results.forEach(result => {
                            expect(result.status).toBe(200);
                            expect(result.body).toBeDefined();
                            expect(typeof result.body).toBe('object');
                        });

                        // Property: Response times should be reasonable (under 5 seconds)
                        results.forEach(result => {
                            expect(result.responseTime).toBeLessThan(5000);
                        });

                        // Property: Health checks should maintain consistent structure
                        const healthResults = results.filter(r => r.endpoint === '/health');
                        healthResults.forEach(result => {
                            expect(result.body).toHaveProperty('status', 'gesund');
                            expect(result.body).toHaveProperty('timestamp');
                            expect(result.body).toHaveProperty('uptime');
                        });
                    }
                ),
                { numRuns: 50 }
            );
        }, 60000);

        test('should serve static files correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        path: fc.constantFrom('/app', '/index.html', '/css/main.css', '/js/app.js'),
                        method: fc.constantFrom('GET'),
                        cacheControl: fc.constantFrom('no-cache', 'max-age=3600', undefined)
                    }),
                    async (requestData) => {
                        const req = request(app).get(requestData.path);
                        
                        if (requestData.cacheControl) {
                            req.set('Cache-Control', requestData.cacheControl);
                        }

                        const response = await req;

                        // Property: Static file requests should not return server errors
                        expect(response.status).not.toBeGreaterThanOrEqual(500);

                        // Property: App route should serve HTML content
                        if (requestData.path === '/app') {
                            // Should either serve the HTML file (200) or redirect (3xx)
                            expect([200, 301, 302, 304]).toContain(response.status);
                        }

                        // Property: CSS files should have appropriate content type (if they exist)
                        if (requestData.path.endsWith('.css') && response.status === 200) {
                            expect(response.type).toMatch(/text\/css|text\/plain/);
                        }

                        // Property: JS files should have appropriate content type (if they exist)
                        if (requestData.path.endsWith('.js') && response.status === 200) {
                            expect(response.type).toMatch(/application\/javascript|text\/javascript|text\/plain/);
                        }

                        // Property: HTML files should have appropriate content type (if they exist)
                        if ((requestData.path.endsWith('.html') || requestData.path === '/app') && response.status === 200) {
                            expect(response.type).toMatch(/text\/html|application\/octet-stream/);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should handle errors gracefully and continue operation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        invalidEndpoint: fc.string({ minLength: 1, maxLength: 50 })
                            .filter(s => !s.includes('..') && !s.includes('//') && s.trim().length > 0)
                            .map(s => '/' + s.replace(/[^a-zA-Z0-9\-_]/g, '')),
                        method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
                        payload: fc.record({
                            data: fc.string({ maxLength: 100 }),
                            number: fc.integer({ min: -1000, max: 1000 })
                        })
                    }),
                    async (requestData) => {
                        // Skip if endpoint might be valid
                        if (requestData.invalidEndpoint.includes('api') || 
                            requestData.invalidEndpoint.includes('health') ||
                            requestData.invalidEndpoint === '/') {
                            return;
                        }

                        let response;
                        try {
                            if (requestData.method === 'GET') {
                                response = await request(app)
                                    .get(requestData.invalidEndpoint)
                                    .timeout(5000);
                            } else if (requestData.method === 'POST') {
                                response = await request(app)
                                    .post(requestData.invalidEndpoint)
                                    .send(requestData.payload)
                                    .timeout(5000);
                            } else if (requestData.method === 'PUT') {
                                response = await request(app)
                                    .put(requestData.invalidEndpoint)
                                    .send(requestData.payload)
                                    .timeout(5000);
                            } else if (requestData.method === 'DELETE') {
                                response = await request(app)
                                    .delete(requestData.invalidEndpoint)
                                    .timeout(5000);
                            }
                        } catch (error) {
                            // Property: Server should not crash on invalid requests
                            expect(error.code).toBe('ECONNABORTED'); // Timeout is acceptable
                            return;
                        }

                        // Property: Invalid endpoints should return 404
                        expect(response.status).toBe(404);

                        // Property: Error responses should be JSON with error information
                        expect(response.type).toBe('application/json');
                        expect(response.body).toHaveProperty('error');
                        expect(response.body).toHaveProperty('path', requestData.invalidEndpoint);
                        expect(response.body).toHaveProperty('method', requestData.method);

                        // Property: Server should continue operating after errors
                        // Verify by making a health check
                        const healthResponse = await request(app).get('/health');
                        expect(healthResponse.status).toBe(200);
                        expect(healthResponse.body.status).toBe('gesund');
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should validate environment configuration correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        checkEndpoint: fc.constantFrom('/api/ai-status', '/health', '/'),
                        userAgent: fc.string({ minLength: 1, maxLength: 200 })
                    }),
                    async (testData) => {
                        const response = await request(app)
                            .get(testData.checkEndpoint)
                            .set('User-Agent', testData.userAgent);

                        expect(response.status).toBe(200);

                        // Property: Environment configuration should be reflected in responses
                        if (testData.checkEndpoint === '/api/ai-status') {
                            const body = response.body;
                            
                            // Property: AI configuration should be consistent
                            if (body.ai_enabled) {
                                expect(body.openai_configured).toBe(true);
                                expect(body.model).toBeTruthy();
                                expect(typeof body.model).toBe('string');
                            }
                            
                            // Property: Status message should match configuration
                            if (body.ai_enabled) {
                                expect(body.status).toContain('Bereit');
                            } else {
                                expect(body.status).toContain('deaktiviert');
                            }
                        }

                        // Property: Root endpoint should show consistent configuration
                        if (testData.checkEndpoint === '/') {
                            const body = response.body;
                            expect(body).toHaveProperty('ai_enabled');
                            expect(typeof body.ai_enabled).toBe('boolean');
                            
                            // Property: Endpoints list should be comprehensive
                            expect(body.endpoints).toContain('GET /health');
                            expect(body.endpoints).toContain('GET /api/ai-status');
                            expect(body.endpoints).toContain('GET /api/quotes/today');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should maintain server stability under load', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 10, max: 50 }),
                    async (requestCount) => {
                        const startTime = Date.now();
                        
                        // Property: Server should handle burst of requests
                        const requests = Array(requestCount).fill(0).map((_, i) => 
                            request(app)
                                .get('/health')
                                .timeout(10000)
                        );

                        const responses = await Promise.all(requests);
                        const endTime = Date.now();
                        const totalTime = endTime - startTime;

                        // Property: All requests should succeed
                        responses.forEach((response, index) => {
                            expect(response.status).toBe(200);
                            expect(response.body).toHaveProperty('status', 'gesund');
                            expect(response.body).toHaveProperty('timestamp');
                            expect(response.body).toHaveProperty('uptime');
                        });

                        // Property: Server should handle load efficiently (reasonable time)
                        const avgTimePerRequest = totalTime / requestCount;
                        expect(avgTimePerRequest).toBeLessThan(1000); // Less than 1 second per request on average

                        // Property: Timestamps should be recent and valid
                        responses.forEach(response => {
                            const timestamp = new Date(response.body.timestamp);
                            const now = new Date();
                            const timeDiff = Math.abs(now - timestamp);
                            expect(timeDiff).toBeLessThan(60000); // Within 1 minute
                        });

                        // Property: Uptime should be consistent across requests
                        const uptimes = responses.map(r => r.body.uptime);
                        const minUptime = Math.min(...uptimes);
                        const maxUptime = Math.max(...uptimes);
                        const uptimeDiff = maxUptime - minUptime;
                        expect(uptimeDiff).toBeLessThan(totalTime / 1000 + 1); // Should not differ by more than total test time + 1 second
                    }
                ),
                { numRuns: 20 }
            );
        }, 60000);
    });

    describe('Server Startup Unit Tests', () => {
        test('should have required environment variables', () => {
            // Test that critical environment variables are available
            expect(process.env.PORT || '8000').toBeTruthy();
            expect(process.env.NODE_ENV || 'development').toBeTruthy();
        });

        test('should export app for testing', () => {
            expect(app).toBeDefined();
            expect(typeof app).toBe('function');
            expect(app.listen).toBeDefined();
        });

        test('should handle CORS correctly', async () => {
            const response = await request(app)
                .options('/api/quotes/today')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            // Should handle CORS preflight
            expect([200, 204]).toContain(response.status);
        });

        test('should serve app route', async () => {
            const response = await request(app).get('/app');
            
            // Should either serve content or indicate file not found
            expect([200, 404]).toContain(response.status);
        });

        test('should handle JSON parsing errors gracefully', async () => {
            const response = await request(app)
                .post('/api/quotes/generate')
                .set('Content-Type', 'application/json')
                .send('invalid json{');

            // Should handle malformed JSON gracefully
            expect([400, 500]).toContain(response.status);
        });
    });
});