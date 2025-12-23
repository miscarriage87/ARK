/**
 * DOM Diagnostic Script
 * Checks for missing DOM elements and reports issues
 */

function runDOMDiagnostic() {
    console.log('🔍 ARK DOM Diagnostic: Starting...');
    
    const requiredElements = {
        // Loading screen
        'loading-screen': 'Loading screen container',
        
        // Views
        'daily-quote': 'Daily quote view',
        'archive': 'Archive view', 
        'profile-setup': 'Profile setup view',
        'settings': 'Settings view',
        
        // Navigation
        'nav-today': 'Today navigation button',
        'nav-archive': 'Archive navigation button',
        'nav-settings': 'Settings navigation button',
        
        // Quote elements
        'quote-text': 'Quote text element',
        'quote-author': 'Quote author element',
        'quote-date': 'Quote date element',
        'quote-theme': 'Quote theme element',
        
        // Feedback buttons
        'feedback-like': 'Like feedback button',
        'feedback-neutral': 'Neutral feedback button',
        'feedback-dislike': 'Dislike feedback button',
        
        // Other elements
        'offline-banner': 'Offline banner',
        'install-prompt': 'Install prompt',
        'share-quote': 'Share quote button',
        'generate-quote': 'Generate quote button',
        'menu-toggle': 'Menu toggle button',
        
        // Archive elements
        'archive-search': 'Archive search input',
        'search-btn': 'Search button',
        'theme-filter': 'Theme filter select',
        'date-filter': 'Date filter select',
        'archive-list': 'Archive list container',
        
        // Profile setup
        'questionnaire-form': 'Questionnaire form',
        
        // Settings elements
        'notifications-enabled': 'Notifications toggle',
        'notification-time': 'Notification time input',
        'test-notification': 'Test notification button',
        'app-theme': 'App theme select',
        'quote-length': 'Quote length select',
        'export-data': 'Export data button',
        'sync-data': 'Sync data button',
        'sync-status': 'Sync status element'
    };
    
    const missingElements = [];
    const foundElements = [];
    
    for (const [id, description] of Object.entries(requiredElements)) {
        const element = document.getElementById(id);
        if (element) {
            foundElements.push({ id, description, element });
            console.log(`✅ Found: ${id} (${description})`);
        } else {
            missingElements.push({ id, description });
            console.error(`❌ Missing: ${id} (${description})`);
        }
    }
    
    console.log(`\n📊 ARK DOM Diagnostic Summary:`);
    console.log(`  ✅ Found: ${foundElements.length} elements`);
    console.log(`  ❌ Missing: ${missingElements.length} elements`);
    
    if (missingElements.length > 0) {
        console.log(`\n🚨 Missing Elements:`);
        missingElements.forEach(({ id, description }) => {
            console.log(`  - ${id}: ${description}`);
        });
    }
    
    // Check for common issues
    console.log(`\n🔧 Additional Checks:`);
    
    // Check if main app container exists
    const appContainer = document.getElementById('app');
    console.log(`  App container: ${appContainer ? '✅ Found' : '❌ Missing'}`);
    
    // Check if main content exists
    const mainContent = document.getElementById('main-content');
    console.log(`  Main content: ${mainContent ? '✅ Found' : '❌ Missing'}`);
    
    // Check if CSS is loaded
    const computedStyle = window.getComputedStyle(document.body);
    const hasCustomProps = computedStyle.getPropertyValue('--bg-primary');
    console.log(`  CSS variables: ${hasCustomProps ? '✅ Loaded' : '❌ Not loaded'}`);
    
    // Check for JavaScript errors
    const hasErrors = window.arkErrors && window.arkErrors.length > 0;
    console.log(`  JavaScript errors: ${hasErrors ? '❌ Found errors' : '✅ No errors detected'}`);
    
    return {
        foundElements,
        missingElements,
        hasAppContainer: !!appContainer,
        hasMainContent: !!mainContent,
        hasCSSVariables: !!hasCustomProps,
        hasErrors
    };
}

// Track JavaScript errors
window.arkErrors = [];
window.addEventListener('error', (event) => {
    window.arkErrors.push({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    console.error('🚨 ARK JavaScript Error:', event.error);
});

// Run diagnostic when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDOMDiagnostic);
} else {
    runDOMDiagnostic();
}

// Export for manual testing
window.runDOMDiagnostic = runDOMDiagnostic;