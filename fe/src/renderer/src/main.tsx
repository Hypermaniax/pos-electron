import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { queryClient } from './lib/query-client'
import { ConfigProvider } from './context/ConfigContext'
import { AuthProvider } from './context/AuthContext'
import { ShiftProvider } from './context/ShiftContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { App } from './App'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemen #root tidak ditemukan')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ErrorBoundary>
          <ConfigProvider>
            <AuthProvider>
              <ShiftProvider>
                <TooltipProvider>
                  <App />
                </TooltipProvider>
              </ShiftProvider>
            </AuthProvider>
          </ConfigProvider>
        </ErrorBoundary>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>
)
