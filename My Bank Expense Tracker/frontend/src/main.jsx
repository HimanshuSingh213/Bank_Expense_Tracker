import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ExpenseProvider } from './context/ExpenseContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExpenseProvider>
      <App />
    </ExpenseProvider>
  </StrictMode>,
)
