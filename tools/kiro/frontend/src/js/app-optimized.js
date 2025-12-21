/**
 * ARK Digital Calendar - Optimized Main Application
 * 
 * Entry point for the PWA frontend application with code splitting.
 */

import { QuoteAPI, UserAPI, ThemeAPI } from './modules/api.js';
import { 
    cacheQuote, 
    getCachedTodaysQuote, 
    getCachedQuotes,
    storeFeedbackLocally,
    getPendingFeedback,
    removePendingFeedback,
    saveUserProfile,
    getUserProfile,
    getUserId,
    exportUserData
} from './modules/cache.js';
import { 
    formatDate, 
    formatArchiveDate, 
    debounce, 
    generateUserId,
    getFeedbackEmoji,
    showToast, 
    showError,
    calculatePersonalityWeights,
    getSampleArchiveQuotes
} from './modules/utils.js';
import { 
    initPerformanceMonitoring, 
    measureOperation, 
    performanceMonitor 
} from './modules/performance.js';

// Application state
const AppState = {
    currentView: 'daily-quote',
    user: null,
    currentQuote: null,
    isOnline: navigator.onLine,
    isInstallable: false,
    installPrompt: null
};

// DOM elements cache
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
    console.log('ARK: Initializing optimized application...');
    
    // Initialize performance monitoring
    initPerformanceMonitoring();
    const initTimer = measureOperation.navigation('app-init');
    
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
        
        initTimer(); // End timing
        console.log('ARK: Application initialized successfully');
    } catch (error) {
        initTimer(); // End timing even on error
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
 * Apply theme to the application
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ark-theme', theme);
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Navigation
    elements.navigation.today?.addEventListener('click', () => navigateToView('daily-quote'));
    elements.navigation.archive?.addEventListener('click', () => navigateToView('archive'));
    elements.navigation.settings?.addEventListener('click', () => navigateToView('settings'));
    
    // Feedback buttons
    elements.feedback.like?.addEventListener('click', () => submitFeedback('like'));
    elements.feedback.neutral?.addEventListener('click', () => submitFeedback('neutral'));
    elements.feedback.dislike?.addEventListener('click', () => submitFeedback('dislike'));
    
    // Quote actions
    const shareBtn = document.getElementById('share-quote');
    shareBtn?.addEventListener('click', shareQuote);
    
    // Online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Install prompt
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Settings event listeners (lazy loaded)
    setupSettingsEventListeners();
}

/**
 * Setup settings event listeners (lazy loaded)
 */
function setupSettingsEventListeners() {
    // Sync button
    const syncBtn = document.getElementById('sync-data');
    syncBtn?.addEventListener('click', handleSyncData);
    
    // Export data button
    const exportBtn = document.getElementById('export-data');
    exportBtn?.addEventListener('click', handleExportData);
    
    // Theme settings
    const themeSelect = document.getElementById('app-theme');
    themeSelect?.addEventListener('change', handleThemeChange);
    
    // Quote length preference
    const quoteLengthSelect = document.getElementById('quote-length');
    quoteLengthSelect?.addEventListener('change', handleQuoteLengthChange);
    
    // Notification settings (lazy loaded)
    setupNotificationEventListeners();
}

/**
 * Setup notification event listeners (lazy loaded)
 */
async function setupNotificationEventListeners() {
    const notificationToggle = document.getElementById('notifications-enabled');
    const notificationTime = document.getElementById('notification-time');
    const testNotificationBtn = document.getElementById('test-notification');
    
    if (notificationToggle) {
        notificationToggle.addEventListener('change', async (event) => {
            // Lazy load notification module
            const { getNotificationManager } = await import('./modules/notifications.js');
            const notificationManager = await getNotificationManager();
            await handleNotificationToggle(event, notificationManager);
        });
    }
    
    if (notificationTime) {
        notificationTime.addEventListener('change', async (event) => {
            const { getNotificationManager } = await import('./modules/notifications.js');
            const notificationManager = await getNotificationManager();
            await handleNotificationTimeChange(event, notificationManager);
        });
    }
    
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', async () => {
            const { getNotificationManager } = await import('./modules/notifications.js');
            const notificationManager = await getNotificationManager();
            await notificationManager.sendTestNotification();
        });
    }
}

/**
 * Check if user exists or needs onboarding
 */
async function checkUserStatus() {
    try {
        const userId = getUserId();
        if (userId) {
            // Load existing user profile
            AppState.user = getUserProfile();
            
            // Try to sync with server if online
            if (AppState.isOnline && AppState.user) {
                try {
                    const serverProfile = await UserAPI.getProfile();
                    AppState.user = serverProfile;
                    saveUserProfile(serverProfile);
                } catch (error) {
                    console.warn('ARK: Could not sync user profile from server:', error);
                    // Continue with local profile
                }
            }
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
    
    const navTimer = measureOperation.navigation(viewName);
    
    // Hide all views
    Object.values(elements.views).forEach(view => {
        view?.classList.add('hidden');
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
        
        navTimer();
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
 * Update navigation button states
 */
function updateNavigationState(activeView) {
    // Remove active class from all nav items
    Object.values(elements.navigation).forEach(nav => {
        nav?.classList.remove('active');
    });
    
    // Add active class to current view
    const navMap = {
        'daily-quote': elements.navigation.today,
        'archive': elements.navigation.archive,
        'settings': elements.navigation.settings
    };
    
    navMap[activeView]?.classList.add('active');
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
    
    const quoteTimer = measureOperation.quoteLoad();
    
    try {
        showLoadingState();
        
        // Try to fetch from API first
        if (AppState.isOnline) {
            try {
                const apiTimer = measureOperation.apiCall('quotes-today');
                const quote = await QuoteAPI.getTodaysQuote();
                apiTimer();
                
                displayQuote(quote);
                AppState.currentQuote = quote;
                
                // Cache the quote for offline use
                cacheQuote(quote);
                hideLoadingState();
                quoteTimer();
                return;
            } catch (error) {
                console.warn('ARK: Failed to fetch quote from API:', error);
            }
        }
        
        // Fallback to cached quote if API fails or offline
        const cachedQuote = getCachedTodaysQuote();
        if (cachedQuote) {
            displayQuote(cachedQuote);
            AppState.currentQuote = cachedQuote;
            hideLoadingState();
            quoteTimer();
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
        quoteTimer();
        
    } catch (error) {
        console.error('ARK: Error loading today\'s quote:', error);
        hideLoadingState();
        quoteTimer();
        showError('Failed to load today\'s quote');
    }
}

/**
 * Display quote in the UI
 */
function displayQuote(quote) {
    if (elements.quote.text) elements.quote.text.textContent = quote.content;
    if (elements.quote.author) elements.quote.author.textContent = quote.author ? `— ${quote.author}` : '';
    if (elements.quote.date) elements.quote.date.textContent = quote.date;
    if (elements.quote.theme) elements.quote.theme.textContent = quote.theme || '';
    
    // Show offline indicator if applicable
    if (quote.isOffline && elements.quote.theme) {
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
            try {
                await QuoteAPI.submitFeedback(feedbackData);
                console.log('ARK: Feedback submitted successfully');
                removePendingFeedback(AppState.currentQuote.id);
                return;
            } catch (error) {
                console.warn('ARK: Failed to submit feedback to API:', error);
            }
        }
        
        // Store feedback locally for offline support or API failure
        storeFeedbackLocally(feedbackData);
        console.log('ARK: Feedback stored locally for sync');
        
    } catch (error) {
        console.error('ARK: Error submitting feedback:', error);
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
    const pendingFeedback = getPendingFeedback();
    const existingFeedback = pendingFeedback.find(f => f.quoteId === quoteId);
    
    if (existingFeedback) {
        updateFeedbackUI(existingFeedback.rating);
    } else {
        clearFeedbackUI();
    }
}

/**
 * Update feedback button states
 */
function updateFeedbackUI(selectedRating) {
    // Remove active class from all buttons
    Object.values(elements.feedback).forEach(btn => {
        btn?.classList.remove('active');
    });
    
    // Add active class to selected button
    elements.feedback[selectedRating]?.classList.add('active');
}

/**
 * Clear feedback UI state
 */
function clearFeedbackUI() {
    Object.values(elements.feedback).forEach(btn => {
        btn?.classList.remove('active');
    });
}

/**
 * Show loading state
 */
function showLoadingState() {
    if (elements.quote.text) elements.quote.text.textContent = 'Loading your daily inspiration...';
    if (elements.quote.author) elements.quote.author.textContent = '';
    if (elements.quote.date) elements.quote.date.textContent = '';
    if (elements.quote.theme) elements.quote.theme.textContent = '';
    clearFeedbackUI();
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading state is cleared when quote is displayed
}

/**
 * Load quote archive (lazy loaded functionality)
 */
async function loadQuoteArchive() {
    console.log('ARK: Loading quote archive...');
    
    const archiveTimer = measureOperation.archiveLoad();
    
    try {
        showArchiveLoading();
        
        let quotes = [];
        
        // Try to fetch from API first
        if (AppState.isOnline && AppState.user) {
            try {
                const apiTimer = measureOperation.apiCall('quotes-archive');
                quotes = await QuoteAPI.getArchive();
                apiTimer();
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
        
        archiveTimer();
        
    } catch (error) {
        console.error('ARK: Error loading quote archive:', error);
        archiveTimer();
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
 * Show quote detail
 */
function showQuoteDetail(quote) {
    if (!quote) return;
    
    showToast(`Quote from ${formatArchiveDate(quote.date)}: "${quote.content.substring(0, 50)}..."`, 4000);
}

/**
 * Load user settings (lazy loaded)
 */
async function loadUserSettings() {
    console.log('ARK: Loading user settings...');
    
    try {
        // Load notification preferences if notifications are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const { getNotificationManager } = await import('./modules/notifications.js');
            const notificationManager = await getNotificationManager();
            await loadNotificationPreferences(notificationManager);
        }
        
        // Load other user preferences
        await loadUserPreferences();
        
        console.log('ARK: User settings loaded successfully');
    } catch (error) {
        console.error('ARK: Error loading user settings:', error);
        showToast('Failed to load settings');
    }
}

/**
 * Load notification preferences
 */
async function loadNotificationPreferences(notificationManager) {
    try {
        const preferences = await NotificationAPI.getPreferences();
        
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
        notificationManager.isSubscribed = preferences.hasSubscription || false;
        notificationManager.updateNotificationUI();
        
        console.log('ARK: Notification preferences loaded:', preferences);
    } catch (error) {
        console.error('ARK: Error loading notification preferences:', error);
    }
}

/**
 * Load general user preferences
 */
async function loadUserPreferences() {
    try {
        if (!AppState.user || !AppState.isOnline) return;
        
        const user = await UserAPI.getProfile();
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
    } catch (error) {
        console.error('ARK: Error loading user preferences:', error);
    }
}

/**
 * Load profile setup
 */
async function loadProfileSetup() {
    console.log('ARK: Loading profile setup...');
    
    try {
        const questionnaireForm = document.getElementById('questionnaire-form');
        if (!questionnaireForm) return;
        
        // Define questionnaire questions (simplified for bundle size)
        const questions = [
            {
                id: 'q1',
                text: 'What motivates you most in life?',
                options: [
                    { value: 'spirituality', label: 'Spiritual growth and inner peace' },
                    { value: 'sport', label: 'Physical fitness and athletic achievement' },
                    { value: 'education', label: 'Learning and intellectual development' },
                    { value: 'health', label: 'Overall wellness and healthy living' },
                    { value: 'humor', label: 'Joy, laughter, and positive experiences' },
                    { value: 'philosophy', label: 'Deep thinking and life\'s big questions' }
                ]
            },
            // Additional questions would be loaded dynamically to reduce initial bundle
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
                                type="radio" 
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
        skipBtn?.addEventListener('click', handleSkipSetup);
        
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
        await saveUserProfileAndSync(profile);
        
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
    
    saveUserProfileAndSync(defaultProfile);
    showToast('Using default preferences. You can customize later in settings.', 4000);
    
    setTimeout(() => {
        navigateToView('daily-quote');
    }, 1000);
}

/**
 * Save user profile and sync with server
 */
async function saveUserProfileAndSync(profile) {
    try {
        // Save to localStorage
        saveUserProfile(profile);
        
        // Update app state
        AppState.user = profile;
        
        // Try to sync with API if online
        if (AppState.isOnline) {
            try {
                const data = await UserAPI.createProfile(profile);
                if (data.token) {
                    localStorage.setItem('ark-auth-token', data.token);
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
 * Handle online status change
 */
function handleOnlineStatus() {
    AppState.isOnline = true;
    elements.offlineBanner?.classList.add('hidden');
    console.log('ARK: Back online');
    
    // Sync pending data when coming back online
    setTimeout(() => {
        syncPendingData();
    }, 1000);
}

/**
 * Handle offline status change
 */
function handleOfflineStatus() {
    AppState.isOnline = false;
    elements.offlineBanner?.classList.remove('hidden');
    console.log('ARK: Gone offline');
}

/**
 * Sync pending data
 */
async function syncPendingData() {
    try {
        const pendingFeedback = getPendingFeedback();
        
        if (pendingFeedback.length > 0) {
            console.log(`ARK: Syncing ${pendingFeedback.length} pending feedback items`);
            
            for (const feedback of pendingFeedback) {
                try {
                    await QuoteAPI.submitFeedback(feedback);
                    console.log('ARK: Feedback synced successfully:', feedback.quoteId);
                } catch (error) {
                    console.error('ARK: Error syncing individual feedback:', error);
                    return; // Keep in pending if sync fails
                }
            }
            
            // Clear pending feedback after successful sync
            localStorage.removeItem('ark-pending-feedback');
            showToast('Offline data synced successfully!', 3000);
        }
    } catch (error) {
        console.error('ARK: Error syncing pending data:', error);
    }
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
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.textContent = 'Syncing...';
        }
        
        if (syncStatus) {
            syncStatus.textContent = 'Synchronizing data...';
            syncStatus.className = 'sync-status syncing';
        }
        
        // Perform sync
        await syncPendingData();
        
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
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.textContent = 'Sync Data';
        }
    }
}

/**
 * Handle export data button click
 */
function handleExportData() {
    try {
        const userData = exportUserData();
        
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

/**
 * Handle theme change
 */
async function handleThemeChange(event) {
    const theme = event.target.value;
    applyTheme(theme);
    
    // Save to server if online
    if (AppState.isOnline && AppState.user) {
        try {
            await UserAPI.updateProfile({
                preferences: {
                    theme: theme,
                    quoteLength: document.getElementById('quote-length')?.value || 'medium'
                }
            });
        } catch (error) {
            console.error('ARK: Error saving theme preference:', error);
        }
    }
}

/**
 * Handle quote length preference change
 */
async function handleQuoteLengthChange(event) {
    const quoteLength = event.target.value;
    
    // Save to server if online
    if (AppState.isOnline && AppState.user) {
        try {
            await UserAPI.updateProfile({
                preferences: {
                    theme: document.getElementById('app-theme')?.value || 'light',
                    quoteLength: quoteLength
                }
            });
        } catch (error) {
            console.error('ARK: Error saving quote length preference:', error);
        }
    }
}

/**
 * Handle notification settings changes (lazy loaded)
 */
async function handleNotificationToggle(event, notificationManager) {
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
        const success = await notificationManager.subscribe();
        if (!success) {
            event.target.checked = false;
            return;
        }
        
        // Update preferences
        const timeInput = document.getElementById('notification-time');
        const time = timeInput ? timeInput.value : '09:00';
        
        await notificationManager.updatePreferences({
            enabled: true,
            time: time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        
    } else {
        // Unsubscribe from notifications
        await notificationManager.unsubscribe();
        
        await notificationManager.updatePreferences({
            enabled: false,
            time: document.getElementById('notification-time')?.value || '09:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }
}

/**
 * Handle notification time changes
 */
async function handleNotificationTimeChange(event, notificationManager) {
    const time = event.target.value;
    const enabled = document.getElementById('notifications-enabled')?.checked || false;
    
    if (enabled) {
        await notificationManager.updatePreferences({
            enabled: true,
            time: time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
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
            elements.installPrompt?.classList.remove('hidden');
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
    
    installBtn?.addEventListener('click', async () => {
        if (AppState.installPrompt) {
            AppState.installPrompt.prompt();
            const result = await AppState.installPrompt.userChoice;
            console.log('ARK: Install prompt result:', result);
            
            elements.installPrompt?.classList.add('hidden');
            AppState.installPrompt = null;
            AppState.isInstallable = false;
        }
    });
    
    dismissBtn?.addEventListener('click', () => {
        elements.installPrompt?.classList.add('hidden');
        AppState.isInstallable = false;
    });
    
    const dismissOffline = document.getElementById('dismiss-offline');
    dismissOffline?.addEventListener('click', () => {
        elements.offlineBanner?.classList.add('hidden');
    });
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(event) {
    // ESC key to close modals/prompts
    if (event.key === 'Escape') {
        elements.installPrompt?.classList.add('hidden');
        elements.offlineBanner?.classList.add('hidden');
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
 * Hide loading screen
 */
function hideLoadingScreen() {
    if (elements.loadingScreen) {
        elements.loadingScreen.style.display = 'none';
    }
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
        displayArchive,
        filterArchive,
        setupArchiveFilters,
        setupArchiveSearch
    };
}