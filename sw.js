self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new task!',
      icon: '/frontend2/pfp.ico',
      badge: '/frontend2/badge.png',
      data: {
        url: data.url || 'https://bazinga0401.github.io/frontend2/index.html'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Task Reminder', options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      for (let client of clientsArr) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
