/**
 * API module for ARK Digital Calendar
 * 
 * Handles all API communication and data fetching.
 */

// API configuration
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * API client with common functionality
 */
class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    /**
     * Get authorization headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('ark-auth-token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request error for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Create singleton instance
const apiClient = new APIClient();

/**
 * Quote API methods
 */
const QuoteAPI = {
    async getTodaysQuote() {
        return apiClient.get('/quotes/today');
    },

    async getArchive(skip = 0, limit = 100) {
        return apiClient.get(`/quotes/archive?skip=${skip}&limit=${limit}`);
    },

    async searchQuotes(query, skip = 0, limit = 50) {
        return apiClient.get(`/quotes/search?q=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`);
    },

    async submitFeedback(feedbackData) {
        return apiClient.post('/quotes/feedback', feedbackData);
    }
};

/**
 * User API methods
 */
const UserAPI = {
    async getProfile() {
        return apiClient.get('/users/profile');
    },

    async createProfile(profileData) {
        return apiClient.post('/users/profile', profileData);
    },

    async updateProfile(profileData) {
        return apiClient.put('/users/profile', profileData);
    },

    async syncData() {
        return apiClient.post('/users/sync');
    }
};

/**
 * Theme API methods
 */
const ThemeAPI = {
    async getCurrentTheme() {
        return apiClient.get('/themes/current');
    },

    async getThemeCalendar(year) {
        return apiClient.get(`/themes/calendar?year=${year}`);
    }
};

/**
 * Notification API methods
 */
const NotificationAPI = {
    async getVapidKey() {
        return apiClient.get('/notifications/vapid-public-key');
    },

    async subscribe(subscriptionData) {
        return apiClient.post('/notifications/subscribe', subscriptionData);
    },

    async unsubscribe() {
        return apiClient.delete('/notifications/unsubscribe');
    },

    async updatePreferences(preferences) {
        return apiClient.put('/notifications/preferences', preferences);
    },

    async getPreferences() {
        return apiClient.get('/notifications/preferences');
    },

    async sendTest(message) {
        return apiClient.post('/notifications/test', { message });
    }
};

// Export for both CommonJS and ES6
module.exports = {
    API_BASE_URL,
    APIClient,
    apiClient,
    QuoteAPI,
    UserAPI,
    ThemeAPI,
    NotificationAPI
};

// ES6 exports for browser compatibility
if (typeof window !== 'undefined') {
    window.APIModule = module.exports;
}