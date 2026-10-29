import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { cssVariables } from './theme.ts'

// Expose theme tokens to CSS as var(--color-…), so theme.ts stays the single source.
for (const [name, value] of Object.entries(cssVariables())) {
  document.documentElement.style.setProperty(name, value)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
