/**
 * ARK Error Handler
 * 
 * Comprehensive error handling and logging system for the backend.
 * Provides structured error logging, diagnostic reporting, and error recovery.
 * 
 * Validates: Requirements 7.1, 7.4
 */

const fs = require('fs');
const path = require('path');

class ErrorHandler {
    constructor(config = {}) {
        this.config = {
            logLevel: config.logLevel || 'info',
            logToFile: config.logToFile !== false,
            logToConsole: config.logToConsole !== false,
            logDirectory: config.logDirectory || path.join(__dirname, 'logs'),
            maxLogFiles: config.maxLogFiles || 10,
            maxLogSize: config.maxLogSize || 10 * 1024 * 1024, // 10MB
            ...config
        };
        
        this.errorCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
        
        this.recentErrors = [];
        this.maxRecentErrors = 100;
        
        this.initializeLogging();
    }

    /**
     * Initialize logging system
     */
    initializeLogging() {
        if (this.config.logToFile) {
            try {
                // Ensure log directory exists
                if (!fs.existsSync(this.config.logDirectory)) {
                    fs.mkdirSync(this.config.logDirectory, { recursive: true });
                }
                
                // Set up log rotation
                this.setupLogRotation();
                
                console.log('✅ ARK Error Handler: File logging initialized');
            } catch (error) {
                console.error('❌ ARK Error Handler: Failed to initialize file logging:', error.message);
                this.config.logToFile = false;
            }
        }
    }

    /**
     * Set up log rotation to prevent disk space issues
     */
    setupLogRotation() {
        const logFile = path.join(this.config.logDirectory, 'error.log');
        
        try {
            if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > this.config.maxLogSize) {
                    this.rotateLogFile(logFile);
                }
            }
        } catch (error) {
            console.error('❌ ARK Error Handler: Log rotation failed:', error.message);
        }
    }

    /**
     * Rotate log file when it gets too large
     */
    rotateLogFile(logFile) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
            
            fs.renameSync(logFile, rotatedFile);
            
            // Clean up old log files
            this.cleanupOldLogs();
            
            console.log(`📄 ARK Error Handler: Log rotated to ${rotatedFile}`);
        } catch (error) {
            console.error('❌ ARK Error Handler: Failed to rotate log:', error.message);
        }
    }

    /**
     * Clean up old log files to prevent disk space issues
     */
    cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.config.logDirectory)
                .filter(file => file.startsWith('error-') && file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.logDirectory, file),
                    mtime: fs.statSync(path.join(this.config.logDirectory, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // Keep only the most recent log files
            if (files.length > this.config.maxLogFiles) {
                const filesToDelete = files.slice(this.config.maxLogFiles);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ ARK Error Handler: Deleted old log file ${file.name}`);
                });
            }
        } catch (error) {
            console.error('❌ ARK Error Handler: Failed to cleanup old logs:', error.message);
        }
    }

    /**
     * Log error with structured format
     */
    logError(level, component, message, error = null, context = {}) {
        const timestamp = new Date().toISOString();
        const errorId = this.generateErrorId();
        
        const logEntry = {
            id: errorId,
            timestamp: timestamp,
            level: level,
            component: component,
            message: message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            } : null,
            context: context,
            process: {
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                arch: process.arch
            }
        };

        // Update error counts
        if (this.errorCounts[level] !== undefined) {
            this.errorCounts[level]++;
        }

        // Add to recent errors
        this.recentErrors.unshift(logEntry);
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors = this.recentErrors.slice(0, this.maxRecentErrors);
        }

        // Log to console
        if (this.config.logToConsole) {
            this.logToConsole(logEntry);
        }

        // Log to file
        if (this.config.logToFile) {
            this.logToFile(logEntry);
        }

        return errorId;
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `ERR-${timestamp}-${random}`.toUpperCase();
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

        const icon = levelIcons[logEntry.level] || '📝';
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        
        console.error(`${icon} [${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.component}] ${logEntry.message}`);
        
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
    }

    /**
     * Log to file
     */
    logToFile(logEntry) {
        try {
            const logFile = path.join(this.config.logDirectory, 'error.log');
            const logLine = JSON.stringify(logEntry) + '\n';
            
            fs.appendFileSync(logFile, logLine);
        } catch (error) {
            console.error('❌ ARK Error Handler: Failed to write to log file:', error.message);
        }
    }

    /**
     * Handle critical errors that may crash the application
     */
    handleCriticalError(component, message, error, context = {}) {
        const errorId = this.logError('critical', component, message, error, context);
        
        // For critical errors, also create a crash report
        this.createCrashReport(errorId, component, message, error, context);
        
        return errorId;
    }

    /**
     * Create crash report for critical errors
     */
    createCrashReport(errorId, component, message, error, context) {
        try {
            const crashReport = {
                errorId: errorId,
                timestamp: new Date().toISOString(),
                component: component,
                message: message,
                error: error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                } : null,
                context: context,
                system: {
                    platform: process.platform,
                    nodeVersion: process.version,
                    arch: process.arch,
                    memory: process.memoryUsage(),
                    uptime: process.uptime(),
                    pid: process.pid
                },
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    PORT: process.env.PORT,
                    AI_ENABLED: process.env.ENABLE_AI_GENERATION
                },
                recentErrors: this.recentErrors.slice(0, 10) // Last 10 errors for context
            };

            const crashFile = path.join(this.config.logDirectory, `crash-${errorId}.json`);
            fs.writeFileSync(crashFile, JSON.stringify(crashReport, null, 2));
            
            console.error(`💥 ARK Error Handler: Crash report created: ${crashFile}`);
        } catch (reportError) {
            console.error('❌ ARK Error Handler: Failed to create crash report:', reportError.message);
        }
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            counts: { ...this.errorCounts },
            recentErrorsCount: this.recentErrors.length,
            totalErrors: Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0),
            lastError: this.recentErrors[0] || null
        };
    }

    /**
     * Get recent errors for diagnostic reporting
     */
    getRecentErrors(limit = 20) {
        return this.recentErrors.slice(0, limit);
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
            systemInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                arch: process.arch,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                pid: process.pid
            },
            configuration: {
                logLevel: this.config.logLevel,
                logToFile: this.config.logToFile,
                logToConsole: this.config.logToConsole,
                logDirectory: this.config.logDirectory
            }
        };
    }

    /**
     * Clear error history (for testing or maintenance)
     */
    clearErrorHistory() {
        this.errorCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
        this.recentErrors = [];
        
        console.log('🧹 ARK Error Handler: Error history cleared');
    }

    /**
     * Express middleware for handling uncaught errors
     */
    expressErrorMiddleware() {
        return (error, req, res, next) => {
            const errorId = this.logError('high', 'express', 'Unhandled Express error', error, {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
                params: req.params,
                query: req.query
            });

            // Don't expose internal error details in production
            const isProduction = process.env.NODE_ENV === 'production';
            
            res.status(500).json({
                error: 'Internal server error',
                message: isProduction ? 'An unexpected error occurred' : error.message,
                errorId: errorId,
                timestamp: new Date().toISOString()
            });
        };
    }

    /**
     * Set up global error handlers
     */
    setupGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            const errorId = this.handleCriticalError('process', 'Uncaught exception', error);
            console.error(`💥 ARK: Uncaught exception (${errorId}). Application will exit.`);
            
            // Give time for logging to complete
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            const errorId = this.logError('high', 'process', 'Unhandled promise rejection', error, {
                promise: promise.toString()
            });
            
            console.error(`⚠️ ARK: Unhandled promise rejection (${errorId})`);
        });

        // Handle process warnings
        process.on('warning', (warning) => {
            this.logError('medium', 'process', 'Process warning', warning, {
                warningName: warning.name,
                warningCode: warning.code
            });
        });

        console.log('✅ ARK Error Handler: Global error handlers set up');
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler({
    logLevel: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE !== 'false',
    logToConsole: process.env.LOG_TO_CONSOLE !== 'false'
});

// Set up global handlers
errorHandler.setupGlobalHandlers();

module.exports = errorHandler;