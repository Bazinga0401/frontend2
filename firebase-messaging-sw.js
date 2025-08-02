importScripts("https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js");

// ✅ Firebase Init
firebase.initializeApp({
  apiKey: "AIzaSyDZujeILCWJZbxp8sxn9LmbVyu-z5nn060",
  authDomain: "task-manager-185dc.firebaseapp.com",
  projectId: "task-manager-185dc",
  messagingSenderId: "1046024881090",
  appId: "1:1046024881090:web:58333b0313ebbc80ba4c5b"
});

const messaging = firebase.messaging();

// ✅ Handle FCM push in background
messaging.onBackgroundMessage(payload => {
  if (!payload.notification) {
  console.log('[SW] Background push:', payload);
  const title = payload.notification?.title || 'Breaking News: You Have a Task 📰';
  const body = payload.notification?.body || '';
  const url = payload.data?.url || '/';
  self.registration.showNotification(title || 'Breaking News: You Have a Task 📰', {
    body,
    icon: '/icons/manifest-icon-192.maskable.png',
    badge: '/icons/apple-icon-180.png',
    data: {  url: url || '/' }
  });
  }
});



// ✅ Notification click → redirect
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// ✅ Cache App Shell
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
  // 🧠 skipWaiting removed to stop Chrome auto-update message
});

// ✅ Take control on activation
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ✅ Network First (skip PDFs)
self.addEventListener('fetch', event => {
  const req = event.request;

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


