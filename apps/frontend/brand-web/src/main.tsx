import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;background:red;color:white;">ERROR: #root element missing!</div>';
} else {
  
  import('./App')
    .then(({ default: App }) => {
      ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((error) => {
      rootEl.innerHTML = '<div style="padding:20px;background:red;color:white;">ERROR: Failed to import App - ' + error.message + '</div>';
    });
}