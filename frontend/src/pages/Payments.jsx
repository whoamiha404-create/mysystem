import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CreditCard, Loader2, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function printReceipt(tenant, payment, settings) {
  const rno = String(tenant.id).padStart(4,'0') + '-' + String(payment.id).padStart(3,'0');
  const sym = { USD:'$', EUR:'EUR ', GBP:'GBP ', IQD:'IQD ', AED:'AED ', SAR:'SAR ' }[settings.currency] || '$';
  const date = payment.paid_date || new Date().toISOString().slice(0,10);
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt</title><style>body{font-family:Arial;padding:20mm;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:10mm}td{padding:10px 14px}tr:nth-child(even){background:#f8f8f8}.box{background:#eff6ff;border:2px solid #1d4ed8;border-radius:10px;padding:24px;text-align:center}.big{font-size:44px;font-weight:900;color:#1d4ed8}.badge{background:#059669;color:#fff;padding:5px 18px;border-radius:20px;font-size:13px;font-weight:700;display:inline-block;margin-top:10px}.hdr{display:flex;justify-content:space-between;margin-bottom:10mm;padding-bottom:6mm;border-bottom:3px solid #1d4ed8}.foot{font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:6mm;text-align:center;margin-top:6mm}</style></head><body><div class="hdr"><div><div style="font-size:26px;font-weight:900;color:#1d4ed8"> '+(settings.appName||'RentPro')+'</div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">'+(settings.companyName||'')+'</div></div><div style="text-align:right"><div style="font-size:11px;color:#888">PAYMENT RECEIPT</div><div style="font-size:22px;font-weight:800">#'+rno+'</div><div style="font-size:12px;color:#555">'+date+'</div></div></div><table><tr><td style="color:#777;font-size:11px;text-transform:uppercase;width:35%">Tenant</td><td><strong>'+tenant.name+'</strong></td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Phone</td><td>'+tenant.phone+'</td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Property</td><td>'+tenant.apt+(tenant.location?' - '+tenant.location:'')+'</td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Period</td><td>'+payment.month+'</td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Date Paid</td><td>'+date+'</td></tr></table><div class="box"><div style="font-size:11px;text-transform:uppercase;color:#555;margin-bottom:8px">Amount Paid</div><div class="big">'+sym+parseFloat(payment.amount).toLocaleString()+'</div><span class="badge">PAID</span></div><div class="foot">Receipt #'+rno+' - '+new Date().toLocaleString()+'</div><script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);}<\/script></body></html>';
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(html);
  win.document.close();
}

function sortPayments(payments) {
  return [...(payments || [])].sort((a,b) => {
    const [am, ay] = String(a.month || '').split(' ');
    const [bm, by] = String(b.month || '').split(' ');
    if (ay !== by) return Number(ay || 0) - Number(by || 0);
    return MONTHS.indexOf(am) - MONTHS.indexOf(bm);
  });
}

function nextMonthFor(tenant) {
  const payments = tenant.payments || [];
  if (payments.length === 0) {
    if (tenant.contract_start) {
      const d = new Date(tenant.contract_start);
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }

  const sorted = sortPayments(payments);
  const [mon, yr] = String(sorted[sorted.length - 1].month || '').split(' ');
  const idx = MONTHS.indexOf(mon);
  return idx === 11 ? `Jan ${Number(yr) + 1}` : `${MONTHS[idx + 1]} ${yr}`;
}

function statusBadge(status, t) {
  if (status === 'paid') return <span className="badge badge-green"><Check size={12} /> {t('paidStatus')}</span>;
  if (status === 'late') return <span className="badge badge-red"><X size={12} /> {t('lateStatus')}</span>;
  return <span className="badge badge-amber">{t('pendingStatus')}</span>;
}

export default function Payments() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState([]);
  const [settings, setSettings] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.getTenants(), api.getSettings()])
      .then(([ts, s]) => {
        setTenants(ts);
        setSettings(s);
        setSelectedId(ts[0]?.id || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const sym = { USD:'$', EUR:'EUR ', GBP:'GBP ', IQD:'IQD ', AED:'AED ', SAR:'SAR ' }[settings.currency] || '$';
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(tenant => [tenant.name, tenant.phone, tenant.apt, tenant.location || '', tenant.owner || ''].join(' ').toLowerCase().includes(q));
  }, [search, tenants]);

  const selectedTenant = tenants.find(tenant => Number(tenant.id) === Number(selectedId)) || filtered[0] || tenants[0];
  const selectedPayments = sortPayments(selectedTenant?.payments || []);
  const allPayments = tenants.flatMap(tenant => tenant.payments || []);
  const totals = {
    paid: allPayments.filter(payment => payment.status === 'paid').length,
    pending: allPayments.filter(payment => payment.status === 'pending').length,
    late: allPayments.filter(payment => payment.status === 'late').length,
  };

  async function refreshTenantList(nextTenants) {
    setTenants(nextTenants);
    if (!nextTenants.some(tenant => Number(tenant.id) === Number(selectedId))) {
      setSelectedId(nextTenants[0]?.id || null);
    }
  }

  async function markStatus(payment, status) {
    try {
      await api.updatePayment(payment.id, { status });
      const paidDate = status === 'paid' ? new Date().toISOString().slice(0,10) : null;
      refreshTenantList(tenants.map(tenant => ({
        ...tenant,
        payments: (tenant.payments || []).map(item => item.id === payment.id ? { ...item, status, paid_date: paidDate } : item),
      })));
      toast(status === 'paid' ? t('paidStatus') : t('pendingStatus'), status === 'paid' ? 'success' : 'info');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function addMonth(tenant) {
    const month = nextMonthFor(tenant);
    try {
      const payment = await api.addPayment({ tenant_id: tenant.id, month, status: 'pending', amount: tenant.rent });
      refreshTenantList(tenants.map(item => item.id === tenant.id ? { ...item, payments: [...(item.payments || []), payment] } : item));
      setSelectedId(tenant.id);
      toast(`${t('addMonth')}: ${month}`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteMonth(payment, tenantId) {
    if (!window.confirm('Delete this month?')) return;
    try {
      await api.deletePayment(payment.id);
      refreshTenantList(tenants.map(tenant => tenant.id === tenantId ? { ...tenant, payments: (tenant.payments || []).filter(item => item.id !== payment.id) } : tenant));
      toast('Month deleted', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>{t('paymentsTitle')}</h1>
          <p>{t('paymentsSub')}</p>
        </div>
      </div>

      <div className="payment-summary-row">
        <div className="payment-search">
          <Search size={17} />
          <input placeholder={t('searchTenants')} value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <span className="badge badge-green badge-lg"><Check size={13} /> {totals.paid} {t('paidStatus')}</span>
        <span className="badge badge-amber badge-lg">{totals.pending} {t('pendingStatus')}</span>
        {totals.late > 0 && <span className="badge badge-red badge-lg"><X size={13} /> {totals.late} {t('lateStatus')}</span>}
      </div>

      <div className="payment-layout">
        <section className="card payment-tenant-panel">
          <div className="card-header">
            <h3>{t('tenants')}</h3>
          </div>
          <div className="table-wrap">
            {filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><CreditCard size={32} /></div><h3>{t('noResults')}</h3></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t('tenant')}</th>
                    <th>{t('apartment')}</th>
                    <th>{t('rent')}</th>
                    <th>{t('payDay')}</th>
                    <th>{t('progress')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tenant => {
                    const payments = tenant.payments || [];
                    const paid = payments.filter(payment => payment.status === 'paid').length;
                    const pending = payments.filter(payment => payment.status === 'pending').length;
                    const late = payments.filter(payment => payment.status === 'late').length;
                    const isSelected = Number(selectedTenant?.id) === Number(tenant.id);
                    return (
                      <tr key={tenant.id} className={isSelected ? 'payment-row-selected' : ''} onClick={() => setSelectedId(tenant.id)}>
                        <td><div className="td-name">{tenant.name}</div><div className="td-sub">{tenant.phone}</div></td>
                        <td><div>{tenant.apt}</div><div className="td-sub">{tenant.location}</div></td>
                        <td style={{ fontWeight: 800, color: 'var(--warning)' }}>{sym}{Number(tenant.rent || 0).toLocaleString()}</td>
                        <td>{tenant.pay_day}</td>
                        <td>
                          <div className="payment-mini-status">
                            <span className="badge badge-green">{paid}</span>
                            <span className="badge badge-amber">{pending}</span>
                            {late > 0 && <span className="badge badge-red">{late}</span>}
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={event => { event.stopPropagation(); addMonth(tenant); }}>
                            <Plus size={14} /> {t('month')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="card payment-detail-panel">
          <div className="card-header">
            <h3>{selectedTenant ? selectedTenant.name : t('payments')}</h3>
            {selectedTenant && (
              <button className="btn btn-primary btn-sm" onClick={() => addMonth(selectedTenant)}>
                <Plus size={14} /> {t('addMonth')}
              </button>
            )}
          </div>

          {!selectedTenant ? (
            <div className="empty-state"><CalendarDays size={32} /><p>{t('noTenants')}</p></div>
          ) : selectedPayments.length === 0 ? (
            <div className="empty-state" style={{ padding: 36 }}>
              <div className="empty-icon"><CalendarDays size={32} /></div>
              <h3>{t('noPaymentRecords')}</h3>
              <button className="btn btn-primary" onClick={() => addMonth(selectedTenant)}><Plus size={16} /> {t('addMonth')}</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('month')}</th>
                    <th>{t('paidStatus')}</th>
                    <th>{t('amount')}</th>
                    <th>{t('paidDate')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPayments.map((payment, index) => {
                    const isPaid = payment.status === 'paid';
                    return (
                      <tr key={payment.id}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{index + 1}</td>
                        <td style={{ fontWeight: 800 }}>{payment.month}</td>
                        <td>{statusBadge(payment.status, t)}</td>
                        <td style={{ fontWeight: 800, color: 'var(--warning)' }}>{sym}{Number(payment.amount || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{payment.paid_date || '-'}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className={`btn btn-sm ${isPaid ? 'btn-secondary' : 'btn-success'}`} onClick={() => markStatus(payment, isPaid ? 'pending' : 'paid')}>
                              {isPaid ? t('markPending') : t('markPaid')}
                            </button>
                            {isPaid && (
                              <button className="btn btn-secondary btn-sm" onClick={() => printReceipt(selectedTenant, payment, settings)} title={t('printReceipt')}>
                                <Printer size={14} />
                              </button>
                            )}
                            {!isPaid && (
                              <button className="btn btn-ghost btn-sm" onClick={() => deleteMonth(payment, selectedTenant.id)} title="Delete this month" style={{ color:'var(--danger)' }}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
