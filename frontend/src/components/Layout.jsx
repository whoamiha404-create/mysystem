import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [waState, setWaState] = useState('init');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [attention, setAttention] = useState({ notifications: 0, profits: 0 });

  useEffect(() => {
    let iv;
    const poll = async () => {
      try { const s = await api.waStatus(); setWaState(s.state); }
      catch(e) { setWaState('offline'); }
    };
    poll();
    iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!user || user.role === 'developer') return undefined;
    let alive = true;
    const loadAttention = async () => {
      try {
        const [unread, pendingProfits] = await Promise.all([
          api.getNotificationUnreadCount(),
          api.getPendingProfitContracts(),
        ]);
        if (alive) {
          setAttention({
            notifications: Number(unread?.count || 0),
            profits: Array.isArray(pendingProfits) ? pendingProfits.length : 0,
          });
        }
      } catch {
        if (alive) setAttention({ notifications: 0, profits: 0 });
      }
    };
    loadAttention();
    const interval = setInterval(loadAttention, 30000);
    window.addEventListener('rentpro-notifications-updated', loadAttention);
    window.addEventListener('rentpro-profit-updated', loadAttention);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('rentpro-notifications-updated', loadAttention);
      window.removeEventListener('rentpro-profit-updated', loadAttention);
    };
  }, [user]);

  const attentionCount = attention.notifications + attention.profits;
  function openAttention() {
    navigate(attention.profits > 0 ? '/profit' : '/notifications');
  }

  return (
    <div className={`app-shell ${mobileNavOpen ? 'mobile-nav-is-open' : ''}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="mobile-topbar-title">RentPro</div>
        <span className={`mobile-wa-dot ${waState === 'ready' ? 'ready' : waState === 'qr' ? 'qr' : waState === 'init' ? 'init' : 'offline'}`} />
      </header>
      <button
        type="button"
        className="mobile-sidebar-overlay"
        onClick={() => setMobileNavOpen(false)}
        aria-label="Close menu"
      />
      <Sidebar waState={waState} mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <main className="app-main">
        {attentionCount > 0 && (
          <button type="button" className="global-attention" onClick={openAttention} title="Attention">
            <Bell size={17} />
            <span>{attentionCount}</span>
          </button>
        )}
        <div className="page-content">
          <Outlet context={{ waState }} />
        </div>
      </main>
    </div>
  );
}
