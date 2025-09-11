import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('[Brand Interface] main.tsx loading...');

const rootElement = document.getElementById('root');
console.log('[Brand Interface] Root element:', rootElement);

if (rootElement) {
  // Test semplice senza App
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div style={{ padding: '20px', background: '#FF6900', color: 'white' }}>
        <h1>Brand Interface HQ</h1>
        <p>Sistema separato su porta 5001</p>
        <p>Se vedi questo, React funziona!</p>
      </div>
    </React.StrictMode>,
  );
  console.log('[Brand Interface] React rendered!');
} else {
  console.error('[Brand Interface] Root element not found!');
}