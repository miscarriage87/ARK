/**
 * Service Worker for ARK Digital Calendar PWA
 * 
 * Implements caching strategies, offline functionality, and background sync
 * for the ARK digital calendar application.
 */

const CACHE_NAME = 'ark-v1.0.0';
const STATIC_CACHE = 'ark-static-v1.0.0';
const DYNAMIC_CACHE = 'ark-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-384x384.png'
];

// API endpoints that should be cached for offline use
const API_CACHE_PATTERNS = [
    /\/api\/quotes\/today/,
    /\/api\/quotes\/archive/,
    /\/api\/themes\/current/,
    /\/api\/users\/profile/
];

// Cache strategies for different content types
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only'
};

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error caching static files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests for caching, but handle POST/PUT for background sync
    if (request.method === 'GET') {
        if (isStaticFile(request)) {
            // Cache-first strategy for static files
            event.respondWith(cacheFirst(request));
        } else if (isAPIRequest(request)) {
            // Network-first strategy for API requests with offline fallback
            event.respondWith(networkFirstWithOfflineFallback(request));
        } else {
            // Stale-while-revalidate for other requests
            event.respondWith(staleWhileRevalidate(request));
        }
    } else if (request.method === 'POST' || request.method === 'PUT') {
        // Handle POST/PUT requests with background sync
        event.respondWith(handleMutatingRequest(request));
    }
});

// Enhanced network-first strategy with better offline support
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            // Clone response before caching
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        throw new Error(`Network response not ok: ${networkResponse.status}`);
    } catch (error) {
        console.log('Network failed, trying cache:', error.message);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Add offline indicator header
            const response = cachedResponse.clone();
            response.headers.set('X-Served-From', 'cache');
            return response;
        }
        
        // Return offline fallback for specific endpoints
        return getOfflineFallback(request);
    }
}

// Provide offline fallbacks for critical endpoints
function getOfflineFallback(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/quotes/today') {
        return new Response(JSON.stringify({
            id: 'offline-fallback',
            content: "Even when offline, your potential remains unlimited. Every moment is a chance to grow from within.",
            author: "ARK Wisdom",
            date: new Date().toISOString(),
            theme: "Offline Inspiration",
            isOffline: true
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Served-From': 'fallback'
            }
        });
    }
    
    if (url.pathname === '/api/quotes/archive') {
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Served-From': 'fallback'
            }
        });
    }
    
    // Generic offline response
    return new Response(JSON.stringify({
        error: 'Offline',
        message: 'This content is not available offline'
    }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'feedback-sync') {
        event.waitUntil(syncFeedback());
    } else if (event.tag === 'profile-sync') {
        event.waitUntil(syncProfile());
    }
});

// Push notification handling
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: 'Your daily inspiration is ready!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'daily-quote',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'View Quote',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.data = data;
    }
    
    event.waitUntil(
        self.registration.showNotification('ARK Daily Quote', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked', event.action);
    
    event.notification.close();
    
    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper functions

function isStaticFile(request) {
    const url = new URL(request.url);
    return STATIC_FILES.some(file => url.pathname === file) ||
           url.pathname.startsWith('/css/') ||
           url.pathname.startsWith('/js/') ||
           url.pathname.startsWith('/icons/');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/');
}

async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Cache-first strategy failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Offline - Content not available', { 
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

async function handleMutatingRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.log('Mutating request failed, storing for background sync:', error);
        
        // Store request for background sync
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text()
        };
        
        // Store in IndexedDB for background sync
        await storeForSync(requestData);
        
        // Register appropriate background sync based on URL
        if ('serviceWorker' in self && 'sync' in self.ServiceWorkerRegistration.prototype) {
            let syncTag = 'feedback-sync';
            if (request.url.includes('/users/profile')) {
                syncTag = 'profile-sync';
            }
            
            try {
                await self.registration.sync.register(syncTag);
                console.log(`Service Worker: Registered ${syncTag}`);
            } catch (syncError) {
                console.error('Service Worker: Failed to register sync:', syncError);
            }
        }
        
        return new Response(JSON.stringify({ 
            success: false, 
            message: 'Request queued for sync when online',
            queued: true
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function syncFeedback() {
    console.log('Service Worker: Syncing feedback data');
    
    try {
        // Get pending feedback from IndexedDB
        const pendingFeedback = await getStoredRequests('feedback');
        
        for (const feedback of pendingFeedback) {
            try {
                const response = await fetch(feedback.url, {
                    method: feedback.method,
                    headers: feedback.headers,
                    body: feedback.body
                });
                
                if (response.ok) {
                    console.log('Service Worker: Feedback synced successfully');
                    await removeStoredRequest('feedback', feedback.id);
                } else {
                    console.error('Service Worker: Failed to sync feedback:', response.status);
                }
            } catch (error) {
                console.error('Service Worker: Error syncing individual feedback:', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Error in syncFeedback:', error);
    }
}

async function syncProfile() {
    console.log('Service Worker: Syncing profile data');
    
    try {
        // Get pending profile updates from IndexedDB
        const pendingProfiles = await getStoredRequests('profile');
        
        for (const profile of pendingProfiles) {
            try {
                const response = await fetch(profile.url, {
                    method: profile.method,
                    headers: profile.headers,
                    body: profile.body
                });
                
                if (response.ok) {
                    console.log('Service Worker: Profile synced successfully');
                    await removeStoredRequest('profile', profile.id);
                } else {
                    console.error('Service Worker: Failed to sync profile:', response.status);
                }
            } catch (error) {
                console.error('Service Worker: Error syncing individual profile:', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Error in syncProfile:', error);
    }
}

async function storeForSync(requestData) {
    console.log('Service Worker: Storing request for sync', requestData);
    
    try {
        // Determine sync type based on URL
        let syncType = 'feedback';
        if (requestData.url.includes('/users/profile')) {
            syncType = 'profile';
        }
        
        // Add unique ID and timestamp
        const storedRequest = {
            ...requestData,
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            syncType: syncType
        };
        
        await storeRequest(syncType, storedRequest);
        console.log(`Service Worker: Request stored for ${syncType} sync`);
    } catch (error) {
        console.error('Service Worker: Error storing request for sync:', error);
    }
}

// IndexedDB helper functions
async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ARK-SyncDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores for different sync types
            if (!db.objectStoreNames.contains('feedback')) {
                db.createObjectStore('feedback', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('profile')) {
                db.createObjectStore('profile', { keyPath: 'id' });
            }
        };
    });
}

async function storeRequest(storeName, request) {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
        const request_op = store.add(request);
        request_op.onsuccess = () => resolve();
        request_op.onerror = () => reject(request_op.error);
    });
}

async function getStoredRequests(storeName) {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function removeStoredRequest(storeName, id) {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}