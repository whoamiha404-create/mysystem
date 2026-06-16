import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Edit3, Loader2, Trash2, TrendingDown, TrendingUp, WalletMinimal } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import './Profit.css';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function money(value, currency = 'USD') {
  return `${Number(value || 0).toLocaleString()} ${currency}`;
}

export default function Profit() {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: firstOfMonth(), to: today() });
  const [data, setData] = useState({ profits: [], expenses: [] });
  const [pendingContracts, setPendingContracts] = useState([]);
  const [profitTarget, setProfitTarget] = useState(null);
  const [profitForm, setProfitForm] = useState({ amount: '', currency: 'USD', notes: '' });
  const [editingProfit, setEditingProfit] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', currency: 'USD', notes: '' });
  const isRtl = lang === 'ar' || lang === 'ku';

  async function load(nextFilters = filters) {
    setLoading(true);
    try {
      const [profitRows, pendingRows] = await Promise.all([
        api.getProfits(nextFilters),
        api.getPendingProfitContracts(),
      ]);
      setData(profitRows);
      setPendingContracts(pendingRows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (loading || profitTarget) return;
    const raw = localStorage.getItem('rentpro-profit-contract');
    if (!raw) return;
    let target = null;
    try {
      target = JSON.parse(raw);
    } catch {
      localStorage.removeItem('rentpro-profit-contract');
      return;
    }
    const match = pendingContracts.find(contract =>
      String(contract.id) === String(target.id) && (!target.kind || contract.kind === target.kind)
    );
    if (match) {
      setProfitTarget(match);
      setProfitForm({ amount: '', currency: 'USD', notes: '' });
      localStorage.removeItem('rentpro-profit-contract');
    } else if (pendingContracts.length || !loading) {
      localStorage.removeItem('rentpro-profit-contract');
    }
  }, [loading, pendingContracts, profitTarget]);

  const summary = useMemo(() => {
    const byCurrency = {};
    for (const row of data.profits || []) {
      const cur = row.currency || 'USD';
      byCurrency[cur] = byCurrency[cur] || { profit: 0, expense: 0 };
      byCurrency[cur].profit += Number(row.amount || 0);
    }
    for (const row of data.expenses || []) {
      const cur = 'USD';
      byCurrency[cur] = byCurrency[cur] || { profit: 0, expense: 0 };
      byCurrency[cur].expense += Number(row.amount || 0);
    }
    return byCurrency;
  }, [data]);

  const primaryCurrency = Object.keys(summary)[0] || 'USD';
  const gross = summary[primaryCurrency]?.profit || 0;
  const expense = summary[primaryCurrency]?.expense || 0;
  const net = gross - expense;

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
  }

  async function saveContractProfit() {
    if (!profitTarget) return;
    try {
      await api.createProfit({
        contractId: profitTarget.id,
        contractKind: profitTarget.kind,
        contractTitle: profitTarget.title || profitTarget.values?.firstParty || profitTarget.values?.ownerParty || '',
        contractNo: profitTarget.contractNo || profitTarget.values?.contractNo || '',
        contractDate: profitTarget.contractDate || profitTarget.values?.contractDate || '',
        amount: profitForm.amount,
        currency: profitForm.currency,
        notes: profitForm.notes,
        source: 'contract',
      });
      toast(t('recordProfit'), 'success');
      setProfitTarget(null);
      setProfitForm({ amount: '', currency: 'USD', notes: '' });
      await load();
      window.dispatchEvent(new Event('rentpro-profit-updated'));
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function openEditProfit(row) {
    setEditingProfit(row);
    setEditForm({
      amount: row.amount || '',
      currency: row.currency || 'USD',
      notes: row.notes || '',
    });
  }

  async function saveEditProfit() {
    if (!editingProfit) return;
    try {
      const result = await api.updateProfit(editingProfit.id, editForm);
      toast(result?.requiresApproval ? 'Edit sent to admin approval' : t('save'), 'success');
      setEditingProfit(null);
      await load();
      window.dispatchEvent(new Event('rentpro-profit-updated'));
      window.dispatchEvent(new Event('rentpro-change-requests-updated'));
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function deleteProfit(row) {
    if (!window.confirm(`${t('delete')}?`)) return;
    try {
      const result = await api.deleteProfit(row.id);
      toast(result?.requiresApproval ? 'Delete sent to admin approval' : t('delete'), 'success');
      await load();
      window.dispatchEvent(new Event('rentpro-profit-updated'));
      window.dispatchEvent(new Event('rentpro-change-requests-updated'));
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="profit-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>{t('profitTitle')}</h1>
          <p>{t('profitSub')}</p>
        </div>
      </div>

      <div className="profit-filters card">
        <div className="form-grid">
          <div className="form-group">
            <label>{t('fromDate')}</label>
            <input type="date" value={filters.from} onChange={event => updateFilter('from', event.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('toDate')}</label>
            <input type="date" value={filters.to} onChange={event => updateFilter('to', event.target.value)} />
          </div>
          <div className="form-group profit-filter-button">
            <button className="btn btn-secondary" onClick={() => load()}>{t('refresh')}</button>
          </div>
        </div>
      </div>

      <div className="stat-grid profit-stats">
        <div className="stat-card" style={{'--stat-accent':'var(--success)','--stat-dim':'var(--success-light)'}}>
          <div className="stat-icon"><TrendingUp size={22} /></div>
          <div className="stat-label">{t('grossProfit')}</div>
          <div className="stat-value">{money(gross, primaryCurrency)}</div>
          <div className="stat-sub">{data.profits.length} {t('savedRecords')}</div>
        </div>
        <div className="stat-card" style={{'--stat-accent':'var(--danger)','--stat-dim':'var(--danger-light)'}}>
          <div className="stat-icon"><TrendingDown size={22} /></div>
          <div className="stat-label">{t('totalExpenses')}</div>
          <div className="stat-value">{money(expense, primaryCurrency)}</div>
          <div className="stat-sub">{data.expenses.length} {t('expenseRecords')}</div>
        </div>
        <div className="stat-card" style={{'--stat-accent':'var(--primary)','--stat-dim':'var(--primary-light)'}}>
          <div className="stat-icon"><WalletMinimal size={22} /></div>
          <div className="stat-label">{t('netProfit')}</div>
          <div className="stat-value">{money(net, primaryCurrency)}</div>
          <div className="stat-sub">{filters.from} - {filters.to}</div>
        </div>
      </div>

      <section className="card profit-pending-card">
        <div className="card-header">
          <h3><AlertCircle size={18} /> {t('recordProfit')}</h3>
          <span className="badge badge-amber badge-lg">{pendingContracts.length}</span>
        </div>
        {pendingContracts.length === 0 ? (
          <div className="empty-state profit-empty">{t('noProfits')}</div>
        ) : (
          <div className="profit-contract-list">
            {pendingContracts.map(contract => (
              <button
                type="button"
                key={contract.id}
                className="profit-contract-card"
                onClick={() => {
                  setProfitTarget(contract);
                  setProfitForm({ amount: '', currency: 'USD', notes: '' });
                }}
              >
                <span>
                  <strong>{contract.title || contract.values?.firstParty || contract.values?.ownerParty || t('contract')}</strong>
                  <small>{contract.kind} - #{contract.contractNo || contract.values?.contractNo || contract.id}</small>
                </span>
                <span>
                  <b>{contract.price || contract.values?.price || contract.values?.amount || '-'}</b>
                  <small>{contract.userName || ''}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h3>{t('profit')}</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('date')}</th><th>{t('agent')}</th><th>{t('contract')}</th><th>{t('type')}</th><th>{t('amount')}</th><th>{t('notes')}</th><th>{t('actions') || 'Actions'}</th></tr></thead>
            <tbody>
              {data.profits.length === 0 ? (
                <tr><td colSpan="7" className="td-sub">{t('noProfits')}</td></tr>
              ) : data.profits.map(row => (
                <tr key={row.id}>
                  <td>{String(row.created_at || '').slice(0, 16)}</td>
                  <td>{row.user_name || row.username || '-'}</td>
                  <td><strong>{row.contract_title || row.contract_no || '-'}</strong><div className="td-sub">{row.contract_no || ''}</div></td>
                  <td>{row.contract_kind || row.source || '-'}</td>
                  <td className="profit-money">{money(row.amount, row.currency)}</td>
                  <td>{row.notes || '-'}</td>
                  <td>
                    <div className="profit-actions">
                      <button type="button" className="icon-btn" onClick={() => openEditProfit(row)} title={t('edit')}>
                        <Edit3 size={15} />
                      </button>
                      <button type="button" className="icon-btn danger" onClick={() => deleteProfit(row)} title={t('delete')}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {profitTarget && (
        <Modal
          title={t('profitPromptTitle')}
          onClose={() => setProfitTarget(null)}
          size="sm"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setProfitTarget(null)}>{t('later') || 'Later'}</button>
              <button className="btn btn-primary" onClick={saveContractProfit}>{t('save')}</button>
            </>
          )}
        >
          <p className="td-sub" style={{ marginTop: 0 }}>{t('profitPromptSub')}</p>
          <div className="profit-target-summary">
            <strong>{profitTarget.title || profitTarget.values?.firstParty || profitTarget.values?.ownerParty || t('contract')}</strong>
            <span>{profitTarget.kind} - {profitTarget.price || profitTarget.values?.price || profitTarget.values?.amount || '-'}</span>
          </div>
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

      {editingProfit && (
        <Modal
          title="Edit Profit"
          onClose={() => setEditingProfit(null)}
          size="sm"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setEditingProfit(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveEditProfit}>{t('save')}</button>
            </>
          )}
        >
          <div className="profit-target-summary">
            <strong>{editingProfit.contract_title || editingProfit.contract_no || t('profit')}</strong>
            <span>{editingProfit.contract_kind || editingProfit.source || '-'}</span>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>{t('profitAmount')}</label>
              <input type="number" min="0" value={editForm.amount} onChange={event => setEditForm({ ...editForm, amount: event.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label>{t('profitCurrency')}</label>
              <select value={editForm.currency} onChange={event => setEditForm({ ...editForm, currency: event.target.value })}>
                <option value="USD">dolar</option>
                <option value="IQD">dinar iraqi</option>
              </select>
            </div>
            <div className="form-group span-2">
              <label>{t('notes')}</label>
              <textarea rows={3} value={editForm.notes} onChange={event => setEditForm({ ...editForm, notes: event.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
