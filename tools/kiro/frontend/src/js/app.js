/**
 * ARK Digital Calendar - Main Application
 * 
 * Entry point for the PWA frontend application.
 * Handles initialization, routing, and core app functionality.
 */

// Application state
const AppState = {
    currentView: 'daily-quote',
    user: null,
    currentQuote: null,
    isOnline: navigator.onLine,
    isInstallable: false
};

// API configuration
const API_BASE_URL = 'http://localhost:8000/api';

// DOM elements
const elements = {
    loadingScreen: document.getElementById('loading-screen'),
    views: {
        dailyQuote: document.getElementById('daily-quote'),
        archive: document.getElementById('archive'),
        profileSetup: document.getElementById('profile-setup'),
        settings: document.getElementById('settings')
    },
    navigation: {
        today: document.getElementById('nav-today'),
        archive: document.getElementById('nav-archive'),
        settings: document.getElementById('nav-settings')
    },
    quote: {
        text: document.getElementById('quote-text'),
        author: document.getElementById('quote-author'),
        date: document.getElementById('quote-date'),
        theme: document.getElementById('quote-theme')
    },
    feedback: {
        like: document.getElementById('feedback-like'),
        neutral: document.getElementById('feedback-neutral'),
        dislike: document.getElementById('feedback-dislike')
    },
    offlineBanner: document.getElementById('offline-banner'),
    installPrompt: document.getElementById('install-prompt')
};

/**
 * Application initialization
 */
async function initializeApp() {
    console.log('ARK: Initializing application...');
    
    try {
        // Set up event listeners
        setupEventListeners();
        
        // Initialize theme
        initializeTheme();
        
        // Check for existing user or show onboarding
        await checkUserStatus();
        
        // Load initial view
        await loadInitialView();
        
        // Set up PWA features
        setupPWAFeatures();
        
        // Hide loading screen
        hideLoadingScreen();
        
        console.log('ARK: Application initialized successfully');
    } catch (error) {
        console.error('ARK: Failed to initialize application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Initialize theme from localStorage or system preference
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('ark-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    let theme = savedTheme || 'auto';
    
    if (theme === 'auto') {
        theme = systemTheme;
    }
    
    applyTheme(theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentTheme = localStorage.getItem('ark-theme') || 'auto';
        if (currentTheme === 'auto') {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Navigation
    elements.navigation.today.addEventListener('click', () => navigateToView('daily-quote'));
    elements.navigation.archive.addEventListener('click', () => navigateToView('archive'));
    elements.navigation.settings.addEventListener('click', () => navigateToView('settings'));
    
    // Feedback buttons
    elements.feedback.like.addEventListener('click', () => submitFeedback('like'));
    elements.feedback.neutral.addEventListener('click', () => submitFeedback('neutral'));
    elements.feedback.dislike.addEventListener('click', () => submitFeedback('dislike'));
    
    // Quote actions
    const shareBtn = document.getElementById('share-quote');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareQuote);
    }
    
    // Online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Install prompt
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Sync button
    const syncBtn = document.getElementById('sync-data');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleSyncData);
    }
    
    // Export data button
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportData);
    }
    
    // Notification settings
    const notificationToggle = document.getElementById('notifications-enabled');
    if (notificationToggle) {
        notificationToggle.addEventListener('change', handleNotificationToggle);
    }
    
    const notificationTime = document.getElementById('notification-time');
    if (notificationTime) {
        notificationTime.addEventListener('change', handleNotificationTimeChange);
    }
    
    const testNotificationBtn = document.getElementById('test-notification');
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', handleTestNotification);
    }
    
    // Theme settings
    const themeSelect = document.getElementById('app-theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }
    
    // Quote length preference
    const quoteLengthSelect = document.getElementById('quote-length');
    if (quoteLengthSelect) {
        quoteLengthSelect.addEventListener('change', handleQuoteLengthChange);
    }
}

/**
 * Check if user exists or needs onboarding
 */
async function checkUserStatus() {
    try {
        const userId = localStorage.getItem('ark-user-id');
        if (userId) {
            // Load existing user profile
            AppState.user = await loadUserProfile(userId);
        } else {
            // New user - show profile setup
            navigateToView('profile-setup');
        }
    } catch (error) {
        console.error('ARK: Error checking user status:', error);
        // Continue with anonymous usage
    }
}

/**
 * Load initial view based on app state
 */
async function loadInitialView() {
    if (AppState.user) {
        await loadTodaysQuote();
        navigateToView('daily-quote');
    } else {
        navigateToView('profile-setup');
    }
}

/**
 * Navigate to a specific view
 */
function navigateToView(viewName) {
    console.log(`ARK: Navigating to ${viewName}`);
    
    // Hide all views
    Object.values(elements.views).forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show target view
    if (elements.views[viewName]) {
        elements.views[viewName].classList.remove('hidden');
        AppState.currentView = viewName;
        
        // Update navigation state
        updateNavigationState(viewName);
        
        // Load view-specific data
        loadViewData(viewName);
        
        // Update page title
        updatePageTitle(viewName);
        
        // Announce navigation to screen readers
        announceNavigation(viewName);
    }
}

/**
 * Update page title based on current view
 */
function updatePageTitle(viewName) {
    const titles = {
        'daily-quote': 'Today\'s Quote - ARK Digital Calendar',
        'archive': 'Quote Archive - ARK Digital Calendar',
        'settings': 'Settings - ARK Digital Calendar',
        'profile-setup': 'Profile Setup - ARK Digital Calendar'
    };
    
    document.title = titles[viewName] || 'ARK Digital Calendar';
}

/**
 * Announce navigation to screen readers
 */
function announceNavigation(viewName) {
    const announcements = {
        'daily-quote': 'Navigated to today\'s quote',
        'archive': 'Navigated to quote archive',
        'settings': 'Navigated to settings',
        'profile-setup': 'Navigated to profile setup'
    };
    
    const announcement = announcements[viewName];
    if (announcement) {
        // Create a temporary element for screen reader announcement
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.textContent = announcement;
        
        document.body.appendChild(announcer);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcer);
        }, 1000);
    }
}

/**
 * Update navigation button states
 */
function updateNavigationState(activeView) {
    // Remove active class from all nav items
    Object.values(elements.navigation).forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Add active class to current view
    const navMap = {
        'daily-quote': elements.navigation.today,
        'archive': elements.navigation.archive,
        'settings': elements.navigation.settings
    };
    
    if (navMap[activeView]) {
        navMap[activeView].classList.add('active');
    }
}

/**
 * Load data for specific view
 */
async function loadViewData(viewName) {
    try {
        switch (viewName) {
            case 'daily-quote':
                await loadTodaysQuote();
                break;
            case 'archive':
                await loadQuoteArchive();
                break;
            case 'settings':
                await loadUserSettings();
                break;
            case 'profile-setup':
                await loadProfileSetup();
                break;
        }
    } catch (error) {
        console.error(`ARK: Error loading data for ${viewName}:`, error);
        showError(`Failed to load ${viewName} data`);
    }
}

/**
 * Load today's quote
 */
async function loadTodaysQuote() {
    if (!AppState.user) return;
    
    try {
        showLoadingState();
        
        // Try to fetch from API first
        if (AppState.isOnline) {
            const response = await fetch(`${API_BASE_URL}/quotes/today`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const quote = await response.json();
                displayQuote(quote);
                AppState.currentQuote = quote;
                
                // Cache the quote for offline use
                cacheQuote(quote);
                hideLoadingState();
                return;
            }
        }
        
        // Fallback to cached quote if API fails or offline
        const cachedQuote = getCachedTodaysQuote();
        if (cachedQuote) {
            displayQuote(cachedQuote);
            AppState.currentQuote = cachedQuote;
            hideLoadingState();
            return;
        }
        
        // Final fallback to a default inspirational quote
        const fallbackQuote = {
            id: 'fallback-' + new Date().toDateString(),
            content: "Every day is a new beginning. Take a deep breath, smile, and start again.",
            author: "Unknown",
            date: formatDate(new Date()),
            theme: "Daily Inspiration",
            isOffline: true
        };
        
        displayQuote(fallbackQuote);
        AppState.currentQuote = fallbackQuote;
        hideLoadingState();
        
    } catch (error) {
        console.error('ARK: Error loading today\'s quote:', error);
        hideLoadingState();
        showError('Failed to load today\'s quote');
    }
}

/**
 * Display quote in the UI
 */
function displayQuote(quote) {
    elements.quote.text.textContent = quote.content;
    elements.quote.author.textContent = quote.author ? `— ${quote.author}` : '';
    elements.quote.date.textContent = quote.date;
    elements.quote.theme.textContent = quote.theme || '';
    
    // Show offline indicator if applicable
    if (quote.isOffline) {
        elements.quote.theme.textContent += ' (Offline)';
    }
    
    // Load existing feedback if any
    loadExistingFeedback(quote.id);
}

/**
 * Submit feedback for current quote
 */
async function submitFeedback(rating) {
    if (!AppState.currentQuote) return;
    
    try {
        // Update UI immediately for better UX
        updateFeedbackUI(rating);
        
        const feedbackData = {
            quoteId: AppState.currentQuote.id,
            rating: rating,
            timestamp: new Date().toISOString()
        };
        
        if (AppState.isOnline) {
            // Try to submit to API
            const response = await fetch(`${API_BASE_URL}/quotes/feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (response.ok) {
                console.log('ARK: Feedback submitted successfully');
                // Remove from pending feedback if it was there
                removePendingFeedback(AppState.currentQuote.id);
                return;
            }
        }
        
        // Store feedback locally for offline support or API failure
        storeFeedbackLocally(feedbackData);
        console.log('ARK: Feedback stored locally for sync');
        
    } catch (error) {
        console.error('ARK: Error submitting feedback:', error);
        // Still store locally as fallback
        storeFeedbackLocally({
            quoteId: AppState.currentQuote.id,
            rating: rating,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Load existing feedback for a quote
 */
function loadExistingFeedback(quoteId) {
    // Check local storage for existing feedback
    const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
    const existingFeedback = pendingFeedback.find(f => f.quoteId === quoteId);
    
    if (existingFeedback) {
        updateFeedbackUI(existingFeedback.rating);
    } else {
        // Clear any previous feedback UI state
        clearFeedbackUI();
    }
}

/**
 * Clear feedback UI state
 */
function clearFeedbackUI() {
    Object.values(elements.feedback).forEach(btn => {
        btn.classList.remove('active');
    });
}

/**
 * Cache quote for offline use
 */
function cacheQuote(quote) {
    const today = new Date().toDateString();
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    cachedQuotes[today] = quote;
    localStorage.setItem('ark-cached-quotes', JSON.stringify(cachedQuotes));
}

/**
 * Get cached quote for today
 */
function getCachedTodaysQuote() {
    const today = new Date().toDateString();
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    return cachedQuotes[today];
}

/**
 * Remove pending feedback for a quote
 */
function removePendingFeedback(quoteId) {
    const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
    const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== quoteId);
    localStorage.setItem('ark-pending-feedback', JSON.stringify(filteredFeedback));
}

/**
 * Show loading state
 */
function showLoadingState() {
    elements.quote.text.textContent = 'Loading your daily inspiration...';
    elements.quote.author.textContent = '';
    elements.quote.date.textContent = '';
    elements.quote.theme.textContent = '';
    clearFeedbackUI();
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading state is cleared when quote is displayed
}

/**
 * Update feedback button states
 */
function updateFeedbackUI(selectedRating) {
    // Remove active class from all buttons
    Object.values(elements.feedback).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected button
    if (elements.feedback[selectedRating]) {
        elements.feedback[selectedRating].classList.add('active');
    }
}

/**
 * Load quote archive (placeholder)
 */
async function loadQuoteArchive() {
    console.log('ARK: Loading quote archive...');
    
    try {
        showArchiveLoading();
        
        let quotes = [];
        
        // Try to fetch from API first
        if (AppState.isOnline && AppState.user) {
            try {
                const response = await fetch(`${API_BASE_URL}/quotes/archive`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    quotes = await response.json();
                }
            } catch (error) {
                console.error('ARK: Error fetching archive from API:', error);
            }
        }
        
        // Fallback to cached quotes if API fails or offline
        if (quotes.length === 0) {
            quotes = getCachedQuotes();
        }
        
        // If still no quotes, show sample data for demo
        if (quotes.length === 0) {
            quotes = getSampleArchiveQuotes();
        }
        
        displayArchive(quotes);
        setupArchiveFilters(quotes);
        setupArchiveSearch(quotes);
        
    } catch (error) {
        console.error('ARK: Error loading quote archive:', error);
        showError('Failed to load quote archive');
    }
}

/**
 * Display archive quotes
 */
function displayArchive(quotes) {
    const archiveList = document.getElementById('archive-list');
    if (!archiveList) return;
    
    if (quotes.length === 0) {
        archiveList.innerHTML = `
            <div class="archive-empty">
                <p>No quotes in your archive yet.</p>
                <p>Visit the daily quote to start building your collection!</p>
            </div>
        `;
        return;
    }
    
    // Sort quotes by date (newest first)
    const sortedQuotes = quotes.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    archiveList.innerHTML = sortedQuotes.map(quote => `
        <article class="archive-item" data-quote-id="${quote.id}" data-theme="${quote.theme || ''}" data-date="${quote.date}">
            <div class="archive-quote-content">
                <blockquote class="archive-quote-text">${quote.content}</blockquote>
                ${quote.author ? `<cite class="archive-quote-author">— ${quote.author}</cite>` : ''}
            </div>
            <div class="archive-quote-meta">
                <span class="archive-quote-date">${formatArchiveDate(quote.date)}</span>
                ${quote.theme ? `<span class="archive-quote-theme">${quote.theme}</span>` : ''}
                ${quote.feedback ? `<span class="archive-quote-feedback" title="Your feedback: ${quote.feedback.rating}">${getFeedbackEmoji(quote.feedback.rating)}</span>` : ''}
            </div>
        </article>
    `).join('');
    
    // Add click handlers for quote items
    archiveList.querySelectorAll('.archive-item').forEach(item => {
        item.addEventListener('click', () => {
            const quoteId = item.dataset.quoteId;
            showQuoteDetail(quotes.find(q => q.id === quoteId));
        });
    });
}

/**
 * Setup archive filters
 */
function setupArchiveFilters(quotes) {
    const themeFilter = document.getElementById('theme-filter');
    const dateFilter = document.getElementById('date-filter');
    
    if (!themeFilter || !dateFilter) return;
    
    // Populate theme filter
    const themes = [...new Set(quotes.map(q => q.theme).filter(Boolean))];
    themeFilter.innerHTML = '<option value="">All Themes</option>' + 
        themes.map(theme => `<option value="${theme}">${theme}</option>`).join('');
    
    // Add filter event listeners
    themeFilter.addEventListener('change', () => filterArchive(quotes));
    dateFilter.addEventListener('change', () => filterArchive(quotes));
}

/**
 * Setup archive search
 */
function setupArchiveSearch(quotes) {
    const searchInput = document.getElementById('archive-search');
    const searchBtn = document.getElementById('search-btn');
    
    if (!searchInput || !searchBtn) return;
    
    const performSearch = debounce(() => {
        filterArchive(quotes);
    }, 300);
    
    searchInput.addEventListener('input', performSearch);
    searchBtn.addEventListener('click', () => filterArchive(quotes));
    
    // Handle Enter key in search
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            filterArchive(quotes);
        }
    });
}

/**
 * Filter archive based on current filter settings
 */
function filterArchive(allQuotes) {
    const searchTerm = document.getElementById('archive-search')?.value.toLowerCase() || '';
    const themeFilter = document.getElementById('theme-filter')?.value || '';
    const dateFilter = document.getElementById('date-filter')?.value || '';
    
    let filteredQuotes = allQuotes;
    
    // Apply search filter
    if (searchTerm) {
        filteredQuotes = filteredQuotes.filter(quote => 
            quote.content.toLowerCase().includes(searchTerm) ||
            (quote.author && quote.author.toLowerCase().includes(searchTerm)) ||
            (quote.theme && quote.theme.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply theme filter
    if (themeFilter) {
        filteredQuotes = filteredQuotes.filter(quote => quote.theme === themeFilter);
    }
    
    // Apply date filter
    if (dateFilter) {
        const now = new Date();
        filteredQuotes = filteredQuotes.filter(quote => {
            const quoteDate = new Date(quote.date);
            switch (dateFilter) {
                case 'week':
                    return (now - quoteDate) <= 7 * 24 * 60 * 60 * 1000;
                case 'month':
                    return (now - quoteDate) <= 30 * 24 * 60 * 60 * 1000;
                case 'year':
                    return (now - quoteDate) <= 365 * 24 * 60 * 60 * 1000;
                default:
                    return true;
            }
        });
    }
    
    displayArchive(filteredQuotes);
}

/**
 * Get cached quotes from localStorage
 */
function getCachedQuotes() {
    const cachedQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
    return Object.values(cachedQuotes);
}

/**
 * Get sample archive quotes for demo
 */
function getSampleArchiveQuotes() {
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

/**
 * Show archive loading state
 */
function showArchiveLoading() {
    const archiveList = document.getElementById('archive-list');
    if (archiveList) {
        archiveList.innerHTML = `
            <div class="archive-loading">
                <div class="loading-spinner"></div>
                <p>Loading your quote archive...</p>
            </div>
        `;
    }
}

/**
 * Format date for archive display
 */
function formatArchiveDate(dateString) {
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
 * Get emoji for feedback rating
 */
function getFeedbackEmoji(rating) {
    switch (rating) {
        case 'like': return '👍';
        case 'dislike': return '👎';
        case 'neutral': return '😐';
        default: return '';
    }
}

/**
 * Show quote detail (could be expanded into a modal)
 */
function showQuoteDetail(quote) {
    if (!quote) return;
    
    // For now, just scroll to top and show a toast
    // This could be expanded into a full modal later
    showToast(`Quote from ${formatArchiveDate(quote.date)}: "${quote.content.substring(0, 50)}..."`, 4000);
}

/**
 * Load user settings
 */
async function loadUserSettings() {
    console.log('ARK: Loading user settings...');
    
    try {
        // Load current notification preferences from server
        await loadNotificationPreferences();
        
        // Load other user preferences
        await loadUserPreferences();
        
        // Initialize notification manager if not already done
        if (!NotificationManager.isSupported) {
            await NotificationManager.init();
        }
        
        console.log('ARK: User settings loaded successfully');
    } catch (error) {
        console.error('ARK: Error loading user settings:', error);
        showToast('Failed to load settings');
    }
}

/**
 * Load notification preferences from server
 */
async function loadNotificationPreferences() {
    try {
        const authToken = localStorage.getItem('ark-auth-token');
        if (!authToken) {
            console.log('ARK: No auth token, using default notification settings');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const preferences = result.data;
            
            // Update UI with loaded preferences
            const notificationToggle = document.getElementById('notifications-enabled');
            const notificationTime = document.getElementById('notification-time');
            
            if (notificationToggle) {
                notificationToggle.checked = preferences.enabled || false;
            }
            
            if (notificationTime) {
                notificationTime.value = preferences.time || '09:00';
            }
            
            // Update notification manager state
            NotificationManager.isSubscribed = preferences.hasSubscription || false;
            NotificationManager.updateNotificationUI();
            
            console.log('ARK: Notification preferences loaded:', preferences);
        } else {
            console.warn('ARK: Failed to load notification preferences');
        }
    } catch (error) {
        console.error('ARK: Error loading notification preferences:', error);
    }
}

/**
 * Load general user preferences
 */
async function loadUserPreferences() {
    try {
        const userId = localStorage.getItem('ark-user-id');
        if (!userId) return;
        
        const authToken = localStorage.getItem('ark-auth-token');
        if (!authToken) return;
        
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            const preferences = user.preferences || {};
            
            // Update theme setting
            const themeSelect = document.getElementById('app-theme');
            if (themeSelect && preferences.theme) {
                themeSelect.value = preferences.theme;
                applyTheme(preferences.theme);
            }
            
            // Update quote length preference
            const quoteLengthSelect = document.getElementById('quote-length');
            if (quoteLengthSelect && preferences.quoteLength) {
                quoteLengthSelect.value = preferences.quoteLength;
            }
            
            console.log('ARK: User preferences loaded:', preferences);
        }
    } catch (error) {
        console.error('ARK: Error loading user preferences:', error);
    }
}

/**
 * Save user preferences
 */
async function saveUserPreferences(preferences) {
    try {
        const authToken = localStorage.getItem('ark-auth-token');
        if (!authToken) {
            console.warn('ARK: No auth token, cannot save preferences');
            return false;
        }
        
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                preferences: preferences
            })
        });
        
        if (response.ok) {
            console.log('ARK: User preferences saved successfully');
            showToast('Preferences saved');
            return true;
        } else {
            throw new Error('Failed to save preferences');
        }
    } catch (error) {
        console.error('ARK: Error saving user preferences:', error);
        showToast('Failed to save preferences');
        return false;
    }
}

/**
 * Apply theme to the application
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ark-theme', theme);
}

/**
 * Handle theme change
 */
async function handleThemeChange(event) {
    const theme = event.target.value;
    applyTheme(theme);
    
    // Save to server
    await saveUserPreferences({
        theme: theme,
        quoteLength: document.getElementById('quote-length')?.value || 'medium'
    });
}

/**
 * Handle quote length preference change
 */
async function handleQuoteLengthChange(event) {
    const quoteLength = event.target.value;
    
    // Save to server
    await saveUserPreferences({
        theme: document.getElementById('app-theme')?.value || 'light',
        quoteLength: quoteLength
    });
}

/**
 * Load profile setup (placeholder)
 */
async function loadProfileSetup() {
    console.log('ARK: Loading profile setup...');
    
    try {
        const questionnaireForm = document.getElementById('questionnaire-form');
        if (!questionnaireForm) return;
        
        // Define questionnaire questions
        const questions = [
            {
                id: 'q1',
                text: 'What motivates you most in life?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Spiritual growth and inner peace' },
                    { value: 'sport', label: 'Physical fitness and athletic achievement' },
                    { value: 'education', label: 'Learning and intellectual development' },
                    { value: 'health', label: 'Overall wellness and healthy living' },
                    { value: 'humor', label: 'Joy, laughter, and positive experiences' },
                    { value: 'philosophy', label: 'Deep thinking and life\'s big questions' }
                ]
            },
            {
                id: 'q2',
                text: 'How do you prefer to start your day?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Meditation or prayer' },
                    { value: 'sport', label: 'Exercise or physical activity' },
                    { value: 'education', label: 'Reading or learning something new' },
                    { value: 'health', label: 'Healthy breakfast and self-care routine' },
                    { value: 'humor', label: 'Something fun or entertaining' },
                    { value: 'philosophy', label: 'Quiet reflection and contemplation' }
                ]
            },
            {
                id: 'q3',
                text: 'What type of content resonates with you most?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Inspirational and uplifting messages' },
                    { value: 'sport', label: 'Motivational and action-oriented quotes' },
                    { value: 'education', label: 'Thought-provoking and educational insights' },
                    { value: 'health', label: 'Wellness tips and healthy living advice' },
                    { value: 'humor', label: 'Light-hearted and humorous content' },
                    { value: 'philosophy', label: 'Deep philosophical wisdom' }
                ]
            },
            {
                id: 'q4',
                text: 'When facing challenges, you tend to:',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Seek inner strength and faith' },
                    { value: 'sport', label: 'Push through with determination' },
                    { value: 'education', label: 'Research and learn from others' },
                    { value: 'health', label: 'Focus on self-care and balance' },
                    { value: 'humor', label: 'Find the lighter side of things' },
                    { value: 'philosophy', label: 'Reflect on the deeper meaning' }
                ]
            },
            {
                id: 'q5',
                text: 'What brings you the most fulfillment?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Connection with something greater' },
                    { value: 'sport', label: 'Achieving physical goals' },
                    { value: 'education', label: 'Gaining knowledge and skills' },
                    { value: 'health', label: 'Feeling energized and well' },
                    { value: 'humor', label: 'Making others smile and laugh' },
                    { value: 'philosophy', label: 'Understanding life\'s complexities' }
                ]
            }
        ];
        
        // Generate questionnaire HTML
        questionnaireForm.innerHTML = questions.map((question, index) => `
            <div class="question-group" data-question-id="${question.id}">
                <label class="question-label">
                    <span class="question-number">${index + 1}.</span>
                    ${question.text}
                </label>
                <div class="question-options">
                    ${question.options.map(option => `
                        <label class="option-label">
                            <input 
                                type="${question.type}" 
                                name="${question.id}" 
                                value="${option.value}"
                                class="option-input"
                                required
                            >
                            <span class="option-text">${option.label}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('') + `
            <div class="questionnaire-actions">
                <button type="submit" class="submit-btn primary-btn">Complete Setup</button>
                <button type="button" id="skip-setup" class="submit-btn secondary-btn">Skip for Now</button>
            </div>
        `;
        
        // Add form submission handler
        questionnaireForm.addEventListener('submit', handleQuestionnaireSubmit);
        
        // Add skip button handler
        const skipBtn = document.getElementById('skip-setup');
        if (skipBtn) {
            skipBtn.addEventListener('click', handleSkipSetup);
        }
        
    } catch (error) {
        console.error('ARK: Error loading profile setup:', error);
        showError('Failed to load profile setup');
    }
}

/**
 * Handle questionnaire submission
 */
async function handleQuestionnaireSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const responses = {};
        
        // Collect all responses
        for (let [key, value] of formData.entries()) {
            responses[key] = value;
        }
        
        // Calculate personality category weights
        const categoryWeights = calculatePersonalityWeights(responses);
        
        // Create user profile
        const profile = {
            id: generateUserId(),
            createdAt: new Date().toISOString(),
            personalityCategories: categoryWeights,
            preferences: {
                notificationsEnabled: false,
                notificationTime: '09:00',
                theme: 'auto',
                quoteLength: 'medium'
            }
        };
        
        // Save profile
        await saveUserProfile(profile);
        
        // Show success message
        showToast('Profile created successfully! Welcome to ARK!', 4000);
        
        // Navigate to daily quote
        setTimeout(() => {
            navigateToView('daily-quote');
        }, 1000);
        
    } catch (error) {
        console.error('ARK: Error submitting questionnaire:', error);
        showError('Failed to create profile. Please try again.');
    }
}

/**
 * Handle skip setup
 */
function handleSkipSetup() {
    // Create a default profile
    const defaultProfile = {
        id: generateUserId(),
        createdAt: new Date().toISOString(),
        personalityCategories: [
            { category: 'spirituality', weight: 0.17, confidence: 0.5 },
            { category: 'sport', weight: 0.17, confidence: 0.5 },
            { category: 'education', weight: 0.17, confidence: 0.5 },
            { category: 'health', weight: 0.17, confidence: 0.5 },
            { category: 'humor', weight: 0.16, confidence: 0.5 },
            { category: 'philosophy', weight: 0.16, confidence: 0.5 }
        ],
        preferences: {
            notificationsEnabled: false,
            notificationTime: '09:00',
            theme: 'auto',
            quoteLength: 'medium'
        }
    };
    
    saveUserProfile(defaultProfile);
    showToast('Using default preferences. You can customize later in settings.', 4000);
    
    setTimeout(() => {
        navigateToView('daily-quote');
    }, 1000);
}

/**
 * Calculate personality weights from questionnaire responses
 */
function calculatePersonalityWeights(responses) {
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
 * Generate a unique user ID
 */
function generateUserId() {
    return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Save user profile
 */
async function saveUserProfile(profile) {
    try {
        // Save to localStorage
        localStorage.setItem('ark-user-id', profile.id);
        localStorage.setItem('ark-user-profile', JSON.stringify(profile));
        
        // Update app state
        AppState.user = profile;
        
        // Try to sync with API if online
        if (AppState.isOnline) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(profile)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.token) {
                        localStorage.setItem('ark-auth-token', data.token);
                    }
                }
            } catch (error) {
                console.error('ARK: Error syncing profile with API:', error);
                // Continue anyway - profile is saved locally
            }
        }
        
        return profile;
    } catch (error) {
        console.error('ARK: Error saving user profile:', error);
        throw error;
    }
}

/**
 * Load user profile from API
 */
async function loadUserProfile(userId) {
    try {
        // First try to load from localStorage
        const localProfile = localStorage.getItem('ark-user-profile');
        if (localProfile) {
            return JSON.parse(localProfile);
        }
        
        // If online, try to fetch from API
        if (AppState.isOnline) {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const profile = await response.json();
                // Cache locally
                localStorage.setItem('ark-user-profile', JSON.stringify(profile));
                return profile;
            }
        }
        
        // Fallback to default profile
        return null;
    } catch (error) {
        console.error('ARK: Error loading user profile:', error);
        return null;
    }
}

/**
 * Store feedback locally for offline sync
 */
function storeFeedbackLocally(feedbackData) {
    const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
    
    // Remove any existing feedback for this quote
    const filteredFeedback = pendingFeedback.filter(f => f.quoteId !== feedbackData.quoteId);
    
    // Add the new feedback
    filteredFeedback.push(feedbackData);
    
    localStorage.setItem('ark-pending-feedback', JSON.stringify(filteredFeedback));
}

/**
 * Handle online status change
 */
function handleOnlineStatus() {
    AppState.isOnline = true;
    elements.offlineBanner.classList.add('hidden');
    console.log('ARK: Back online');
    
    // Sync pending data when coming back online
    setTimeout(() => {
        syncPendingData();
    }, 1000); // Small delay to ensure connection is stable
}

/**
 * Handle offline status change
 */
function handleOfflineStatus() {
    AppState.isOnline = false;
    elements.offlineBanner.classList.remove('hidden');
    console.log('ARK: Gone offline');
}

/**
 * Handle sync data button click
 */
async function handleSyncData() {
    const syncBtn = document.getElementById('sync-data');
    const syncStatus = document.getElementById('sync-status');
    
    if (!AppState.isOnline) {
        showToast('Cannot sync while offline', 3000);
        return;
    }
    
    if (!AppState.user) {
        showToast('Please complete profile setup first', 3000);
        return;
    }
    
    try {
        // Update UI
        syncBtn.disabled = true;
        syncBtn.textContent = 'Syncing...';
        if (syncStatus) {
            syncStatus.textContent = 'Synchronizing data...';
            syncStatus.className = 'sync-status syncing';
        }
        
        // Perform sync
        await performFullSync();
        
        // Update UI on success
        if (syncStatus) {
            syncStatus.textContent = 'Last synced: ' + new Date().toLocaleTimeString();
            syncStatus.className = 'sync-status success';
        }
        
    } catch (error) {
        console.error('ARK: Sync failed:', error);
        
        // Update UI on error
        if (syncStatus) {
            syncStatus.textContent = 'Sync failed. Please try again.';
            syncStatus.className = 'sync-status error';
        }
        
        showToast('Sync failed. Please try again.', 4000);
    } finally {
        // Reset button
        syncBtn.disabled = false;
        syncBtn.textContent = 'Sync Data';
    }
}

/**
 * Handle export data button click
 */
function handleExportData() {
    try {
        // Collect all user data
        const userData = {
            profile: JSON.parse(localStorage.getItem('ark-user-profile') || 'null'),
            quotes: JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}'),
            feedback: JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]'),
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        // Create downloadable file
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Create download link
        const downloadUrl = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `ark-data-export-${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(downloadUrl);
        
        showToast('Data exported successfully!', 3000);
        
    } catch (error) {
        console.error('ARK: Export failed:', error);
        showToast('Export failed. Please try again.', 4000);
    }
}
function resolveDataConflicts(localData, serverData, conflictType) {
    console.log(`ARK: Resolving ${conflictType} conflict`);
    
    switch (conflictType) {
        case 'profile':
            // For profile conflicts, merge data with server taking precedence for newer updates
            const localTimestamp = new Date(localData.updatedAt || localData.createdAt);
            const serverTimestamp = new Date(serverData.updatedAt || serverData.createdAt);
            
            if (localTimestamp > serverTimestamp) {
                // Local data is newer, keep local changes
                console.log('ARK: Using local profile data (newer)');
                return { resolved: localData, source: 'local' };
            } else {
                // Server data is newer or same age, use server data
                console.log('ARK: Using server profile data (newer or equal)');
                return { resolved: serverData, source: 'server' };
            }
            
        case 'feedback':
            // For feedback conflicts, merge arrays and deduplicate by quoteId
            const mergedFeedback = [...localData];
            
            serverData.forEach(serverItem => {
                const existsLocally = localData.find(localItem => 
                    localItem.quoteId === serverItem.quoteId
                );
                
                if (!existsLocally) {
                    mergedFeedback.push(serverItem);
                } else {
                    // If feedback exists for same quote, keep the most recent
                    const localIndex = mergedFeedback.findIndex(item => 
                        item.quoteId === serverItem.quoteId
                    );
                    
                    const localTimestamp = new Date(mergedFeedback[localIndex].timestamp);
                    const serverTimestamp = new Date(serverItem.timestamp);
                    
                    if (serverTimestamp > localTimestamp) {
                        mergedFeedback[localIndex] = serverItem;
                    }
                }
            });
            
            console.log(`ARK: Merged feedback: ${mergedFeedback.length} items`);
            return { resolved: mergedFeedback, source: 'merged' };
            
        case 'quotes':
            // For quotes, server is always authoritative (no local quote creation)
            console.log('ARK: Using server quotes data (authoritative)');
            return { resolved: serverData, source: 'server' };
            
        default:
            // Default to server data for unknown conflict types
            console.log(`ARK: Unknown conflict type ${conflictType}, using server data`);
            return { resolved: serverData, source: 'server' };
    }
}

/**
 * Perform full data synchronization with conflict resolution
 */
async function performFullSync() {
    if (!AppState.isOnline || !AppState.user) {
        console.log('ARK: Cannot perform full sync - offline or no user');
        return;
    }
    
    try {
        console.log('ARK: Starting full data synchronization...');
        
        // Get local data
        const localProfile = JSON.parse(localStorage.getItem('ark-user-profile') || 'null');
        const localFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
        const localQuotes = JSON.parse(localStorage.getItem('ark-cached-quotes') || '{}');
        
        // Fetch server data
        const [profileResponse, feedbackResponse, quotesResponse] = await Promise.allSettled([
            fetch(`${API_BASE_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`${API_BASE_URL}/users/feedback`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`${API_BASE_URL}/quotes/archive`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                    'Content-Type': 'application/json'
                }
            })
        ]);
        
        // Process profile sync
        if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
            const serverProfile = await profileResponse.value.json();
            
            if (localProfile) {
                const profileConflict = resolveDataConflicts(localProfile, serverProfile, 'profile');
                localStorage.setItem('ark-user-profile', JSON.stringify(profileConflict.resolved));
                AppState.user = profileConflict.resolved;
                
                if (profileConflict.source === 'local') {
                    // Upload local changes to server
                    await fetch(`${API_BASE_URL}/users/profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(profileConflict.resolved)
                    });
                }
            } else {
                localStorage.setItem('ark-user-profile', JSON.stringify(serverProfile));
                AppState.user = serverProfile;
            }
        }
        
        // Process feedback sync
        if (feedbackResponse.status === 'fulfilled' && feedbackResponse.value.ok) {
            const serverFeedback = await feedbackResponse.value.json();
            
            if (localFeedback.length > 0) {
                const feedbackConflict = resolveDataConflicts(localFeedback, serverFeedback, 'feedback');
                
                // Upload any local feedback that's not on server
                for (const feedback of localFeedback) {
                    const existsOnServer = serverFeedback.find(sf => sf.quoteId === feedback.quoteId);
                    if (!existsOnServer) {
                        await fetch(`${API_BASE_URL}/quotes/feedback`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(feedback)
                        });
                    }
                }
                
                localStorage.removeItem('ark-pending-feedback');
            }
        }
        
        // Process quotes sync (server authoritative)
        if (quotesResponse.status === 'fulfilled' && quotesResponse.value.ok) {
            const serverQuotes = await quotesResponse.value.json();
            
            // Convert server quotes array to cache format
            const quotesCache = {};
            serverQuotes.forEach(quote => {
                const dateKey = new Date(quote.date).toDateString();
                quotesCache[dateKey] = quote;
            });
            
            localStorage.setItem('ark-cached-quotes', JSON.stringify(quotesCache));
        }
        
        console.log('ARK: Full synchronization completed successfully');
        showToast('Data synchronized successfully!', 3000);
        
    } catch (error) {
        console.error('ARK: Error during full synchronization:', error);
        showToast('Sync failed. Will retry when online.', 4000);
    }
}
async function syncPendingData() {
    try {
        // Sync pending feedback
        const pendingFeedback = JSON.parse(localStorage.getItem('ark-pending-feedback') || '[]');
        
        if (pendingFeedback.length > 0) {
            console.log(`ARK: Syncing ${pendingFeedback.length} pending feedback items`);
            
            for (const feedback of pendingFeedback) {
                try {
                    const response = await fetch(`${API_BASE_URL}/quotes/feedback`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(feedback)
                    });
                    
                    if (response.ok) {
                        console.log('ARK: Feedback synced successfully:', feedback.quoteId);
                    } else {
                        console.error('ARK: Failed to sync feedback:', response.status);
                    }
                } catch (error) {
                    console.error('ARK: Error syncing individual feedback:', error);
                    // Keep in pending if sync fails
                    return;
                }
            }
            
            // Clear pending feedback after successful sync
            localStorage.removeItem('ark-pending-feedback');
            showToast('Offline data synced successfully!', 3000);
        }
        
        // Sync pending profile updates
        const pendingProfile = localStorage.getItem('ark-pending-profile-update');
        if (pendingProfile) {
            try {
                const profileData = JSON.parse(pendingProfile);
                const response = await fetch(`${API_BASE_URL}/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(profileData)
                });
                
                if (response.ok) {
                    console.log('ARK: Profile synced successfully');
                    localStorage.removeItem('ark-pending-profile-update');
                } else {
                    console.error('ARK: Failed to sync profile:', response.status);
                }
            } catch (error) {
                console.error('ARK: Error syncing profile:', error);
            }
        }
    } catch (error) {
        console.error('ARK: Error syncing pending data:', error);
    }
}

/**
 * Handle PWA install prompt
 */
function handleInstallPrompt(event) {
    event.preventDefault();
    AppState.installPrompt = event;
    AppState.isInstallable = true;
    
    // Show install prompt after a delay
    setTimeout(() => {
        if (AppState.isInstallable) {
            elements.installPrompt.classList.remove('hidden');
        }
    }, 5000);
}

/**
 * Set up PWA features
 */
function setupPWAFeatures() {
    // Install button
    const installBtn = document.getElementById('install-app');
    const dismissBtn = document.getElementById('dismiss-install');
    
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (AppState.installPrompt) {
                AppState.installPrompt.prompt();
                const result = await AppState.installPrompt.userChoice;
                console.log('ARK: Install prompt result:', result);
                
                elements.installPrompt.classList.add('hidden');
                AppState.installPrompt = null;
                AppState.isInstallable = false;
            }
        });
    }
    
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            elements.installPrompt.classList.add('hidden');
            AppState.isInstallable = false;
        });
    }
    
    // Dismiss offline banner
    const dismissOffline = document.getElementById('dismiss-offline');
    if (dismissOffline) {
        dismissOffline.addEventListener('click', () => {
            elements.offlineBanner.classList.add('hidden');
        });
    }
    
    // Initialize notification manager
    NotificationManager.init().catch(error => {
        console.error('ARK: Failed to initialize notifications:', error);
    });
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(event) {
    // ESC key to close modals/prompts
    if (event.key === 'Escape') {
        elements.installPrompt.classList.add('hidden');
        elements.offlineBanner.classList.add('hidden');
    }
    
    // Number keys for quick navigation
    if (event.key >= '1' && event.key <= '3') {
        const views = ['daily-quote', 'archive', 'settings'];
        const viewIndex = parseInt(event.key) - 1;
        if (views[viewIndex]) {
            navigateToView(views[viewIndex]);
        }
    }
    
    // Arrow keys for feedback when on daily quote view
    if (AppState.currentView === 'daily-quote' && AppState.currentQuote) {
        if (event.key === 'ArrowLeft') {
            submitFeedback('dislike');
        } else if (event.key === 'ArrowDown') {
            submitFeedback('neutral');
        } else if (event.key === 'ArrowRight') {
            submitFeedback('like');
        }
    }
    
    // Space or Enter to refresh quote (if allowed)
    if ((event.key === ' ' || event.key === 'Enter') && AppState.currentView === 'daily-quote') {
        if (event.target === document.body || event.target === elements.views.dailyQuote) {
            event.preventDefault();
            refreshQuoteIfAllowed();
        }
    }
}

/**
 * Refresh quote if allowed (for testing or special cases)
 */
function refreshQuoteIfAllowed() {
    // Only allow refresh in development or if explicitly enabled
    if (localStorage.getItem('ark-dev-mode') === 'true') {
        loadTodaysQuote();
    }
}

/**
 * Add quote sharing functionality
 */
function shareQuote() {
    if (!AppState.currentQuote) return;
    
    const shareText = `"${AppState.currentQuote.content}"${AppState.currentQuote.author ? ` — ${AppState.currentQuote.author}` : ''}\n\nShared from ARK Digital Calendar`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Daily Quote from ARK',
            text: shareText,
            url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Quote copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy quote:', err);
            showToast('Failed to copy quote');
        });
    }
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
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
 * Hide loading screen
 */
function hideLoadingScreen() {
    if (elements.loadingScreen) {
        elements.loadingScreen.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    console.error('ARK Error:', message);
    // This will be enhanced with proper error UI in later tasks
    
    // For now, show a simple alert
    if (!AppState.isOnline) {
        message += ' (You are currently offline)';
    }
    
    // Could implement a toast notification system here
    alert(message);
}

/**
 * Push Notification Management
 */
const NotificationManager = {
    vapidPublicKey: null,
    isSupported: false,
    isSubscribed: false,
    subscription: null,

    /**
     * Initialize notification support
     */
    async init() {
        console.log('ARK: Initializing notification manager...');
        
        // Check if push notifications are supported
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        
        if (!this.isSupported) {
            console.log('ARK: Push notifications not supported');
            return false;
        }
        
        try {
            // Get VAPID public key from server
            await this.loadVapidKey();
            
            // Check current subscription status
            await this.checkSubscriptionStatus();
            
            console.log('ARK: Notification manager initialized');
            return true;
        } catch (error) {
            console.error('ARK: Failed to initialize notification manager:', error);
            return false;
        }
    },

    /**
     * Load VAPID public key from server
     */
    async loadVapidKey() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/vapid-public-key`);
            if (response.ok) {
                const data = await response.json();
                this.vapidPublicKey = data.publicKey;
                console.log('ARK: VAPID public key loaded');
            } else {
                throw new Error('Failed to load VAPID public key');
            }
        } catch (error) {
            console.error('ARK: Error loading VAPID key:', error);
            throw error;
        }
    },

    /**
     * Check current subscription status
     */
    async checkSubscriptionStatus() {
        try {
            const registration = await navigator.serviceWorker.ready;
            this.subscription = await registration.pushManager.getSubscription();
            this.isSubscribed = !!this.subscription;
            
            console.log('ARK: Subscription status:', this.isSubscribed);
            
            // Update UI
            this.updateNotificationUI();
            
        } catch (error) {
            console.error('ARK: Error checking subscription status:', error);
        }
    },

    /**
     * Subscribe to push notifications
     */
    async subscribe() {
        if (!this.isSupported || !this.vapidPublicKey) {
            throw new Error('Push notifications not supported or VAPID key not loaded');
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Subscribe to push manager
            this.subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            // Send subscription to server
            await this.sendSubscriptionToServer(this.subscription);
            
            this.isSubscribed = true;
            this.updateNotificationUI();
            
            console.log('ARK: Successfully subscribed to push notifications');
            showToast('Notifications enabled successfully!');
            
            return true;
        } catch (error) {
            console.error('ARK: Error subscribing to push notifications:', error);
            showToast('Failed to enable notifications. Please try again.');
            return false;
        }
    },

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        if (!this.subscription) {
            return true;
        }

        try {
            // Unsubscribe from push manager
            await this.subscription.unsubscribe();
            
            // Notify server
            await this.removeSubscriptionFromServer();
            
            this.subscription = null;
            this.isSubscribed = false;
            this.updateNotificationUI();
            
            console.log('ARK: Successfully unsubscribed from push notifications');
            showToast('Notifications disabled');
            
            return true;
        } catch (error) {
            console.error('ARK: Error unsubscribing from push notifications:', error);
            showToast('Failed to disable notifications');
            return false;
        }
    },

    /**
     * Send subscription to server
     */
    async sendSubscriptionToServer(subscription) {
        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
                auth: this.arrayBufferToBase64(subscription.getKey('auth'))
            }
        };

        const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
            },
            body: JSON.stringify(subscriptionData)
        });

        if (!response.ok) {
            throw new Error('Failed to register subscription with server');
        }
    },

    /**
     * Remove subscription from server
     */
    async removeSubscriptionFromServer() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                }
            });

            if (!response.ok) {
                console.warn('ARK: Failed to remove subscription from server');
            }
        } catch (error) {
            console.warn('ARK: Error removing subscription from server:', error);
        }
    },

    /**
     * Update notification preferences
     */
    async updatePreferences(preferences) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                body: JSON.stringify(preferences)
            });

            if (response.ok) {
                console.log('ARK: Notification preferences updated');
                showToast('Notification preferences saved');
                return true;
            } else {
                throw new Error('Failed to update preferences');
            }
        } catch (error) {
            console.error('ARK: Error updating notification preferences:', error);
            showToast('Failed to save notification preferences');
            return false;
        }
    },

    /**
     * Send test notification
     */
    async sendTestNotification() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ark-auth-token')}`
                },
                body: JSON.stringify({
                    message: 'This is a test notification from ARK!'
                })
            });

            if (response.ok) {
                showToast('Test notification sent!');
                return true;
            } else {
                throw new Error('Failed to send test notification');
            }
        } catch (error) {
            console.error('ARK: Error sending test notification:', error);
            showToast('Failed to send test notification');
            return false;
        }
    },

    /**
     * Update notification UI elements
     */
    updateNotificationUI() {
        const notificationToggle = document.getElementById('notifications-enabled');
        const testButton = document.getElementById('test-notification');
        
        if (notificationToggle) {
            notificationToggle.checked = this.isSubscribed;
            notificationToggle.disabled = !this.isSupported;
        }
        
        if (testButton) {
            testButton.disabled = !this.isSubscribed;
        }
    },

    /**
     * Convert VAPID key to Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },

    /**
     * Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
};

/**
 * Handle notification settings changes
 */
async function handleNotificationToggle(event) {
    const enabled = event.target.checked;
    
    if (enabled) {
        // Request notification permission first
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                event.target.checked = false;
                showToast('Notification permission denied');
                return;
            }
        } else if (Notification.permission === 'denied') {
            event.target.checked = false;
            showToast('Notifications are blocked. Please enable them in your browser settings.');
            return;
        }
        
        // Subscribe to notifications
        const success = await NotificationManager.subscribe();
        if (!success) {
            event.target.checked = false;
            return;
        }
        
        // Update preferences with current time setting
        const timeInput = document.getElementById('notification-time');
        const time = timeInput ? timeInput.value : '09:00';
        
        await NotificationManager.updatePreferences({
            enabled: true,
            time: time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        
    } else {
        // Unsubscribe from notifications
        await NotificationManager.unsubscribe();
        
        await NotificationManager.updatePreferences({
            enabled: false,
            time: document.getElementById('notification-time')?.value || '09:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }
}

/**
 * Handle notification time changes
 */
async function handleNotificationTimeChange(event) {
    const time = event.target.value;
    const enabled = document.getElementById('notifications-enabled')?.checked || false;
    
    if (enabled) {
        await NotificationManager.updatePreferences({
            enabled: true,
            time: time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }
}

/**
 * Handle test notification button
 */
async function handleTestNotification() {
    await NotificationManager.sendTestNotification();
}

/**
 * Utility function to format dates
 */
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
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

// Initialize the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        initializeApp,
        navigateToView,
        submitFeedback,
        formatDate,
        debounce,
        displayArchive,
        formatArchiveDate,
        getCachedQuotes,
        filterArchive,
        setupArchiveFilters,
        setupArchiveSearch
    };
}