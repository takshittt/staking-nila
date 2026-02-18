import './utils/logger.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import PaymentCancelled from './pages/PaymentCancelled';
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <PaymentCancelled />
        </BrowserRouter>
    </React.StrictMode>,
)
