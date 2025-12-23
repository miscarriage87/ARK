/**
 * ARK Error Recovery System
 * 
 * Provides user-friendly error messages and recovery options.
 * Helps users recover from errors and continue using the application.
 * 
 * Validates: Requirements 7.3
 */

class ErrorRecoverySystem {
    constructor(config = {}) {
        this.config = {
            showRecoveryOptions: config.showRecoveryOptions !== false,
            autoRetry: config.autoRetry !== false,
            maxRetryAttempts: config.maxRetryAttempts || 3,
            retryDelay: config.retryDelay || 2000,
            ...config
        };
        
        this.retryAttempts = new Map();
        this.recoveryStrategies = new Map();
        
        this.initializeRecoveryStrategies();
    }

    /**
     * Initialize recovery strategies for different error types
     */
    initializeRecoveryStrategies() {
        // Network error recovery
        this.recoveryStrategies.set('network', {
            userMessage: 'Connection problem detected',
            description: 'Unable to connect to the server. This might be due to network issues.',
            recoveryOptions: [
                {
                    label: 'Check Connection',
                    action: 'checkConnection',
                    description: 'Verify your internet connection'
                },
                {
                    label: 'Retry',
                    action: 'retry',
                    description: 'Try the request again'
                },
                {
                    label: 'Work Offline',
                    action: 'goOffline',
                    description: 'Continue with cached content'
                }
            ]
        });

        // API error recovery
        this.recoveryStrategies.set('api', {
            userMessage: 'Service temporarily unavailable',
            description: 'The server is experiencing issues. Your data is safe.',
            recoveryOptions: [
                {
                    label: 'Retry',
                    action: 'retry',
                    description: 'Try again in a moment'
                },
                {
                    label: 'Refresh Page',
                    action: 'refresh',
                    description: 'Reload the application'
                },
                {
                    label: 'Report Issue',
                    action: 'report',
                    description: 'Let us know about this problem'
                }
            ]
        });

        // JavaScript error recovery
        this.recoveryStrategies.set('javascript', {
            userMessage: 'Application error occurred',
            description: 'Something went wrong with the application. We\'re working to fix it.',
            recoveryOptions: [
                {
                    label: 'Refresh Page',
                    action: 'refresh',
                    description: 'Reload the application'
                },
                {
                    label: 'Clear Cache',
                    action: 'clearCache',
                    description: 'Clear stored data and refresh'
                },
                {
                    label: 'Report Bug',
                    action: 'report',
                    description: 'Help us fix this issue'
                }
            ]
        });

        // UI error recovery
        this.recoveryStrategies.set('ui', {
            userMessage: 'Display issue detected',
            description: 'Some parts of the interface may not be working correctly.',
            recoveryOptions: [
                {
                    label: 'Refresh View',
                    action: 'refreshView',
                    description: 'Reload the current view'
                },
                {
                    label: 'Go Home',
                    action: 'goHome',
                    description: 'Return to the main page'
                },
                {
                    label: 'Reset Layout',
                    action: 'resetLayout',
                    description: 'Reset the interface layout'
                }
            ]
        });

        // Storage error recovery
        this.recoveryStrategies.set('storage', {
            userMessage: 'Storage issue detected',
            description: 'Unable to save or load data. Your browser storage might be full.',
            recoveryOptions: [
                {
                    label: 'Clear Old Data',
                    action: 'clearOldData',
                    description: 'Remove old cached data'
                },
                {
                    label: 'Export Data',
                    action: 'exportData',
                    description: 'Download your data as backup'
                },
                {
                    label: 'Continue Anyway',
                    action: 'continue',
                    description: 'Use the app without saving'
                }
            ]
        });

        console.log('✅ ARK Error Recovery: Recovery strategies initialized');
    }

    /**
     * Show user-friendly error with recovery options
     */
    showErrorWithRecovery(errorType, originalError, context = {}) {
        const strategy = this.recoveryStrategies.get(errorType) || this.getDefaultStrategy();
        
        // Create error recovery modal
        const modal = this.createErrorModal(strategy, originalError, context);
        document.body.appendChild(modal);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
        
        // Auto-hide after timeout if no user interaction
        setTimeout(() => {
            if (modal.parentNode && !modal.classList.contains('user-interacted')) {
                this.hideErrorModal(modal);
            }
        }, 15000);
        
        return modal;
    }

    /**
     * Create error recovery modal
     */
    createErrorModal(strategy, originalError, context) {
        const modal = document.createElement('div');
        modal.className = 'error-recovery-modal';
        modal.innerHTML = `
            <div class="error-recovery-backdrop"></div>
            <div class="error-recovery-content">
                <div class="error-recovery-header">
                    <div class="error-icon">⚠️</div>
                    <h3 class="error-title">${strategy.userMessage}</h3>
                    <button class="error-close" aria-label="Close">&times;</button>
                </div>
                <div class="error-recovery-body">
                    <p class="error-description">${strategy.description}</p>
                    ${context.details ? `<details class="error-details">
                        <summary>Technical Details</summary>
                        <pre class="error-technical">${this.formatTechnicalDetails(originalError, context)}</pre>
                    </details>` : ''}
                    <div class="error-recovery-options">
                        <h4>What would you like to do?</h4>
                        <div class="recovery-buttons">
                            ${strategy.recoveryOptions.map(option => `
                                <button class="recovery-option" data-action="${option.action}">
                                    <span class="option-label">${option.label}</span>
                                    <span class="option-description">${option.description}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="error-recovery-footer">
                    <small>Error ID: ${context.errorId || 'Unknown'}</small>
                </div>
            </div>
        `;

        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;

        // Add event listeners
        this.setupModalEventListeners(modal, strategy, originalError, context);

        return modal;
    }

    /**
     * Set up event listeners for the error modal
     */
    setupModalEventListeners(modal, strategy, originalError, context) {
        // Mark as user-interacted when clicked
        modal.addEventListener('click', () => {
            modal.classList.add('user-interacted');
        });

        // Close button
        const closeBtn = modal.querySelector('.error-close');
        closeBtn.addEventListener('click', () => {
            this.hideErrorModal(modal);
        });

        // Backdrop click to close
        const backdrop = modal.querySelector('.error-recovery-backdrop');
        backdrop.addEventListener('click', () => {
            this.hideErrorModal(modal);
        });

        // Recovery option buttons
        const recoveryButtons = modal.querySelectorAll('.recovery-option');
        recoveryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.executeRecoveryAction(action, originalError, context, modal);
            });
        });

        // Keyboard navigation
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideErrorModal(modal);
            }
        });
    }

    /**
     * Execute recovery action
     */
    async executeRecoveryAction(action, originalError, context, modal) {
        console.log(`🔧 ARK Error Recovery: Executing action '${action}'`);
        
        try {
            switch (action) {
                case 'retry':
                    await this.handleRetry(originalError, context, modal);
                    break;
                case 'refresh':
                    this.handleRefresh();
                    break;
                case 'refreshView':
                    await this.handleRefreshView(context);
                    break;
                case 'goHome':
                    this.handleGoHome();
                    break;
                case 'goOffline':
                    this.handleGoOffline();
                    break;
                case 'checkConnection':
                    await this.handleCheckConnection(modal);
                    break;
                case 'clearCache':
                    await this.handleClearCache();
                    break;
                case 'clearOldData':
                    await this.handleClearOldData();
                    break;
                case 'exportData':
                    this.handleExportData();
                    break;
                case 'report':
                    this.handleReportIssue(originalError, context);
                    break;
                case 'resetLayout':
                    this.handleResetLayout();
                    break;
                case 'continue':
                    this.hideErrorModal(modal);
                    break;
                default:
                    console.warn(`Unknown recovery action: ${action}`);
            }
        } catch (error) {
            console.error('Error executing recovery action:', error);
            this.showToast('Recovery action failed. Please try another option.', 4000);
        }
    }

    /**
     * Handle retry action
     */
    async handleRetry(originalError, context, modal) {
        const retryKey = context.retryKey || 'default';
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        if (attempts >= this.config.maxRetryAttempts) {
            this.showToast('Maximum retry attempts reached. Please try a different option.', 4000);
            return;
        }
        
        this.retryAttempts.set(retryKey, attempts + 1);
        
        // Show retry progress
        const retryBtn = modal.querySelector('[data-action="retry"]');
        const originalText = retryBtn.innerHTML;
        retryBtn.innerHTML = '<span class="option-label">Retrying...</span><span class="option-description">Please wait</span>';
        retryBtn.disabled = true;
        
        try {
            // Wait for retry delay
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            
            // Execute retry function if provided
            if (context.retryFunction && typeof context.retryFunction === 'function') {
                await context.retryFunction();
                this.hideErrorModal(modal);
                this.showToast('Operation completed successfully!', 3000);
                this.retryAttempts.delete(retryKey);
            } else {
                // Default retry: reload current view
                await this.handleRefreshView(context);
                this.hideErrorModal(modal);
            }
        } catch (retryError) {
            console.error('Retry failed:', retryError);
            retryBtn.innerHTML = originalText;
            retryBtn.disabled = false;
            this.showToast(`Retry failed (${attempts + 1}/${this.config.maxRetryAttempts}). Please try again.`, 4000);
        }
    }

    /**
     * Handle refresh page action
     */
    handleRefresh() {
        this.showToast('Refreshing page...', 2000);
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    /**
     * Handle refresh view action
     */
    async handleRefreshView(context) {
        if (typeof navigateToView === 'function' && context.currentView) {
            this.showToast('Refreshing view...', 2000);
            await navigateToView(context.currentView);
        } else {
            this.handleRefresh();
        }
    }

    /**
     * Handle go home action
     */
    handleGoHome() {
        if (typeof navigateToView === 'function') {
            this.showToast('Going to home...', 2000);
            navigateToView('daily-quote');
        } else {
            window.location.href = '/app';
        }
    }

    /**
     * Handle go offline action
     */
    handleGoOffline() {
        this.showToast('Switching to offline mode...', 3000);
        
        // Trigger offline mode if available
        if (typeof handleOfflineStatus === 'function') {
            handleOfflineStatus();
        }
        
        // Ensure offline content is available
        if (typeof ensureOfflineContent === 'function') {
            ensureOfflineContent();
        }
    }

    /**
     * Handle check connection action
     */
    async handleCheckConnection(modal) {
        const checkBtn = modal.querySelector('[data-action="checkConnection"]');
        const originalText = checkBtn.innerHTML;
        checkBtn.innerHTML = '<span class="option-label">Checking...</span><span class="option-description">Testing connection</span>';
        checkBtn.disabled = true;
        
        try {
            // Test connection by making a simple request
            const response = await fetch('/health', { 
                method: 'GET',
                cache: 'no-cache',
                timeout: 5000
            });
            
            if (response.ok) {
                this.showToast('Connection is working! You can try your action again.', 4000);
                checkBtn.innerHTML = '<span class="option-label">✅ Connected</span><span class="option-description">Connection is working</span>';
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error) {
            this.showToast('Connection test failed. Please check your internet connection.', 4000);
            checkBtn.innerHTML = '<span class="option-label">❌ No Connection</span><span class="option-description">Check your internet</span>';
        }
        
        setTimeout(() => {
            checkBtn.innerHTML = originalText;
            checkBtn.disabled = false;
        }, 3000);
    }

    /**
     * Handle clear cache action
     */
    async handleClearCache() {
        try {
            // Clear localStorage
            const keysToKeep = ['ark-user-profile']; // Keep essential data
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Clear caches if available
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            this.showToast('Cache cleared successfully. Refreshing page...', 3000);
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('Failed to clear cache:', error);
            this.showToast('Failed to clear cache. Please try refreshing the page manually.', 4000);
        }
    }

    /**
     * Handle clear old data action
     */
    async handleClearOldData() {
        try {
            // Clear old cached quotes (keep only recent ones)
            const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            const recentQuotes = {};
            Object.entries(cachedQuotes).forEach(([date, quote]) => {
                const quoteDate = new Date(date);
                if (quoteDate > thirtyDaysAgo) {
                    recentQuotes[date] = quote;
                }
            });
            
            localStorage.setItem('ark-cached-quotes', JSON.stringify(recentQuotes));
            
            // Clear old error logs
            localStorage.removeItem('ark-error-log');
            
            // Clear old feedback
            const feedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
            const recentFeedback = feedback.filter(f => {
                const feedbackDate = new Date(f.timestamp);
                return feedbackDate > thirtyDaysAgo;
            });
            localStorage.setItem('ark-pending-feedback', JSON.stringify(recentFeedback));
            
            this.showToast('Old data cleared successfully!', 3000);
            
        } catch (error) {
            console.error('Failed to clear old data:', error);
            this.showToast('Failed to clear old data. Please try clearing cache instead.', 4000);
        }
    }

    /**
     * Handle export data action
     */
    handleExportData() {
        if (typeof handleExportData === 'function') {
            handleExportData();
        } else {
            this.showToast('Export feature is not available at the moment.', 3000);
        }
    }

    /**
     * Handle report issue action
     */
    handleReportIssue(originalError, context) {
        const reportData = {
            error: originalError,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Create mailto link with error details
        const subject = encodeURIComponent('ARK App Error Report');
        const body = encodeURIComponent(`
Error Report:
- Error ID: ${context.errorId || 'Unknown'}
- Time: ${reportData.timestamp}
- Page: ${reportData.url}
- Browser: ${reportData.userAgent}

Description:
Please describe what you were doing when this error occurred:

Technical Details:
${JSON.stringify(reportData, null, 2)}
        `);
        
        const mailtoLink = `mailto:support@ark-app.com?subject=${subject}&body=${body}`;
        
        try {
            window.open(mailtoLink);
            this.showToast('Email client opened. Thank you for reporting this issue!', 4000);
        } catch (error) {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(body).then(() => {
                this.showToast('Error details copied to clipboard. Please email them to support@ark-app.com', 5000);
            }).catch(() => {
                this.showToast('Please email support@ark-app.com with details about this error.', 4000);
            });
        }
    }

    /**
     * Handle reset layout action
     */
    handleResetLayout() {
        // Remove any layout-related localStorage items
        const layoutKeys = Object.keys(localStorage).filter(key => 
            key.includes('layout') || key.includes('position') || key.includes('size')
        );
        
        layoutKeys.forEach(key => localStorage.removeItem(key));
        
        this.showToast('Layout reset. Refreshing page...', 3000);
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    /**
     * Hide error modal
     */
    hideErrorModal(modal) {
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }, 300);
    }

    /**
     * Get default recovery strategy
     */
    getDefaultStrategy() {
        return {
            userMessage: 'Something went wrong',
            description: 'An unexpected error occurred. We apologize for the inconvenience.',
            recoveryOptions: [
                {
                    label: 'Refresh Page',
                    action: 'refresh',
                    description: 'Reload the application'
                },
                {
                    label: 'Go Home',
                    action: 'goHome',
                    description: 'Return to the main page'
                },
                {
                    label: 'Report Issue',
                    action: 'report',
                    description: 'Let us know about this problem'
                }
            ]
        };
    }

    /**
     * Format technical details for display
     */
    formatTechnicalDetails(error, context) {
        const details = {
            timestamp: new Date().toISOString(),
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines
            } : null,
            context: context,
            page: {
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };
        
        return JSON.stringify(details, null, 2);
    }

    /**
     * Show toast notification
     */
    showToast(message, duration = 3000) {
        if (typeof showToast === 'function') {
            showToast(message, duration);
        } else {
            console.log('Toast:', message);
        }
    }

    /**
     * Clear retry attempts for a specific key
     */
    clearRetryAttempts(retryKey) {
        this.retryAttempts.delete(retryKey);
    }

    /**
     * Add custom recovery strategy
     */
    addRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
        console.log(`✅ ARK Error Recovery: Added strategy for '${errorType}'`);
    }
}

// Create and export singleton instance
const errorRecoverySystem = new ErrorRecoverySystem();

// Make it globally available
window.ARKErrorRecovery = errorRecoverySystem;

export default errorRecoverySystem;