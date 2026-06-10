import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardList, CreditCard, FileText, HandCoins, Home, Package, ReceiptText, UserRound, ClipboardCheck } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Dashboard.css';

function symFor(cur) {
  return { USD:'$', EUR:'EUR ', GBP:'GBP ', IQD:'IQD ', AED:'AED ', SAR:'SAR ' }[cur] || `${cur || ''} `;
}

function readResult(result, fallback) {
  return result.status === 'fulfilled' ? result.value : fallback;
}

function countMeta(firstCount, firstLabel, secondCount, secondLabel) {
  return `${firstLabel}: ${firstCount} / ${secondLabel}: ${secondCount}`;
}

const CHOICE_TEXT = {
  en: { securityAnket: 'Security Anket', projectAnket: 'Project Anket' },
  ar: { securityAnket: 'استبيان الأمن', projectAnket: 'استبيان المشروع' },
  ku: { securityAnket: 'ئانکێتی ئاسایش', projectAnket: 'ئانکێتی پرۆژە' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [receiptChoiceOpen, setReceiptChoiceOpen] = useState(false);
  const [anketChoiceOpen, setAnketChoiceOpen] = useState(false);
  const choiceText = CHOICE_TEXT[lang] || CHOICE_TEXT.en;

  function openCard(card) {
    if (card.receiptChoice) {
      setReceiptChoiceOpen(true);
      return;
    }
    if (card.anketChoice) {
      setAnketChoiceOpen(true);
      return;
    }
    navigate(card.to);
  }

  useEffect(() => {
    const userRequest = ['developer', 'admin'].includes(user?.role) ? api.getUsers() : Promise.resolve([]);

    Promise.allSettled([
      api.getTenants(),
      api.getExpenses(),
      api.getReceipts(),
      api.getSettings(),
      userRequest,
    ]).then(([tn, ex, rc, st, us]) => {
      setTenants(readResult(tn, []));
      setExpenses(readResult(ex, []));
      setReceipts(readResult(rc, []));
      setSettings(readResult(st, {}));
      setUsers(readResult(us, []));
    }).finally(() => setLoading(false));
  }, [user?.role]);

  const summary = useMemo(() => {
    const payments = tenants.flatMap(tenant => tenant.payments || []);
    const paid = payments.filter(payment => payment.status === 'paid');
    const pending = payments.filter(payment => payment.status === 'pending');
    const late = payments.filter(payment => payment.status === 'late');
    const collected = paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return {
      payments,
      paid,
      pending,
      late,
      collected,
      expenseTotal,
      netIncome: collected - expenseTotal,
      currency: symFor(settings.currency),
    };
  }, [expenses, settings.currency, tenants]);

  const cards = useMemo(() => {
    const baseCards = [
      {
        to: '/',
        icon: Home,
        title: t('home'),
        meta: t('portfolioOverview'),
        value: tenants.length,
        valueLabel: t('activeTenants'),
      },
      {
        to: '/tenants',
        icon: UserRound,
        title: t('tenants'),
        meta: t('manageTenants'),
        value: tenants.length,
        valueLabel: t('totalTenants'),
      },
      {
        to: '/payments',
        icon: CreditCard,
        title: t('payments'),
        meta: countMeta(summary.pending.length, t('pendingLabel'), summary.late.length, t('lateLabel')),
        value: summary.payments.length,
        valueLabel: t('paymentRecords'),
      },
      {
        to: '/receipts',
        icon: ReceiptText,
        title: t('receiveReceipts'),
        meta: t('tenantPaymentReceipts'),
        value: receipts.length,
        valueLabel: t('savedRecords'),
      },
      {
        to: '/give-receipts',
        icon: HandCoins,
        title: t('giveReceipts'),
        meta: t('ownerPayoutReceipts'),
        value: receipts.filter(receipt => String(receipt.receipt_no || '').startsWith('G-')).length,
        valueLabel: t('savedRecords'),
      },
      {
        to: '/contracts/sell',
        icon: FileText,
        title: t('sellContract'),
        meta: t('contractShortcut'),
        value: '-',
        valueLabel: t('savedRecords'),
      },
      {
        to: '/contracts/rent',
        icon: ClipboardList,
        title: t('rentContract'),
        meta: t('contractShortcut'),
        value: '-',
        valueLabel: t('savedRecords'),
      },
      {
        to: '/ankets/security',
        icon: FileText,
        title: choiceText.securityAnket,
        meta: t('anketsMeta'),
        value: '-',
        valueLabel: t('savedRecords'),
      },
      {
        to: '/ankets/project',
        icon: FileText,
        title: choiceText.projectAnket,
        meta: t('anketsMeta'),
        value: '-',
        valueLabel: t('savedRecords'),
      },
      {
        to: '/expenses',
        icon: Package,
        title: t('expenses'),
        meta: `${summary.currency}${summary.expenseTotal.toLocaleString()}`,
        value: expenses.length,
        valueLabel: t('expenseRecords'),
      },
      {
        to: '/reports',
        icon: BarChart3,
        title: t('reports'),
        meta: `${summary.currency}${summary.netIncome.toLocaleString()} ${t('netIncome')}`,
        value: summary.paid.length,
        valueLabel: t('paidPayments'),
      },
    ];

    if (user?.role === 'admin') {
      baseCards.push({
        to: '/agent-reports',
        icon: ClipboardCheck,
        title: t('agentReports'),
        meta: t('agentReportsSub'),
        value: users.length,
        valueLabel: t('agent'),
      });
    }

    return baseCards;
  }, [choiceText.projectAnket, choiceText.securityAnket, expenses.length, receipts, summary, t, tenants.length, user?.role, users.length]);

  const quickCards = [
    { to:'/contracts/sell/new', icon:FileText, title:t('sellContract'), meta:t('contractShortcut') },
    { to:'/contracts/rent/new', icon:ClipboardList, title:t('rentContract'), meta:t('contractShortcut') },
    { to:'/receipts', receiptChoice:true, icon:ReceiptText, title:t('receiptShortcut'), meta:t('receiptShortcutMeta') },
    { to:'/ankets/security', anketChoice:true, icon:FileText, title:t('ankets'), meta:t('anketsMeta') },
  ];

  if (loading) {
    return <div className="empty-state"><div className="animate-spin" style={{fontSize:32}}>&#10227;</div></div>;
  }

  return (
    <div className="dashboard-hub" dir={lang === 'ar' || lang === 'ku' ? 'rtl' : 'ltr'}>
      <div className="dashboard-hub-header">
        <div>
          <p className="dashboard-eyebrow">HOPEZONE REAL ESTATE</p>
          <h1>{t('home')}</h1>
        </div>
        <div className="dashboard-date">{new Date().toISOString().slice(0, 10)}</div>
      </div>

      <div className="dashboard-quick-grid">
        {quickCards.map(card => (
          <button key={card.to} type="button" className="dashboard-quick-card" onClick={() => openCard(card)}>
            <span className="dashboard-quick-icon"><card.icon size={22} strokeWidth={2.25} /></span>
            <span>
              <strong>{card.title}</strong>
              <small>{card.meta}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="dashboard-card-grid">
        {cards.map(card => (
          <button key={card.to} type="button" className="dashboard-module-card" onClick={() => openCard(card)}>
            <span className="dashboard-module-icon"><card.icon size={23} strokeWidth={2.25} /></span>
            <span className="dashboard-module-meta">{card.meta}</span>
            <strong className="dashboard-module-value">{card.value}</strong>
            <span className="dashboard-module-title">{card.title}</span>
            <span className="dashboard-module-label">{card.valueLabel}</span>
          </button>
        ))}
      </div>
      {receiptChoiceOpen && (
        <div className="dashboard-choice-backdrop" onClick={() => setReceiptChoiceOpen(false)}>
          <div className="dashboard-choice-modal" onClick={event => event.stopPropagation()}>
            <h2>{t('receipts')}</h2>
            <button type="button" onClick={() => navigate('/receipts/new')}>پارە وەرگرتن</button>
            <button type="button" onClick={() => navigate('/give-receipts/new')}>پارەپێدان</button>
            <button type="button" className="muted" onClick={() => setReceiptChoiceOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {anketChoiceOpen && (
        <div className="dashboard-choice-backdrop" onClick={() => setAnketChoiceOpen(false)}>
          <div className="dashboard-choice-modal" onClick={event => event.stopPropagation()}>
            <h2>{t('ankets')}</h2>
            <button type="button" onClick={() => navigate('/ankets/security/new')}>{choiceText.securityAnket}</button>
            <button type="button" onClick={() => navigate('/ankets/project/new')}>{choiceText.projectAnket}</button>
            <button type="button" className="muted" onClick={() => setAnketChoiceOpen(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
