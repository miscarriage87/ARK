/**
 * Property-based tests for User Profile Persistence
 * Feature: kiro-application-fixes, Property 7: User Profile Persistence
 * 
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
 */

const fc = require('fast-check');

// Mock localStorage
const mockLocalStorage = {
    data: {},
    getItem: function(key) {
        return this.data[key] || null;
    },
    setItem: function(key, value) {
        this.data[key] = value;
    },
    removeItem: function(key) {
        delete this.data[key];
    },
    clear: function() {
        this.data = {};
    }
};

// Mock global objects
global.localStorage = mockLocalStorage;
global.navigator = {
    onLine: true
};

// Mock console methods to reduce test noise
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Simplified ProfileManager implementation for testing
class TestProfileManager {
    constructor() {
        this.currentProfile = null;
        this.onboardingComplete = false;
    }

    // Cache functions
    saveUserProfile(profile) {
        localStorage.setItem('ark-user-id', profile.id);
        localStorage.setItem('ark-user-profile', JSON.stringify(profile));
    }

    getUserProfile() {
        const profileData = localStorage.getItem('ark-user-profile');
        return profileData ? JSON.parse(profileData) : null;
    }

    getUserId() {
        return localStorage.getItem('ark-user-id');
    }

    // Profile management functions
    generateUserId() {
        return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

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
            confidence: total > 0 ? 0.8 : 0.5
        }));
    }

    validateProfileStructure(profile) {
        if (!profile || typeof profile !== 'object') {
            return false;
        }

        // Check required fields
        const requiredFields = ['id', 'createdAt', 'personalityCategories', 'preferences'];
        for (const field of requiredFields) {
            if (!profile[field]) {
                return false;
            }
        }

        // Validate personality categories
        if (!Array.isArray(profile.personalityCategories)) {
            return false;
        }

        // Validate preferences structure
        if (typeof profile.preferences !== 'object') {
            return false;
        }

        return true;
    }

    async createProfile(questionnaireData) {
        const userId = this.generateUserId();
        const personalityCategories = this.calculatePersonalityWeights(questionnaireData);
        
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

        this.saveUserProfile(profile);
        this.currentProfile = profile;
        this.onboardingComplete = true;

        // Store for sync if offline
        if (!navigator.onLine) {
            localStorage.setItem('ark-pending-profile-sync', JSON.stringify(profile));
        }

        return profile;
    }

    async updateProfile(updates) {
        if (!this.currentProfile) {
            throw new Error('No profile to update');
        }

        const updatedProfile = {
            ...this.currentProfile,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        if (!this.validateProfileStructure(updatedProfile)) {
            throw new Error('Updated profile structure is invalid');
        }

        this.saveUserProfile(updatedProfile);
        this.currentProfile = updatedProfile;

        // Store for sync if offline
        if (!navigator.onLine) {
            localStorage.setItem('ark-pending-profile-update', JSON.stringify(updatedProfile));
        }

        return updatedProfile;
    }

    getCurrentProfile() {
        return this.currentProfile;
    }

    async recoverFromCorruption() {
        try {
            // First, try to validate existing data
            const existingProfile = this.getUserProfile();
            if (existingProfile && this.validateProfileStructure(existingProfile)) {
                this.currentProfile = existingProfile;
                this.onboardingComplete = true;
                return true;
            }

            // Clear corrupted local data
            localStorage.removeItem('ark-user-profile');
            localStorage.removeItem('ark-user-id');
            
            // Try to recover from backup if available
            const backupProfile = localStorage.getItem('ark-profile-backup');
            if (backupProfile) {
                try {
                    const parsedBackup = JSON.parse(backupProfile);
                    if (this.validateProfileStructure(parsedBackup)) {
                        this.saveUserProfile(parsedBackup);
                        this.currentProfile = parsedBackup;
                        this.onboardingComplete = true;
                        return true;
                    }
                } catch (backupError) {
                    // Backup is corrupted too
                }
            }

            // If all recovery attempts fail, reset to onboarding
            this.currentProfile = null;
            this.onboardingComplete = false;
            return false;
        } catch (error) {
            return false;
        }
    }

    async syncPendingData() {
        if (!navigator.onLine) {
            return false;
        }

        try {
            // Simulate successful sync
            const pendingProfile = localStorage.getItem('ark-pending-profile-sync');
            if (pendingProfile) {
                localStorage.removeItem('ark-pending-profile-sync');
            }

            const pendingUpdate = localStorage.getItem('ark-pending-profile-update');
            if (pendingUpdate) {
                localStorage.removeItem('ark-pending-profile-update');
            }

            return true;
        } catch (error) {
            return false;
        }
    }
}

describe('User Profile Persistence Property Tests', () => {
    
    let profileManager;
    
    beforeEach(() => {
        // Reset all mocks
        mockLocalStorage.clear();
        jest.clearAllMocks();
        
        // Reset navigator online status
        global.navigator.onLine = true;
        
        // Create fresh ProfileManager instance
        profileManager = new TestProfileManager();
    });

    /**
     * Property 7a: Profile Creation and Persistence
     * For any valid questionnaire data, creating a profile should result in 
     * a valid profile that can be retrieved and has all required fields
     * **Validates: Requirements 5.2, 5.3**
     */
    test('Property 7a: Profile creation persists all required data correctly', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                q1: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q2: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q3: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q4: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q5: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy')
            }),
            async (questionnaireData) => {
                // Create profile from questionnaire data
                const profile = await profileManager.createProfile(questionnaireData);
                
                // Verify profile structure
                expect(profile).toBeDefined();
                expect(profile.id).toBeDefined();
                expect(typeof profile.id).toBe('string');
                expect(profile.id.length).toBeGreaterThan(0);
                
                expect(profile.createdAt).toBeDefined();
                expect(new Date(profile.createdAt)).toBeInstanceOf(Date);
                
                expect(profile.updatedAt).toBeDefined();
                expect(new Date(profile.updatedAt)).toBeInstanceOf(Date);
                
                expect(profile.personalityCategories).toBeDefined();
                expect(Array.isArray(profile.personalityCategories)).toBe(true);
                expect(profile.personalityCategories.length).toBe(6);
                
                expect(profile.preferences).toBeDefined();
                expect(typeof profile.preferences).toBe('object');
                
                expect(profile.onboardingCompleted).toBe(true);
                expect(profile.version).toBeDefined();
                
                // Verify personality categories structure
                const categories = ['spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'];
                profile.personalityCategories.forEach(cat => {
                    expect(categories).toContain(cat.category);
                    expect(typeof cat.weight).toBe('number');
                    expect(cat.weight).toBeGreaterThanOrEqual(0);
                    expect(cat.weight).toBeLessThanOrEqual(1);
                    expect(typeof cat.confidence).toBe('number');
                    expect(cat.confidence).toBeGreaterThan(0);
                    expect(cat.confidence).toBeLessThanOrEqual(1);
                });
                
                // Verify weights sum to approximately 1
                const totalWeight = profile.personalityCategories.reduce((sum, cat) => sum + cat.weight, 0);
                expect(Math.abs(totalWeight - 1)).toBeLessThan(0.01);
                
                // Verify profile can be retrieved
                const retrievedProfile = profileManager.getUserProfile();
                expect(retrievedProfile).toEqual(profile);
                
                // Verify user ID is stored
                const userId = profileManager.getUserId();
                expect(userId).toBe(profile.id);
            }
        ), { numRuns: 50 });
    });

    /**
     * Property 7b: Profile Update Persistence
     * For any valid profile updates, the updated profile should maintain 
     * data integrity and be correctly persisted
     * **Validates: Requirements 5.3, 5.4**
     */
    test('Property 7b: Profile updates preserve data integrity and persist correctly', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                q1: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q2: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q3: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q4: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q5: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy')
            }),
            fc.record({
                preferences: fc.record({
                    notificationsEnabled: fc.boolean(),
                    notificationTime: fc.constantFrom('06:00', '07:00', '08:00', '09:00', '10:00'),
                    theme: fc.constantFrom('light', 'dark', 'auto'),
                    quoteLength: fc.constantFrom('short', 'medium', 'long'),
                    language: fc.constantFrom('de', 'en')
                })
            }),
            async (questionnaireData, updates) => {
                // Create initial profile
                const originalProfile = await profileManager.createProfile(questionnaireData);
                const originalUpdatedAt = originalProfile.updatedAt;
                
                // Wait a small amount to ensure timestamp difference
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Update profile
                const updatedProfile = await profileManager.updateProfile(updates);
                
                // Verify update preserved original data
                expect(updatedProfile.id).toBe(originalProfile.id);
                expect(updatedProfile.createdAt).toBe(originalProfile.createdAt);
                expect(updatedProfile.personalityCategories).toEqual(originalProfile.personalityCategories);
                expect(updatedProfile.onboardingCompleted).toBe(originalProfile.onboardingCompleted);
                expect(updatedProfile.version).toBe(originalProfile.version);
                
                // Verify updates were applied
                expect(updatedProfile.preferences).toEqual(updates.preferences);
                
                // Verify timestamp was updated
                expect(updatedProfile.updatedAt).not.toBe(originalUpdatedAt);
                expect(new Date(updatedProfile.updatedAt)).toBeInstanceOf(Date);
                expect(new Date(updatedProfile.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
                
                // Verify updated profile can be retrieved
                const retrievedProfile = profileManager.getUserProfile();
                expect(retrievedProfile).toEqual(updatedProfile);
                
                // Verify profile manager state is updated
                expect(profileManager.getCurrentProfile()).toEqual(updatedProfile);
            }
        ), { numRuns: 30 });
    });

    /**
     * Property 7c: Profile Corruption Recovery
     * For any corrupted profile data, the system should either recover 
     * valid data or gracefully reset to onboarding state
     * **Validates: Requirements 5.5**
     */
    test('Property 7c: Profile corruption recovery maintains system stability', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                q1: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q2: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q3: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q4: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q5: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy')
            }),
            fc.constantFrom(
                'invalid_json',
                'missing_id',
                'missing_categories',
                'invalid_categories',
                'missing_preferences',
                'null_profile'
            ),
            async (questionnaireData, corruptionType) => {
                // Create valid profile first
                const validProfile = await profileManager.createProfile(questionnaireData);
                
                // Corrupt the profile data based on corruption type
                let corruptedData;
                switch (corruptionType) {
                    case 'invalid_json':
                        mockLocalStorage.setItem('ark-user-profile', '{ invalid json }');
                        break;
                    case 'missing_id':
                        corruptedData = { ...validProfile };
                        delete corruptedData.id;
                        mockLocalStorage.setItem('ark-user-profile', JSON.stringify(corruptedData));
                        break;
                    case 'missing_categories':
                        corruptedData = { ...validProfile };
                        delete corruptedData.personalityCategories;
                        mockLocalStorage.setItem('ark-user-profile', JSON.stringify(corruptedData));
                        break;
                    case 'invalid_categories':
                        corruptedData = { ...validProfile };
                        corruptedData.personalityCategories = 'not an array';
                        mockLocalStorage.setItem('ark-user-profile', JSON.stringify(corruptedData));
                        break;
                    case 'missing_preferences':
                        corruptedData = { ...validProfile };
                        delete corruptedData.preferences;
                        mockLocalStorage.setItem('ark-user-profile', JSON.stringify(corruptedData));
                        break;
                    case 'null_profile':
                        mockLocalStorage.setItem('ark-user-profile', 'null');
                        break;
                }
                
                // Create backup for recovery testing
                mockLocalStorage.setItem('ark-profile-backup', JSON.stringify(validProfile));
                
                // Create new profile manager instance to test recovery
                const recoveryManager = new TestProfileManager();
                
                // Attempt recovery
                const recovered = await recoveryManager.recoverFromCorruption();
                
                // Verify recovery behavior
                if (recovered) {
                    // If recovery succeeded, profile should be valid
                    const recoveredProfile = recoveryManager.getCurrentProfile();
                    expect(recoveredProfile).toBeDefined();
                    expect(recoveredProfile.id).toBeDefined();
                    expect(recoveredProfile.personalityCategories).toBeDefined();
                    expect(Array.isArray(recoveredProfile.personalityCategories)).toBe(true);
                    expect(recoveredProfile.preferences).toBeDefined();
                    expect(typeof recoveredProfile.preferences).toBe('object');
                } else {
                    // If recovery failed, should be in clean state for onboarding
                    expect(recoveryManager.getCurrentProfile()).toBeNull();
                }
                
                // System should remain stable (no crashes)
                expect(recoveryManager).toBeDefined();
            }
        ), { numRuns: 30 });
    });

    /**
     * Property 7d: Offline/Online Synchronization
     * For any profile operations performed offline, when connectivity returns,
     * the data should be synchronized correctly without data loss
     * **Validates: Requirements 5.5**
     */
    test('Property 7d: Offline operations synchronize correctly when online', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                q1: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q2: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q3: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q4: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                q5: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy')
            }),
            fc.record({
                preferences: fc.record({
                    theme: fc.constantFrom('light', 'dark', 'auto'),
                    quoteLength: fc.constantFrom('short', 'medium', 'long')
                })
            }),
            async (questionnaireData, updates) => {
                // Start offline
                global.navigator.onLine = false;
                
                // Create profile offline
                const profile = await profileManager.createProfile(questionnaireData);
                
                // Verify pending sync data exists
                const pendingSync = mockLocalStorage.getItem('ark-pending-profile-sync');
                expect(pendingSync).toBeDefined();
                expect(JSON.parse(pendingSync)).toEqual(profile);
                
                // Update profile offline
                const updatedProfile = await profileManager.updateProfile(updates);
                
                // Verify pending update data exists
                const pendingUpdate = mockLocalStorage.getItem('ark-pending-profile-update');
                expect(pendingUpdate).toBeDefined();
                expect(JSON.parse(pendingUpdate)).toEqual(updatedProfile);
                
                // Go back online
                global.navigator.onLine = true;
                
                // Perform sync
                const syncSuccess = await profileManager.syncPendingData();
                
                // Verify sync was successful
                expect(syncSuccess).toBe(true);
                
                // Verify pending data was cleared
                expect(mockLocalStorage.getItem('ark-pending-profile-sync')).toBeNull();
                expect(mockLocalStorage.getItem('ark-pending-profile-update')).toBeNull();
                
                // Verify profile is still accessible
                const finalProfile = profileManager.getCurrentProfile();
                expect(finalProfile).toEqual(updatedProfile);
            }
        ), { numRuns: 20 });
    });

    /**
     * Property 7e: Data Integrity Validation
     * For any profile data, the validation should correctly identify 
     * valid and invalid structures
     * **Validates: Requirements 5.2, 5.5**
     */
    test('Property 7e: Profile validation correctly identifies valid and invalid structures', () => {
        fc.assert(fc.property(
            fc.oneof(
                // Valid profile structure
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    createdAt: fc.date().map(d => d.toISOString()),
                    updatedAt: fc.date().map(d => d.toISOString()),
                    personalityCategories: fc.array(
                        fc.record({
                            category: fc.constantFrom('spirituality', 'sport', 'education', 'health', 'humor', 'philosophy'),
                            weight: fc.float({ min: 0, max: 1 }),
                            confidence: fc.float({ min: 0, max: 1 })
                        }),
                        { minLength: 6, maxLength: 6 }
                    ),
                    preferences: fc.record({
                        notificationsEnabled: fc.boolean(),
                        notificationTime: fc.string(),
                        theme: fc.string(),
                        quoteLength: fc.string()
                    }),
                    onboardingCompleted: fc.boolean(),
                    version: fc.string()
                }).map(profile => ({ profile, shouldBeValid: true })),
                
                // Invalid profile structures
                fc.oneof(
                    fc.constant(null).map(profile => ({ profile, shouldBeValid: false })),
                    fc.constant(undefined).map(profile => ({ profile, shouldBeValid: false })),
                    fc.string().map(profile => ({ profile, shouldBeValid: false })),
                    fc.record({
                        // Missing id
                        createdAt: fc.date().map(d => d.toISOString()),
                        personalityCategories: fc.array(fc.record({})),
                        preferences: fc.record({})
                    }).map(profile => ({ profile, shouldBeValid: false })),
                    fc.record({
                        id: fc.string({ minLength: 1 }),
                        createdAt: fc.date().map(d => d.toISOString()),
                        // Missing personalityCategories
                        preferences: fc.record({})
                    }).map(profile => ({ profile, shouldBeValid: false })),
                    fc.record({
                        id: fc.string({ minLength: 1 }),
                        createdAt: fc.date().map(d => d.toISOString()),
                        personalityCategories: fc.string(), // Wrong type
                        preferences: fc.record({})
                    }).map(profile => ({ profile, shouldBeValid: false }))
                )
            ),
            ({ profile, shouldBeValid }) => {
                const isValid = profileManager.validateProfileStructure(profile);
                expect(isValid).toBe(shouldBeValid);
            }
        ), { numRuns: 100 });
    });
});