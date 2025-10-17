import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// WindTre Design System integrated in index.css
import './index.css'
import { initializeGTM } from './lib/gtm'

initializeGTM();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)