/**
 * ARK Frontend Error Handler
 * 
 * Comprehensive error handling and logging system for the frontend.
 * Provides structured error logging, user-friendly error messages, and diagnostic reporting.
 * 
 * Validates: Requirements 7.1, 7.4
 */

class FrontendErrorHandler {
    constructor(config = {}) {
        this.config = {
            logLevel: config.logLevel || 'info',
            maxStoredErrors: config.maxStoredErrors || 100,
            reportToServer: config.reportToServer !== false,
            showUserErrors: config.showUserErrors !== false,
            apiEndpoint: config.apiEndpoint || '/api/errors',
            ...config
        };
        
        this.errorCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            javascript: 0,
            network: 0,
            ui: 0
        };
        
        this.storedErrors = [];
        this.errorQueue = [];
        this.isOnline = navigator.onLine;
        
        this.initializeErrorHandling();
    }

    /**
     * Initialize error handling system
     */
    initializeErrorHandling() {
        this.setupGlobalErrorHandlers();
        this.setupNetworkMonitoring();
        this.loadStoredErrors();
        
        console.log('✅ ARK Frontend Error Handler: Initialized');
    }

    /**
     * Set up global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError(event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                message: event.message
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason, {
                promise: event.promise
            });
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError(event.target, {
                    type: event.target.tagName,
                    src: event.target.src || event.target.href,
                    message: 'Failed to load resource'
                });
            }
        }, true);

        console.log('✅ ARK Frontend Error Handler: Global handlers set up');
    }

    /**
     * Set up network monitoring
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processErrorQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Load stored errors from localStorage
     */
    loadStoredErrors() {
        try {
            const stored = localStorage.getItem('ark-error-log');
            if (stored) {
                this.storedErrors = JSON.parse(stored);
                console.log(`📦 ARK Error Handler: Loaded ${this.storedErrors.length} stored errors`);
            }
        } catch (error) {
            console.warn('⚠️ ARK Error Handler: Failed to load stored errors:', error.message);
            this.storedErrors = [];
        }
    }

    /**
     * Save errors to localStorage
     */
    saveStoredErrors() {
        try {
            // Keep only the most recent errors to prevent storage bloat
            const errorsToStore = this.storedErrors.slice(0, this.config.maxStoredErrors);
            localStorage.setItem('ark-error-log', JSON.stringify(errorsToStore));
        } catch (error) {
            console.warn('⚠️ ARK Error Handler: Failed to save errors to storage:', error.message);
        }
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `FE-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Log error with structured format
     */
    logError(level, category, message, error = null, context = {}) {
        const timestamp = new Date().toISOString();
        const errorId = this.generateErrorId();
        
        const logEntry = {
            id: errorId,
            timestamp: timestamp,
            level: level,
            category: category,
            message: message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                fileName: error.fileName,
                lineNumber: error.lineNumber,
                columnNumber: error.columnNumber
            } : null,
            context: context,
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            page: {
                url: window.location.href,
                referrer: document.referrer,
                title: document.title,
                timestamp: timestamp
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio
            }
        };

        // Update error counts
        if (this.errorCounts[level] !== undefined) {
            this.errorCounts[level]++;
        }
        if (this.errorCounts[category] !== undefined) {
            this.errorCounts[category]++;
        }

        // Store error
        this.storedErrors.unshift(logEntry);
        if (this.storedErrors.length > this.config.maxStoredErrors) {
            this.storedErrors = this.storedErrors.slice(0, this.config.maxStoredErrors);
        }

        // Save to localStorage
        this.saveStoredErrors();

        // Log to console
        this.logToConsole(logEntry);

        // Report to server if online
        if (this.config.reportToServer) {
            if (this.isOnline) {
                this.reportErrorToServer(logEntry);
            } else {
                this.errorQueue.push(logEntry);
            }
        }

        // Show user-friendly error if configured
        if (this.config.showUserErrors && (level === 'critical' || level === 'high')) {
            this.showUserError(logEntry);
        }

        return errorId;
    }

    /**
     * Log to console with formatting
     */
    logToConsole(logEntry) {
        const levelIcons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            info: 'ℹ️',
            debug: '🔍'
        };

        const categoryIcons = {
            javascript: '⚡',
            network: '🌐',
            ui: '🎨',
            api: '🔌',
            storage: '💾',
            performance: '⚡'
        };

        const levelIcon = levelIcons[logEntry.level] || '📝';
        const categoryIcon = categoryIcons[logEntry.category] || '📋';
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        
        console.error(`${levelIcon}${categoryIcon} [${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}] ${logEntry.message}`);
        
        if (logEntry.error) {
            console.error(`   Error: ${logEntry.error.message}`);
            if (logEntry.level === 'critical' || logEntry.level === 'high') {
                console.error(`   Stack: ${logEntry.error.stack}`);
            }
        }
        
        if (Object.keys(logEntry.context).length > 0) {
            console.error(`   Context:`, logEntry.context);
        }
        
        console.error(`   Error ID: ${logEntry.id}`);
        console.error(`   Page: ${logEntry.page.url}`);
    }

    /**
     * Handle JavaScript errors
     */
    handleJavaScriptError(error, context = {}) {
        const errorId = this.logError('high', 'javascript', 'JavaScript error occurred', error, context);
        
        // Additional context for JavaScript errors
        if (error && error.stack) {
            const stackLines = error.stack.split('\n');
            const relevantStack = stackLines.slice(0, 5); // First 5 lines of stack
            
            console.group(`🔍 ARK Error Details (${errorId})`);
            console.error('Stack trace:', relevantStack);
            console.error('Full error object:', error);
            console.groupEnd();
        }
        
        return errorId;
    }

    /**
     * Handle promise rejections
     */
    handlePromiseRejection(reason, context = {}) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        return this.logError('medium', 'javascript', 'Unhandled promise rejection', error, context);
    }

    /**
     * Handle resource loading errors
     */
    handleResourceError(element, context = {}) {
        return this.logError('medium', 'network', 'Resource failed to load', null, {
            ...context,
            element: {
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                src: element.src || element.href
            }
        });
    }

    /**
     * Handle API errors
     */
    handleAPIError(response, request, context = {}) {
        const level = response.status >= 500 ? 'high' : 'medium';
        const message = `API request failed: ${response.status} ${response.statusText}`;
        
        return this.logError(level, 'network', message, null, {
            ...context,
            request: {
                method: request.method || 'GET',
                url: request.url,
                headers: request.headers
            },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            }
        });
    }

    /**
     * Handle UI errors
     */
    handleUIError(component, message, context = {}) {
        return this.logError('medium', 'ui', `UI Error in ${component}: ${message}`, null, context);
    }

    /**
     * Report error to server
     */
    async reportErrorToServer(logEntry) {
        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            console.log(`📤 ARK Error Handler: Error ${logEntry.id} reported to server`);
        } catch (error) {
            console.warn(`⚠️ ARK Error Handler: Failed to report error ${logEntry.id} to server:`, error.message);
            // Add back to queue for retry
            this.errorQueue.push(logEntry);
        }
    }

    /**
     * Process queued errors when back online
     */
    async processErrorQueue() {
        if (!this.isOnline || this.errorQueue.length === 0) {
            return;
        }

        console.log(`📤 ARK Error Handler: Processing ${this.errorQueue.length} queued errors`);

        const errors = [...this.errorQueue];
        this.errorQueue = [];

        for (const error of errors) {
            await this.reportErrorToServer(error);
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Show user-friendly error message
     */
    showUserError(logEntry) {
        // Create user-friendly error message
        let userMessage = this.getUserFriendlyMessage(logEntry);
        
        // Add error ID for support
        userMessage += `\n\nError ID: ${logEntry.id}`;
        
        // Show error using the app's toast system if available
        if (typeof showToast === 'function') {
            showToast(userMessage, 5000);
        } else if (typeof showError === 'function') {
            showError(userMessage);
        } else {
            // Fallback to alert
            alert(userMessage);
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(logEntry) {
        const messages = {
            javascript: {
                critical: 'A critical error occurred. Please refresh the page.',
                high: 'An error occurred while processing your request. Please try again.',
                medium: 'Something went wrong. The app should continue working normally.',
                low: 'A minor issue was detected and has been logged.'
            },
            network: {
                critical: 'Unable to connect to the server. Please check your internet connection.',
                high: 'Network request failed. Please check your connection and try again.',
                medium: 'Some content may not load properly due to network issues.',
                low: 'A network request failed but the app should continue working.'
            },
            ui: {
                critical: 'The user interface encountered a critical error. Please refresh the page.',
                high: 'A display error occurred. Some features may not work properly.',
                medium: 'A minor display issue was detected.',
                low: 'A small UI issue was detected and logged.'
            }
        };

        const categoryMessages = messages[logEntry.category] || messages.javascript;
        return categoryMessages[logEntry.level] || 'An unexpected error occurred.';
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            counts: { ...this.errorCounts },
            storedErrorsCount: this.storedErrors.length,
            queuedErrorsCount: this.errorQueue.length,
            totalErrors: Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0),
            lastError: this.storedErrors[0] || null
        };
    }

    /**
     * Get recent errors
     */
    getRecentErrors(limit = 20) {
        return this.storedErrors.slice(0, limit);
    }

    /**
     * Generate diagnostic report
     */
    generateDiagnosticReport() {
        const stats = this.getErrorStats();
        const recentErrors = this.getRecentErrors(10);
        
        return {
            timestamp: new Date().toISOString(),
            errorStats: stats,
            recentErrors: recentErrors,
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                hardwareConcurrency: navigator.hardwareConcurrency,
                maxTouchPoints: navigator.maxTouchPoints
            },
            pageInfo: {
                url: window.location.href,
                referrer: document.referrer,
                title: document.title,
                readyState: document.readyState
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            performance: this.getPerformanceMetrics(),
            configuration: {
                logLevel: this.config.logLevel,
                maxStoredErrors: this.config.maxStoredErrors,
                reportToServer: this.config.reportToServer,
                showUserErrors: this.config.showUserErrors
            }
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!window.performance) {
            return null;
        }

        const navigation = performance.getEntriesByType('navigation')[0];
        const memory = performance.memory;

        return {
            navigation: navigation ? {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                domInteractive: navigation.domInteractive - navigation.navigationStart,
                firstPaint: navigation.responseEnd - navigation.requestStart
            } : null,
            memory: memory ? {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit
            } : null,
            timing: {
                now: performance.now(),
                timeOrigin: performance.timeOrigin
            }
        };
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            javascript: 0,
            network: 0,
            ui: 0
        };
        this.storedErrors = [];
        this.errorQueue = [];
        
        try {
            localStorage.removeItem('ark-error-log');
        } catch (error) {
            console.warn('⚠️ ARK Error Handler: Failed to clear stored errors:', error.message);
        }
        
        console.log('🧹 ARK Frontend Error Handler: Error history cleared');
    }

    /**
     * Test error handling (for development)
     */
    testErrorHandling() {
        console.log('🧪 ARK Error Handler: Testing error handling...');
        
        // Test JavaScript error
        this.handleJavaScriptError(new Error('Test JavaScript error'), { test: true });
        
        // Test promise rejection
        this.handlePromiseRejection('Test promise rejection', { test: true });
        
        // Test UI error
        this.handleUIError('TestComponent', 'Test UI error', { test: true });
        
        console.log('✅ ARK Error Handler: Error handling test complete');
    }
}

// Create and export singleton instance
const frontendErrorHandler = new FrontendErrorHandler({
    logLevel: 'info',
    reportToServer: true,
    showUserErrors: true
});

// Make it globally available
window.ARKErrorHandler = frontendErrorHandler;

export default frontendErrorHandler;