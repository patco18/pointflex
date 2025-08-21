import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { I18nProvider } from './contexts/I18nContext'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'animate-slide-in',

        style: {
          background: '#363636',
          color: '#fff',
        },
      }}
    />
  </React.StrictMode>,
)