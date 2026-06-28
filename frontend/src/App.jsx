import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider }         from './context/ToastContext';
import { ThemeProvider }         from './context/ThemeContext';
import { LanguageProvider }      from './context/LanguageContext';
import api from './api/client';
import fallbackLogo from './hopezone.png';
import Layout    from './components/Layout';
import ThemePicker from './components/ThemePicker';
import Login     from './pages/Login';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import Tenants   from './pages/Tenants';
import Payments  from './pages/Payments';
import RenewRentContracts from './pages/RenewRentContracts';
import Notifications from './pages/Notifications';
import Profit from './pages/Profit';
import Maps from './pages/Maps';
import Expenses  from './pages/Expenses';
import Reports   from './pages/Reports';
import AgentReports from './pages/AgentReports';
import ChangeReviewCenter from './pages/ChangeReviewCenter';
import WhatsApp  from './pages/WhatsApp';
import Settings  from './pages/Settings';
import Users     from './pages/Users';
import Receipts     from './pages/Receipts';
import GiveReceipts from './pages/GiveReceipts';
import Ankets       from './pages/Ankets';
import './styles/globals.css';
import './pages/Payments.css';

const LOGO_STORAGE_KEY = 'rentpro_app_logo';

function readStoredLogo() {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function LogoSplash({ logo }) {
  const splashLogo = logo || readStoredLogo() || fallbackLogo;
  return (
    <div className="logo-splash" role="status" aria-label="Loading Hope Zone">
      <div className="logo-splash-card">
        <div className="logo-splash-image-wrap">
          <img src={splashLogo} alt="Company logo" className="logo-splash-image" />
        </div>
        <div className="logo-splash-loader" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}

function StartupSplash() {
  const { user } = useAuth();
  const [show, setShow] = useState(true);
  const [logo, setLogo] = useState(() => readStoredLogo());

  useEffect(() => {
    const syncStoredLogo = () => setLogo(readStoredLogo());
    window.addEventListener('rentpro-settings-updated', syncStoredLogo);
    return () => window.removeEventListener('rentpro-settings-updated', syncStoredLogo);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    api.getSettings()
      .then(settings => {
        if (!alive) return;
        const nextLogo = settings?.appLogo || '';
        setLogo(nextLogo);
        try {
          if (nextLogo) localStorage.setItem(LOGO_STORAGE_KEY, nextLogo);
          else localStorage.removeItem(LOGO_STORAGE_KEY);
        } catch {}
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!show) return undefined;
    const timer = setTimeout(() => setShow(false), 1550);
    return () => clearTimeout(timer);
  }, [show]);

  return show ? (
    <div className="logo-splash-overlay" aria-hidden="true">
      <LogoSplash logo={logo} />
    </div>
  ) : null;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LogoSplash />;
  return user ? children : <Navigate to="/login" replace />;
}

function ManagerOnly({ children }) {
  const { user } = useAuth();
  return ['developer', 'admin'].includes(user?.role) ? children : <Navigate to="/" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function OperationalOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'developer' ? <Navigate to="/users" replace /> : children;
}

function RoleHome() {
  const { user } = useAuth();
  return user?.role === 'developer' ? <Navigate to="/users" replace /> : <Dashboard />;
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <ThemePicker />
            <StartupSplash />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Protected><Layout /></Protected>}>
                  <Route index             element={<RoleHome />}      />
                  <Route path="dashboard"  element={<OperationalOnly><Home /></OperationalOnly>} />
                  <Route path="contracts/sell" element={<OperationalOnly><Contracts kind="sell" /></OperationalOnly>} />
                  <Route path="contracts/rent" element={<OperationalOnly><Contracts kind="rent" /></OperationalOnly>} />
                  <Route path="contracts/sell/new" element={<OperationalOnly><Contracts kind="sell" mode="form" /></OperationalOnly>} />
                  <Route path="contracts/rent/new" element={<OperationalOnly><Contracts kind="rent" mode="form" /></OperationalOnly>} />
                  <Route path="contracts/sell/:contractId" element={<OperationalOnly><Contracts kind="sell" mode="form" /></OperationalOnly>} />
                  <Route path="contracts/rent/:contractId" element={<OperationalOnly><Contracts kind="rent" mode="form" /></OperationalOnly>} />
                  <Route path="tenants"    element={<OperationalOnly><Tenants /></OperationalOnly>}   />
                  <Route path="payments"   element={<OperationalOnly><Payments /></OperationalOnly>}  />
                  <Route path="renew-rent-contracts" element={<OperationalOnly><RenewRentContracts /></OperationalOnly>} />
                  <Route path="notifications" element={<OperationalOnly><Notifications /></OperationalOnly>} />
                  <Route path="profit" element={<OperationalOnly><Profit /></OperationalOnly>} />
                  <Route path="maps" element={<OperationalOnly><Maps /></OperationalOnly>} />
                  <Route path="expenses"   element={<OperationalOnly><Expenses /></OperationalOnly>}  />
                  <Route path="reports"    element={<OperationalOnly><Reports /></OperationalOnly>}   />
                  <Route path="agent-reports" element={<AdminOnly><AgentReports /></AdminOnly>} />
                  <Route path="change-review-center" element={<ManagerOnly><ChangeReviewCenter /></ManagerOnly>} />
                  <Route path="whatsapp"   element={<OperationalOnly><WhatsApp /></OperationalOnly>}  />
                  <Route path="receipts"      element={<OperationalOnly><Receipts /></OperationalOnly>}     />
                  <Route path="receipts/new"  element={<OperationalOnly><Receipts mode="form" /></OperationalOnly>} />
                  <Route path="give-receipts" element={<OperationalOnly><GiveReceipts /></OperationalOnly>} />
                  <Route path="give-receipts/new" element={<OperationalOnly><GiveReceipts mode="form" /></OperationalOnly>} />
                  <Route path="ankets/security" element={<OperationalOnly><Ankets type="security" /></OperationalOnly>} />
                  <Route path="ankets/project"  element={<OperationalOnly><Ankets type="project" /></OperationalOnly>} />
                  <Route path="ankets/security/new" element={<OperationalOnly><Ankets type="security" mode="form" /></OperationalOnly>} />
                  <Route path="ankets/project/new"  element={<OperationalOnly><Ankets type="project" mode="form" /></OperationalOnly>} />
                  <Route path="settings"   element={<Settings />}  />
                  <Route path="users"      element={<ManagerOnly><Users /></ManagerOnly>}     />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
export default App;
