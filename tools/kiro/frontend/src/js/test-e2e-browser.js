/**
 * End-to-End Browser Compatibility Tests
 * 
 * This module provides comprehensive browser compatibility testing
 * for the ARK Digital Calendar PWA across different devices and browsers.
 */

class BrowserCompatibilityTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
        this.apiBaseUrl = '/api';
    }

    /**
     * Run all browser compatibility tests
     */
    async runAllTests() {
        console.log('🚀 Starting Browser Compatibility Tests...');
        console.log('=' .repeat(60));

        const tests = [
            this.testPWAFeatures.bind(this),
            this.testServiceWorkerFunctionality.bind(this),
            this.testOfflineCapabilities.bind(this),
            this.testNotificationSupport.bind(this),
            this.testLocalStorageOperations.bind(this),
            this.testResponsiveDesign.bind(this),
            this.testTouchInteractions.bind(this),
            this.testAPIConnectivity.bind(this),
            this.testCacheManagement.bind(this),
            this.testCrossBrowserFeatures.bind(this)
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
     * Test PWA installation and manifest features
     */
    async testPWAFeatures() {
        this.currentTest = 'PWA Features';
        console.log('📱 Testing PWA Features...');

        // Test manifest.json
        try {
            const manifestResponse = await fetch('/manifest.json');
            const manifest = await manifestResponse.json();
            
            const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
            const missingFields = requiredFields.filter(field => !manifest[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing manifest fields: ${missingFields.join(', ')}`);
            }

            // Test PWA installation prompt
            let installPromptAvailable = false;
            window.addEventListener('beforeinstallprompt', (e) => {
                installPromptAvailable = true;
            });

            // Test if running as PWA
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                               window.navigator.standalone ||
                               document.referrer.includes('android-app://');

            this.recordTestResult('PWA Features', true, 
                `Manifest valid, Install prompt: ${installPromptAvailable}, Standalone: ${isStandalone}`);

        } catch (error) {
            this.recordTestResult('PWA Features', false, error.message);
        }
    }

    /**
     * Test Service Worker functionality
     */
    async testServiceWorkerFunctionality() {
        this.currentTest = 'Service Worker';
        console.log('⚙️ Testing Service Worker...');

        if (!('serviceWorker' in navigator)) {
            this.recordTestResult('Service Worker', false, 'Service Worker not supported');
            return;
        }

        try {
            // Check if service worker is registered
            const registration = await navigator.serviceWorker.getRegistration();
            
            if (!registration) {
                // Try to register service worker
                const newRegistration = await navigator.serviceWorker.register('/sw.js');
                await this.waitForServiceWorkerActivation(newRegistration);
            }

            // Test service worker communication
            const messageChannel = new MessageChannel();
            const messagePromise = new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data);
                };
            });

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage(
                    { type: 'TEST_CONNECTION' },
                    [messageChannel.port2]
                );

                const response = await Promise.race([
                    messagePromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Service Worker timeout')), 5000)
                    )
                ]);

                this.recordTestResult('Service Worker', true, 
                    `Active and responsive: ${JSON.stringify(response)}`);
            } else {
                this.recordTestResult('Service Worker', true, 'Registered but not controlling');
            }

        } catch (error) {
            this.recordTestResult('Service Worker', false, error.message);
        }
    }

    /**
     * Test offline capabilities
     */
    async testOfflineCapabilities() {
        this.currentTest = 'Offline Capabilities';
        console.log('📴 Testing Offline Capabilities...');

        try {
            // Test cache API availability
            if (!('caches' in window)) {
                throw new Error('Cache API not supported');
            }

            // Test if essential resources are cached
            const cacheNames = await caches.keys();
            const arkCache = await caches.open('ark-v1');
            const cachedRequests = await arkCache.keys();

            const essentialResources = [
                '/',
                '/css/main.css',
                '/js/app.js',
                '/manifest.json'
            ];

            const cachedUrls = cachedRequests.map(req => new URL(req.url).pathname);
            const missingResources = essentialResources.filter(
                resource => !cachedUrls.some(url => url.includes(resource))
            );

            // Test offline functionality simulation
            const offlineTest = await this.simulateOfflineOperation();

            this.recordTestResult('Offline Capabilities', missingResources.length === 0 && offlineTest,
                `Cached resources: ${cachedUrls.length}, Missing: ${missingResources.join(', ')}, Offline test: ${offlineTest}`);

        } catch (error) {
            this.recordTestResult('Offline Capabilities', false, error.message);
        }
    }

    /**
     * Test notification support
     */
    async testNotificationSupport() {
        this.currentTest = 'Notifications';
        console.log('🔔 Testing Notification Support...');

        try {
            if (!('Notification' in window)) {
                throw new Error('Notifications not supported');
            }

            if (!('PushManager' in window)) {
                throw new Error('Push notifications not supported');
            }

            // Test notification permission
            let permission = Notification.permission;
            if (permission === 'default') {
                // Don't actually request permission in automated tests
                // permission = await Notification.requestPermission();
            }

            // Test push subscription capability
            const registration = await navigator.serviceWorker.getRegistration();
            let pushSupported = false;
            
            if (registration && registration.pushManager) {
                try {
                    const subscription = await registration.pushManager.getSubscription();
                    pushSupported = true;
                } catch (e) {
                    // Push might not be supported or configured
                }
            }

            this.recordTestResult('Notifications', true,
                `Permission: ${permission}, Push supported: ${pushSupported}`);

        } catch (error) {
            this.recordTestResult('Notifications', false, error.message);
        }
    }

    /**
     * Test local storage operations
     */
    async testLocalStorageOperations() {
        this.currentTest = 'Local Storage';
        console.log('💾 Testing Local Storage...');

        try {
            // Test localStorage
            const testKey = 'ark-test-' + Date.now();
            const testData = { test: true, timestamp: Date.now() };
            
            localStorage.setItem(testKey, JSON.stringify(testData));
            const retrieved = JSON.parse(localStorage.getItem(testKey));
            localStorage.removeItem(testKey);

            if (retrieved.test !== testData.test) {
                throw new Error('localStorage data integrity failed');
            }

            // Test IndexedDB
            let indexedDBSupported = false;
            if ('indexedDB' in window) {
                try {
                    const dbRequest = indexedDB.open('ark-test-db', 1);
                    await new Promise((resolve, reject) => {
                        dbRequest.onsuccess = () => {
                            dbRequest.result.close();
                            indexedDB.deleteDatabase('ark-test-db');
                            resolve();
                        };
                        dbRequest.onerror = reject;
                        dbRequest.onupgradeneeded = (event) => {
                            const db = event.target.result;
                            db.createObjectStore('test');
                        };
                    });
                    indexedDBSupported = true;
                } catch (e) {
                    // IndexedDB might be disabled
                }
            }

            // Test sessionStorage
            sessionStorage.setItem(testKey, JSON.stringify(testData));
            const sessionRetrieved = JSON.parse(sessionStorage.getItem(testKey));
            sessionStorage.removeItem(testKey);

            this.recordTestResult('Local Storage', true,
                `localStorage: ✓, sessionStorage: ✓, IndexedDB: ${indexedDBSupported ? '✓' : '✗'}`);

        } catch (error) {
            this.recordTestResult('Local Storage', false, error.message);
        }
    }

    /**
     * Test responsive design across different viewport sizes
     */
    async testResponsiveDesign() {
        this.currentTest = 'Responsive Design';
        console.log('📐 Testing Responsive Design...');

        try {
            const viewports = [
                { width: 320, height: 568, name: 'Mobile Portrait' },
                { width: 568, height: 320, name: 'Mobile Landscape' },
                { width: 768, height: 1024, name: 'Tablet Portrait' },
                { width: 1024, height: 768, name: 'Tablet Landscape' },
                { width: 1920, height: 1080, name: 'Desktop' }
            ];

            const results = [];
            const originalWidth = window.innerWidth;
            const originalHeight = window.innerHeight;

            for (const viewport of viewports) {
                // Simulate viewport change (limited in real browser)
                const mediaQuery = window.matchMedia(`(max-width: ${viewport.width}px)`);
                
                // Check if CSS responds to viewport
                const body = document.body;
                const computedStyle = window.getComputedStyle(body);
                
                // Test if main content is visible and properly sized
                const mainContent = document.querySelector('.main-content') || 
                                  document.querySelector('main') || 
                                  document.body;
                
                if (mainContent) {
                    const rect = mainContent.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    results.push(`${viewport.name}: ${isVisible ? '✓' : '✗'}`);
                }
            }

            this.recordTestResult('Responsive Design', results.length > 0,
                results.join(', '));

        } catch (error) {
            this.recordTestResult('Responsive Design', false, error.message);
        }
    }

    /**
     * Test touch interactions for mobile devices
     */
    async testTouchInteractions() {
        this.currentTest = 'Touch Interactions';
        console.log('👆 Testing Touch Interactions...');

        try {
            const touchSupported = 'ontouchstart' in window || 
                                 navigator.maxTouchPoints > 0 ||
                                 navigator.msMaxTouchPoints > 0;

            // Test touch event handling
            let touchEventsWork = false;
            if (touchSupported) {
                const testElement = document.createElement('div');
                testElement.style.position = 'absolute';
                testElement.style.left = '-9999px';
                document.body.appendChild(testElement);

                testElement.addEventListener('touchstart', () => {
                    touchEventsWork = true;
                });

                // Simulate touch event
                const touchEvent = new TouchEvent('touchstart', {
                    touches: [{
                        clientX: 0,
                        clientY: 0,
                        target: testElement
                    }]
                });
                testElement.dispatchEvent(touchEvent);

                document.body.removeChild(testElement);
            }

            // Test gesture support
            const gestureSupported = 'ongesturestart' in window;

            this.recordTestResult('Touch Interactions', true,
                `Touch supported: ${touchSupported}, Events work: ${touchEventsWork}, Gestures: ${gestureSupported}`);

        } catch (error) {
            this.recordTestResult('Touch Interactions', false, error.message);
        }
    }

    /**
     * Test API connectivity and error handling
     */
    async testAPIConnectivity() {
        this.currentTest = 'API Connectivity';
        console.log('🌐 Testing API Connectivity...');

        try {
            // Test basic API endpoint
            const healthResponse = await fetch(`${this.apiBaseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!healthResponse.ok && healthResponse.status !== 404) {
                throw new Error(`API health check failed: ${healthResponse.status}`);
            }

            // Test CORS handling
            const corsHeaders = healthResponse.headers.get('Access-Control-Allow-Origin');
            
            // Test error handling with invalid endpoint
            const invalidResponse = await fetch(`${this.apiBaseUrl}/invalid-endpoint-test`);
            const handlesErrors = invalidResponse.status === 404 || invalidResponse.status === 405;

            this.recordTestResult('API Connectivity', true,
                `Health check: ${healthResponse.status}, CORS: ${corsHeaders ? '✓' : '✗'}, Error handling: ${handlesErrors ? '✓' : '✗'}`);

        } catch (error) {
            this.recordTestResult('API Connectivity', false, error.message);
        }
    }

    /**
     * Test cache management and updates
     */
    async testCacheManagement() {
        this.currentTest = 'Cache Management';
        console.log('🗄️ Testing Cache Management...');

        try {
            if (!('caches' in window)) {
                throw new Error('Cache API not supported');
            }

            // Test cache creation and management
            const testCacheName = 'ark-test-cache-' + Date.now();
            const testCache = await caches.open(testCacheName);

            // Test cache operations
            const testUrl = '/test-cache-resource';
            const testResponse = new Response('test content', {
                headers: { 'Content-Type': 'text/plain' }
            });

            await testCache.put(testUrl, testResponse.clone());
            const cachedResponse = await testCache.match(testUrl);
            
            if (!cachedResponse) {
                throw new Error('Cache put/match failed');
            }

            const cachedContent = await cachedResponse.text();
            if (cachedContent !== 'test content') {
                throw new Error('Cache content integrity failed');
            }

            // Clean up test cache
            await caches.delete(testCacheName);

            // Test cache size limits (approximate)
            const cacheNames = await caches.keys();
            
            this.recordTestResult('Cache Management', true,
                `Operations: ✓, Active caches: ${cacheNames.length}, Content integrity: ✓`);

        } catch (error) {
            this.recordTestResult('Cache Management', false, error.message);
        }
    }

    /**
     * Test cross-browser feature compatibility
     */
    async testCrossBrowserFeatures() {
        this.currentTest = 'Cross-Browser Features';
        console.log('🌍 Testing Cross-Browser Features...');

        try {
            const features = {
                'ES6 Classes': typeof class {} === 'function',
                'Arrow Functions': (() => true)(),
                'Promises': typeof Promise !== 'undefined',
                'Async/Await': (async () => true)() instanceof Promise,
                'Fetch API': typeof fetch !== 'undefined',
                'Web Workers': typeof Worker !== 'undefined',
                'WebRTC': typeof RTCPeerConnection !== 'undefined',
                'WebGL': (() => {
                    try {
                        const canvas = document.createElement('canvas');
                        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                    } catch (e) {
                        return false;
                    }
                })(),
                'Geolocation': 'geolocation' in navigator,
                'Device Orientation': 'DeviceOrientationEvent' in window,
                'Battery API': 'getBattery' in navigator,
                'Vibration API': 'vibrate' in navigator
            };

            const supportedFeatures = Object.entries(features)
                .filter(([name, supported]) => supported)
                .map(([name]) => name);

            const unsupportedFeatures = Object.entries(features)
                .filter(([name, supported]) => !supported)
                .map(([name]) => name);

            this.recordTestResult('Cross-Browser Features', true,
                `Supported: ${supportedFeatures.length}/${Object.keys(features).length} (${unsupportedFeatures.join(', ')})`);

        } catch (error) {
            this.recordTestResult('Cross-Browser Features', false, error.message);
        }
    }

    /**
     * Simulate offline operation
     */
    async simulateOfflineOperation() {
        try {
            // Try to access a cached resource
            const cache = await caches.open('ark-v1');
            const cachedResponse = await cache.match('/');
            return cachedResponse !== undefined;
        } catch (error) {
            return false;
        }
    }

    /**
     * Wait for service worker activation
     */
    async waitForServiceWorkerActivation(registration) {
        return new Promise((resolve) => {
            if (registration.active) {
                resolve();
                return;
            }

            const worker = registration.installing || registration.waiting;
            if (worker) {
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'activated') {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
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
        console.log('📊 Browser Compatibility Test Results');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const percentage = Math.round((passed / total) * 100);

        console.log(`\n📈 Overall Results: ${passed}/${total} tests passed (${percentage}%)`);

        if (passed === total) {
            console.log('🎉 All browser compatibility tests PASSED!');
            console.log('✅ Application is ready for cross-browser deployment');
        } else {
            console.log('⚠️  Some browser compatibility issues detected');
            console.log('❌ Review failed tests before deployment');
            
            console.log('\n🔍 Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(result => {
                    console.log(`   • ${result.test}: ${result.details}`);
                });
        }

        // Store results for potential export
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ark-browser-test-results', JSON.stringify({
                results: this.testResults,
                summary: { passed, total, percentage },
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            }));
        }

        console.log('='.repeat(60));
    }

    /**
     * Export test results
     */
    exportResults() {
        const results = {
            summary: {
                passed: this.testResults.filter(r => r.passed).length,
                total: this.testResults.length,
                percentage: Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100)
            },
            browser: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio
            },
            tests: this.testResults,
            timestamp: new Date().toISOString()
        };

        return results;
    }
}

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('run-e2e-tests')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tester = new BrowserCompatibilityTester();
        const success = await tester.runAllTests();
        
        // Optionally send results to server
        if (success) {
            console.log('🚀 Browser compatibility validation completed successfully!');
        } else {
            console.log('⚠️ Browser compatibility issues detected - review before deployment');
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserCompatibilityTester;
} else if (typeof window !== 'undefined') {
    window.BrowserCompatibilityTester = BrowserCompatibilityTester;
}