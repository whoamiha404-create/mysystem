import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, RefreshCw, Search, Send, WalletMinimal } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateText) {
  if (!dateText) return null;
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((startOfDay(target) - startOfDay()) / 86400000);
}

function fmt(dateText) {
  if (!dateText) return '-';
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return dateText;
  return d.toISOString().slice(0, 10);
}

export default function RenewRentContracts() {
  const { t } = useLanguage();
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [query, setQuery] = useState('');
  const [windowDays, setWindowDays] = useState(7);
  const [profitRow, setProfitRow] = useState(null);
  const [profitForm, setProfitForm] = useState({ amount: '', currency: 'USD', notes: '' });

  async function load() {
    setLoading(true);
    try {
      const rows = await api.getTenants();
      setTenants(rows || []);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants
      .filter(row => row.contract_end)
      .map(row => ({ ...row, days_left: daysUntil(row.contract_end) }))
      .filter(row => {
        if (!q) return true;
        return [row.name, row.phone, row.apt, row.location, row.owner]
          .some(value => String(value || '').toLowerCase().includes(q));
      })
      .sort((a, b) => (a.days_left ?? 99999) - (b.days_left ?? 99999));
  }, [query, tenants]);

  const dueRows = rows.filter(row => row.days_left !== null && row.days_left >= 0 && row.days_left <= windowDays);
  const expiredRows = rows.filter(row => row.days_left !== null && row.days_left < 0);
  const activeRows = rows.filter(row => row.days_left !== null && row.days_left > windowDays);

  async function sendOne(row) {
    setSending(row.id);
    try {
      await api.waRenewal(row.id, false);
      toast(`${t('sendRenewalReminder')} ${row.name}`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending('');
    }
  }

  async function sendAll() {
    setSending('all');
    try {
      const result = await api.waRenewalAll(windowDays, false);
      const ok = (result.results || []).filter(row => row.ok).length;
      toast(`${ok} ${t('sendRenewalReminder')}`, ok ? 'success' : 'warning');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending('');
    }
  }

  async function saveProfit() {
    try {
      await api.createProfit({
        contractKind: 'renew-rent',
        contractTitle: profitRow?.name || '',
        contractNo: profitRow?.apt || '',
        contractDate: profitRow?.contract_end || new Date().toISOString().slice(0, 10),
        amount: profitForm.amount,
        currency: profitForm.currency,
        notes: profitForm.notes,
        source: 'renew-rent',
      });
      toast(t('recordProfit'), 'success');
      setProfitRow(null);
      setProfitForm({ amount: '', currency: 'USD', notes: '' });
      window.dispatchEvent(new Event('rentpro-profit-updated'));
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function badgeFor(row) {
    if (row.days_left === null) return <span className="badge badge-gray">-</span>;
    if (row.days_left < 0) return <span className="badge badge-red">{t('expired')}</span>;
    if (row.days_left <= windowDays) return <span className="badge badge-amber">{t('renewalDueSoon')}</span>;
    return <span className="badge badge-green">{t('activeStatus')}</span>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('renewRentContractsTitle')}</h1>
        <p>{t('renewRentContractsSub')}</p>
      </div>

      <div className="stat-grid renew-stat-grid">
        <div className="stat-card">
          <div className="stat-icon"><CalendarClock size={20} /></div>
          <div className="stat-label">{t('renewalDueSoon')}</div>
          <div className="stat-value">{dueRows.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-label">{t('expired')}</div>
          <div className="stat-value">{expiredRows.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-label">{t('contract')}</div>
          <div className="stat-value">{rows.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div className="search-input" style={{maxWidth:420}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('searchTenants')} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <span>{t('renewalWindow')}</span>
              <input
                type="number"
                min="1"
                max="60"
                value={windowDays}
                onChange={e=>setWindowDays(Math.max(1, Number(e.target.value) || 7))}
                style={{width:90}}
              />
            </label>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('refresh') || 'Refresh'}
            </button>
            <button className="btn btn-primary" onClick={sendAll} disabled={!dueRows.length || sending === 'all'}>
              <Send size={15} /> {sending === 'all' ? '...' : t('sendAllRenewals')}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('tenant')}</th>
                <th>{t('apartment')}</th>
                <th>{t('phone')}</th>
                <th>{t('contractStart')}</th>
                <th>{t('contractEnd')}</th>
                <th>{t('daysLeft')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <div className="td-name">{row.name}</div>
                    <div className="td-sub">{row.owner || '-'}</div>
                  </td>
                  <td>
                    <div>{row.apt}</div>
                    <div className="td-sub">{row.location || '-'}</div>
                  </td>
                  <td>{row.phone || '-'}</td>
                  <td>{fmt(row.contract_start)}</td>
                  <td>{fmt(row.contract_end)}</td>
                  <td className="font-bold">{row.days_left ?? '-'}</td>
                  <td>{badgeFor(row)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => sendOne(row)} disabled={sending === row.id || !row.phone}>
                        <Send size={14} /> {sending === row.id ? '...' : t('sendRenewalReminder')}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setProfitRow(row)}>
                        <WalletMinimal size={14} /> {t('recordProfit')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state" style={{padding:36}}>
                      <CalendarClock size={42} />
                      <h3>{t('noRenewals')}</h3>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!!activeRows.length && (
        <div className="text-muted" style={{marginTop:12,fontSize:'var(--text-sm)'}}>
          {activeRows.length} {t('contract')} outside the reminder window.
        </div>
      )}

      {profitRow && (
        <Modal
          title={t('recordProfit')}
          onClose={() => setProfitRow(null)}
          size="sm"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setProfitRow(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveProfit}>{t('save')}</button>
            </>
          )}
        >
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>{t('profitAmount')}</label>
              <input type="number" min="0" value={profitForm.amount} onChange={event => setProfitForm({ ...profitForm, amount: event.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label>{t('profitCurrency')}</label>
              <select value={profitForm.currency} onChange={event => setProfitForm({ ...profitForm, currency: event.target.value })}>
                <option value="USD">dolar</option>
                <option value="IQD">dinar iraqi</option>
              </select>
            </div>
            <div className="form-group span-2">
              <label>{t('notes')}</label>
              <textarea rows={3} value={profitForm.notes} onChange={event => setProfitForm({ ...profitForm, notes: event.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
