import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('[Brand Interface] bootstrapping...');

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('Brand Interface: #root missing from DOM!');
  document.body.innerHTML = '<div style="padding:20px;background:red;color:white;">ERROR: #root element missing!</div>';
} else {
  console.log('[Brand Interface] Found #root element, dynamic import App...');
  
  import('./App')
    .then(({ default: App }) => {
      console.log('[Brand Interface] App imported successfully, mounting React...');
      ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((error) => {
      console.error('[Brand Interface] App import failed:', error);
      rootEl.innerHTML = '<div style="padding:20px;background:red;color:white;">ERROR: Failed to import App - ' + error.message + '</div>';
    });
}