import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Brand Interface bootstrapping

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('Brand Interface: #root missing from DOM!');
  document.body.innerHTML = '<div style="padding:20px;background:red;color:white;">ERROR: #root element missing!</div>';
} else {
  // Found #root element, dynamic import App
  
  import('./App')
    .then(({ default: App }) => {
      // App imported successfully, mounting React
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