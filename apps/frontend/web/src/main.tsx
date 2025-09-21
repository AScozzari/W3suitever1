import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// WindTre Design System integrated in index.css
import './index.css'

// TEMPORARY: Test React without App.tsx to isolate the problem
const TestComponent = () => (
  <div style={{ padding: '20px', fontSize: '24px', color: 'green' }}>
    <h1>🎉 REACT WORKS!</h1>
    <p>This bypasses App.tsx completely</p>
    <p>If you see this, React + ReactDOM work fine</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestComponent />
  </React.StrictMode>,
)