importScripts("https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js");

// ✅ Firebase Initialization
firebase.initializeApp({
  apiKey: "AIzaSyDZujeILCWJZbxp8sxn9LmbVyu-z5nn060",
  authDomain: "task-manager-185dc.firebaseapp.com",
  projectId: "task-manager-185dc",
  messagingSenderId: "1046024881090",
  appId: "1:1046024881090:web:58333b0313ebbc80ba4c5b"
});

const messaging = firebase.messaging();

// ✅ Push: Background Notifications
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background push received:', payload);

  const { title, body } = payload.notification || {};
  const options = {
    body,
    icon: '/icons/manifest-icon-192.maskable.png',
    badge: '/icons/manifest-icon-192.maskable.png',
    data: {
      url: '/index.html'
    }
  };

  self.registration.showNotification(title || '🔔 New Alert', options);
});

// ✅ Notification Click Handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(clients.openWindow(url));
});

// ✅ PWA Install & Static Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('pi-hisab-static-v1').then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/practice.css',
        '/practics.js',
        '/icons/manifest-icon-192.maskable.png',
        '/icons/manifest-icon-512.maskable.png'
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ✅ Fetch Caching: Network First (GET-only, skip PDFs)
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only cache GET requests, and skip .pdf files
  if (req.method !== 'GET' || req.url.endsWith('.pdf')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        const cloned = res.clone();
        caches.open('pi-hisab-dynamic-v1').then(cache => {
          cache.put(req, cloned).catch(err => {
            console.warn('⚠️ Cache put failed:', err);
          });
        });
        return res;
      })
      .catch(() => caches.match(req))
  );
});
