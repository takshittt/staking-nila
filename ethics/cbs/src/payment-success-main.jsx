import './utils/logger.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import PaymentSuccess from './pages/PaymentSuccess';
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <PaymentSuccess />
        </BrowserRouter>
    </React.StrictMode>,
)
