/**
 * Test Service Worker Registration
 * 
 * Simple test to verify service worker registration is working
 */

const fs = require('fs');
const path = require('path');

// Test service worker registration
async function testServiceWorkerRegistration() {
    console.log('🧪 Testing Service Worker Registration...');
    
    try {
        // Check if service worker file exists
        const swPath = path.join(__dirname, 'public', 'sw.js');
        if (!fs.existsSync(swPath)) {
            throw new Error('Service worker file not found at: ' + swPath);
        }
        console.log('✅ Service worker file exists');
        
        // Check if HTML has registration code
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        if (htmlContent.includes('navigator.serviceWorker.register')) {
            console.log('✅ Service worker registration code found in HTML');
        } else {
            throw new Error('Service worker registration code not found in HTML');
        }
        
        // Check if app.js has PWA setup
        const appPath = path.join(__dirname, 'src', 'js', 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        if (appContent.includes('registerServiceWorker')) {
            console.log('✅ Service worker registration function found in app.js');
        } else {
            throw new Error('Service worker registration function not found in app.js');
        }
        
        // Test service worker syntax
        try {
            const swContent = fs.readFileSync(swPath, 'utf8');
            
            // Basic syntax checks
            if (swContent.includes('addEventListener(\'install\'')) {
                console.log('✅ Service worker install event listener found');
            } else {
                throw new Error('Service worker install event listener not found');
            }
            
            if (swContent.includes('addEventListener(\'activate\'')) {
                console.log('✅ Service worker activate event listener found');
            } else {
                throw new Error('Service worker activate event listener not found');
            }
            
            if (swContent.includes('addEventListener(\'fetch\'')) {
                console.log('✅ Service worker fetch event listener found');
            } else {
                throw new Error('Service worker fetch event listener not found');
            }
            
            // Check for proper cache names
            if (swContent.includes('ark-static-v1.0.2') && swContent.includes('ark-dynamic-v1.0.2')) {
                console.log('✅ Service worker cache names are updated');
            } else {
                console.log('⚠️ Service worker cache names may need updating');
            }
            
        } catch (error) {
            throw new Error('Service worker syntax error: ' + error.message);
        }
        
        console.log('🎉 Service Worker Registration Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Service Worker Registration Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test cache management functions
async function testCacheManagement() {
    console.log('🧪 Testing Cache Management Functions...');
    
    try {
        const appPath = path.join(__dirname, 'src', 'js', 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        const requiredFunctions = [
            'getCacheStatus',
            'clearAllCaches',
            'handleServiceWorkerMessage',
            'showUpdateNotification'
        ];
        
        for (const func of requiredFunctions) {
            if (appContent.includes(`function ${func}`) || appContent.includes(`${func} =`)) {
                console.log(`✅ Function ${func} found`);
            } else {
                throw new Error(`Function ${func} not found`);
            }
        }
        
        console.log('🎉 Cache Management Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Cache Management Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test PWA manifest
async function testPWAManifest() {
    console.log('🧪 Testing PWA Manifest...');
    
    try {
        const manifestPath = path.join(__dirname, 'public', 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error('Manifest file not found');
        }
        
        const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        for (const field of requiredFields) {
            if (!manifestContent[field]) {
                throw new Error(`Manifest missing required field: ${field}`);
            }
        }
        
        console.log('✅ PWA manifest is valid');
        console.log('🎉 PWA Manifest Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ PWA Manifest Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting PWA Service Worker Tests...\n');
    
    const results = {
        serviceWorkerRegistration: await testServiceWorkerRegistration(),
        cacheManagement: await testCacheManagement(),
        pwaManifest: await testPWAManifest()
    };
    
    console.log('\n📊 Test Results:');
    console.log('Service Worker Registration:', results.serviceWorkerRegistration ? '✅ PASS' : '❌ FAIL');
    console.log('Cache Management:', results.cacheManagement ? '✅ PASS' : '❌ FAIL');
    console.log('PWA Manifest:', results.pwaManifest ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
        console.log('\n🎉 All PWA tests passed! Service worker registration should work correctly.');
    } else {
        console.log('\n❌ Some PWA tests failed. Please check the errors above.');
    }
    
    return allPassed;
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = {
    testServiceWorkerRegistration,
    testCacheManagement,
    testPWAManifest,
    runAllTests
};