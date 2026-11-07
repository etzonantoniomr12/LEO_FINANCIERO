import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { create31DayDemo, DemoFinanceRepository } from './data/demoFinance'
import './styles.css'

const isDemo = new URLSearchParams(window.location.search).get('demo') === '31'
const demo = isDemo ? create31DayDemo() : null

createRoot(document.getElementById('root')!).render(<StrictMode><App repository={demo ? new DemoFinanceRepository(demo.snapshot) : undefined} initialAnalysisMonth={demo?.month} demoMode={Boolean(demo)} /></StrictMode>)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`))
}
