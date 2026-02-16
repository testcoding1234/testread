const CACHE_NAME = 'reading-journal-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/components.css',
    '/css/dark-mode.css',
    '/js/app.js',
    '/js/db.js',
    '/js/ui.js',
    '/js/barcode-scanner.js',
    '/js/google-books-api.js',
    '/js/google-drive-backup.js',
    '/js/fuzzy-search.js',
    '/js/book-detail.js',
    '/js/collections.js',
    '/assets/icons/icon-192x192.svg',
    '/assets/icons/icon-512x512.svg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Don't cache Google APIs or Chrome extension requests
    if (url.origin.includes('googleapis.com') || 
        url.origin.includes('google.com') ||
        url.protocol === 'chrome-extension:') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(request)
                    .then((fetchResponse) => {
                        // Cache successful responses for future use
                        if (fetchResponse && fetchResponse.status === 200) {
                            const responseToCache = fetchResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        }
                        return fetchResponse;
                    })
                    .catch(() => {
                        // Offline fallback for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Background sync for future enhancement
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-books') {
        event.waitUntil(syncBooks());
    }
});

async function syncBooks() {
    // Placeholder for future background sync functionality
    console.log('Background sync triggered');
}

// Push notifications placeholder for future
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png'
    };

    event.waitUntil(
        self.registration.showNotification('Reading Journal', options)
    );
});
