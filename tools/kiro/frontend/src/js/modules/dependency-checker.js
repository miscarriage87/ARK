/**
 * ARK Dependency Checker
 * 
 * Detects missing dependencies and component failures.
 * Provides clear error reporting for component failures.
 * 
 * Validates: Requirements 7.5
 */

class DependencyChecker {
    constructor(config = {}) {
        this.config = {
            checkInterval: config.checkInterval || 30000, // 30 seconds
            enablePeriodicChecks: config.enablePeriodicChecks !== false,
            reportMissingDependencies: config.reportMissingDependencies !== false,
            ...config
        };
        
        this.dependencies = new Map();
        this.missingDependencies = new Set();
        this.failedComponents = new Set();
        this.checkResults = new Map();
        
        this.initializeDependencyChecking();
    }

    /**
     * Initialize dependency checking system
     */
    initializeDependencyChecking() {
        this.registerCoreDependencies();
        this.setupPeriodicChecks();
        
        console.log('✅ ARK Dependency Checker: Initialized');
    }

    /**
     * Register core application dependencies
     */
    registerCoreDependencies() {
        // Core browser APIs
        this.registerDependency('localStorage', {
            check: () => typeof Storage !== 'undefined' && window.localStorage,
            critical: true,
            description: 'Local storage for offline functionality',
            fallback: 'Limited functionality without data persistence'
        });

        this.registerDependency('fetch', {
            check: () => typeof fetch === 'function',
            critical: true,
            description: 'Fetch API for network requests',
            fallback: 'XMLHttpRequest fallback available'
        });

        this.registerDependency('serviceWorker', {
            check: () => 'serviceWorker' in navigator,
            critical: false,
            description: 'Service Worker for PWA functionality',
            fallback: 'App will work without offline capabilities'
        });

        this.registerDependency('notifications', {
            check: () => 'Notification' in window,
            critical: false,
            description: 'Web Notifications API',
            fallback: 'No push notifications available'
        });

        this.registerDependency('indexedDB', {
            check: () => 'indexedDB' in window,
            critical: false,
            description: 'IndexedDB for advanced storage',
            fallback: 'Using localStorage instead'
        });

        // DOM elements
        this.registerDependency('loadingScreen', {
            check: () => document.getElementById('loading-screen'),
            critical: true,
            description: 'Loading screen element',
            fallback: 'App may appear broken during loading'
        });

        this.registerDependency('dailyQuoteView', {
            check: () => document.getElementById('daily-quote'),
            critical: true,
            description: 'Daily quote view container',
            fallback: 'Main functionality unavailable'
        });

        this.registerDependency('navigationElements', {
            check: () => {
                const nav = document.getElementById('nav-today');
                const archive = document.getElementById('nav-archive');
                const settings = document.getElementById('nav-settings');
                return nav && archive && settings;
            },
            critical: true,
            description: 'Navigation elements',
            fallback: 'Navigation will not work properly'
        });

        this.registerDependency('quoteElements', {
            check: () => {
                const text = document.getElementById('quote-text');
                const author = document.getElementById('quote-author');
                return text && author;
            },
            critical: true,
            description: 'Quote display elements',
            fallback: 'Quotes cannot be displayed'
        });

        this.registerDependency('feedbackElements', {
            check: () => {
                const like = document.getElementById('feedback-like');
                const neutral = document.getElementById('feedback-neutral');
                const dislike = document.getElementById('feedback-dislike');
                return like && neutral && dislike;
            },
            critical: false,
            description: 'Feedback buttons',
            fallback: 'Feedback functionality unavailable'
        });

        // Application modules
        this.registerDependency('profileManager', {
            check: () => typeof profileManager !== 'undefined' && profileManager,
            critical: true,
            description: 'Profile management system',
            fallback: 'User profiles will not work'
        });

        this.registerDependency('preferencesManager', {
            check: () => typeof preferencesManager !== 'undefined' && preferencesManager,
            critical: false,
            description: 'User preferences system',
            fallback: 'Default preferences will be used'
        });

        this.registerDependency('errorHandler', {
            check: () => typeof errorHandler !== 'undefined' && errorHandler,
            critical: false,
            description: 'Error handling system',
            fallback: 'Basic error handling only'
        });

        // Network connectivity
        this.registerDependency('networkConnection', {
            check: () => navigator.onLine,
            critical: false,
            description: 'Internet connectivity',
            fallback: 'Offline mode available'
        });

        // CSS and styling
        this.registerDependency('mainStylesheet', {
            check: () => {
                const stylesheets = Array.from(document.styleSheets);
                return stylesheets.some(sheet => 
                    sheet.href && sheet.href.includes('main.css')
                );
            },
            critical: false,
            description: 'Main CSS stylesheet',
            fallback: 'App may appear unstyled'
        });

        console.log(`📋 ARK Dependency Checker: Registered ${this.dependencies.size} dependencies`);
    }

    /**
     * Register a dependency for checking
     */
    registerDependency(name, config) {
        this.dependencies.set(name, {
            name: name,
            check: config.check,
            critical: config.critical || false,
            description: config.description || 'No description provided',
            fallback: config.fallback || 'No fallback available',
            lastChecked: null,
            status: 'unknown'
        });
    }

    /**
     * Check all registered dependencies
     */
    async checkAllDependencies() {
        console.log('🔍 ARK Dependency Checker: Checking all dependencies...');
        
        const results = {
            timestamp: new Date().toISOString(),
            total: this.dependencies.size,
            passed: 0,
            failed: 0,
            critical: 0,
            dependencies: {}
        };

        for (const [name, dependency] of this.dependencies) {
            const result = await this.checkDependency(name);
            results.dependencies[name] = result;
            
            if (result.available) {
                results.passed++;
            } else {
                results.failed++;
                if (dependency.critical) {
                    results.critical++;
                }
            }
        }

        this.checkResults.set('latest', results);
        
        console.log(`✅ ARK Dependency Checker: Check complete - ${results.passed}/${results.total} passed`);
        
        if (results.failed > 0) {
            console.warn(`⚠️ ARK Dependency Checker: ${results.failed} dependencies failed`);
            if (results.critical > 0) {
                console.error(`❌ ARK Dependency Checker: ${results.critical} critical dependencies failed`);
            }
        }

        return results;
    }

    /**
     * Check a specific dependency
     */
    async checkDependency(name) {
        const dependency = this.dependencies.get(name);
        if (!dependency) {
            console.warn(`⚠️ ARK Dependency Checker: Unknown dependency '${name}'`);
            return null;
        }

        const startTime = performance.now();
        let available = false;
        let error = null;

        try {
            available = await dependency.check();
        } catch (checkError) {
            error = checkError;
            available = false;
        }

        const duration = performance.now() - startTime;
        const result = {
            name: name,
            available: available,
            critical: dependency.critical,
            description: dependency.description,
            fallback: dependency.fallback,
            error: error ? {
                message: error.message,
                stack: error.stack
            } : null,
            checkDuration: Math.round(duration * 100) / 100,
            timestamp: new Date().toISOString()
        };

        // Update dependency status
        dependency.lastChecked = result.timestamp;
        dependency.status = available ? 'available' : 'missing';

        // Track missing dependencies
        if (!available) {
            this.missingDependencies.add(name);
            
            // Log missing dependency
            if (dependency.critical) {
                console.error(`❌ ARK Dependency Checker: Critical dependency '${name}' is missing`);
                console.error(`   Description: ${dependency.description}`);
                console.error(`   Fallback: ${dependency.fallback}`);
            } else {
                console.warn(`⚠️ ARK Dependency Checker: Optional dependency '${name}' is missing`);
                console.warn(`   Description: ${dependency.description}`);
                console.warn(`   Fallback: ${dependency.fallback}`);
            }
        } else {
            this.missingDependencies.delete(name);
        }

        return result;
    }

    /**
     * Check component health
     */
    async checkComponentHealth() {
        console.log('🔍 ARK Dependency Checker: Checking component health...');
        
        const components = {
            'app-initialization': () => typeof initializeApp === 'function',
            'navigation-system': () => typeof navigateToView === 'function',
            'quote-system': () => typeof loadTodaysQuote === 'function',
            'feedback-system': () => typeof submitFeedback === 'function',
            'profile-system': () => profileManager && typeof profileManager.init === 'function',
            'preferences-system': () => preferencesManager && typeof preferencesManager.init === 'function',
            'error-handling': () => errorHandler && typeof errorHandler.logError === 'function',
            'offline-support': () => typeof getCachedTodaysQuote === 'function',
            'pwa-features': () => 'serviceWorker' in navigator
        };

        const results = {};
        
        for (const [componentName, healthCheck] of Object.entries(components)) {
            try {
                const isHealthy = await healthCheck();
                results[componentName] = {
                    healthy: isHealthy,
                    timestamp: new Date().toISOString()
                };
                
                if (!isHealthy) {
                    this.failedComponents.add(componentName);
                    console.warn(`⚠️ ARK Dependency Checker: Component '${componentName}' is not healthy`);
                } else {
                    this.failedComponents.delete(componentName);
                }
            } catch (error) {
                results[componentName] = {
                    healthy: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                this.failedComponents.add(componentName);
                console.error(`❌ ARK Dependency Checker: Component '${componentName}' health check failed:`, error.message);
            }
        }

        return results;
    }

    /**
     * Generate comprehensive diagnostic report
     */
    async generateDiagnosticReport() {
        console.log('📊 ARK Dependency Checker: Generating diagnostic report...');
        
        const dependencyResults = await this.checkAllDependencies();
        const componentHealth = await this.checkComponentHealth();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalDependencies: dependencyResults.total,
                availableDependencies: dependencyResults.passed,
                missingDependencies: dependencyResults.failed,
                criticalMissing: dependencyResults.critical,
                failedComponents: this.failedComponents.size
            },
            dependencies: dependencyResults.dependencies,
            components: componentHealth,
            missingDependencies: Array.from(this.missingDependencies),
            failedComponents: Array.from(this.failedComponents),
            recommendations: this.generateRecommendations(dependencyResults, componentHealth),
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                hardwareConcurrency: navigator.hardwareConcurrency
            },
            pageInfo: {
                url: window.location.href,
                referrer: document.referrer,
                title: document.title,
                readyState: document.readyState
            }
        };

        console.log('✅ ARK Dependency Checker: Diagnostic report generated');
        return report;
    }

    /**
     * Generate recommendations based on check results
     */
    generateRecommendations(dependencyResults, componentHealth) {
        const recommendations = [];

        // Critical dependency recommendations
        if (dependencyResults.critical > 0) {
            recommendations.push({
                priority: 'critical',
                title: 'Critical Dependencies Missing',
                description: 'Some essential features are not available',
                actions: [
                    'Refresh the page to reload missing resources',
                    'Check if JavaScript is enabled in your browser',
                    'Clear browser cache and reload the page',
                    'Try using a different browser'
                ]
            });
        }

        // Component failure recommendations
        if (this.failedComponents.size > 0) {
            recommendations.push({
                priority: 'high',
                title: 'Component Failures Detected',
                description: 'Some application components are not working correctly',
                actions: [
                    'Refresh the page to reinitialize components',
                    'Check browser console for error messages',
                    'Clear application data and restart',
                    'Report the issue if problems persist'
                ]
            });
        }

        // Network connectivity recommendations
        if (!navigator.onLine) {
            recommendations.push({
                priority: 'medium',
                title: 'Offline Mode Active',
                description: 'Limited functionality available without internet connection',
                actions: [
                    'Check your internet connection',
                    'Use cached content for basic functionality',
                    'Some features will be restored when connection returns'
                ]
            });
        }

        // Browser compatibility recommendations
        const missingAPIs = Array.from(this.missingDependencies).filter(dep => {
            const dependency = this.dependencies.get(dep);
            return dependency && ['fetch', 'serviceWorker', 'notifications', 'indexedDB'].includes(dep);
        });

        if (missingAPIs.length > 0) {
            recommendations.push({
                priority: 'medium',
                title: 'Browser Compatibility Issues',
                description: 'Your browser may not support all features',
                actions: [
                    'Update your browser to the latest version',
                    'Try using a modern browser like Chrome, Firefox, or Safari',
                    'Some features may have limited functionality'
                ]
            });
        }

        // No issues found
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'info',
                title: 'All Dependencies Available',
                description: 'All required dependencies and components are working correctly',
                actions: [
                    'Continue using the application normally',
                    'Regular dependency checks will continue in the background'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Set up periodic dependency checks
     */
    setupPeriodicChecks() {
        if (!this.config.enablePeriodicChecks) {
            return;
        }

        setInterval(async () => {
            try {
                await this.checkAllDependencies();
                
                // Report critical issues immediately
                if (this.missingDependencies.size > 0) {
                    const criticalMissing = Array.from(this.missingDependencies).filter(name => {
                        const dep = this.dependencies.get(name);
                        return dep && dep.critical;
                    });
                    
                    if (criticalMissing.length > 0) {
                        console.error(`🚨 ARK Dependency Checker: Critical dependencies missing: ${criticalMissing.join(', ')}`);
                        
                        // Notify error handler if available
                        if (typeof errorHandler !== 'undefined' && errorHandler) {
                            errorHandler.logError('critical', 'dependencies', 
                                `Critical dependencies missing: ${criticalMissing.join(', ')}`, 
                                null, 
                                { missingDependencies: criticalMissing }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('❌ ARK Dependency Checker: Periodic check failed:', error);
            }
        }, this.config.checkInterval);

        console.log(`⏰ ARK Dependency Checker: Periodic checks enabled (${this.config.checkInterval}ms interval)`);
    }

    /**
     * Get current status summary
     */
    getStatusSummary() {
        return {
            totalDependencies: this.dependencies.size,
            missingDependencies: this.missingDependencies.size,
            failedComponents: this.failedComponents.size,
            criticalIssues: Array.from(this.missingDependencies).filter(name => {
                const dep = this.dependencies.get(name);
                return dep && dep.critical;
            }).length,
            lastCheck: this.checkResults.get('latest')?.timestamp || null
        };
    }

    /**
     * Force immediate dependency check
     */
    async forceCheck() {
        console.log('🔄 ARK Dependency Checker: Force checking all dependencies...');
        return await this.checkAllDependencies();
    }

    /**
     * Clear all cached results
     */
    clearCache() {
        this.checkResults.clear();
        this.missingDependencies.clear();
        this.failedComponents.clear();
        
        // Reset dependency statuses
        for (const dependency of this.dependencies.values()) {
            dependency.status = 'unknown';
            dependency.lastChecked = null;
        }
        
        console.log('🧹 ARK Dependency Checker: Cache cleared');
    }
}

// Create and export singleton instance
const dependencyChecker = new DependencyChecker();

// Make it globally available
window.ARKDependencyChecker = dependencyChecker;

export default dependencyChecker;