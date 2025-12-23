/**
 * Preferences module for ARK Digital Calendar
 * 
 * Handles loading and applying user preferences for theme, notifications, and quote settings.
 */

const { profileManager } = require('./profile.js');

/**
 * Preferences manager class
 */
class PreferencesManager {
    constructor() {
        this.currentPreferences = null;
        this.defaultPreferences = {
            notificationsEnabled: false,
            notificationTime: '09:00',
            theme: 'auto',
            quoteLength: 'medium',
            language: 'de'
        };
    }

    /**
     * Initialize preferences manager
     */
    async init() {
        console.log('🎨 PreferencesManager: Initializing...');
        
        try {
            await this.loadPreferences();
            await this.applyPreferences();
            console.log('✅ PreferencesManager: Initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ PreferencesManager: Initialization failed:', error);
            // Apply default preferences as fallback
            await this.applyPreferences(this.defaultPreferences);
            return false;
        }
    }

    /**
     * Load preferences from user profile
     */
    async loadPreferences() {
        console.log('📥 PreferencesManager: Loading preferences...');
        
        try {
            // Get current profile
            const profile = profileManager.getCurrentProfile();
            
            if (profile && profile.preferences) {
                // Merge with defaults to ensure all preferences exist
                this.currentPreferences = {
                    ...this.defaultPreferences,
                    ...profile.preferences
                };
                console.log('✅ PreferencesManager: Preferences loaded from profile');
            } else {
                // Use defaults if no profile or preferences
                this.currentPreferences = { ...this.defaultPreferences };
                console.log('📝 PreferencesManager: Using default preferences');
            }
            
            return this.currentPreferences;
        } catch (error) {
            console.error('❌ PreferencesManager: Error loading preferences:', error);
            this.currentPreferences = { ...this.defaultPreferences };
            return this.currentPreferences;
        }
    }

    /**
     * Apply preferences to the application
     */
    async applyPreferences(preferences = null) {
        const prefs = preferences || this.currentPreferences || this.defaultPreferences;
        console.log('🎨 PreferencesManager: Applying preferences:', prefs);
        
        try {
            // Apply theme
            await this.applyTheme(prefs.theme);
            
            // Apply notification settings
            await this.applyNotificationSettings(prefs);
            
            // Apply quote length preference
            await this.applyQuoteLengthPreference(prefs.quoteLength);
            
            // Apply language preference
            await this.applyLanguagePreference(prefs.language);
            
            // Update UI elements to reflect current preferences
            this.updatePreferenceUI(prefs);
            
            console.log('✅ PreferencesManager: Preferences applied successfully');
            return true;
        } catch (error) {
            console.error('❌ PreferencesManager: Error applying preferences:', error);
            return false;
        }
    }

    /**
     * Apply theme preference
     */
    async applyTheme(theme) {
        console.log('🎨 PreferencesManager: Applying theme:', theme);
        
        try {
            let effectiveTheme = theme;
            
            // Handle auto theme
            if (theme === 'auto') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            
            // Apply theme to document
            document.documentElement.setAttribute('data-theme', effectiveTheme);
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${effectiveTheme}`);
            
            // Store the preference (not the effective theme)
            localStorage.setItem('ark-theme', theme);
            
            console.log('✅ PreferencesManager: Theme applied:', effectiveTheme);
        } catch (error) {
            console.error('❌ PreferencesManager: Error applying theme:', error);
        }
    }

    /**
     * Apply notification settings
     */
    async applyNotificationSettings(preferences) {
        console.log('🔔 PreferencesManager: Applying notification settings');
        
        try {
            // Store notification preferences
            localStorage.setItem('ark-notifications-enabled', preferences.notificationsEnabled.toString());
            localStorage.setItem('ark-notification-time', preferences.notificationTime);
            
            // If notifications are enabled, request permission and set up
            if (preferences.notificationsEnabled && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    console.log('🔔 PreferencesManager: Notification permission:', permission);
                }
                
                // Set up daily notification if permission granted
                if (Notification.permission === 'granted') {
                    this.scheduleDailyNotification(preferences.notificationTime);
                }
            }
            
            console.log('✅ PreferencesManager: Notification settings applied');
        } catch (error) {
            console.error('❌ PreferencesManager: Error applying notification settings:', error);
        }
    }

    /**
     * Apply quote length preference
     */
    async applyQuoteLengthPreference(quoteLength) {
        console.log('📏 PreferencesManager: Applying quote length preference:', quoteLength);
        
        try {
            // Store preference
            localStorage.setItem('ark-quote-length', quoteLength);
            
            // Apply CSS class for quote length styling
            document.body.className = document.body.className.replace(/quote-length-\w+/g, '');
            document.body.classList.add(`quote-length-${quoteLength}`);
            
            console.log('✅ PreferencesManager: Quote length preference applied');
        } catch (error) {
            console.error('❌ PreferencesManager: Error applying quote length preference:', error);
        }
    }

    /**
     * Apply language preference
     */
    async applyLanguagePreference(language) {
        console.log('🌐 PreferencesManager: Applying language preference:', language);
        
        try {
            // Store preference
            localStorage.setItem('ark-language', language);
            
            // Set document language
            document.documentElement.lang = language;
            
            console.log('✅ PreferencesManager: Language preference applied');
        } catch (error) {
            console.error('❌ PreferencesManager: Error applying language preference:', error);
        }
    }

    /**
     * Update preference UI elements
     */
    updatePreferenceUI(preferences) {
        console.log('🎛️ PreferencesManager: Updating preference UI');
        
        try {
            // Update theme selector
            const themeSelect = document.getElementById('app-theme');
            if (themeSelect) {
                themeSelect.value = preferences.theme;
            }
            
            // Update notification settings
            const notificationToggle = document.getElementById('notifications-enabled');
            if (notificationToggle) {
                notificationToggle.checked = preferences.notificationsEnabled;
            }
            
            const notificationTime = document.getElementById('notification-time');
            if (notificationTime) {
                notificationTime.value = preferences.notificationTime;
            }
            
            // Update quote length selector
            const quoteLengthSelect = document.getElementById('quote-length');
            if (quoteLengthSelect) {
                quoteLengthSelect.value = preferences.quoteLength;
            }
            
            console.log('✅ PreferencesManager: Preference UI updated');
        } catch (error) {
            console.error('❌ PreferencesManager: Error updating preference UI:', error);
        }
    }

    /**
     * Update a specific preference
     */
    async updatePreference(key, value) {
        console.log(`🔄 PreferencesManager: Updating preference ${key}:`, value);
        
        try {
            // Update current preferences
            if (!this.currentPreferences) {
                await this.loadPreferences();
            }
            
            this.currentPreferences[key] = value;
            
            // Apply the specific preference
            switch (key) {
                case 'theme':
                    await this.applyTheme(value);
                    break;
                case 'notificationsEnabled':
                case 'notificationTime':
                    await this.applyNotificationSettings(this.currentPreferences);
                    break;
                case 'quoteLength':
                    await this.applyQuoteLengthPreference(value);
                    break;
                case 'language':
                    await this.applyLanguagePreference(value);
                    break;
            }
            
            // Update profile with new preferences
            if (profileManager.getCurrentProfile()) {
                await profileManager.updateProfile({
                    preferences: this.currentPreferences
                });
            }
            
            console.log(`✅ PreferencesManager: Preference ${key} updated successfully`);
            return true;
        } catch (error) {
            console.error(`❌ PreferencesManager: Error updating preference ${key}:`, error);
            return false;
        }
    }

    /**
     * Get current preferences
     */
    getCurrentPreferences() {
        return this.currentPreferences || this.defaultPreferences;
    }

    /**
     * Reset preferences to defaults
     */
    async resetToDefaults() {
        console.log('🔄 PreferencesManager: Resetting to default preferences');
        
        try {
            this.currentPreferences = { ...this.defaultPreferences };
            await this.applyPreferences();
            
            // Update profile
            if (profileManager.getCurrentProfile()) {
                await profileManager.updateProfile({
                    preferences: this.currentPreferences
                });
            }
            
            console.log('✅ PreferencesManager: Reset to defaults completed');
            return true;
        } catch (error) {
            console.error('❌ PreferencesManager: Error resetting to defaults:', error);
            return false;
        }
    }

    /**
     * Schedule daily notification
     */
    scheduleDailyNotification(time) {
        console.log('⏰ PreferencesManager: Scheduling daily notification for:', time);
        
        try {
            // Clear existing notification timeout
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }
            
            // Parse time
            const [hours, minutes] = time.split(':').map(Number);
            
            // Calculate next notification time
            const now = new Date();
            const notificationTime = new Date();
            notificationTime.setHours(hours, minutes, 0, 0);
            
            // If time has passed today, schedule for tomorrow
            if (notificationTime <= now) {
                notificationTime.setDate(notificationTime.getDate() + 1);
            }
            
            const timeUntilNotification = notificationTime.getTime() - now.getTime();
            
            // Schedule notification
            this.notificationTimeout = setTimeout(() => {
                this.sendDailyNotification();
                // Reschedule for next day
                this.scheduleDailyNotification(time);
            }, timeUntilNotification);
            
            console.log('⏰ PreferencesManager: Daily notification scheduled for:', notificationTime);
        } catch (error) {
            console.error('❌ PreferencesManager: Error scheduling notification:', error);
        }
    }

    /**
     * Send daily notification
     */
    sendDailyNotification() {
        console.log('🔔 PreferencesManager: Sending daily notification');
        
        try {
            if (Notification.permission === 'granted') {
                new Notification('ARK Digital Calendar', {
                    body: 'Dein täglicher Spruch wartet auf dich! 🌟',
                    icon: '/icons/icon-192x192.svg',
                    badge: '/icons/icon-72x72.svg',
                    tag: 'daily-quote',
                    requireInteraction: false,
                    silent: false
                });
                
                console.log('✅ PreferencesManager: Daily notification sent');
            }
        } catch (error) {
            console.error('❌ PreferencesManager: Error sending notification:', error);
        }
    }

    /**
     * Handle system theme change
     */
    handleSystemThemeChange() {
        console.log('🎨 PreferencesManager: System theme changed');
        
        // Only apply if current theme is auto
        if (this.currentPreferences && this.currentPreferences.theme === 'auto') {
            this.applyTheme('auto');
        }
    }

    /**
     * Set up event listeners for preference changes
     */
    setupEventListeners() {
        console.log('🎛️ PreferencesManager: Setting up event listeners');
        
        try {
            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                this.handleSystemThemeChange();
            });
            
            // Listen for storage changes (for multi-tab sync)
            window.addEventListener('storage', (event) => {
                if (event.key && event.key.startsWith('ark-')) {
                    console.log('🔄 PreferencesManager: Storage change detected, reloading preferences');
                    this.loadPreferences().then(() => {
                        this.applyPreferences();
                    });
                }
            });
            
            console.log('✅ PreferencesManager: Event listeners set up');
        } catch (error) {
            console.error('❌ PreferencesManager: Error setting up event listeners:', error);
        }
    }
}

// Create singleton instance
const preferencesManager = new PreferencesManager();

// Export for both CommonJS and ES6
module.exports = { PreferencesManager, preferencesManager };
if (typeof window !== 'undefined') {
    window.PreferencesManager = PreferencesManager;
    window.preferencesManager = preferencesManager;
}