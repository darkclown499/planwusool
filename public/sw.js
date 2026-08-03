// ============================================================================
// WhatsStore Web Push Service Worker
// ============================================================================
// - يستمع لحدث "push" ويعرض إشعاراً فورياً
// - يستمع لحدث "notificationclick" لتوجيه المستخدم للرابط المرفق وإغلاق الإشعار
// ============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      return Promise.all(
        clientList.map((client) => {
          return client.navigate(client.url);
        })
      );
    })
  );
  self.clients.claim();
});

// ────────────────────────────────────────────────────────────────────────────
// حدث استقبال الإشعار
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // إذا لم يكن JSON صالحاً، استخدم النص الخام
    data = { title: 'WhatsStore', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'WhatsStore';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: data.icon || '/storage/media/logo.png',
    badge: data.badge || '/storage/media/logo.png',
    image: data.image || undefined,
    data: {
      url: data.url || '/',
      notification_id: data.notification_id || null,
      type: data.type || null,
      ts: Date.now(),
    },
    tag: data.tag || `whatsstore-${data.notification_id || Date.now()}`,
    renotify: Boolean(data.renotify),
    requireInteraction: Boolean(data.requireInteraction),
    vibrate: data.vibrate || [100, 50, 100],
    actions: data.actions || [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ────────────────────────────────────────────────────────────────────────────
// حدث النقر على الإشعار
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};

  // إغلاق الإشعار
  notification.close();

  const urlToOpen = data.url || '/';

  // معالجة أزرار الإجراءات
  if (event.action) {
    if (event.action === 'close') {
      return;
    }
    if (event.action === 'open') {
      // استمرار التنفيذ لفتح الرابط
    }
  }

  event.waitUntil(
    (async () => {
      // إرسال رسالة إلى الخادم لتسجيل النقرة (اختياري)
      // يمكن تنفيذ ذلك عبر fetch إذا كان هناك API مخصص
      // fetch(`/api/notifications/${data.notification_id}/click`, { method: 'POST' })

      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of allClients) {
        // إذا وجدنا نافذة مفتوحة بنفس العنوان، ركز عليها ولوّح إليها بالرابط
        if ('focus' in client) {
          await client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: urlToOpen, notification_id: data.notification_id });
          return;
        }
      }

      // إذا لم نجد نافذة مفتوحة، افتح نافذة جديدة
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

// ────────────────────────────────────────────────────────────────────────────
// إغلاق الإشعار
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  // يمكن إرسال إشارة للخادم بأن المستخدم أغلق الإشعار
  // fetch(`/api/notifications/${data.notification_id}/close`, { method: 'POST' }).catch(() => {});
});

