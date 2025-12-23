/**
 * Cache module for ARK Digital Calendar
 * 
 * Handles local storage and caching of quotes and user data.
 */

// Cache configuration
const CACHE_CONFIG = {
    MAX_QUOTES: 100,           // Maximum number of quotes to cache
    MAX_FEEDBACK_ITEMS: 500,   // Maximum number of feedback items
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB limit
    CLEANUP_THRESHOLD: 0.8,    // Clean up when 80% full
    QUOTE_RETENTION_DAYS: 30   // Keep quotes for 30 days
};

/**
 * Safe localStorage operations with error handling
 */
const SafeStorage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Cache: Error reading ${key}:`, error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            
            // Check if we're approaching storage limits
            if (this.getStorageSize() + serialized.length > CACHE_CONFIG.MAX_STORAGE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD) {
                this.performCleanup();
            }
            
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error(`Cache: Error writing ${key}:`, error);
            
            // If quota exceeded, try cleanup and retry once
            if (error.name === 'QuotaExceededError') {
                this.performCleanup();
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (retryError) {
                    console.error(`Cache: Retry failed for ${key}:`, retryError);
                }
            }
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Cache: Error removing ${key}:`, error);
            return false;
        }
    },

    getStorageSize() {
        let total = 0;
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
        } catch (error) {
            console.error('Cache: Error calculating storage size:', error);
        }
        return total;
    },

    performCleanup() {
        console.log('Cache: Performing cleanup...');
        
        // Clean up old quotes
        cleanupOldQuotes();
        
        // Clean up excess feedback
        cleanupExcessFeedback();
        
        console.log('Cache: Cleanup completed');
    }
};

/**
 * Cache quote for offline use with metadata
 */
function cacheQuote(quote) {
    try {
        const today = new Date().toDateString();
        const cachedQuotes = SafeStorage.get('ark-cached-quotes', {});
        
        // Add metadata to the quote
        const quoteToCahe = {
            ...quote,
            cachedAt: new Date().toISOString(),
            dateKey: today,
            version: '1.0.0'
        };
        
        cachedQuotes[today] = quoteToCahe;
        
        // Check if we need to clean up old quotes
        if (Object.keys(cachedQuotes).length > CACHE_CONFIG.MAX_QUOTES) {
            cleanupOldQuotes(cachedQuotes);
        }
        
        const success = SafeStorage.set('ark-cached-quotes', cachedQuotes);
        if (!success) {
            throw new Error('Failed to cache quote');
        }
        
        return quoteToCahe;
    } catch (error) {
        console.error('Cache: Error caching quote:', error);
        throw error;
    }
}

/**
 * Get cached quote for today
 */
function getCachedTodaysQuote() {
    try {
        const today = new Date().toDateString();
        const cachedQuotes = SafeStorage.get('ark-cached-quotes', {});
        const quote = cachedQuotes[today];
        
        if (quote && isQuoteValid(quote)) {
            return quote;
        }
        
        return null;
    } catch (error) {
        console.error('Cache: Error getting today\'s quote:', error);
        return null;
    }
}

/**
 * Get all cached quotes with validation
 */
function getCachedQuotes() {
    try {
        const cachedQuotes = SafeStorage.get('ark-cached-quotes', {});
        const validQuotes = [];
        
        for (const [dateKey, quote] of Object.entries(cachedQuotes)) {
            if (isQuoteValid(quote)) {
                validQuotes.push(quote);
            }
        }
        
        // Sort by date (newest first)
        return validQuotes.sort((a, b) => new Date(b.cachedAt) - new Date(a.cachedAt));
    } catch (error) {
        console.error('Cache: Error getting cached quotes:', error);
        return [];
    }
}

/**
 * Get cached quotes for a specific date range
 */
function getCachedQuotesInRange(startDate, endDate) {
    try {
        const cachedQuotes = SafeStorage.get('ark-cached-quotes', {});
        const validQuotes = [];
        
        for (const [dateKey, quote] of Object.entries(cachedQuotes)) {
            if (isQuoteValid(quote)) {
                const quoteDate = new Date(dateKey);
                if (quoteDate >= startDate && quoteDate <= endDate) {
                    validQuotes.push(quote);
                }
            }
        }
        
        return validQuotes.sort((a, b) => new Date(b.cachedAt) - new Date(a.cachedAt));
    } catch (error) {
        console.error('Cache: Error getting quotes in range:', error);
        return [];
    }
}

/**
 * Validate quote data integrity
 */
function isQuoteValid(quote) {
    if (!quote || typeof quote !== 'object') {
        return false;
    }
    
    // Check required fields
    const requiredFields = ['content', 'author'];
    for (const field of requiredFields) {
        if (!quote[field] || typeof quote[field] !== 'string') {
            return false;
        }
    }
    
    // Check if quote is not too old
    if (quote.cachedAt) {
        const cacheDate = new Date(quote.cachedAt);
        const maxAge = CACHE_CONFIG.QUOTE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() - cacheDate.getTime() > maxAge) {
            return false;
        }
    }
    
    return true;
}

/**
 * Clean up old quotes beyond retention period
 */
function cleanupOldQuotes(cachedQuotes = null) {
    try {
        const quotes = cachedQuotes || SafeStorage.get('ark-cached-quotes', {});
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CACHE_CONFIG.QUOTE_RETENTION_DAYS);
        
        let cleanedCount = 0;
        const cleanedQuotes = {};
        
        for (const [dateKey, quote] of Object.entries(quotes)) {
            const quoteDate = new Date(dateKey);
            if (quoteDate >= cutoffDate && isQuoteValid(quote)) {
                cleanedQuotes[dateKey] = quote;
            } else {
                cleanedCount++;
            }
        }
        
        // If we still have too many quotes, remove oldest ones
        const sortedEntries = Object.entries(cleanedQuotes)
            .sort(([a], [b]) => new Date(b) - new Date(a));
        
        if (sortedEntries.length > CACHE_CONFIG.MAX_QUOTES) {
            const keptEntries = sortedEntries.slice(0, CACHE_CONFIG.MAX_QUOTES);
            const finalQuotes = Object.fromEntries(keptEntries);
            cleanedCount += sortedEntries.length - CACHE_CONFIG.MAX_QUOTES;
            
            SafeStorage.set('ark-cached-quotes', finalQuotes);
        } else {
            SafeStorage.set('ark-cached-quotes', cleanedQuotes);
        }
        
        if (cleanedCount > 0) {
            console.log(`Cache: Cleaned up ${cleanedCount} old quotes`);
        }
        
        return cleanedCount;
    } catch (error) {
        console.error('Cache: Error cleaning up old quotes:', error);
        return 0;
    }
}

/**
 * Store feedback locally for offline sync with improved management
 */
function storeFeedbackLocally(feedbackData) {
    try {
        const pendingFeedback = SafeStorage.get('ark-pending-feedback', []);
        
        // Add metadata to feedback
        const feedbackWithMetadata = {
            ...feedbackData,
            timestamp: new Date().toISOString(),
            id: feedbackData.id || generateFeedbackId(feedbackData),
            version: '1.0.0'
        };
        
        // Remove any existing feedback for this quote
        const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== feedbackData.quoteId);
        
        // Add the new feedback
        filteredFeedback.push(feedbackWithMetadata);
        
        // Check if we need to clean up excess feedback
        if (filteredFeedback.length > CACHE_CONFIG.MAX_FEEDBACK_ITEMS) {
            cleanupExcessFeedback(filteredFeedback);
        }
        
        const success = SafeStorage.set('ark-pending-feedback', filteredFeedback);
        if (!success) {
            throw new Error('Failed to store feedback locally');
        }
        
        return feedbackWithMetadata;
    } catch (error) {
        console.error('Cache: Error storing feedback locally:', error);
        throw error;
    }
}

/**
 * Get pending feedback with validation
 */
function getPendingFeedback() {
    try {
        const pendingFeedback = SafeStorage.get('ark-pending-feedback', []);
        return pendingFeedback.filter(feedback => isFeedbackValid(feedback));
    } catch (error) {
        console.error('Cache: Error getting pending feedback:', error);
        return [];
    }
}

/**
 * Remove pending feedback for a quote
 */
function removePendingFeedback(quoteId) {
    try {
        const pendingFeedback = getPendingFeedback();
        const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== quoteId);
        const success = SafeStorage.set('ark-pending-feedback', filteredFeedback);
        
        if (!success) {
            throw new Error('Failed to remove pending feedback');
        }
        
        return true;
    } catch (error) {
        console.error('Cache: Error removing pending feedback:', error);
        return false;
    }
}

/**
 * Clear all pending feedback
 */
function clearPendingFeedback() {
    try {
        return SafeStorage.remove('ark-pending-feedback');
    } catch (error) {
        console.error('Cache: Error clearing pending feedback:', error);
        return false;
    }
}

/**
 * Validate feedback data integrity
 */
function isFeedbackValid(feedback) {
    if (!feedback || typeof feedback !== 'object') {
        return false;
    }
    
    // Check required fields
    const requiredFields = ['quoteId', 'rating'];
    for (const field of requiredFields) {
        if (feedback[field] === undefined || feedback[field] === null) {
            return false;
        }
    }
    
    // Validate rating range
    if (typeof feedback.rating !== 'number' || feedback.rating < -1 || feedback.rating > 1) {
        return false;
    }
    
    return true;
}

/**
 * Generate unique feedback ID
 */
function generateFeedbackId(feedbackData) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `feedback_${feedbackData.quoteId}_${timestamp}_${random}`;
}

/**
 * Clean up excess feedback items
 */
function cleanupExcessFeedback(feedbackArray = null) {
    try {
        const feedback = feedbackArray || SafeStorage.get('ark-pending-feedback', []);
        
        if (feedback.length <= CACHE_CONFIG.MAX_FEEDBACK_ITEMS) {
            return 0;
        }
        
        // Sort by timestamp (newest first) and keep only the most recent items
        const sortedFeedback = feedback
            .filter(f => isFeedbackValid(f))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, CACHE_CONFIG.MAX_FEEDBACK_ITEMS);
        
        const cleanedCount = feedback.length - sortedFeedback.length;
        
        SafeStorage.set('ark-pending-feedback', sortedFeedback);
        
        if (cleanedCount > 0) {
            console.log(`Cache: Cleaned up ${cleanedCount} excess feedback items`);
        }
        
        return cleanedCount;
    } catch (error) {
        console.error('Cache: Error cleaning up excess feedback:', error);
        return 0;
    }
}

/**
 * Save user profile with validation
 */
function saveUserProfile(profile) {
    try {
        if (!isProfileValid(profile)) {
            throw new Error('Invalid profile data');
        }
        
        const profileWithMetadata = {
            ...profile,
            lastUpdated: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const success1 = SafeStorage.set('ark-user-id', profile.id);
        const success2 = SafeStorage.set('ark-user-profile', profileWithMetadata);
        
        if (!success1 || !success2) {
            throw new Error('Failed to save user profile');
        }
        
        return profileWithMetadata;
    } catch (error) {
        console.error('Cache: Error saving user profile:', error);
        throw error;
    }
}

/**
 * Get user profile with validation
 */
function getUserProfile() {
    try {
        const profileData = SafeStorage.get('ark-user-profile', null);
        
        if (profileData && isProfileValid(profileData)) {
            return profileData;
        }
        
        return null;
    } catch (error) {
        console.error('Cache: Error getting user profile:', error);
        return null;
    }
}

/**
 * Get user ID
 */
function getUserId() {
    try {
        return SafeStorage.get('ark-user-id', null);
    } catch (error) {
        console.error('Cache: Error getting user ID:', error);
        return null;
    }
}

/**
 * Clear user data
 */
function clearUserData() {
    try {
        const success1 = SafeStorage.remove('ark-user-id');
        const success2 = SafeStorage.remove('ark-user-profile');
        const success3 = SafeStorage.remove('ark-auth-token');
        
        return success1 && success2 && success3;
    } catch (error) {
        console.error('Cache: Error clearing user data:', error);
        return false;
    }
}

/**
 * Validate profile data integrity
 */
function isProfileValid(profile) {
    if (!profile || typeof profile !== 'object') {
        return false;
    }
    
    // Check required fields
    if (!profile.id || typeof profile.id !== 'string') {
        return false;
    }
    
    return true;
}

/**
 * Get cache statistics and health information
 */
function getCacheStats() {
    try {
        const quotes = SafeStorage.get('ark-cached-quotes', {});
        const feedback = SafeStorage.get('ark-pending-feedback', []);
        const profile = SafeStorage.get('ark-user-profile', null);
        
        const stats = {
            quotes: {
                total: Object.keys(quotes).length,
                valid: Object.values(quotes).filter(q => isQuoteValid(q)).length,
                oldestDate: null,
                newestDate: null
            },
            feedback: {
                total: feedback.length,
                valid: feedback.filter(f => isFeedbackValid(f)).length
            },
            profile: {
                exists: !!profile,
                valid: profile ? isProfileValid(profile) : false
            },
            storage: {
                totalSize: SafeStorage.getStorageSize(),
                maxSize: CACHE_CONFIG.MAX_STORAGE_SIZE,
                usagePercent: Math.round((SafeStorage.getStorageSize() / CACHE_CONFIG.MAX_STORAGE_SIZE) * 100)
            },
            health: 'good' // Will be calculated based on other metrics
        };
        
        // Calculate date range for quotes
        const quoteDates = Object.keys(quotes).map(d => new Date(d)).filter(d => !isNaN(d));
        if (quoteDates.length > 0) {
            stats.quotes.oldestDate = new Date(Math.min(...quoteDates)).toISOString();
            stats.quotes.newestDate = new Date(Math.max(...quoteDates)).toISOString();
        }
        
        // Determine overall health
        if (stats.storage.usagePercent > 90) {
            stats.health = 'critical';
        } else if (stats.storage.usagePercent > 80 || stats.quotes.valid < stats.quotes.total * 0.8) {
            stats.health = 'warning';
        }
        
        return stats;
    } catch (error) {
        console.error('Cache: Error getting cache stats:', error);
        return {
            quotes: { total: 0, valid: 0 },
            feedback: { total: 0, valid: 0 },
            profile: { exists: false, valid: false },
            storage: { totalSize: 0, maxSize: CACHE_CONFIG.MAX_STORAGE_SIZE, usagePercent: 0 },
            health: 'error'
        };
    }
}

/**
 * Detect cache corruption and validate data integrity
 */
function detectCacheCorruption() {
    const corruptionReport = {
        timestamp: new Date().toISOString(),
        issues: [],
        severity: 'none',
        recoverable: true
    };

    try {
        // Check quotes cache
        const quotesIssues = validateQuotesCache();
        if (quotesIssues.length > 0) {
            corruptionReport.issues.push({
                type: 'quotes',
                issues: quotesIssues,
                severity: quotesIssues.some(i => i.severity === 'critical') ? 'critical' : 'warning'
            });
        }

        // Check feedback cache
        const feedbackIssues = validateFeedbackCache();
        if (feedbackIssues.length > 0) {
            corruptionReport.issues.push({
                type: 'feedback',
                issues: feedbackIssues,
                severity: feedbackIssues.some(i => i.severity === 'critical') ? 'critical' : 'warning'
            });
        }

        // Check profile cache
        const profileIssues = validateProfileCache();
        if (profileIssues.length > 0) {
            corruptionReport.issues.push({
                type: 'profile',
                issues: profileIssues,
                severity: profileIssues.some(i => i.severity === 'critical') ? 'critical' : 'warning'
            });
        }

        // Determine overall severity
        if (corruptionReport.issues.length > 0) {
            const hasCritical = corruptionReport.issues.some(i => i.severity === 'critical');
            corruptionReport.severity = hasCritical ? 'critical' : 'warning';
            corruptionReport.recoverable = !hasCritical || corruptionReport.issues.length < 3;
        }

        return corruptionReport;
    } catch (error) {
        console.error('Cache: Error detecting corruption:', error);
        return {
            timestamp: new Date().toISOString(),
            issues: [{
                type: 'system',
                issues: [{ message: 'Failed to detect corruption', severity: 'critical', error: error.message }],
                severity: 'critical'
            }],
            severity: 'critical',
            recoverable: false
        };
    }
}

/**
 * Validate quotes cache integrity
 */
function validateQuotesCache() {
    const issues = [];
    
    try {
        const rawData = localStorage.getItem('ark-cached-quotes');
        
        if (rawData === null) {
            return issues; // No data is not an issue
        }

        // Check if data is valid JSON
        let quotesData;
        try {
            quotesData = JSON.parse(rawData);
        } catch (parseError) {
            issues.push({
                message: 'Quotes cache contains invalid JSON',
                severity: 'critical',
                error: parseError.message,
                recoverable: true
            });
            return issues;
        }

        // Check if data structure is correct
        if (typeof quotesData !== 'object' || quotesData === null) {
            issues.push({
                message: 'Quotes cache has invalid data structure',
                severity: 'critical',
                recoverable: true
            });
            return issues;
        }

        // Validate individual quotes
        let invalidQuotes = 0;
        let totalQuotes = 0;
        
        for (const [dateKey, quote] of Object.entries(quotesData)) {
            totalQuotes++;
            
            if (!isQuoteValid(quote)) {
                invalidQuotes++;
                
                if (invalidQuotes <= 5) { // Only report first 5 invalid quotes
                    issues.push({
                        message: `Invalid quote for date ${dateKey}`,
                        severity: 'warning',
                        details: {
                            dateKey,
                            missingFields: getMissingQuoteFields(quote)
                        },
                        recoverable: true
                    });
                }
            }
        }

        // Check for excessive invalid quotes
        if (invalidQuotes > totalQuotes * 0.5) {
            issues.push({
                message: `High percentage of invalid quotes (${invalidQuotes}/${totalQuotes})`,
                severity: 'critical',
                recoverable: true
            });
        }

        // Check cache size
        if (totalQuotes > CACHE_CONFIG.MAX_QUOTES * 1.5) {
            issues.push({
                message: `Quotes cache exceeds safe limits (${totalQuotes}/${CACHE_CONFIG.MAX_QUOTES})`,
                severity: 'warning',
                recoverable: true
            });
        }

    } catch (error) {
        issues.push({
            message: 'Failed to validate quotes cache',
            severity: 'critical',
            error: error.message,
            recoverable: false
        });
    }

    return issues;
}

/**
 * Validate feedback cache integrity
 */
function validateFeedbackCache() {
    const issues = [];
    
    try {
        const rawData = localStorage.getItem('ark-pending-feedback');
        
        if (rawData === null) {
            return issues; // No data is not an issue
        }

        // Check if data is valid JSON
        let feedbackData;
        try {
            feedbackData = JSON.parse(rawData);
        } catch (parseError) {
            issues.push({
                message: 'Feedback cache contains invalid JSON',
                severity: 'critical',
                error: parseError.message,
                recoverable: true
            });
            return issues;
        }

        // Check if data structure is correct
        if (!Array.isArray(feedbackData)) {
            issues.push({
                message: 'Feedback cache has invalid data structure (not an array)',
                severity: 'critical',
                recoverable: true
            });
            return issues;
        }

        // Validate individual feedback items
        let invalidFeedback = 0;
        
        feedbackData.forEach((feedback, index) => {
            if (!isFeedbackValid(feedback)) {
                invalidFeedback++;
                
                if (invalidFeedback <= 5) { // Only report first 5 invalid items
                    issues.push({
                        message: `Invalid feedback item at index ${index}`,
                        severity: 'warning',
                        details: {
                            index,
                            missingFields: getMissingFeedbackFields(feedback)
                        },
                        recoverable: true
                    });
                }
            }
        });

        // Check for excessive invalid feedback
        if (invalidFeedback > feedbackData.length * 0.3) {
            issues.push({
                message: `High percentage of invalid feedback (${invalidFeedback}/${feedbackData.length})`,
                severity: 'critical',
                recoverable: true
            });
        }

        // Check cache size
        if (feedbackData.length > CACHE_CONFIG.MAX_FEEDBACK_ITEMS * 1.5) {
            issues.push({
                message: `Feedback cache exceeds safe limits (${feedbackData.length}/${CACHE_CONFIG.MAX_FEEDBACK_ITEMS})`,
                severity: 'warning',
                recoverable: true
            });
        }

    } catch (error) {
        issues.push({
            message: 'Failed to validate feedback cache',
            severity: 'critical',
            error: error.message,
            recoverable: false
        });
    }

    return issues;
}

/**
 * Validate profile cache integrity
 */
function validateProfileCache() {
    const issues = [];
    
    try {
        const rawData = localStorage.getItem('ark-user-profile');
        const userId = localStorage.getItem('ark-user-id');
        
        if (rawData === null && userId === null) {
            return issues; // No profile data is not an issue
        }

        // Check profile data
        if (rawData !== null) {
            let profileData;
            try {
                profileData = JSON.parse(rawData);
            } catch (parseError) {
                issues.push({
                    message: 'Profile cache contains invalid JSON',
                    severity: 'critical',
                    error: parseError.message,
                    recoverable: true
                });
                return issues;
            }

            if (!isProfileValid(profileData)) {
                issues.push({
                    message: 'Profile data is invalid',
                    severity: 'warning',
                    details: {
                        missingFields: getMissingProfileFields(profileData)
                    },
                    recoverable: true
                });
            }

            // Check consistency between profile and user ID
            if (userId && profileData && profileData.id !== userId) {
                issues.push({
                    message: 'Profile ID inconsistency detected',
                    severity: 'warning',
                    details: {
                        profileId: profileData.id,
                        storedUserId: userId
                    },
                    recoverable: true
                });
            }
        }

        // Check if user ID exists but profile doesn't
        if (userId && rawData === null) {
            issues.push({
                message: 'User ID exists but profile data is missing',
                severity: 'warning',
                recoverable: true
            });
        }

    } catch (error) {
        issues.push({
            message: 'Failed to validate profile cache',
            severity: 'critical',
            error: error.message,
            recoverable: false
        });
    }

    return issues;
}

/**
 * Get missing fields for a quote
 */
function getMissingQuoteFields(quote) {
    const required = ['content', 'author'];
    const missing = [];
    
    if (!quote || typeof quote !== 'object') {
        return ['entire object'];
    }
    
    required.forEach(field => {
        if (!quote[field] || typeof quote[field] !== 'string' || quote[field].trim().length === 0) {
            missing.push(field);
        }
    });
    
    return missing;
}

/**
 * Get missing fields for feedback
 */
function getMissingFeedbackFields(feedback) {
    const required = ['quoteId', 'rating'];
    const missing = [];
    
    if (!feedback || typeof feedback !== 'object') {
        return ['entire object'];
    }
    
    required.forEach(field => {
        if (feedback[field] === undefined || feedback[field] === null) {
            missing.push(field);
        }
    });
    
    if (typeof feedback.rating !== 'number' || feedback.rating < -1 || feedback.rating > 1) {
        missing.push('valid rating');
    }
    
    return missing;
}

/**
 * Get missing fields for profile
 */
function getMissingProfileFields(profile) {
    const required = ['id'];
    const missing = [];
    
    if (!profile || typeof profile !== 'object') {
        return ['entire object'];
    }
    
    required.forEach(field => {
        if (!profile[field] || typeof profile[field] !== 'string' || profile[field].trim().length === 0) {
            missing.push(field);
        }
    });
    
    return missing;
}

/**
 * Recover from cache corruption
 */
function recoverFromCorruption(corruptionReport = null) {
    const report = corruptionReport || detectCacheCorruption();
    const recoveryResults = {
        timestamp: new Date().toISOString(),
        attempted: [],
        successful: [],
        failed: [],
        summary: {
            totalIssues: 0,
            resolved: 0,
            unresolved: 0
        }
    };

    try {
        console.log('Cache: Starting corruption recovery...');

        report.issues.forEach(issueGroup => {
            issueGroup.issues.forEach(issue => {
                recoveryResults.summary.totalIssues++;
                
                if (!issue.recoverable) {
                    recoveryResults.failed.push({
                        type: issueGroup.type,
                        issue: issue.message,
                        reason: 'Not recoverable'
                    });
                    recoveryResults.summary.unresolved++;
                    return;
                }

                recoveryResults.attempted.push({
                    type: issueGroup.type,
                    issue: issue.message
                });

                try {
                    let recovered = false;

                    switch (issueGroup.type) {
                        case 'quotes':
                            recovered = recoverQuotesCache(issue);
                            break;
                        case 'feedback':
                            recovered = recoverFeedbackCache(issue);
                            break;
                        case 'profile':
                            recovered = recoverProfileCache(issue);
                            break;
                        default:
                            recovered = false;
                    }

                    if (recovered) {
                        recoveryResults.successful.push({
                            type: issueGroup.type,
                            issue: issue.message
                        });
                        recoveryResults.summary.resolved++;
                    } else {
                        recoveryResults.failed.push({
                            type: issueGroup.type,
                            issue: issue.message,
                            reason: 'Recovery method failed'
                        });
                        recoveryResults.summary.unresolved++;
                    }
                } catch (error) {
                    recoveryResults.failed.push({
                        type: issueGroup.type,
                        issue: issue.message,
                        reason: error.message
                    });
                    recoveryResults.summary.unresolved++;
                }
            });
        });

        console.log('Cache: Recovery completed:', recoveryResults.summary);
        return recoveryResults;

    } catch (error) {
        console.error('Cache: Error during recovery:', error);
        return {
            timestamp: new Date().toISOString(),
            attempted: [],
            successful: [],
            failed: [{ type: 'system', issue: 'Recovery process failed', reason: error.message }],
            summary: { totalIssues: 1, resolved: 0, unresolved: 1 }
        };
    }
}

/**
 * Recover quotes cache
 */
function recoverQuotesCache(issue) {
    try {
        if (issue.message.includes('invalid JSON') || issue.message.includes('invalid data structure')) {
            // Reset quotes cache
            SafeStorage.set('ark-cached-quotes', {});
            return true;
        }

        if (issue.message.includes('Invalid quote') || issue.message.includes('High percentage')) {
            // Clean up invalid quotes
            const quotes = SafeStorage.get('ark-cached-quotes', {});
            const cleanedQuotes = {};
            
            for (const [dateKey, quote] of Object.entries(quotes)) {
                if (isQuoteValid(quote)) {
                    cleanedQuotes[dateKey] = quote;
                }
            }
            
            SafeStorage.set('ark-cached-quotes', cleanedQuotes);
            return true;
        }

        if (issue.message.includes('exceeds safe limits')) {
            // Perform cleanup
            cleanupOldQuotes();
            return true;
        }

        return false;
    } catch (error) {
        console.error('Cache: Error recovering quotes cache:', error);
        return false;
    }
}

/**
 * Recover feedback cache
 */
function recoverFeedbackCache(issue) {
    try {
        if (issue.message.includes('invalid JSON') || issue.message.includes('invalid data structure')) {
            // Reset feedback cache
            SafeStorage.set('ark-pending-feedback', []);
            return true;
        }

        if (issue.message.includes('Invalid feedback') || issue.message.includes('High percentage')) {
            // Clean up invalid feedback
            const feedback = SafeStorage.get('ark-pending-feedback', []);
            const cleanedFeedback = feedback.filter(f => isFeedbackValid(f));
            
            SafeStorage.set('ark-pending-feedback', cleanedFeedback);
            return true;
        }

        if (issue.message.includes('exceeds safe limits')) {
            // Perform cleanup
            cleanupExcessFeedback();
            return true;
        }

        return false;
    } catch (error) {
        console.error('Cache: Error recovering feedback cache:', error);
        return false;
    }
}

/**
 * Recover profile cache
 */
function recoverProfileCache(issue) {
    try {
        if (issue.message.includes('invalid JSON')) {
            // Remove corrupted profile data
            SafeStorage.remove('ark-user-profile');
            return true;
        }

        if (issue.message.includes('Profile data is invalid')) {
            // Try to fix profile data or remove it
            const profile = SafeStorage.get('ark-user-profile', null);
            const userId = SafeStorage.get('ark-user-id', null);
            
            if (userId && profile && !profile.id) {
                // Fix missing ID
                profile.id = userId;
                SafeStorage.set('ark-user-profile', profile);
                return true;
            } else {
                // Remove invalid profile
                SafeStorage.remove('ark-user-profile');
                SafeStorage.remove('ark-user-id');
                return true;
            }
        }

        if (issue.message.includes('Profile ID inconsistency')) {
            // Fix inconsistency by using profile ID as source of truth
            const profile = SafeStorage.get('ark-user-profile', null);
            if (profile && profile.id) {
                SafeStorage.set('ark-user-id', profile.id);
                return true;
            }
        }

        if (issue.message.includes('User ID exists but profile data is missing')) {
            // Remove orphaned user ID
            SafeStorage.remove('ark-user-id');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Cache: Error recovering profile cache:', error);
        return false;
    }
}

/**
 * Perform comprehensive cache health check and recovery
 */
function performCacheHealthCheck() {
    try {
        console.log('Cache: Starting comprehensive health check...');
        
        const healthReport = {
            timestamp: new Date().toISOString(),
            corruption: null,
            recovery: null,
            stats: null,
            maintenance: null,
            overallHealth: 'unknown'
        };

        // Step 1: Detect corruption
        healthReport.corruption = detectCacheCorruption();
        
        // Step 2: Recover if needed
        if (healthReport.corruption.severity !== 'none') {
            healthReport.recovery = recoverFromCorruption(healthReport.corruption);
        }

        // Step 3: Perform maintenance
        healthReport.maintenance = performCacheMaintenance();

        // Step 4: Get final stats
        healthReport.stats = getCacheStats();

        // Step 5: Determine overall health
        if (healthReport.corruption.severity === 'none' && healthReport.stats.health === 'good') {
            healthReport.overallHealth = 'excellent';
        } else if (healthReport.recovery && healthReport.recovery.summary.resolved > healthReport.recovery.summary.unresolved) {
            healthReport.overallHealth = 'recovered';
        } else if (healthReport.stats.health === 'good') {
            healthReport.overallHealth = 'good';
        } else {
            healthReport.overallHealth = 'needs_attention';
        }

        console.log('Cache: Health check completed:', {
            health: healthReport.overallHealth,
            issues: healthReport.corruption.issues.length,
            resolved: healthReport.recovery ? healthReport.recovery.summary.resolved : 0
        });

        return healthReport;
    } catch (error) {
        console.error('Cache: Error during health check:', error);
        return {
            timestamp: new Date().toISOString(),
            corruption: null,
            recovery: null,
            stats: null,
            maintenance: null,
            overallHealth: 'error',
            error: error.message
        };
    }
}
    try {
        console.log('Cache: Starting comprehensive maintenance...');
        
        const stats = getCacheStats();
        const results = {
            quotesCleanedUp: 0,
            feedbackCleanedUp: 0,
            errorsFixed: 0,
            storageFreed: 0
        };
        
        const initialSize = stats.storage.totalSize;
        
        // Clean up old quotes
        results.quotesCleanedUp = cleanupOldQuotes();
        
        // Clean up excess feedback
        results.feedbackCleanedUp = cleanupExcessFeedback();
        
        // Calculate storage freed
        const finalStats = getCacheStats();
        results.storageFreed = initialSize - finalStats.storage.totalSize;
        
        console.log('Cache: Maintenance completed:', results);
        return results;
    } catch (error) {
        console.error('Cache: Error during maintenance:', error);
        return {
            quotesCleanedUp: 0,
            feedbackCleanedUp: 0,
            errorsFixed: 0,
            storageFreed: 0,
            error: error.message
        };
    }
}

/**
 * Synchronize pending feedback with backend
 */
async function synchronizeFeedback() {
    try {
        console.log('Cache: Starting feedback synchronization...');
        
        const pendingFeedback = getPendingFeedback();
        if (pendingFeedback.length === 0) {
            console.log('Cache: No pending feedback to synchronize');
            return {
                success: true,
                synchronized: 0,
                failed: 0,
                errors: []
            };
        }

        const syncResults = {
            success: true,
            synchronized: 0,
            failed: 0,
            errors: []
        };

        // Import API module if available
        let QuoteAPI = null;
        try {
            if (typeof window !== 'undefined' && window.APIModule) {
                QuoteAPI = window.APIModule.QuoteAPI;
            } else if (typeof require !== 'undefined') {
                QuoteAPI = require('./api').QuoteAPI;
            }
        } catch (error) {
            console.warn('Cache: API module not available for synchronization');
        }

        if (!QuoteAPI) {
            throw new Error('API module not available for synchronization');
        }

        // Process each feedback item
        for (const feedback of pendingFeedback) {
            try {
                // Attempt to submit feedback to backend
                await QuoteAPI.submitFeedback({
                    quoteId: feedback.quoteId,
                    rating: feedback.rating,
                    comment: feedback.comment,
                    timestamp: feedback.timestamp
                });

                // Remove successfully synchronized feedback
                removePendingFeedback(feedback.quoteId);
                syncResults.synchronized++;
                
                console.log(`Cache: Synchronized feedback for quote ${feedback.quoteId}`);
                
            } catch (error) {
                console.error(`Cache: Failed to sync feedback for quote ${feedback.quoteId}:`, error);
                syncResults.failed++;
                syncResults.errors.push({
                    quoteId: feedback.quoteId,
                    error: error.message
                });
                
                // Mark feedback as failed if it's been retried too many times
                if (feedback.retryCount && feedback.retryCount >= 3) {
                    console.warn(`Cache: Removing feedback after 3 failed attempts: ${feedback.quoteId}`);
                    removePendingFeedback(feedback.quoteId);
                } else {
                    // Increment retry count
                    const updatedFeedback = {
                        ...feedback,
                        retryCount: (feedback.retryCount || 0) + 1,
                        lastRetry: new Date().toISOString()
                    };
                    
                    // Update the feedback with retry information
                    const allFeedback = SafeStorage.get('ark-pending-feedback', []);
                    const updatedAllFeedback = allFeedback.map(f => 
                        f.quoteId === feedback.quoteId ? updatedFeedback : f
                    );
                    SafeStorage.set('ark-pending-feedback', updatedAllFeedback);
                }
            }
        }

        if (syncResults.failed > 0) {
            syncResults.success = false;
        }

        console.log('Cache: Feedback synchronization completed:', syncResults);
        return syncResults;

    } catch (error) {
        console.error('Cache: Error during feedback synchronization:', error);
        return {
            success: false,
            synchronized: 0,
            failed: 0,
            errors: [{ error: error.message }]
        };
    }
}

/**
 * Enhanced feedback storage with synchronization metadata
 */
function storeFeedbackWithSync(feedbackData, syncImmediately = false) {
    try {
        // Store feedback locally first
        const storedFeedback = storeFeedbackLocally(feedbackData);
        
        // Add synchronization metadata
        const feedbackWithSyncData = {
            ...storedFeedback,
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
            retryCount: 0,
            lastSyncAttempt: null
        };

        // Update the stored feedback with sync metadata
        const allFeedback = SafeStorage.get('ark-pending-feedback', []);
        const updatedFeedback = allFeedback.map(f => 
            f.id === storedFeedback.id ? feedbackWithSyncData : f
        );
        SafeStorage.set('ark-pending-feedback', updatedFeedback);

        // Attempt immediate synchronization if requested and online
        if (syncImmediately && navigator.onLine) {
            synchronizeFeedback().catch(error => {
                console.warn('Cache: Immediate sync failed:', error);
            });
        }

        return feedbackWithSyncData;
    } catch (error) {
        console.error('Cache: Error storing feedback with sync:', error);
        throw error;
    }
}

/**
 * Get feedback synchronization status
 */
function getFeedbackSyncStatus() {
    try {
        const pendingFeedback = getPendingFeedback();
        
        const status = {
            total: pendingFeedback.length,
            pending: 0,
            failed: 0,
            retrying: 0,
            oldestPending: null,
            newestPending: null
        };

        if (pendingFeedback.length === 0) {
            return status;
        }

        const timestamps = [];
        
        pendingFeedback.forEach(feedback => {
            if (feedback.retryCount && feedback.retryCount >= 3) {
                status.failed++;
            } else if (feedback.retryCount && feedback.retryCount > 0) {
                status.retrying++;
            } else {
                status.pending++;
            }
            
            if (feedback.timestamp) {
                timestamps.push(new Date(feedback.timestamp));
            }
        });

        if (timestamps.length > 0) {
            timestamps.sort((a, b) => a - b);
            status.oldestPending = timestamps[0].toISOString();
            status.newestPending = timestamps[timestamps.length - 1].toISOString();
        }

        return status;
    } catch (error) {
        console.error('Cache: Error getting feedback sync status:', error);
        return {
            total: 0,
            pending: 0,
            failed: 0,
            retrying: 0,
            oldestPending: null,
            newestPending: null,
            error: error.message
        };
    }
}

/**
 * Clean up failed feedback items
 */
function cleanupFailedFeedback() {
    try {
        const allFeedback = SafeStorage.get('ark-pending-feedback', []);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Remove feedback older than 7 days
        
        const cleanedFeedback = allFeedback.filter(feedback => {
            // Keep feedback that hasn't failed too many times
            if (feedback.retryCount && feedback.retryCount >= 3) {
                // Check if it's old enough to remove
                const feedbackDate = new Date(feedback.timestamp || feedback.createdAt);
                return feedbackDate > cutoffDate;
            }
            return true;
        });

        const removedCount = allFeedback.length - cleanedFeedback.length;
        
        if (removedCount > 0) {
            SafeStorage.set('ark-pending-feedback', cleanedFeedback);
            console.log(`Cache: Cleaned up ${removedCount} failed feedback items`);
        }

        return removedCount;
    } catch (error) {
        console.error('Cache: Error cleaning up failed feedback:', error);
        return 0;
    }
}

/**
 * Batch synchronize feedback with rate limiting
 */
async function batchSynchronizeFeedback(batchSize = 5, delayMs = 1000) {
    try {
        console.log('Cache: Starting batch feedback synchronization...');
        
        const pendingFeedback = getPendingFeedback();
        if (pendingFeedback.length === 0) {
            return { success: true, synchronized: 0, failed: 0, errors: [] };
        }

        const totalResults = {
            success: true,
            synchronized: 0,
            failed: 0,
            errors: []
        };

        // Process feedback in batches
        for (let i = 0; i < pendingFeedback.length; i += batchSize) {
            const batch = pendingFeedback.slice(i, i + batchSize);
            
            console.log(`Cache: Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
            
            // Process batch items in parallel
            const batchPromises = batch.map(async (feedback) => {
                try {
                    // Import API module
                    let QuoteAPI = null;
                    if (typeof window !== 'undefined' && window.APIModule) {
                        QuoteAPI = window.APIModule.QuoteAPI;
                    } else if (typeof require !== 'undefined') {
                        QuoteAPI = require('./api').QuoteAPI;
                    }

                    if (!QuoteAPI) {
                        throw new Error('API module not available');
                    }

                    await QuoteAPI.submitFeedback({
                        quoteId: feedback.quoteId,
                        rating: feedback.rating,
                        comment: feedback.comment,
                        timestamp: feedback.timestamp
                    });

                    removePendingFeedback(feedback.quoteId);
                    return { success: true, quoteId: feedback.quoteId };
                } catch (error) {
                    return { success: false, quoteId: feedback.quoteId, error: error.message };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process batch results
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        totalResults.synchronized++;
                    } else {
                        totalResults.failed++;
                        totalResults.errors.push({
                            quoteId: result.value.quoteId,
                            error: result.value.error
                        });
                    }
                } else {
                    totalResults.failed++;
                    totalResults.errors.push({
                        quoteId: batch[index].quoteId,
                        error: result.reason.message
                    });
                }
            });

            // Add delay between batches to avoid overwhelming the server
            if (i + batchSize < pendingFeedback.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        if (totalResults.failed > 0) {
            totalResults.success = false;
        }

        console.log('Cache: Batch synchronization completed:', totalResults);
        return totalResults;

    } catch (error) {
        console.error('Cache: Error during batch synchronization:', error);
        return {
            success: false,
            synchronized: 0,
            failed: 0,
            errors: [{ error: error.message }]
        };
    }
}

/**
 * Auto-sync feedback when online
 */
function setupAutoSync() {
    if (typeof window === 'undefined') {
        return; // Not in browser environment
    }

    let syncInProgress = false;
    
    const performAutoSync = async () => {
        if (syncInProgress || !navigator.onLine) {
            return;
        }

        const pendingCount = getPendingFeedback().length;
        if (pendingCount === 0) {
            return;
        }

        console.log(`Cache: Auto-sync triggered (${pendingCount} pending items)`);
        syncInProgress = true;
        
        try {
            await synchronizeFeedback();
        } catch (error) {
            console.warn('Cache: Auto-sync failed:', error);
        } finally {
            syncInProgress = false;
        }
    };

    // Sync when coming online
    window.addEventListener('online', performAutoSync);

    // Periodic sync every 5 minutes when online
    const syncInterval = setInterval(() => {
        if (navigator.onLine) {
            performAutoSync();
        }
    }, 5 * 60 * 1000);

    // Sync when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) {
            setTimeout(performAutoSync, 1000); // Small delay to ensure page is fully active
        }
    });

    // Return cleanup function
    return () => {
        window.removeEventListener('online', performAutoSync);
        clearInterval(syncInterval);
        document.removeEventListener('visibilitychange', performAutoSync);
    };
}
    try {
        const quotes = SafeStorage.get('ark-cached-quotes', {});
        const feedback = SafeStorage.get('ark-pending-feedback', []);
        const profile = getUserProfile();
        
        return {
            profile: profile,
            quotes: Object.values(quotes).filter(q => isQuoteValid(q)),
            feedback: feedback.filter(f => isFeedbackValid(f)),
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            stats: getCacheStats()
        };
    } catch (error) {
        console.error('Cache: Error exporting user data:', error);
        return {
            profile: null,
            quotes: [],
            feedback: [],
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            error: error.message
        };
    }
}

// Export for both CommonJS and ES6
module.exports = {
    // Core cache operations
    cacheQuote,
    getCachedTodaysQuote,
    getCachedQuotes,
    getCachedQuotesInRange,
    
    // Feedback management
    storeFeedbackLocally,
    getPendingFeedback,
    removePendingFeedback,
    clearPendingFeedback,
    
    // Enhanced feedback synchronization
    synchronizeFeedback,
    storeFeedbackWithSync,
    getFeedbackSyncStatus,
    cleanupFailedFeedback,
    batchSynchronizeFeedback,
    setupAutoSync,
    
    // User profile management
    saveUserProfile,
    getUserProfile,
    getUserId,
    clearUserData,
    
    // Cache management and maintenance
    getCacheStats,
    performCacheMaintenance,
    cleanupOldQuotes,
    cleanupExcessFeedback,
    
    // Cache corruption detection and recovery
    detectCacheCorruption,
    recoverFromCorruption,
    performCacheHealthCheck,
    validateQuotesCache,
    validateFeedbackCache,
    validateProfileCache,
    
    // Data validation
    isQuoteValid,
    isFeedbackValid,
    isProfileValid,
    
    // Data export/import
    exportUserData,
    
    // Configuration
    CACHE_CONFIG,
    
    // Safe storage operations
    SafeStorage
};

// ES6 exports for browser compatibility
if (typeof window !== 'undefined') {
    window.CacheModule = module.exports;
}