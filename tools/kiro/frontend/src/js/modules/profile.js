/**
 * Profile module for ARK Digital Calendar
 * 
 * Handles user profile creation, onboarding, and personalization.
 */

const { saveUserProfile, getUserProfile, getUserId } = require('./cache.js');
const { UserAPI } = require('./api.js');

/**
 * Profile setup and onboarding manager
 */
export class ProfileManager {
    constructor() {
        this.currentProfile = null;
        this.onboardingComplete = false;
        this.syncInterval = null;
    }

    /**
     * Initialize profile manager
     */
    async init() {
        console.log('🔧 ProfileManager: Initializing...');
        
        try {
            // Check for existing profile
            const userId = getUserId();
            if (userId) {
                this.currentProfile = await this.loadProfile(userId);
                this.onboardingComplete = !!this.currentProfile;
                
                if (this.currentProfile) {
                    // Perform integrity check
                    await this.checkDataIntegrity();
                    
                    // Start periodic sync
                    this.startPeriodicSync();
                }
                
                console.log('✅ ProfileManager: Existing profile loaded');
            } else {
                console.log('📝 ProfileManager: No existing profile found');
            }
            
            return this.onboardingComplete;
        } catch (error) {
            console.error('❌ ProfileManager: Initialization failed:', error);
            
            // Try to recover from corruption
            const recovered = await this.recoverFromCorruption();
            if (recovered) {
                this.startPeriodicSync();
            }
            
            return recovered;
        }
    }

    /**
     * Check if user needs onboarding
     */
    needsOnboarding() {
        return !this.onboardingComplete || !this.currentProfile;
    }

    /**
     * Load user profile
     */
    async loadProfile(userId) {
        console.log('📥 ProfileManager: Loading profile for user:', userId);
        
        try {
            // First try local storage
            let profile = getUserProfile();
            
            if (profile) {
                console.log('📦 ProfileManager: Profile loaded from cache');
                return profile;
            }

            // Try to fetch from API if online
            if (navigator.onLine) {
                try {
                    profile = await UserAPI.getProfile();
                    if (profile) {
                        // Cache the profile locally
                        saveUserProfile(profile);
                        console.log('🌐 ProfileManager: Profile loaded from API and cached');
                        return profile;
                    }
                } catch (apiError) {
                    console.warn('⚠️ ProfileManager: API fetch failed, using local data:', apiError.message);
                }
            }

            console.log('❌ ProfileManager: No profile found');
            return null;
        } catch (error) {
            console.error('❌ ProfileManager: Error loading profile:', error);
            return null;
        }
    }

    /**
     * Create new user profile from questionnaire
     */
    async createProfile(questionnaireData) {
        console.log('🆕 ProfileManager: Creating new profile');
        
        try {
            // Generate unique user ID
            const userId = this.generateUserId();
            
            // Calculate personality weights from questionnaire
            const personalityCategories = this.calculatePersonalityWeights(questionnaireData);
            
            // Create profile object
            const profile = {
                id: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                personalityCategories: personalityCategories,
                preferences: {
                    notificationsEnabled: false,
                    notificationTime: '09:00',
                    theme: 'auto',
                    quoteLength: 'medium',
                    language: 'de'
                },
                onboardingCompleted: true,
                version: '1.0.0'
            };

            // Persist profile with backup
            const persisted = await this.persistProfile(profile);
            if (!persisted) {
                throw new Error('Failed to persist profile');
            }

            this.onboardingComplete = true;

            // Try to sync with API if online
            if (navigator.onLine) {
                try {
                    const response = await UserAPI.createProfile(profile);
                    if (response && response.token) {
                        localStorage.setItem('ark-auth-token', response.token);
                        console.log('🔐 ProfileManager: Auth token saved');
                    }
                    console.log('🌐 ProfileManager: Profile synced with API');
                } catch (apiError) {
                    console.warn('⚠️ ProfileManager: API sync failed, profile saved locally:', apiError.message);
                    // Store for later sync
                    localStorage.setItem('ark-pending-profile-sync', JSON.stringify(profile));
                }
            } else {
                // Store for later sync when online
                localStorage.setItem('ark-pending-profile-sync', JSON.stringify(profile));
                console.log('📴 ProfileManager: Profile saved for offline sync');
            }

            console.log('✅ ProfileManager: Profile created successfully');
            return profile;
        } catch (error) {
            console.error('❌ ProfileManager: Error creating profile:', error);
            throw error;
        }
    }

    /**
     * Create default profile (for skip setup)
     */
    async createDefaultProfile() {
        console.log('🔧 ProfileManager: Creating default profile');
        
        const defaultQuestionnaireData = {
            q1: 'spirituality',
            q2: 'spirituality', 
            q3: 'spirituality',
            q4: 'spirituality',
            q5: 'spirituality'
        };

        return this.createProfile(defaultQuestionnaireData);
    }

    /**
     * Update existing profile
     */
    async updateProfile(updates) {
        console.log('🔄 ProfileManager: Updating profile');
        
        if (!this.currentProfile) {
            throw new Error('No profile to update');
        }

        try {
            // Merge updates with current profile
            const updatedProfile = {
                ...this.currentProfile,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            // Validate updated profile structure
            if (!this.validateProfileStructure(updatedProfile)) {
                throw new Error('Updated profile structure is invalid');
            }

            // Persist profile with backup
            const persisted = await this.persistProfile(updatedProfile);
            if (!persisted) {
                throw new Error('Failed to persist updated profile');
            }

            // Try to sync with API if online
            if (navigator.onLine) {
                try {
                    await UserAPI.updateProfile(updatedProfile);
                    console.log('🌐 ProfileManager: Profile update synced with API');
                } catch (apiError) {
                    console.warn('⚠️ ProfileManager: API sync failed, update saved locally:', apiError.message);
                    // Store for later sync
                    localStorage.setItem('ark-pending-profile-update', JSON.stringify(updatedProfile));
                }
            } else {
                // Store for later sync
                localStorage.setItem('ark-pending-profile-update', JSON.stringify(updatedProfile));
                console.log('📴 ProfileManager: Profile update saved for offline sync');
            }

            console.log('✅ ProfileManager: Profile updated successfully');
            return updatedProfile;
        } catch (error) {
            console.error('❌ ProfileManager: Error updating profile:', error);
            throw error;
        }
    }

    /**
     * Get current profile
     */
    getCurrentProfile() {
        return this.currentProfile;
    }

    /**
     * Calculate personality weights from questionnaire responses
     */
    calculatePersonalityWeights(responses) {
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
     * Generate unique user ID
     */
    generateUserId() {
        return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get questionnaire questions
     */
    getQuestionnaireQuestions() {
        return [
            {
                id: 'q1',
                text: 'Was motiviert dich am meisten im Leben?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Spirituelles Wachstum und innerer Frieden' },
                    { value: 'sport', label: 'Körperliche Fitness und sportliche Leistung' },
                    { value: 'education', label: 'Lernen und intellektuelle Entwicklung' },
                    { value: 'health', label: 'Allgemeines Wohlbefinden und gesundes Leben' },
                    { value: 'humor', label: 'Freude, Lachen und positive Erfahrungen' },
                    { value: 'philosophy', label: 'Tiefes Denken und die großen Fragen des Lebens' }
                ]
            },
            {
                id: 'q2',
                text: 'Wie startest du am liebsten in den Tag?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Meditation oder Gebet' },
                    { value: 'sport', label: 'Sport oder körperliche Aktivität' },
                    { value: 'education', label: 'Lesen oder etwas Neues lernen' },
                    { value: 'health', label: 'Gesundes Frühstück und Selbstfürsorge-Routine' },
                    { value: 'humor', label: 'Etwas Lustiges oder Unterhaltsames' },
                    { value: 'philosophy', label: 'Ruhige Reflexion und Kontemplation' }
                ]
            },
            {
                id: 'q3',
                text: 'Welche Art von Inhalten spricht dich am meisten an?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Inspirierende und erhebende Botschaften' },
                    { value: 'sport', label: 'Motivierende und handlungsorientierte Sprüche' },
                    { value: 'education', label: 'Zum Nachdenken anregende und lehrreiche Einsichten' },
                    { value: 'health', label: 'Wellness-Tipps und Ratschläge für gesundes Leben' },
                    { value: 'humor', label: 'Leichte und humorvolle Inhalte' },
                    { value: 'philosophy', label: 'Tiefe philosophische Weisheit' }
                ]
            },
            {
                id: 'q4',
                text: 'Bei Herausforderungen neigst du dazu:',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Innere Stärke und Glauben zu suchen' },
                    { value: 'sport', label: 'Mit Entschlossenheit durchzuhalten' },
                    { value: 'education', label: 'Zu recherchieren und von anderen zu lernen' },
                    { value: 'health', label: 'Auf Selbstfürsorge und Balance zu fokussieren' },
                    { value: 'humor', label: 'Die leichtere Seite der Dinge zu finden' },
                    { value: 'philosophy', label: 'Über die tiefere Bedeutung zu reflektieren' }
                ]
            },
            {
                id: 'q5',
                text: 'Was bringt dir die größte Erfüllung?',
                type: 'radio',
                options: [
                    { value: 'spirituality', label: 'Verbindung mit etwas Größerem' },
                    { value: 'sport', label: 'Körperliche Ziele erreichen' },
                    { value: 'education', label: 'Wissen und Fähigkeiten erlangen' },
                    { value: 'health', label: 'Sich energiegeladen und wohl fühlen' },
                    { value: 'humor', label: 'Andere zum Lächeln und Lachen bringen' },
                    { value: 'philosophy', label: 'Die Komplexität des Lebens verstehen' }
                ]
            }
        ];
    }

    /**
     * Validate questionnaire responses
     */
    validateQuestionnaireResponses(responses) {
        const questions = this.getQuestionnaireQuestions();
        const errors = [];

        questions.forEach(question => {
            if (!responses[question.id]) {
                errors.push(`Bitte beantworte Frage ${question.id.replace('q', '')}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sync pending profile data when online
     */
    async syncPendingData() {
        console.log('🔄 ProfileManager: Syncing pending data');
        
        if (!navigator.onLine) {
            console.log('📴 ProfileManager: Offline, skipping sync');
            return;
        }

        try {
            let syncSuccess = true;

            // Sync pending profile creation
            const pendingProfile = localStorage.getItem('ark-pending-profile-sync');
            if (pendingProfile) {
                try {
                    const profileData = JSON.parse(pendingProfile);
                    const response = await UserAPI.createProfile(profileData);
                    if (response && response.token) {
                        localStorage.setItem('ark-auth-token', response.token);
                    }
                    localStorage.removeItem('ark-pending-profile-sync');
                    console.log('✅ ProfileManager: Pending profile creation synced');
                } catch (error) {
                    console.error('❌ ProfileManager: Failed to sync profile creation:', error);
                    syncSuccess = false;
                }
            }

            // Sync pending profile updates
            const pendingUpdate = localStorage.getItem('ark-pending-profile-update');
            if (pendingUpdate) {
                try {
                    const updateData = JSON.parse(pendingUpdate);
                    await UserAPI.updateProfile(updateData);
                    localStorage.removeItem('ark-pending-profile-update');
                    console.log('✅ ProfileManager: Pending profile update synced');
                } catch (error) {
                    console.error('❌ ProfileManager: Failed to sync profile update:', error);
                    syncSuccess = false;
                }
            }

            // Perform full sync to ensure data consistency
            if (syncSuccess) {
                await this.performFullSync();
            }

            return syncSuccess;
        } catch (error) {
            console.error('❌ ProfileManager: Error syncing pending data:', error);
            return false;
        }
    }

    /**
     * Perform full synchronization with server
     */
    async performFullSync() {
        console.log('🔄 ProfileManager: Performing full sync');
        
        if (!navigator.onLine || !this.currentProfile) {
            console.log('📴 ProfileManager: Cannot perform full sync - offline or no profile');
            return false;
        }

        try {
            // Fetch latest profile from server
            const serverProfile = await UserAPI.getProfile();
            
            if (serverProfile) {
                // Compare timestamps to determine which is newer
                const localTimestamp = new Date(this.currentProfile.updatedAt);
                const serverTimestamp = new Date(serverProfile.updatedAt);
                
                if (serverTimestamp > localTimestamp) {
                    // Server profile is newer, update local
                    console.log('🌐 ProfileManager: Server profile is newer, updating local');
                    await this.persistProfile(serverProfile);
                } else if (localTimestamp > serverTimestamp) {
                    // Local profile is newer, update server
                    console.log('📤 ProfileManager: Local profile is newer, updating server');
                    await UserAPI.updateProfile(this.currentProfile);
                } else {
                    console.log('✅ ProfileManager: Profiles are in sync');
                }
            }

            console.log('✅ ProfileManager: Full sync completed');
            return true;
        } catch (error) {
            console.error('❌ ProfileManager: Error during full sync:', error);
            return false;
        }
    }

    /**
     * Start periodic sync (every 5 minutes when online)
     */
    startPeriodicSync() {
        console.log('⏰ ProfileManager: Starting periodic sync');
        
        // Clear any existing interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(async () => {
            if (navigator.onLine && this.currentProfile) {
                console.log('⏰ ProfileManager: Running periodic sync');
                await this.syncPendingData();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop periodic sync
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏰ ProfileManager: Periodic sync stopped');
        }
    }

    /**
     * Check data integrity and repair if needed
     */
    async checkDataIntegrity() {
        console.log('🔍 ProfileManager: Checking data integrity');
        
        try {
            // Check if profile exists and is valid
            if (!this.currentProfile) {
                console.log('⚠️ ProfileManager: No current profile');
                return false;
            }

            // Validate profile structure
            if (!this.validateProfileStructure(this.currentProfile)) {
                console.log('⚠️ ProfileManager: Profile structure invalid, attempting recovery');
                return await this.recoverFromCorruption();
            }

            // Check localStorage consistency
            const storedProfile = getUserProfile();
            const storedUserId = getUserId();

            if (!storedProfile || !storedUserId) {
                console.log('⚠️ ProfileManager: Missing localStorage data, restoring');
                await this.persistProfile(this.currentProfile);
            } else if (storedProfile.id !== this.currentProfile.id) {
                console.log('⚠️ ProfileManager: Profile ID mismatch, fixing');
                await this.persistProfile(this.currentProfile);
            }

            console.log('✅ ProfileManager: Data integrity check passed');
            return true;
        } catch (error) {
            console.error('❌ ProfileManager: Error during integrity check:', error);
            return false;
        }
    }

    /**
     * Handle profile corruption recovery
     */
    async recoverFromCorruption() {
        console.log('🔧 ProfileManager: Attempting profile recovery');
        
        try {
            // First, try to validate existing data
            const existingProfile = getUserProfile();
            if (existingProfile && this.validateProfileStructure(existingProfile)) {
                console.log('✅ ProfileManager: Existing profile is valid');
                this.currentProfile = existingProfile;
                this.onboardingComplete = true;
                return true;
            }

            console.log('⚠️ ProfileManager: Profile corrupted or invalid, attempting recovery');
            
            // Clear corrupted local data
            localStorage.removeItem('ark-user-profile');
            localStorage.removeItem('ark-user-id');
            
            // Try to fetch from API if online
            if (navigator.onLine) {
                try {
                    const profile = await UserAPI.getProfile();
                    if (profile && this.validateProfileStructure(profile)) {
                        saveUserProfile(profile);
                        this.currentProfile = profile;
                        this.onboardingComplete = true;
                        console.log('✅ ProfileManager: Profile recovered from API');
                        return true;
                    }
                } catch (apiError) {
                    console.warn('⚠️ ProfileManager: API recovery failed:', apiError.message);
                }
            }

            // Try to recover from backup if available
            const backupProfile = localStorage.getItem('ark-profile-backup');
            if (backupProfile) {
                try {
                    const parsedBackup = JSON.parse(backupProfile);
                    if (this.validateProfileStructure(parsedBackup)) {
                        saveUserProfile(parsedBackup);
                        this.currentProfile = parsedBackup;
                        this.onboardingComplete = true;
                        console.log('✅ ProfileManager: Profile recovered from backup');
                        return true;
                    }
                } catch (backupError) {
                    console.warn('⚠️ ProfileManager: Backup recovery failed:', backupError.message);
                }
            }

            // If all recovery attempts fail, reset to onboarding
            this.currentProfile = null;
            this.onboardingComplete = false;
            console.log('🔄 ProfileManager: Recovery failed, resetting to onboarding');
            return false;
        } catch (error) {
            console.error('❌ ProfileManager: Error during recovery:', error);
            return false;
        }
    }

    /**
     * Validate profile structure
     */
    validateProfileStructure(profile) {
        if (!profile || typeof profile !== 'object') {
            return false;
        }

        // Check required fields
        const requiredFields = ['id', 'createdAt', 'personalityCategories', 'preferences'];
        for (const field of requiredFields) {
            if (!profile[field]) {
                console.warn(`⚠️ ProfileManager: Missing required field: ${field}`);
                return false;
            }
        }

        // Validate personality categories
        if (!Array.isArray(profile.personalityCategories)) {
            console.warn('⚠️ ProfileManager: personalityCategories is not an array');
            return false;
        }

        // Validate preferences structure
        if (typeof profile.preferences !== 'object') {
            console.warn('⚠️ ProfileManager: preferences is not an object');
            return false;
        }

        return true;
    }

    /**
     * Create profile backup
     */
    createBackup(profile) {
        try {
            localStorage.setItem('ark-profile-backup', JSON.stringify(profile));
            localStorage.setItem('ark-profile-backup-timestamp', new Date().toISOString());
            console.log('💾 ProfileManager: Profile backup created');
        } catch (error) {
            console.warn('⚠️ ProfileManager: Failed to create backup:', error);
        }
    }

    /**
     * Enhanced profile persistence with backup
     */
    async persistProfile(profile) {
        try {
            // Create backup before saving
            this.createBackup(profile);
            
            // Save to localStorage
            saveUserProfile(profile);
            
            // Update current profile
            this.currentProfile = profile;
            
            console.log('✅ ProfileManager: Profile persisted successfully');
            return true;
        } catch (error) {
            console.error('❌ ProfileManager: Error persisting profile:', error);
            return false;
        }
    }
}

// Create singleton instance
const profileManager = new ProfileManager();

// Export for both CommonJS and ES6
module.exports = { ProfileManager, profileManager };
if (typeof window !== 'undefined') {
    window.ProfileManager = ProfileManager;
    window.profileManager = profileManager;
}