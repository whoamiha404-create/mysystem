import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider }         from './context/ToastContext';
import { ThemeProvider }         from './context/ThemeContext';
import { LanguageProvider }      from './context/LanguageContext';
import Layout    from './components/Layout';
import ThemePicker from './components/ThemePicker';
import Login     from './pages/Login';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import Tenants   from './pages/Tenants';
import Payments  from './pages/Payments';
import Expenses  from './pages/Expenses';
import Reports   from './pages/Reports';
import AgentReports from './pages/AgentReports';
import WhatsApp  from './pages/WhatsApp';
import Settings  from './pages/Settings';
import Users     from './pages/Users';
import Receipts     from './pages/Receipts';
import GiveReceipts from './pages/GiveReceipts';
import Ankets       from './pages/Ankets';
import './styles/globals.css';
import './pages/Payments.css';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:32 }}>
      <Loader2 className="animate-spin" size={32} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function ManagerOnly({ children }) {
  const { user } = useAuth();
  return ['developer', 'admin'].includes(user?.role) ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <ThemePicker />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Protected><Layout /></Protected>}>
                  <Route index             element={<Home />}      />
                  <Route path="dashboard"  element={<Dashboard />} />
                  <Route path="contracts/sell" element={<Contracts kind="sell" />} />
                  <Route path="contracts/rent" element={<Contracts kind="rent" />} />
                  <Route path="contracts/sell/new" element={<Contracts kind="sell" mode="form" />} />
                  <Route path="contracts/rent/new" element={<Contracts kind="rent" mode="form" />} />
                  <Route path="contracts/sell/:contractId" element={<Contracts kind="sell" mode="form" />} />
                  <Route path="contracts/rent/:contractId" element={<Contracts kind="rent" mode="form" />} />
                  <Route path="tenants"    element={<Tenants />}   />
                  <Route path="payments"   element={<Payments />}  />
                  <Route path="expenses"   element={<Expenses />}  />
                  <Route path="reports"    element={<Reports />}   />
                  <Route path="agent-reports" element={<ManagerOnly><AgentReports /></ManagerOnly>} />
                  <Route path="whatsapp"   element={<WhatsApp />}  />
                  <Route path="receipts"      element={<Receipts />}     />
                  <Route path="receipts/new"  element={<Receipts mode="form" />} />
                  <Route path="give-receipts" element={<GiveReceipts />} />
                  <Route path="give-receipts/new" element={<GiveReceipts mode="form" />} />
                  <Route path="ankets/security" element={<Ankets type="security" />} />
                  <Route path="ankets/project"  element={<Ankets type="project" />} />
                  <Route path="ankets/security/new" element={<Ankets type="security" mode="form" />} />
                  <Route path="ankets/project/new"  element={<Ankets type="project" mode="form" />} />
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
