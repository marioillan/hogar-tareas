// Service Worker — Tareas del Hogar
// Permite que la app sea instalable como PWA y que las notificaciones
// funcionen en segundo plano en Android Chrome.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// Pasamos las peticiones de red al navegador sin caché
// (los datos de Supabase siempre deben ser frescos)
self.addEventListener('fetch', () => {})

// Para futuro Web Push desde servidor
self.addEventListener('push', e => {
  if (!e.data) return
  const { title, body, icon } = e.data.json()
  e.waitUntil(
    self.registration.showNotification(title, { body, icon: icon ?? '/icon.svg' })
  )
})
