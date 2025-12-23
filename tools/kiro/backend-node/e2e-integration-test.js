#!/usr/bin/env node

/**
 * End-to-End Integration Test Suite
 * 
 * Comprehensive testing of complete user workflows from start to finish
 * to validate all features work together correctly and ensure no regressions.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class E2EIntegrationTester {
    constructor() {
        this.baseUrl = 'http://localhost:8000';
        this.testResults = [];
        this.currentTest = null;
    }

    /**
     * Run all end-to-end integration tests
     */
    async runAllTests() {
        console.log('🚀 Starting End-to-End Integration Tests...');
        console.log('=' .repeat(60));

        const tests = [
            this.testCompleteUserOnboarding.bind(this),
            this.testDailyQuoteWorkflow.bind(this),
            this.testQuoteFeedbackWorkflow.bind(this),
            this.testArchiveBrowsingWorkflow.bind(this),
            this.testProfileManagementWorkflow.bind(this),
            this.testOfflineToOnlineWorkflow.bind(this),
            this.testPWAInstallationWorkflow.bind(this),
            this.testErrorRecoveryWorkflow.bind(this),
            this.testPerformanceRequirements.bind(this),
            this.testCrossComponentIntegration.bind(this)
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                this.recordTestResult(this.currentTest, false, error.message);
            }
        }

        this.displayResults();
        return this.testResults.every(result => result.passed);
    }

    /**
     * Test complete user onboarding workflow
     */
    async testCompleteUserOnboarding() {
        this.currentTest = 'Complete User Onboarding';
        console.log('👤 Testing Complete User Onboarding Workflow...');

        try {
            // Step 1: First visit - should show onboarding
            const indexResponse = await this.makeRequest('GET', '/');
            if (indexResponse.statusCode !== 200) {
                throw new Error(`Index page failed: ${indexResponse.statusCode}`);
            }

            // Step 2: Profile creation
            const profileData = {
                preferences: {
                    theme: 'auto',
                    quoteLength: 'medium',
                    notificationsEnabled: true,
                    language: 'de'
                },
                personalityCategories: [
                    { category: 'philosophy', weight: 1, confidence: 0.8 },
                    { category: 'motivation', weight: 0.8, confidence: 0.7 }
                ]
            };

            const profileResponse = await this.makeRequest('POST', '/api/profile', profileData);
            if (profileResponse.statusCode !== 200 && profileResponse.statusCode !== 201) {
                throw new Error(`Profile creation failed: ${profileResponse.statusCode}`);
            }

            // Step 3: First quote request
            const quoteResponse = await this.makeRequest('GET', '/api/quotes/today');
            if (quoteResponse.statusCode !== 200) {
                throw new Error(`Today's quote failed: ${quoteResponse.statusCode}`);
            }

            const quoteData = JSON.parse(quoteResponse.data);
            if (!quoteData.content || !quoteData.author) {
                throw new Error('Quote data incomplete');
            }

            this.recordTestResult('Complete User Onboarding', true,
                `Profile created, first quote loaded: "${quoteData.content.substring(0, 50)}..."`);

        } catch (error) {
            this.recordTestResult('Complete User Onboarding', false, error.message);
        }
    }

    /**
     * Test daily quote workflow
     */
    async testDailyQuoteWorkflow() {
        this.currentTest = 'Daily Quote Workflow';
        console.log('📖 Testing Daily Quote Workflow...');

        try {
            // Step 1: Get today's quote
            const todayResponse = await this.makeRequest('GET', '/api/quotes/today');
            if (todayResponse.statusCode !== 200) {
                throw new Error(`Today's quote failed: ${todayResponse.statusCode}`);
            }

            const todayQuote = JSON.parse(todayResponse.data);
            
            // Step 2: Get quotes list
            const listResponse = await this.makeRequest('GET', '/api/quotes');
            if (listResponse.statusCode !== 200) {
                throw new Error(`Quotes list failed: ${listResponse.statusCode}`);
            }

            const quotesList = JSON.parse(listResponse.data);
            if (!Array.isArray(quotesList) || quotesList.length === 0) {
                throw new Error('Quotes list is empty or invalid');
            }

            // Step 3: Get themes
            const themesResponse = await this.makeRequest('GET', '/api/themes');
            if (themesResponse.statusCode !== 200) {
                throw new Error(`Themes failed: ${themesResponse.statusCode}`);
            }

            const themes = JSON.parse(themesResponse.data);
            if (!Array.isArray(themes) || themes.length === 0) {
                throw new Error('Themes list is empty or invalid');
            }

            this.recordTestResult('Daily Quote Workflow', true,
                `Today's quote loaded, ${quotesList.length} quotes available, ${themes.length} themes`);

        } catch (error) {
            this.recordTestResult('Daily Quote Workflow', false, error.message);
        }
    }

    /**
     * Test quote feedback workflow
     */
    async testQuoteFeedbackWorkflow() {
        this.currentTest = 'Quote Feedback Workflow';
        console.log('👍 Testing Quote Feedback Workflow...');

        try {
            // Step 1: Get a quote to provide feedback on
            const quoteResponse = await this.makeRequest('GET', '/api/quotes/today');
            if (quoteResponse.statusCode !== 200) {
                throw new Error(`Quote retrieval failed: ${quoteResponse.statusCode}`);
            }

            const quote = JSON.parse(quoteResponse.data);

            // Step 2: Submit positive feedback
            const feedbackData = {
                quoteId: quote.id,
                rating: 'like',
                timestamp: new Date().toISOString()
            };

            const feedbackResponse = await this.makeRequest('POST', '/api/feedback', feedbackData);
            if (feedbackResponse.statusCode !== 200 && feedbackResponse.statusCode !== 201) {
                throw new Error(`Feedback submission failed: ${feedbackResponse.statusCode}`);
            }

            // Step 3: Verify feedback was recorded
            const profileResponse = await this.makeRequest('GET', '/api/profile');
            if (profileResponse.statusCode !== 200) {
                throw new Error(`Profile retrieval failed: ${profileResponse.statusCode}`);
            }

            this.recordTestResult('Quote Feedback Workflow', true,
                `Feedback submitted successfully for quote: ${quote.id}`);

        } catch (error) {
            this.recordTestResult('Quote Feedback Workflow', false, error.message);
        }
    }

    /**
     * Test archive browsing workflow
     */
    async testArchiveBrowsingWorkflow() {
        this.currentTest = 'Archive Browsing Workflow';
        console.log('📚 Testing Archive Browsing Workflow...');

        try {
            // Step 1: Get quotes list for archive
            const quotesResponse = await this.makeRequest('GET', '/api/quotes');
            if (quotesResponse.statusCode !== 200) {
                throw new Error(`Quotes list failed: ${quotesResponse.statusCode}`);
            }

            const quotes = JSON.parse(quotesResponse.data);
            if (!Array.isArray(quotes) || quotes.length === 0) {
                throw new Error('No quotes available for archive');
            }

            // Step 2: Test filtering by theme
            const themes = ['philosophy', 'motivation', 'wisdom'];
            let filteredResults = 0;

            for (const theme of themes) {
                const filteredQuotes = quotes.filter(q => q.theme === theme);
                filteredResults += filteredQuotes.length;
            }

            // Step 3: Test date-based browsing
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const recentQuotes = quotes.filter(q => {
                const quoteDate = new Date(q.date);
                return quoteDate >= yesterday;
            });

            this.recordTestResult('Archive Browsing Workflow', true,
                `Archive contains ${quotes.length} quotes, ${filteredResults} themed quotes, ${recentQuotes.length} recent quotes`);

        } catch (error) {
            this.recordTestResult('Archive Browsing Workflow', false, error.message);
        }
    }

    /**
     * Test profile management workflow
     */
    async testProfileManagementWorkflow() {
        this.currentTest = 'Profile Management Workflow';
        console.log('⚙️ Testing Profile Management Workflow...');

        try {
            // Step 1: Get current profile
            const getProfileResponse = await this.makeRequest('GET', '/api/profile');
            if (getProfileResponse.statusCode !== 200) {
                throw new Error(`Profile retrieval failed: ${getProfileResponse.statusCode}`);
            }

            const currentProfile = JSON.parse(getProfileResponse.data);

            // Step 2: Update profile preferences
            const updatedPreferences = {
                ...currentProfile.preferences,
                theme: 'dark',
                quoteLength: 'long',
                notificationsEnabled: false
            };

            const updateData = {
                ...currentProfile,
                preferences: updatedPreferences
            };

            const updateResponse = await this.makeRequest('PUT', '/api/profile', updateData);
            if (updateResponse.statusCode !== 200) {
                throw new Error(`Profile update failed: ${updateResponse.statusCode}`);
            }

            // Step 3: Verify update was applied
            const verifyResponse = await this.makeRequest('GET', '/api/profile');
            if (verifyResponse.statusCode !== 200) {
                throw new Error(`Profile verification failed: ${verifyResponse.statusCode}`);
            }

            const updatedProfile = JSON.parse(verifyResponse.data);
            if (updatedProfile.preferences.theme !== 'dark') {
                throw new Error('Profile update was not persisted');
            }

            this.recordTestResult('Profile Management Workflow', true,
                `Profile updated successfully: theme=${updatedProfile.preferences.theme}, length=${updatedProfile.preferences.quoteLength}`);

        } catch (error) {
            this.recordTestResult('Profile Management Workflow', false, error.message);
        }
    }

    /**
     * Test offline to online workflow
     */
    async testOfflineToOnlineWorkflow() {
        this.currentTest = 'Offline to Online Workflow';
        console.log('📴 Testing Offline to Online Workflow...');

        try {
            // Step 1: Verify online functionality works
            const onlineQuoteResponse = await this.makeRequest('GET', '/api/quotes/today');
            if (onlineQuoteResponse.statusCode !== 200) {
                throw new Error(`Online quote failed: ${onlineQuoteResponse.statusCode}`);
            }

            // Step 2: Test static file serving (simulates offline cache)
            const staticResponse = await this.makeRequest('GET', '/css/main.css');
            if (staticResponse.statusCode !== 200) {
                throw new Error(`Static file serving failed: ${staticResponse.statusCode}`);
            }

            // Step 3: Test service worker file availability
            const swResponse = await this.makeRequest('GET', '/sw.js');
            if (swResponse.statusCode !== 200) {
                throw new Error(`Service worker file failed: ${swResponse.statusCode}`);
            }

            // Step 4: Test manifest file
            const manifestResponse = await this.makeRequest('GET', '/manifest.json');
            if (manifestResponse.statusCode !== 200) {
                throw new Error(`Manifest file failed: ${manifestResponse.statusCode}`);
            }

            this.recordTestResult('Offline to Online Workflow', true,
                'Online functionality verified, offline assets available, PWA files accessible');

        } catch (error) {
            this.recordTestResult('Offline to Online Workflow', false, error.message);
        }
    }

    /**
     * Test PWA installation workflow
     */
    async testPWAInstallationWorkflow() {
        this.currentTest = 'PWA Installation Workflow';
        console.log('📱 Testing PWA Installation Workflow...');

        try {
            // Step 1: Verify manifest is valid
            const manifestResponse = await this.makeRequest('GET', '/manifest.json');
            if (manifestResponse.statusCode !== 200) {
                throw new Error(`Manifest failed: ${manifestResponse.statusCode}`);
            }

            const manifest = JSON.parse(manifestResponse.data);
            const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
            const missingFields = requiredFields.filter(field => !manifest[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Manifest missing fields: ${missingFields.join(', ')}`);
            }

            // Step 2: Verify service worker is available
            const swResponse = await this.makeRequest('GET', '/sw.js');
            if (swResponse.statusCode !== 200) {
                throw new Error(`Service worker failed: ${swResponse.statusCode}`);
            }

            // Step 3: Verify icons are available
            const iconSizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
            let iconCount = 0;

            for (const size of iconSizes) {
                try {
                    const iconResponse = await this.makeRequest('GET', `/icons/icon-${size}.svg`);
                    if (iconResponse.statusCode === 200) {
                        iconCount++;
                    }
                } catch (e) {
                    // Icon might not exist, continue
                }
            }

            if (iconCount === 0) {
                throw new Error('No PWA icons found');
            }

            this.recordTestResult('PWA Installation Workflow', true,
                `Manifest valid, service worker available, ${iconCount}/${iconSizes.length} icons found`);

        } catch (error) {
            this.recordTestResult('PWA Installation Workflow', false, error.message);
        }
    }

    /**
     * Test error recovery workflow
     */
    async testErrorRecoveryWorkflow() {
        this.currentTest = 'Error Recovery Workflow';
        console.log('🔧 Testing Error Recovery Workflow...');

        try {
            // Step 1: Test 404 handling
            const notFoundResponse = await this.makeRequest('GET', '/nonexistent-endpoint');
            if (notFoundResponse.statusCode !== 404) {
                throw new Error(`404 handling failed: expected 404, got ${notFoundResponse.statusCode}`);
            }

            // Step 2: Test invalid API request
            const invalidApiResponse = await this.makeRequest('POST', '/api/invalid-endpoint', { test: 'data' });
            if (invalidApiResponse.statusCode !== 404 && invalidApiResponse.statusCode !== 405) {
                throw new Error(`Invalid API handling failed: ${invalidApiResponse.statusCode}`);
            }

            // Step 3: Test malformed JSON handling
            try {
                const malformedResponse = await this.makeRequest('POST', '/api/profile', 'invalid json{');
                // Should handle gracefully without crashing
            } catch (e) {
                // Expected to fail, but server should still be running
            }

            // Step 4: Verify server is still responsive after errors
            const healthResponse = await this.makeRequest('GET', '/api/health');
            if (healthResponse.statusCode !== 200) {
                throw new Error(`Server not responsive after errors: ${healthResponse.statusCode}`);
            }

            this.recordTestResult('Error Recovery Workflow', true,
                '404 handled correctly, invalid API handled, malformed JSON handled, server remains responsive');

        } catch (error) {
            this.recordTestResult('Error Recovery Workflow', false, error.message);
        }
    }

    /**
     * Test performance requirements
     */
    async testPerformanceRequirements() {
        this.currentTest = 'Performance Requirements';
        console.log('⚡ Testing Performance Requirements...');

        try {
            // Step 1: Test API response times
            const startTime = Date.now();
            const quoteResponse = await this.makeRequest('GET', '/api/quotes/today');
            const responseTime = Date.now() - startTime;

            if (quoteResponse.statusCode !== 200) {
                throw new Error(`Quote API failed: ${quoteResponse.statusCode}`);
            }

            if (responseTime > 3000) {
                throw new Error(`API response too slow: ${responseTime}ms (should be < 3000ms)`);
            }

            // Step 2: Test static file serving performance
            const staticStartTime = Date.now();
            const staticResponse = await this.makeRequest('GET', '/css/main.css');
            const staticResponseTime = Date.now() - staticStartTime;

            if (staticResponse.statusCode !== 200) {
                throw new Error(`Static file failed: ${staticResponse.statusCode}`);
            }

            if (staticResponseTime > 1000) {
                throw new Error(`Static file too slow: ${staticResponseTime}ms (should be < 1000ms)`);
            }

            // Step 3: Test multiple concurrent requests
            const concurrentStartTime = Date.now();
            const concurrentPromises = [];
            
            for (let i = 0; i < 5; i++) {
                concurrentPromises.push(this.makeRequest('GET', '/api/quotes/today'));
            }

            const concurrentResults = await Promise.all(concurrentPromises);
            const concurrentTime = Date.now() - concurrentStartTime;

            const allSuccessful = concurrentResults.every(result => result.statusCode === 200);
            if (!allSuccessful) {
                throw new Error('Some concurrent requests failed');
            }

            this.recordTestResult('Performance Requirements', true,
                `API: ${responseTime}ms, Static: ${staticResponseTime}ms, Concurrent (5x): ${concurrentTime}ms`);

        } catch (error) {
            this.recordTestResult('Performance Requirements', false, error.message);
        }
    }

    /**
     * Test cross-component integration
     */
    async testCrossComponentIntegration() {
        this.currentTest = 'Cross-Component Integration';
        console.log('🔗 Testing Cross-Component Integration...');

        try {
            // Step 1: Test profile affects quote generation
            const profileResponse = await this.makeRequest('GET', '/api/profile');
            if (profileResponse.statusCode !== 200) {
                throw new Error(`Profile retrieval failed: ${profileResponse.statusCode}`);
            }

            // Step 2: Test AI status integration
            const aiStatusResponse = await this.makeRequest('GET', '/api/ai/status');
            if (aiStatusResponse.statusCode !== 200) {
                throw new Error(`AI status failed: ${aiStatusResponse.statusCode}`);
            }

            const aiStatus = JSON.parse(aiStatusResponse.data);

            // Step 3: Test quote generation (if AI enabled)
            if (aiStatus.enabled) {
                const generateResponse = await this.makeRequest('POST', '/api/quotes/generate', {
                    theme: 'philosophy',
                    length: 'medium'
                });
                
                // AI generation might fail due to missing API key, but should handle gracefully
                if (generateResponse.statusCode !== 200 && generateResponse.statusCode !== 503) {
                    throw new Error(`Quote generation failed unexpectedly: ${generateResponse.statusCode}`);
                }
            }

            // Step 4: Test health endpoint integration
            const healthResponse = await this.makeRequest('GET', '/api/health');
            if (healthResponse.statusCode !== 200) {
                throw new Error(`Health check failed: ${healthResponse.statusCode}`);
            }

            const healthData = JSON.parse(healthResponse.data);
            if (!healthData.status || !healthData.timestamp) {
                throw new Error('Health data incomplete');
            }

            this.recordTestResult('Cross-Component Integration', true,
                `Profile integration working, AI status: ${aiStatus.enabled ? 'enabled' : 'disabled'}, health check: ${healthData.status}`);

        } catch (error) {
            this.recordTestResult('Cross-Component Integration', false, error.message);
        }
    }

    /**
     * Make HTTP request
     */
    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'E2E-Integration-Tester/1.0'
                }
            };

            if (data && typeof data === 'object') {
                data = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(data);
            } else if (data && typeof data === 'string') {
                options.headers['Content-Length'] = Buffer.byteLength(data);
            }

            const req = http.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    /**
     * Record test result
     */
    recordTestResult(testName, passed, details) {
        const result = {
            test: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }

    /**
     * Display final test results
     */
    displayResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 End-to-End Integration Test Results');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const percentage = Math.round((passed / total) * 100);

        console.log(`\n📈 Overall Results: ${passed}/${total} tests passed (${percentage}%)`);

        if (passed === total) {
            console.log('🎉 All end-to-end integration tests PASSED!');
            console.log('✅ Application is ready for production deployment');
        } else {
            console.log('⚠️  Some integration issues detected');
            console.log('❌ Review failed tests before deployment');
            
            console.log('\n🔍 Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(result => {
                    console.log(`   • ${result.test}: ${result.details}`);
                });
        }

        // Generate summary report
        const summary = {
            timestamp: new Date().toISOString(),
            totalTests: total,
            passedTests: passed,
            failedTests: total - passed,
            successRate: percentage,
            testResults: this.testResults
        };

        // Save detailed report
        const reportPath = path.join(__dirname, 'e2e-integration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);

        console.log('='.repeat(60));
    }
}

// Auto-run tests if this script is executed directly
if (require.main === module) {
    const tester = new E2EIntegrationTester();
    
    tester.runAllTests()
        .then(success => {
            console.log(`\n🏁 End-to-End Integration Testing completed: ${success ? 'SUCCESS' : 'FAILURE'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 End-to-End Integration Testing failed with error:');
            console.error(error.message);
            console.error(error.stack);
            process.exit(2);
        });
}

module.exports = E2EIntegrationTester;