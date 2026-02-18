
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
// import { AdminApp } from './AdminApp'; // If AdminApp exists and needs routing, it might need to be nested or handled separately.
// The current list_dir showed AdminApp.jsx, let's keep it in mind but for now just add the payment routes.

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/buy" element={<Home />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                {/* Helper for admin if needed, but keeping scope tight */}
            </Routes>
        </BrowserRouter>
    );
}

export default App;
