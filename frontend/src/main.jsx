import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'hsl(240 10% 8%)',
              color: 'hsl(0 0% 98%)',
              border: '1px solid hsl(240 3.7% 15.9%)',
              fontSize: '0.875rem',
              borderRadius: '0.75rem',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: 'hsl(142 71% 45%)', secondary: 'hsl(0 0% 98%)' } },
            error: { iconTheme: { primary: 'hsl(0 84% 60%)', secondary: 'hsl(0 0% 98%)' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
