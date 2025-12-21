/**
 * Cache module for ARK Digital Calendar
 * 
 * Handles local storage and caching of quotes and user data.
 */

/**
 * Cache quote for offline use
 */
export function cacheQuote(quote) {
    const today = new Date().toDateString();
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    cachedQuotes[today] = quote;
    localStorage.setItem('ark-cached-quotes', JSON.stringify(cachedQuotes));
}

/**
 * Get cached quote for today
 */
export function getCachedTodaysQuote() {
    const today = new Date().toDateString();
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    return cachedQuotes[today];
}

/**
 * Get all cached quotes
 */
export function getCachedQuotes() {
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    return Object.values(cachedQuotes);
}

/**
 * Store feedback locally for offline sync
 */
export function storeFeedbackLocally(feedbackData) {
    const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
    
    // Remove any existing feedback for this quote
    const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== feedbackData.quoteId);
    
    // Add the new feedback
    filteredFeedback.push(feedbackData);
    
    localStorage.setItem('ark-pending-feedback', JSON.stringify(filteredFeedback));
}

/**
 * Get pending feedback
 */
export function getPendingFeedback() {
    return JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
}

/**
 * Remove pending feedback for a quote
 */
export function removePendingFeedback(quoteId) {
    const pendingFeedback = getPendingFeedback();
    const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== quoteId);
    localStorage.setItem('ark-pending-feedback', JSON.stringify(filteredFeedback));
}

/**
 * Clear all pending feedback
 */
export function clearPendingFeedback() {
    localStorage.removeItem('ark-pending-feedback');
}

/**
 * Save user profile
 */
export function saveUserProfile(profile) {
    localStorage.setItem('ark-user-id', profile.id);
    localStorage.setItem('ark-user-profile', JSON.stringify(profile));
}

/**
 * Get user profile
 */
export function getUserProfile() {
    const profileData = localStorage.getItem('ark-user-profile');
    return profileData ? JSON.parse(profileData) : null;
}

/**
 * Get user ID
 */
export function getUserId() {
    return localStorage.getItem('ark-user-id');
}

/**
 * Clear user data
 */
export function clearUserData() {
    localStorage.removeItem('ark-user-id');
    localStorage.removeItem('ark-user-profile');
    localStorage.removeItem('ark-auth-token');
}

/**
 * Export all user data
 */
export function exportUserData() {
    return {
        profile: getUserProfile(),
        quotes: JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}'),
        feedback: getPendingFeedback(),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
    };
}