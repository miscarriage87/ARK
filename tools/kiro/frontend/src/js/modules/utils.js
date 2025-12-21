/**
 * Utility functions for ARK Digital Calendar
 * 
 * Common utility functions used throughout the application.
 */

/**
 * Utility function to format dates
 */
export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Format date for archive display
 */
export function formatArchiveDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Utility function to debounce function calls
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate a unique user ID
 */
export function generateUserId() {
    return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get emoji for feedback rating
 */
export function getFeedbackEmoji(rating) {
    switch (rating) {
        case 'like': return '👍';
        case 'dislike': return '👎';
        case 'neutral': return '😐';
        default: return '';
    }
}

/**
 * Show toast notification
 */
export function showToast(message, duration = 3000) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--gray-800);
        color: var(--white);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-md);
        z-index: var(--z-tooltip);
        opacity: 0;
        transition: opacity var(--transition-fast);
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    
    // Remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 150);
    }, duration);
}

/**
 * Show error message
 */
export function showError(message, isOnline = true) {
    console.error('ARK Error:', message);
    
    if (!isOnline) {
        message += ' (You are currently offline)';
    }
    
    showToast(message, 4000);
}

/**
 * Calculate personality weights from questionnaire responses
 */
export function calculatePersonalityWeights(responses) {
    const categories = ['spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'];
    const counts = {};
    
    // Initialize counts
    categories.forEach(cat => counts[cat] = 0);
    
    // Count responses for each category
    Object.values(responses).forEach(value => {
        if (counts.hasOwnProperty(value)) {
            counts[value]++;
        }
    });
    
    // Calculate total responses
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Calculate weights and confidence
    return categories.map(category => ({
        category,
        weight: total > 0 ? counts[category] / total : 1 / categories.length,
        confidence: total > 0 ? 0.8 : 0.5 // Higher confidence if user answered questions
    }));
}

/**
 * Get sample archive quotes for demo
 */
export function getSampleArchiveQuotes() {
    const today = new Date();
    return [
        {
            id: 'sample-1',
            content: 'The only way to do great work is to love what you do.',
            author: 'Steve Jobs',
            date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            theme: 'Career & Purpose',
            feedback: { rating: 'like' }
        },
        {
            id: 'sample-2',
            content: 'Life is what happens to you while you\'re busy making other plans.',
            author: 'John Lennon',
            date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            theme: 'Life Philosophy',
            feedback: { rating: 'neutral' }
        },
        {
            id: 'sample-3',
            content: 'The future belongs to those who believe in the beauty of their dreams.',
            author: 'Eleanor Roosevelt',
            date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            theme: 'Dreams & Aspirations'
        }
    ];
}