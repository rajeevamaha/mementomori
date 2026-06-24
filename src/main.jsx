import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// NB: no React.StrictMode wrapper — its dev-only double mount/unmount breaks
// Framer Motion's AnimatePresence (mode="wait" exit tracking hangs).
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
