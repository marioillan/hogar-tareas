import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@phosphor-icons/web/regular'
import '@phosphor-icons/web/fill'
import './nocturne.css'
import './index.css'
import App from './App.jsx'

// Registrar Service Worker para soporte PWA y notificaciones en background
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
