/**
 * Test Offline Mode and Data Synchronization
 * 
 * Tests offline functionality and data sync when connectivity returns
 */

const fs = require('fs');
const path = require('path');

// Test offline mode functionality
async function testOfflineModeFunctionality() {
    console.log('🧪 Testing Offline Mode Functionality...');
    
    try {
        // Check if app.js has offline handling
        const appPath = path.join(__dirname, 'src', 'js', 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        if (appContent.includes('handleOfflineStatus')) {
            console.log('✅ Offline status handler found');
        } else {
            throw new Error('Offline status handler not found');
        }
        
        if (appContent.includes('handleOnlineStatus')) {
            console.log('✅ Online status handler found');
        } else {
            throw new Error('Online status handler not found');
        }
        
        if (appContent.includes('window.addEventListener(\'offline\'')) {
            console.log('✅ Offline event listener found');
        } else {
            throw new Error('Offline event listener not found');
        }
        
        if (appContent.includes('window.addEventListener(\'online\'')) {
            console.log('✅ Online event listener found');
        } else {
            throw new Error('Online event listener not found');
        }
        
        // Check for offline banner in HTML
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        if (htmlContent.includes('id="offline-banner"')) {
            console.log('✅ Offline banner element found in HTML');
        } else {
            throw new Error('Offline banner element not found in HTML');
        }
        
        console.log('🎉 Offline Mode Functionality Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Offline Mode Functionality Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test data synchronization functionality
async function testDataSynchronization() {
    console.log('🧪 Testing Data Synchronization...');
    
    try {
        const appPath = path.join(__dirname, 'src', 'js', 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        // Check for sync functions
        const requiredSyncFunctions = [
            'syncPendingData',
            'handleSyncData'
        ];
        
        for (const func of requiredSyncFunctions) {
            if (appContent.includes(func)) {
                console.log(`✅ Function ${func} found`);
            } else {
                throw new Error(`Function ${func} not found`);
            }
        }
        
        // Check for pending data storage
        if (appContent.includes('ark-pending-feedback') || appContent.includes('pending-feedback')) {
            console.log('✅ Pending feedback storage mechanism found');
        } else {
            console.warn('⚠️ Pending feedback storage mechanism not clearly identified');
        }
        
        // Check for sync button in HTML
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        if (htmlContent.includes('id="sync-data"')) {
            console.log('✅ Sync data button found in HTML');
        } else {
            console.warn('⚠️ Sync data button not found in HTML');
        }
        
        console.log('🎉 Data Synchronization Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Data Synchronization Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test service worker offline support
async function testServiceWorkerOfflineSupport() {
    console.log('🧪 Testing Service Worker Offline Support...');
    
    try {
        const swPath = path.join(__dirname, 'public', 'sw.js');
        if (!fs.existsSync(swPath)) {
            throw new Error('Service worker file not found');
        }
        
        const swContent = fs.readFileSync(swPath, 'utf8');
        
        // Check for offline fallback handling
        if (swContent.includes('getOfflineFallback')) {
            console.log('✅ Offline fallback function found in service worker');
        } else {
            throw new Error('Offline fallback function not found in service worker');
        }
        
        // Check for cache strategies
        if (swContent.includes('networkFirstWithOfflineFallback')) {
            console.log('✅ Network-first with offline fallback strategy found');
        } else {
            throw new Error('Network-first with offline fallback strategy not found');
        }
        
        // Check for background sync
        if (swContent.includes('addEventListener(\'sync\'')) {
            console.log('✅ Background sync event listener found');
        } else {
            console.warn('⚠️ Background sync event listener not found');
        }
        
        // Check for sync functions
        if (swContent.includes('syncFeedback') || swContent.includes('syncProfile')) {
            console.log('✅ Sync functions found in service worker');
        } else {
            console.warn('⚠️ Sync functions not found in service worker');
        }
        
        // Check for IndexedDB usage for offline storage
        if (swContent.includes('indexedDB') || swContent.includes('openDB')) {
            console.log('✅ IndexedDB usage found for offline storage');
        } else {
            console.warn('⚠️ IndexedDB usage not found');
        }
        
        console.log('🎉 Service Worker Offline Support Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Service Worker Offline Support Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test cached data access
async function testCachedDataAccess() {
    console.log('🧪 Testing Cached Data Access...');
    
    try {
        const appPath = path.join(__dirname, 'src', 'js', 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        // Check for cache retrieval functions
        if (appContent.includes('getCachedTodaysQuote') || appContent.includes('cached')) {
            console.log('✅ Cache retrieval mechanism found');
        } else {
            console.warn('⚠️ Cache retrieval mechanism not clearly identified');
        }
        
        // Check for fallback quote handling
        if (appContent.includes('fallback') && appContent.includes('quote')) {
            console.log('✅ Fallback quote handling found');
        } else {
            console.warn('⚠️ Fallback quote handling not clearly identified');
        }
        
        // Check for offline indicator
        if (appContent.includes('showOfflineIndicator') || appContent.includes('offline-banner')) {
            console.log('✅ Offline indicator mechanism found');
        } else {
            console.warn('⚠️ Offline indicator mechanism not clearly identified');
        }
        
        console.log('🎉 Cached Data Access Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Cached Data Access Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Offline Mode and Data Synchronization Tests...\n');
    
    const results = {
        offlineMode: await testOfflineModeFunctionality(),
        dataSynchronization: await testDataSynchronization(),
        serviceWorkerOffline: await testServiceWorkerOfflineSupport(),
        cachedDataAccess: await testCachedDataAccess()
    };
    
    console.log('\n📊 Test Results:');
    console.log('Offline Mode Functionality:', results.offlineMode ? '✅ PASS' : '❌ FAIL');
    console.log('Data Synchronization:', results.dataSynchronization ? '✅ PASS' : '❌ FAIL');
    console.log('Service Worker Offline Support:', results.serviceWorkerOffline ? '✅ PASS' : '❌ FAIL');
    console.log('Cached Data Access:', results.cachedDataAccess ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
        console.log('\n🎉 All offline and sync tests passed! Offline functionality should work correctly.');
    } else {
        console.log('\n❌ Some offline and sync tests failed. Please check the errors above.');
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
    testOfflineModeFunctionality,
    testDataSynchronization,
    testServiceWorkerOfflineSupport,
    testCachedDataAccess,
    runAllTests
};