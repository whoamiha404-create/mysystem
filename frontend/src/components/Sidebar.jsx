import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  HandCoins,
  Home,
  LogOut,
  MessageCircle,
  Package,
  Palette,
  ReceiptText,
  Settings,
  ClipboardCheck,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletMinimal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import FlagIcon from './FlagIcon';
import './Sidebar.css';

const ICON_SIZE = 17;
const SUB_ICON_SIZE = 15;

export default function Sidebar({ waState, mobileOpen = false, onNavigate = () => {} }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [contractsOpen, setContractsOpen] = useState(() => location.pathname.startsWith('/contracts') || location.pathname.startsWith('/renew-rent-contracts'));
  const contractsActive = location.pathname.startsWith('/contracts') || location.pathname.startsWith('/renew-rent-contracts');
  const [receiptsOpen, setReceiptsOpen] = useState(() => location.pathname.startsWith('/receipts') || location.pathname.startsWith('/give-receipts'));
  const receiptsActive = location.pathname.startsWith('/receipts') || location.pathname.startsWith('/give-receipts');
  const [anketsOpen, setAnketsOpen] = useState(() => location.pathname.startsWith('/ankets'));
  const anketsActive = location.pathname.startsWith('/ankets');
  const [settings, setSettings] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingProfits, setPendingProfits] = useState(0);
  const [pendingChanges, setPendingChanges] = useState(0);
  const isDeveloper = user?.role === 'developer';
  const isAdmin = user?.role === 'admin';
  const canManageCompany = isDeveloper || isAdmin;

  useEffect(() => {
    let alive = true;
    const loadSettings = (event) => {
      if (event?.detail) {
        setSettings(current => ({ ...current, ...event.detail }));
        return;
      }
      api.getSettings().then(data => {
        if (alive) setSettings(data || {});
      }).catch(() => {});
    };
    loadSettings();
    window.addEventListener('rentpro-settings-updated', loadSettings);
    return () => {
      alive = false;
      window.removeEventListener('rentpro-settings-updated', loadSettings);
    };
  }, []);

  useEffect(() => {
    if (isDeveloper) return undefined;
    let alive = true;
    const loadUnread = () => {
      api.getNotificationUnreadCount()
        .then(data => { if (alive) setUnreadNotifications(Number(data.count || 0)); })
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 5000);
    window.addEventListener('rentpro-notifications-updated', loadUnread);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('rentpro-notifications-updated', loadUnread);
    };
  }, [isDeveloper]);

  useEffect(() => {
    if (!canManageCompany) return undefined;
    let alive = true;
    const loadPendingChanges = () => {
      api.getChangeRequestCount()
        .then(data => { if (alive) setPendingChanges(Number(data.count || 0)); })
        .catch(() => {});
    };
    loadPendingChanges();
    const interval = setInterval(loadPendingChanges, 5000);
    window.addEventListener('rentpro-change-requests-updated', loadPendingChanges);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('rentpro-change-requests-updated', loadPendingChanges);
    };
  }, [canManageCompany]);

  useEffect(() => {
    if (isDeveloper) return undefined;
    let alive = true;
    const loadPendingProfits = () => {
      api.getPendingProfitContracts()
        .then(rows => { if (alive) setPendingProfits(Array.isArray(rows) ? rows.length : 0); })
        .catch(() => {});
    };
    loadPendingProfits();
    const interval = setInterval(loadPendingProfits, 5000);
    window.addEventListener('rentpro-profit-updated', loadPendingProfits);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('rentpro-profit-updated', loadPendingProfits);
    };
  }, [isDeveloper]);

  useEffect(() => {
    if (contractsActive) setContractsOpen(true);
  }, [contractsActive]);

  useEffect(() => {
    if (receiptsActive) setReceiptsOpen(true);
  }, [receiptsActive]);

  useEffect(() => {
    if (anketsActive) setAnketsOpen(true);
  }, [anketsActive]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const waDot = waState === 'ready' ? 'dot-green'
    : waState === 'qr' ? 'dot-amber'
    : waState === 'init' ? 'dot-blue'
    : 'dot-red';

  const operationalNav = [
    { to:'/', icon:Home, key:'home', end:true },
    { to:'/dashboard', icon:BarChart3, key:'dashboard' },
    { to:'/tenants', icon:UserRound, key:'tenants' },
    { to:'/payments', icon:CreditCard, key:'payments' },
  ];
  const afterDropdownNav = [
    { to:'/notifications', icon:Bell, key:'notifications', badge: unreadNotifications },
    { to:'/profit', icon:WalletMinimal, key:'profit', badge: pendingProfits },
    { to:'/expenses', icon:Package, key:'expenses' },
    { to:'/reports', icon:BarChart3, key:'reports' },
    { to:'/whatsapp', icon:MessageCircle, key:'whatsapp' },
    { to:'/settings', icon:Settings, key:'settings' },
  ];
  const developerNav = [
    { to:'/settings', icon:Settings, key:'settings' },
  ];
  const nav = isDeveloper ? developerNav : operationalNav;
  const receiptNav = [
    { to:'/receipts', icon:ReceiptText, key:'receiveReceipts' },
    { to:'/give-receipts', icon:HandCoins, key:'giveReceipts' },
  ];
  const contractNav = [
    { to:'/contracts/sell', icon:FileText, key:'sellContract' },
    { to:'/contracts/rent', icon:ClipboardList, key:'rentContract' },
    { to:'/renew-rent-contracts', icon:CalendarClock, key:'renewRentContract' },
  ];
  const anketLabels = {
    en: { security: 'Security Anket', project: 'Project Anket' },
    ar: { security: 'استبيان الأمن', project: 'استبيان المشروع' },
    ku: { security: 'ئانکێتی ئاسایش', project: 'ئانکێتی پرۆژە' },
  }[lang] || { security: 'Security Anket', project: 'Project Anket' };
  const anketNav = [
    { to:'/ankets/security', icon:FileText, label:anketLabels.security },
    { to:'/ankets/project', icon:FileText, label:anketLabels.project },
  ];
  const adminNav = isDeveloper
    ? [{ to:'/users', icon:UsersRound, key:'users' }]
    : [
        { to:'/users', icon:UsersRound, key:'users' },
        { to:'/change-review-center', icon:ShieldCheck, label:'Change Review Center', badge: pendingChanges },
        { to:'/agent-reports', icon:ClipboardCheck, key:'agentReports' },
      ];
  const languages = [
    { code:'en', label:'EN', title:'English' },
    { code:'ar', label:'عر', title:'العربية' },
    { code:'ku', label:'کو', title:'کوردی' },
  ];

  const companyName = (settings.companyName || '').trim();
  const appName = (settings.appName || '').trim();

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo_sidabar">
        <div className={`sidebar-logo-icon_siddar ${settings.appLogo ? 'has-logo sidebar-logo-motion' : 'is-empty'}`}>
          {settings.appLogo && <img src={settings.appLogo} alt={companyName || 'Company logo'} />}
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">{companyName || appName || ''}</div>
          <div className="sidebar-logo-sub">{appName && companyName !== appName ? appName : ''}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">{t('main')}</div>
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={!!item.end}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            onClick={onNavigate}>
            <span className="sidebar-icon"><item.icon size={ICON_SIZE} strokeWidth={2.25} /></span>
            <span className="sidebar-label">{t(item.key)}</span>
            {item.to === '/whatsapp' && <span className={`sidebar-dot ${waDot}`}></span>}
          </NavLink>
        ))}

        {!isDeveloper && (
          <>
            <button
              type="button"
              className={`sidebar-item sidebar-dropdown-toggle ${receiptsActive ? 'active' : ''}`}
              onClick={() => setReceiptsOpen(open => !open)}
            >
              <span className="sidebar-icon"><ReceiptText size={ICON_SIZE} strokeWidth={2.25} /></span>
              <span className="sidebar-label">{t('receipts')}</span>
              <ChevronRight className={`sidebar-chevron ${receiptsOpen ? 'open' : ''}`} size={16} strokeWidth={2.5} />
            </button>
            {receiptsOpen && (
              <div className="sidebar-subgroup">
                {receiptNav.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `sidebar-item sidebar-subitem ${isActive ? 'active' : ''}`}
                    onClick={onNavigate}>
                    <span className="sidebar-icon"><item.icon size={SUB_ICON_SIZE} strokeWidth={2.25} /></span>
                    <span className="sidebar-label">{t(item.key)}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <div className="sidebar-section-label" style={{ marginTop:16 }}>{t('contractSection')}</div>
            <button
              type="button"
              className={`sidebar-item sidebar-dropdown-toggle ${contractsActive ? 'active' : ''}`}
              onClick={() => setContractsOpen(open => !open)}
            >
              <span className="sidebar-icon"><FileText size={ICON_SIZE} strokeWidth={2.25} /></span>
              <span className="sidebar-label">{t('contractSection')}</span>
              <ChevronRight className={`sidebar-chevron ${contractsOpen ? 'open' : ''}`} size={16} strokeWidth={2.5} />
            </button>
            {contractsOpen && (
              <div className="sidebar-subgroup">
                {contractNav.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `sidebar-item sidebar-subitem ${isActive ? 'active' : ''}`}
                    onClick={onNavigate}>
                    <span className="sidebar-icon"><item.icon size={SUB_ICON_SIZE} strokeWidth={2.25} /></span>
                    <span className="sidebar-label">{t(item.key)}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <div className="sidebar-section-label" style={{ marginTop:16 }}>{t('ankets')}</div>
            <button
              type="button"
              className={`sidebar-item sidebar-dropdown-toggle ${anketsActive ? 'active' : ''}`}
              onClick={() => setAnketsOpen(open => !open)}
            >
              <span className="sidebar-icon"><FileText size={ICON_SIZE} strokeWidth={2.25} /></span>
              <span className="sidebar-label">{t('ankets')}</span>
              <ChevronRight className={`sidebar-chevron ${anketsOpen ? 'open' : ''}`} size={16} strokeWidth={2.5} />
            </button>
            {anketsOpen && (
              <div className="sidebar-subgroup">
                {anketNav.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `sidebar-item sidebar-subitem ${isActive ? 'active' : ''}`}
                    onClick={onNavigate}>
                    <span className="sidebar-icon"><item.icon size={SUB_ICON_SIZE} strokeWidth={2.25} /></span>
                    <span className="sidebar-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}

            {afterDropdownNav.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={onNavigate}>
                <span className="sidebar-icon"><item.icon size={ICON_SIZE} strokeWidth={2.25} /></span>
                <span className="sidebar-label">{t(item.key)}</span>
                {!!item.badge && <span className="sidebar-badge">{item.badge}</span>}
                {item.to === '/whatsapp' && <span className={`sidebar-dot ${waDot}`}></span>}
              </NavLink>
            ))}
          </>
        )}

        {canManageCompany && (
          <>
            <div className="sidebar-section-label" style={{ marginTop:16 }}>{t('adminSection')}</div>
            {adminNav.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={onNavigate}>
                <span className="sidebar-icon"><item.icon size={ICON_SIZE} strokeWidth={2.25} /></span>
                <span className="sidebar-label">{item.label || t(item.key)}</span>
                {!!item.badge && <span className="sidebar-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-lang">
        {languages.map(item => (
          <button
            key={item.code}
            className={`lang-btn ${lang === item.code ? 'active' : ''}`}
            onClick={() => setLang(item.code)}
            title={item.title}
          >
            <FlagIcon code={item.code} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <div className="sidebar-actions">
          <button className="sidebar-action-btn" onClick={toggle} title={isDark ? t('lightMode') : t('darkMode')}>
            <Palette size={16} strokeWidth={2.25} />
          </button>
          <button className="sidebar-action-btn logout" onClick={handleLogout} title={t('logout')}>
            <LogOut size={16} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </aside>
  );
}
