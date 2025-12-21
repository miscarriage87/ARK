/**
 * Notification module for ARK Digital Calendar
 * 
 * Handles push notifications and notification management.
 * This module is lazy-loaded to reduce initial bundle size.
 */

import { NotificationAPI } from './api.js';

/**
 * Push Notification Management
 */
export class NotificationManager {
    constructor() {
        this.vapidPublicKey = null;
        this.isSupported = false;
        this.isSubscribed = false;
        this.subscription = null;
    }

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
    }

    /**
     * Load VAPID public key from server
     */
    async loadVapidKey() {
        try {
            const data = await NotificationAPI.getVapidKey();
            this.vapidPublicKey = data.publicKey;
            console.log('ARK: VAPID public key loaded');
        } catch (error) {
            console.error('ARK: Error loading VAPID key:', error);
            throw error;
        }
    }

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
    }

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
            return true;
        } catch (error) {
            console.error('ARK: Error subscribing to push notifications:', error);
            return false;
        }
    }

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
            await NotificationAPI.unsubscribe();
            
            this.subscription = null;
            this.isSubscribed = false;
            this.updateNotificationUI();
            
            console.log('ARK: Successfully unsubscribed from push notifications');
            return true;
        } catch (error) {
            console.error('ARK: Error unsubscribing from push notifications:', error);
            return false;
        }
    }

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

        await NotificationAPI.subscribe(subscriptionData);
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(preferences) {
        try {
            await NotificationAPI.updatePreferences(preferences);
            console.log('ARK: Notification preferences updated');
            return true;
        } catch (error) {
            console.error('ARK: Error updating notification preferences:', error);
            return false;
        }
    }

    /**
     * Send test notification
     */
    async sendTestNotification() {
        try {
            await NotificationAPI.sendTest('This is a test notification from ARK!');
            return true;
        } catch (error) {
            console.error('ARK: Error sending test notification:', error);
            return false;
        }
    }

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
    }

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
    }

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
}

// Create singleton instance (lazy-loaded)
let notificationManager = null;

export async function getNotificationManager() {
    if (!notificationManager) {
        notificationManager = new NotificationManager();
        await notificationManager.init();
    }
    return notificationManager;
}