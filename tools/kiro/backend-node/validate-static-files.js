#!/usr/bin/env node

/**
 * Static File Serving Validation Script
 * Tests that all static files are served correctly with proper headers
 */

const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:8000';

// Test cases for static file serving
const testCases = [
    {
        path: '/app',
        expectedStatus: 200,
        expectedContentType: 'text/html',
        description: 'Main app HTML file'
    },
    {
        path: '/css/main.css',
        expectedStatus: 200,
        expectedContentType: 'text/css',
        description: 'CSS stylesheet'
    },
    {
        path: '/js/app.js',
        expectedStatus: 200,
        expectedContentType: 'application/javascript',
        description: 'JavaScript application file'
    },
    {
        path: '/manifest.json',
        expectedStatus: 200,
        expectedContentType: 'application/json',
        description: 'PWA manifest file'
    },
    {
        path: '/sw.js',
        expectedStatus: 200,
        expectedContentType: 'application/javascript',
        description: 'Service worker file'
    },
    {
        path: '/icons/favicon.svg',
        expectedStatus: 200,
        expectedContentType: 'image/svg+xml',
        description: 'SVG icon file'
    },
    {
        path: '/nonexistent.css',
        expectedStatus: 404,
        expectedContentType: null,
        description: 'Non-existent file (should return 404)'
    }
];

// CORS test cases
const corsTestCases = [
    {
        path: '/api/quotes/today',
        origin: 'http://localhost:3000',
        expectedCorsHeader: 'http://localhost:3000',
        description: 'CORS for allowed origin'
    },
    {
        path: '/api/ai-status',
        origin: 'http://localhost:8080',
        expectedCorsHeader: 'http://localhost:8080',
        description: 'CORS for another allowed origin'
    }
];

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function testStaticFiles() {
    console.log('🔍 Testing Static File Serving...\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        try {
            const url = BASE_URL + testCase.path;
            const response = await makeRequest(url);
            
            // Check status code
            const statusMatch = response.statusCode === testCase.expectedStatus;
            
            // Check content type (if expected)
            let contentTypeMatch = true;
            if (testCase.expectedContentType && response.statusCode === 200) {
                const contentType = response.headers['content-type'] || '';
                contentTypeMatch = contentType.includes(testCase.expectedContentType);
            }
            
            if (statusMatch && contentTypeMatch) {
                console.log(`✅ ${testCase.description}`);
                console.log(`   Status: ${response.statusCode}, Content-Type: ${response.headers['content-type'] || 'N/A'}`);
                passed++;
            } else {
                console.log(`❌ ${testCase.description}`);
                console.log(`   Expected Status: ${testCase.expectedStatus}, Got: ${response.statusCode}`);
                if (testCase.expectedContentType) {
                    console.log(`   Expected Content-Type: ${testCase.expectedContentType}, Got: ${response.headers['content-type'] || 'N/A'}`);
                }
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${testCase.description}`);
            console.log(`   Error: ${error.message}`);
            failed++;
        }
        console.log();
    }
    
    return { passed, failed };
}

async function testCORS() {
    console.log('🌐 Testing CORS Configuration...\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of corsTestCases) {
        try {
            const url = BASE_URL + testCase.path;
            const options = {
                headers: {
                    'Origin': testCase.origin
                }
            };
            
            const response = await makeRequest(url, options);
            
            const corsHeader = response.headers['access-control-allow-origin'];
            const corsMatch = corsHeader === testCase.expectedCorsHeader;
            
            if (corsMatch && response.statusCode === 200) {
                console.log(`✅ ${testCase.description}`);
                console.log(`   Origin: ${testCase.origin}, CORS Header: ${corsHeader}`);
                passed++;
            } else {
                console.log(`❌ ${testCase.description}`);
                console.log(`   Expected CORS Header: ${testCase.expectedCorsHeader}, Got: ${corsHeader || 'N/A'}`);
                console.log(`   Status: ${response.statusCode}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${testCase.description}`);
            console.log(`   Error: ${error.message}`);
            failed++;
        }
        console.log();
    }
    
    return { passed, failed };
}

async function main() {
    console.log('🚀 Static File Serving Validation\n');
    console.log('Testing server at:', BASE_URL);
    console.log('='.repeat(50) + '\n');
    
    try {
        // Test basic server connectivity
        await makeRequest(BASE_URL + '/health');
        console.log('✅ Server is running and accessible\n');
    } catch (error) {
        console.log('❌ Server is not accessible:', error.message);
        console.log('Please ensure the server is running on port 8000');
        process.exit(1);
    }
    
    // Run tests
    const staticResults = await testStaticFiles();
    const corsResults = await testCORS();
    
    // Summary
    console.log('='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    
    const totalPassed = staticResults.passed + corsResults.passed;
    const totalFailed = staticResults.failed + corsResults.failed;
    const totalTests = totalPassed + totalFailed;
    
    console.log(`Static File Tests: ${staticResults.passed}/${staticResults.passed + staticResults.failed} passed`);
    console.log(`CORS Tests: ${corsResults.passed}/${corsResults.passed + corsResults.failed} passed`);
    console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalFailed === 0) {
        console.log('\n✅ All static file serving tests passed!');
        console.log('Static file serving is working correctly.');
        process.exit(0);
    } else {
        console.log(`\n❌ ${totalFailed} test(s) failed.`);
        console.log('Please check the server configuration and static file setup.');
        process.exit(1);
    }
}

// Run the validation
main().catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
});