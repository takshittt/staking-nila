import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import ScrollToTop from './components/ScrollToTop';
import { WalletWatcher } from './components/WalletWatcher';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <WalletWatcher />
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white !text-slate-900 !border !border-slate-100 !shadow-lg !rounded-xl',
          success: {
            iconTheme: {
              primary: '#16a34a',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<Cookies />} />
      </Routes>
    </Router>
  )
}

export default App
