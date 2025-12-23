/**
 * Test PWA Install Prompt Functionality
 * 
 * Tests the app installation and manifest functionality
 */

const fs = require('fs');
const path = require('path');

// Test PWA install prompt functionality
async function testInstallPromptFunctionality() {
    console.log('🧪 Testing PWA Install Prompt Functionality...');
    
    try {
        // Check if HTML has install prompt elements
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        if (htmlContent.includes('id="install-prompt"')) {
            console.log('✅ Install prompt element found in HTML');
        } else {
            throw new Error('Install prompt element not found in HTML');
        }
        
        if (htmlContent.includes('id="install-app"')) {
            console.log('✅ Install app button found in HTML');
        } else {
            throw new Error('Install app button not found in HTML');
        }
        
        if (htmlContent.includes('id="dismiss-install"')) {
            console.log('✅ Dismiss install button found in HTML');
        } else {
            throw new Error('Dismiss install button not found in HTML');
        }
        
        // Check if app.js has install prompt handling
        const appPath = path.join(__dirname, 'src', 'js', 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        if (appContent.includes('handleInstallPrompt')) {
            console.log('✅ Install prompt handler found in app.js');
        } else {
            throw new Error('Install prompt handler not found in app.js');
        }
        
        if (appContent.includes('beforeinstallprompt')) {
            console.log('✅ beforeinstallprompt event listener found');
        } else {
            throw new Error('beforeinstallprompt event listener not found');
        }
        
        console.log('🎉 PWA Install Prompt Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ PWA Install Prompt Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test manifest validation
async function testManifestValidation() {
    console.log('🧪 Testing Manifest Validation...');
    
    try {
        const manifestPath = path.join(__dirname, 'public', 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error('Manifest file not found');
        }
        
        const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Check required PWA manifest fields
        const requiredFields = [
            'name', 'short_name', 'start_url', 'display', 
            'icons', 'theme_color', 'background_color'
        ];
        
        for (const field of requiredFields) {
            if (!manifestContent[field]) {
                throw new Error(`Manifest missing required field: ${field}`);
            }
        }
        
        console.log('✅ All required manifest fields present');
        
        // Check icons
        if (!Array.isArray(manifestContent.icons) || manifestContent.icons.length === 0) {
            throw new Error('Manifest must have at least one icon');
        }
        
        // Check for required icon sizes
        const requiredSizes = ['192x192', '512x512'];
        const availableSizes = manifestContent.icons.map(icon => icon.sizes);
        
        for (const size of requiredSizes) {
            if (!availableSizes.includes(size)) {
                console.warn(`⚠️ Recommended icon size ${size} not found`);
            } else {
                console.log(`✅ Icon size ${size} found`);
            }
        }
        
        // Check if icon files exist
        for (const icon of manifestContent.icons) {
            const iconPath = path.join(__dirname, 'public', icon.src);
            if (fs.existsSync(iconPath)) {
                console.log(`✅ Icon file exists: ${icon.src}`);
            } else {
                console.warn(`⚠️ Icon file missing: ${icon.src}`);
            }
        }
        
        // Check display mode
        if (manifestContent.display === 'standalone' || manifestContent.display === 'fullscreen') {
            console.log('✅ Appropriate display mode set for PWA');
        } else {
            console.warn('⚠️ Display mode should be "standalone" or "fullscreen" for PWA');
        }
        
        // Check start_url
        if (manifestContent.start_url) {
            console.log('✅ Start URL defined');
        } else {
            throw new Error('Start URL is required for PWA');
        }
        
        console.log('🎉 Manifest Validation Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ Manifest Validation Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Test PWA installation criteria
async function testPWAInstallationCriteria() {
    console.log('🧪 Testing PWA Installation Criteria...');
    
    try {
        // Check HTTPS requirement (in production)
        console.log('✅ HTTPS requirement: Will be enforced in production');
        
        // Check service worker registration
        const swPath = path.join(__dirname, 'public', 'sw.js');
        if (fs.existsSync(swPath)) {
            console.log('✅ Service worker file exists');
        } else {
            throw new Error('Service worker file required for PWA installation');
        }
        
        // Check manifest link in HTML
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        if (htmlContent.includes('rel="manifest"')) {
            console.log('✅ Manifest link found in HTML');
        } else {
            throw new Error('Manifest link not found in HTML head');
        }
        
        // Check viewport meta tag
        if (htmlContent.includes('name="viewport"')) {
            console.log('✅ Viewport meta tag found');
        } else {
            console.warn('⚠️ Viewport meta tag recommended for PWA');
        }
        
        // Check theme color meta tag
        if (htmlContent.includes('name="theme-color"')) {
            console.log('✅ Theme color meta tag found');
        } else {
            console.warn('⚠️ Theme color meta tag recommended for PWA');
        }
        
        console.log('🎉 PWA Installation Criteria Test: PASSED');
        return true;
        
    } catch (error) {
        console.error('❌ PWA Installation Criteria Test: FAILED');
        console.error('Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting PWA Installation Tests...\n');
    
    const results = {
        installPrompt: await testInstallPromptFunctionality(),
        manifestValidation: await testManifestValidation(),
        installationCriteria: await testPWAInstallationCriteria()
    };
    
    console.log('\n📊 Test Results:');
    console.log('Install Prompt Functionality:', results.installPrompt ? '✅ PASS' : '❌ FAIL');
    console.log('Manifest Validation:', results.manifestValidation ? '✅ PASS' : '❌ FAIL');
    console.log('PWA Installation Criteria:', results.installationCriteria ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
        console.log('\n🎉 All PWA installation tests passed! App should be installable.');
    } else {
        console.log('\n❌ Some PWA installation tests failed. Please check the errors above.');
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
    testInstallPromptFunctionality,
    testManifestValidation,
    testPWAInstallationCriteria,
    runAllTests
};