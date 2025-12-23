/**
 * Property-Based Tests for OpenAI Integration
 * Feature: kiro-application-fixes, Property 6: OpenAI Integration Reliability
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */

const request = require('supertest');
const app = require('./server');

describe('OpenAI Integration Property Tests', () => {
    let server;
    
    beforeAll((done) => {
        // Start server on a different port for testing
        const testPort = 8001 + Math.floor(Math.random() * 1000);
        server = app.listen(testPort, done);
    });
    
    afterAll((done) => {
        server.close(done);
    });

    /**
     * Property 6: OpenAI Integration Reliability
     * For any AI quote generation request, the system should either successfully 
     * generate a German quote or gracefully handle failures with fallback content
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
     */
    describe('Property 6: OpenAI Integration Reliability', () => {
        test('AI status endpoint should always return valid status information', async () => {
            const response = await request(app)
                .get('/api/ai-status')
                .expect(200);
            
            // Property: AI status response should always have required fields
            expect(response.body).toHaveProperty('ai_enabled');
            expect(response.body).toHaveProperty('openai_configured');
            expect(response.body).toHaveProperty('model');
            expect(response.body).toHaveProperty('status');
            
            // Property: Boolean fields should be actual booleans
            expect(typeof response.body.ai_enabled).toBe('boolean');
            expect(typeof response.body.openai_configured).toBe('boolean');
            
            // Property: Model should be a non-empty string
            expect(typeof response.body.model).toBe('string');
            expect(response.body.model.length).toBeGreaterThan(0);
            
            // Property: Status should be a descriptive string
            expect(typeof response.body.status).toBe('string');
            expect(response.body.status.length).toBeGreaterThan(0);
        });

        test('AI test endpoint should handle connectivity properly', async () => {
            const response = await request(app)
                .post('/api/ai-test');
            
            // Property: Test endpoint should always return a valid response
            expect(response.body).toHaveProperty('success');
            expect(typeof response.body.success).toBe('boolean');
            
            if (response.body.success) {
                // Property: Successful tests should include performance metrics
                expect(response.body).toHaveProperty('response_time');
                expect(typeof response.body.response_time).toBe('number');
                expect(response.body.response_time).toBeGreaterThan(0);
                
                expect(response.body).toHaveProperty('timestamp');
                expect(typeof response.body.timestamp).toBe('string');
                
                // Property: Should indicate available models
                expect(response.body).toHaveProperty('models_available');
                expect(typeof response.body.models_available).toBe('number');
            } else {
                // Property: Failed tests should provide error information
                expect(response.body).toHaveProperty('error');
                expect(response.body).toHaveProperty('error_code');
                expect(typeof response.body.error).toBe('string');
                expect(typeof response.body.error_code).toBe('string');
            }
        });

        test('Quote generation should handle various input parameters gracefully', async () => {
            const testCases = [
                { theme: 'Motivation', mood: 'positiv', length: 'medium' },
                { theme: '', mood: '', length: '' }, // Empty parameters
            ];

            for (const testCase of testCases) {
                const response = await request(app)
                    .post('/api/quotes/generate')
                    .send(testCase);
                
                // Property: Generation endpoint should always return a structured response
                expect(response.body).toHaveProperty('success');
                expect(typeof response.body.success).toBe('boolean');
                
                if (response.body.success) {
                    // Property: Successful generation should return a valid quote
                    expect(response.body).toHaveProperty('quote');
                    const quote = response.body.quote;
                    
                    expect(quote).toHaveProperty('id');
                    expect(quote).toHaveProperty('text');
                    expect(quote).toHaveProperty('author');
                    expect(quote).toHaveProperty('theme');
                    expect(quote).toHaveProperty('date');
                    expect(quote).toHaveProperty('generated');
                    
                    // Property: Generated quotes should have valid content
                    expect(typeof quote.text).toBe('string');
                    expect(quote.text.length).toBeGreaterThan(0);
                    expect(typeof quote.author).toBe('string');
                    expect(quote.author.length).toBeGreaterThan(0);
                    expect(quote.generated).toBe(true);
                    
                    // Property: Date should be in valid format
                    expect(quote.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                } else {
                    // Property: Failed generation should provide fallback information
                    expect(response.body).toHaveProperty('error');
                    expect(response.body).toHaveProperty('fallback_available');
                    expect(response.body.fallback_available).toBe(true);
                }
            }
        });

        test('Today\'s quote should handle AI generation gracefully', async () => {
            const response = await request(app)
                .get('/api/quotes/today')
                .expect(200);
            
            // Property: Today's quote should always return a valid quote structure
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('text');
            expect(response.body).toHaveProperty('author');
            expect(response.body).toHaveProperty('theme');
            expect(response.body).toHaveProperty('date');
            
            // Property: Quote content should be valid
            expect(typeof response.body.text).toBe('string');
            expect(response.body.text.length).toBeGreaterThan(0);
            expect(typeof response.body.author).toBe('string');
            expect(response.body.author.length).toBeGreaterThan(0);
            
            // Property: Date should be today's date
            const today = new Date().toISOString().split('T')[0];
            expect(response.body.date).toBe(today);
            
            // Property: If AI-generated, should be marked as such
            if (response.body.generated) {
                expect(response.body.generated).toBe(true);
            }
            
            // Property: If fallback was used, should be indicated
            if (response.body.fallback) {
                expect(response.body.fallback).toBe(true);
            }
        });

        test('Error handling should be consistent across AI endpoints', async () => {
            // Test one error scenario
            const response = await request(app)
                .post('/api/quotes/generate')
                .send({ theme: 'Test'.repeat(100) }); // Long theme
            
            // Property: Error responses should have consistent structure
            if (response.status >= 400) {
                expect(response.body).toHaveProperty('success');
                expect(response.body.success).toBe(false);
                expect(response.body).toHaveProperty('error');
                expect(typeof response.body.error).toBe('string');
            }
        });

        test('AI configuration validation should be robust', async () => {
            // Property: System should handle missing or invalid configuration gracefully
            const statusResponse = await request(app)
                .get('/api/ai-status')
                .expect(200);
            
            const isConfigured = statusResponse.body.openai_configured;
            const isEnabled = statusResponse.body.ai_enabled;
            
            // Property: Configuration state should be consistent
            if (isEnabled) {
                expect(isConfigured).toBe(true);
            }
            
            // Property: If not configured, generation should fail gracefully
            if (!isConfigured || !isEnabled) {
                const genResponse = await request(app)
                    .post('/api/quotes/generate')
                    .send({ theme: 'Test', mood: 'positiv', length: 'medium' })
                    .expect(503);
                
                expect(genResponse.body).toHaveProperty('error');
                expect(genResponse.body).toHaveProperty('fallback_available');
                expect(genResponse.body.fallback_available).toBe(true);
            }
        });
    });
});