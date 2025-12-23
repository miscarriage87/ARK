/**
 * API Client with timeout and retry mechanisms
 * Provides reliable API communication with automatic retries and timeout handling
 */

/**
 * API Client Configuration
 */
const DEFAULT_CONFIG = {
    baseURL: 'http://localhost:8000/api',
    timeout: 5000, // 5 seconds default timeout
    maxRetries: 3,
    retryDelay: 1000, // Base delay for exponential backoff
    retryableStatuses: [408, 429, 500, 502, 503, 504], // HTTP status codes that should trigger retry
    retryableErrors: ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT', 'AbortError']
};

/**
 * API Client Class
 */
class APIClient {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.requestCount = 0;
        this.failureCount = 0;
    }

    /**
     * Make an API request with timeout and retry logic
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseURL}${endpoint}`;
        const requestOptions = {
            timeout: options.timeout || this.config.timeout,
            maxRetries: options.maxRetries !== undefined ? options.maxRetries : this.config.maxRetries,
            retryDelay: options.retryDelay || this.config.retryDelay,
            ...options
        };

        this.requestCount++;

        return this._attemptRequest(url, requestOptions, 0);
    }

    /**
     * Attempt a request with retry logic
     */
    async _attemptRequest(url, options, retryCount) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`⏰ Request timeout after ${options.timeout}ms: ${url}`);
            controller.abort();
        }, options.timeout);

        try {
            console.log(`📡 API Request (attempt ${retryCount + 1}): ${url}`);
            const startTime = Date.now();

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;
            console.log(`✅ API Response: ${url} (${duration}ms, status: ${response.status})`);

            // Check if response status should trigger retry
            if (!response.ok && this._shouldRetry(response.status, retryCount, options.maxRetries)) {
                console.warn(`⚠️ Retryable error status ${response.status}, retrying...`);
                return this._retry(url, options, retryCount);
            }

            return response;

        } catch (error) {
            clearTimeout(timeoutId);

            console.error(`❌ API Request failed: ${url}`, error.message);
            this.failureCount++;

            // Check if error should trigger retry
            if (this._shouldRetryError(error, retryCount, options.maxRetries)) {
                console.warn(`⚠️ Retryable error: ${error.message}, retrying...`);
                return this._retry(url, options, retryCount);
            }

            // Enhance error with additional context
            const enhancedError = new Error(`API request failed: ${error.message}`);
            enhancedError.originalError = error;
            enhancedError.url = url;
            enhancedError.retryCount = retryCount;
            throw enhancedError;
        }
    }

    /**
     * Retry a failed request with exponential backoff
     */
    async _retry(url, options, retryCount) {
        const nextRetryCount = retryCount + 1;
        
        if (nextRetryCount > options.maxRetries) {
            throw new Error(`Max retries (${options.maxRetries}) exceeded for ${url}`);
        }

        // Exponential backoff: delay increases with each retry
        const delay = options.retryDelay * Math.pow(2, retryCount);
        console.log(`🔄 Retrying in ${delay}ms (attempt ${nextRetryCount + 1}/${options.maxRetries + 1})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        return this._attemptRequest(url, options, nextRetryCount);
    }

    /**
     * Check if HTTP status should trigger retry
     */
    _shouldRetry(status, retryCount, maxRetries) {
        return retryCount < maxRetries && this.config.retryableStatuses.includes(status);
    }

    /**
     * Check if error should trigger retry
     */
    _shouldRetryError(error, retryCount, maxRetries) {
        if (retryCount >= maxRetries) {
            return false;
        }

        // Check if error name or message matches retryable patterns
        return this.config.retryableErrors.some(pattern => 
            error.name === pattern || 
            error.message.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }

    /**
     * Get API client statistics
     */
    getStats() {
        return {
            totalRequests: this.requestCount,
            failures: this.failureCount,
            successRate: this.requestCount > 0 
                ? ((this.requestCount - this.failureCount) / this.requestCount * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.requestCount = 0;
        this.failureCount = 0;
    }
}

/**
 * Create singleton instance
 */
const apiClient = new APIClient();

/**
 * Convenience functions for common API operations
 */
const api = {
    /**
     * Fetch today's quote
     */
    async getTodaysQuote() {
        try {
            const response = await apiClient.get('/quotes/today', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                timeout: 5000,
                maxRetries: 2
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to fetch today's quote: ${response.status}`);
        } catch (error) {
            console.error('Error fetching today\'s quote:', error);
            throw error;
        }
    },

    /**
     * Fetch quote archive
     */
    async getArchive(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const endpoint = `/archive${queryString ? '?' + queryString : ''}`;

            const response = await apiClient.get(endpoint, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                timeout: 8000,
                maxRetries: 2
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to fetch archive: ${response.status}`);
        } catch (error) {
            console.error('Error fetching archive:', error);
            throw error;
        }
    },

    /**
     * Submit feedback for a quote
     */
    async submitFeedback(quoteId, rating) {
        try {
            const response = await apiClient.post(`/quotes/${quoteId}/feedback`, {
                rating: rating,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                timeout: 5000,
                maxRetries: 2
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to submit feedback: ${response.status}`);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error;
        }
    },

    /**
     * Generate new AI quote
     */
    async generateQuote(theme, mood, length) {
        try {
            const response = await apiClient.post('/quotes/generate', {
                theme: theme,
                mood: mood,
                length: length
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                timeout: 30000, // Longer timeout for AI generation
                maxRetries: 1 // Fewer retries for expensive operations
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to generate quote: ${response.status}`);
        } catch (error) {
            console.error('Error generating quote:', error);
            throw error;
        }
    },

    /**
     * Check AI status
     */
    async getAIStatus() {
        try {
            const response = await apiClient.get('/ai-status', {
                timeout: 3000,
                maxRetries: 1
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to check AI status: ${response.status}`);
        } catch (error) {
            console.error('Error checking AI status:', error);
            throw error;
        }
    },

    /**
     * Get user profile
     */
    async getUserProfile() {
        try {
            const response = await apiClient.get('/users/profile', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                timeout: 5000,
                maxRetries: 2
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to fetch user profile: ${response.status}`);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    },

    /**
     * Update user profile
     */
    async updateUserProfile(profileData) {
        try {
            const response = await apiClient.post('/users/profile', profileData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                timeout: 5000,
                maxRetries: 2
            });

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to update user profile: ${response.status}`);
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    /**
     * Get API client statistics
     */
    getStats() {
        return apiClient.getStats();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, apiClient, api };
} else if (typeof exports !== 'undefined') {
    exports.APIClient = APIClient;
    exports.apiClient = apiClient;
    exports.api = api;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.APIClient = APIClient;
    window.apiClient = apiClient;
    window.api = api;
}
