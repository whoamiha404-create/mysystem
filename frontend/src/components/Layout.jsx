import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, ClipboardCheck, Menu, MessageSquareText, WalletCards } from 'lucide-react';
import Sidebar from './Sidebar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Layout.css';

export default function Layout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [waState, setWaState] = useState('init');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [attention, setAttention] = useState({ notifications: 0, profits: 0, changes: 0 });

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
    if (!user) return undefined;
    let alive = true;
    const loadAttention = async () => {
      try {
        const canReview = ['admin', 'developer'].includes(user.role);
        const isDeveloper = user.role === 'developer';
        const [unread, pendingProfits, pendingChanges] = await Promise.all([
          isDeveloper ? Promise.resolve({ count: 0 }) : api.getNotificationUnreadCount(),
          isDeveloper ? Promise.resolve([]) : api.getPendingProfitContracts(),
          canReview ? api.getChangeRequestCount() : Promise.resolve({ count: 0 }),
        ]);
        if (alive) {
          setAttention({
            notifications: Number(unread?.count || 0),
            profits: Array.isArray(pendingProfits) ? pendingProfits.length : 0,
            changes: Number(pendingChanges?.count || 0),
          });
        }
      } catch {
        if (alive) setAttention({ notifications: 0, profits: 0, changes: 0 });
      }
    };
    loadAttention();
    const interval = setInterval(loadAttention, 5000);
    window.addEventListener('rentpro-notifications-updated', loadAttention);
    window.addEventListener('rentpro-profit-updated', loadAttention);
    window.addEventListener('rentpro-change-requests-updated', loadAttention);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('rentpro-notifications-updated', loadAttention);
      window.removeEventListener('rentpro-profit-updated', loadAttention);
      window.removeEventListener('rentpro-change-requests-updated', loadAttention);
    };
  }, [user]);

  const attentionCount = attention.notifications + attention.profits + attention.changes;
  function openAttention() {
    setAttentionOpen(open => !open);
  }

  const attentionItems = [
    { key: 'notifications', count: attention.notifications, text: t('attentionNotifications'), to: '/notifications', icon: MessageSquareText },
    { key: 'profits', count: attention.profits, text: t('attentionProfits'), to: '/profit', icon: WalletCards },
    { key: 'changes', count: attention.changes, text: t('attentionChanges'), to: '/change-review-center', icon: ClipboardCheck },
  ].filter(item => item.count > 0);

  function openAttentionItem(path) {
    setAttentionOpen(false);
    navigate(path);
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
        <div className={`global-attention-wrap ${attentionOpen ? 'open' : ''}`}>
          <button type="button" className={`global-attention ${attentionCount ? 'has-items' : ''}`} onClick={openAttention} title={t('attention')}>
            <Bell size={17} />
            <span>{attentionCount}</span>
          </button>
          {attentionOpen && (
            <div className="global-attention-popover">
              <strong>{t('attention')}</strong>
              {attentionItems.length ? (
                <ul>
                  {attentionItems.map(item => {
                    const Icon = item.icon;
                    return (
                    <li key={item.key}>
                      <button type="button" onClick={() => openAttentionItem(item.to)}>
                        <span className="attention-item-icon"><Icon size={16} /></span>
                        <span>{item.text}</span>
                        <b>{item.count}</b>
                      </button>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p>{t('noAttention')}</p>
              )}
            </div>
          )}
        </div>
        <div className="page-content">
          <Outlet context={{ waState }} />
        </div>
      </main>
    </div>
  );
}
