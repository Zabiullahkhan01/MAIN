import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import WeglotRefresh from "./weglot";
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
  <StrictMode>
  <WeglotRefresh />
    <App />
  </StrictMode>
  </BrowserRouter>,
)
