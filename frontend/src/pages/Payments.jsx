import { useState, useEffect } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronUp, CreditCard, Loader2, Trash2, X } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function printReceipt(tenant, payment, settings) {
  const rno = String(tenant.id).padStart(4,'0') + '-' + String(payment.id).padStart(3,'0');
  const sym = { USD:'$', EUR:'€', GBP:'£', IQD:'IQD ', AED:'AED ', SAR:'SAR ' }[settings.currency] || '$';
  const date = payment.paid_date || new Date().toISOString().slice(0,10);
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt</title><style>body{font-family:Arial;padding:20mm;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:10mm}td{padding:10px 14px}tr:nth-child(even){background:#f8f8f8}.box{background:#eff6ff;border:2px solid #1d4ed8;border-radius:10px;padding:24px;text-align:center}.big{font-size:44px;font-weight:900;color:#1d4ed8}.badge{background:#059669;color:#fff;padding:5px 18px;border-radius:20px;font-size:13px;font-weight:700;display:inline-block;margin-top:10px}.hdr{display:flex;justify-content:space-between;margin-bottom:10mm;padding-bottom:6mm;border-bottom:3px solid #1d4ed8}.foot{font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:6mm;text-align:center;margin-top:6mm}</style></head><body><div class="hdr"><div><div style="font-size:26px;font-weight:900;color:#1d4ed8"> '+(settings.appName||'RentPro')+'</div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">'+(settings.companyName||'')+'</div></div><div style="text-align:right"><div style="font-size:11px;color:#888">PAYMENT RECEIPT</div><div style="font-size:22px;font-weight:800">#'+rno+'</div><div style="font-size:12px;color:#555">'+date+'</div></div></div><table><tr><td style="color:#777;font-size:11px;text-transform:uppercase;width:35%">Tenant</td><td><strong>'+tenant.name+'</strong></td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Phone</td><td>'+tenant.phone+'</td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Property</td><td>'+tenant.apt+(tenant.location?' — '+tenant.location:'')+'</td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Period</td><td>'+payment.month+'</td></tr><tr><td style="color:#777;font-size:11px;text-transform:uppercase">Date Paid</td><td>'+date+'</td></tr></table><div class="box"><div style="font-size:11px;text-transform:uppercase;color:#555;margin-bottom:8px">Amount Paid</div><div class="big">'+sym+parseFloat(payment.amount).toLocaleString()+'</div><span class="badge"> PAID</span></div><div class="foot">Receipt #'+rno+' — '+new Date().toLocaleString()+'</div><script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);}<\/script></body></html>';
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(html);
  win.document.close();
}

export default function Payments() {
  const { t } = useLanguage();
  const [tenants,  setTenants]  = useState([]);
  const [settings, setSettings] = useState({});
  const [open,     setOpen]     = useState({});
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const toast = useToast();

  const load = () => {
    Promise.all([api.getTenants(), api.getSettings()])
      .then(([ts, s]) => {
        setTenants(ts); setSettings(s);
        setOpen(o => {
          const merged = {};
          ts.forEach(ten => {
            const hasPending = (ten.payments||[]).some(p => p.status !== 'paid');
            merged[ten.id] = o[ten.id] !== undefined ? o[ten.id] : hasPending;
          });
          return merged;
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function toggle(id)    { setOpen(o => ({ ...o, [id]: !o[id] })); }
  function expandAll()   { const s = {}; tenants.forEach(t => s[t.id] = true);  setOpen(s); }
  function collapseAll() { const s = {}; tenants.forEach(t => s[t.id] = false); setOpen(s); }

  async function cycleStatus(payment) {
    const ns = payment.status === 'paid' ? 'pending' : 'paid';
    try {
      await api.updatePayment(payment.id, { status: ns });
      setTenants(ts => ts.map(ten => ({
        ...ten,
        payments: (ten.payments||[]).map(p =>
          p.id === payment.id
            ? { ...p, status: ns, paid_date: ns === 'paid' ? new Date().toISOString().slice(0,10) : null }
            : p
        )
      })));
      toast(ns === 'paid' ? ' ' + t('paidStatus') : t('pendingStatus'), ns === 'paid' ? 'success' : 'info');
    } catch(e) { toast(e.message, 'error'); }
  }

  async function deleteMonth(payment, tenantId) {
    if (!window.confirm('Delete this month?')) return;
    try {
      await api.deletePayment(payment.id);
      setTenants(ts => ts.map(ten =>
        ten.id === tenantId
          ? { ...ten, payments: (ten.payments||[]).filter(p => p.id !== payment.id) }
          : ten
      ));
      toast('Month deleted', 'success');
    } catch(e) { toast(e.message, 'error'); }
  }

  async function addMonth(tenant) {
    // Add next month after last existing month
    const payments = tenant.payments || [];
    let nextMonth;
    if (payments.length === 0) {
      // Start from contract start or current month
      if (tenant.contract_start) {
        const d = new Date(tenant.contract_start);
        nextMonth = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      } else {
        const n = new Date();
        nextMonth = MONTHS[n.getMonth()] + ' ' + n.getFullYear();
      }
    } else {
      const sorted = [...payments].sort((a,b) => {
        const [am,ay] = a.month.split(' ');
        const [bm,by] = b.month.split(' ');
        if (ay !== by) return parseInt(ay) - parseInt(by);
        return MONTHS.indexOf(am) - MONTHS.indexOf(bm);
      });
      const last = sorted[sorted.length - 1].month;
      const [mon, yr] = last.split(' ');
      const idx = MONTHS.indexOf(mon);
      nextMonth = idx === 11 ? 'Jan ' + (parseInt(yr)+1) : MONTHS[idx+1] + ' ' + yr;
    }
    try {
      const p = await api.addPayment({ tenant_id: tenant.id, month: nextMonth, status: 'pending', amount: tenant.rent });
      setTenants(ts => ts.map(t => t.id === tenant.id ? { ...t, payments: [...(t.payments||[]), p] } : t));
      toast(t('addMonth') + ': ' + nextMonth, 'success');
    } catch(e) { toast(e.message, 'error'); }
  }

  const sym = { USD:'$', EUR:'€', GBP:'£', IQD:'IQD ', AED:'AED ', SAR:'SAR ' }[settings.currency] || '$';
  const filtered = search
    ? tenants.filter(ten => [ten.name, ten.phone, ten.apt, ten.location||''].join(' ').toLowerCase().includes(search.toLowerCase()))
    : tenants;

  const totalPaid = filtered.reduce((s,t) => s + (t.payments||[]).filter(p=>p.status==='paid').length, 0);
  const totalPend = filtered.reduce((s,t) => s + (t.payments||[]).filter(p=>p.status==='pending').length, 0);
  const totalLate = filtered.reduce((s,t) => s + (t.payments||[]).filter(p=>p.status==='late').length, 0);

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1>{t('paymentsTitle')}</h1><p>{t('paymentsSub')}</p></div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={expandAll}><ChevronDown size={14} /> {t('expandAll')}</button>
          <button className="btn btn-secondary btn-sm" onClick={collapseAll}><ChevronUp size={14} /> {t('collapseAll')}</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="search-input" style={{maxWidth:300}}>
          <input placeholder={t('searchTenants')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-green badge-lg"><Check size={13} /> {totalPaid} {t('paidStatus')}</span>
        <span className="badge badge-amber badge-lg">{totalPend} {t('pendingStatus')}</span>
        {totalLate > 0 && <span className="badge badge-red badge-lg"><X size={13} /> {totalLate} {t('lateStatus')}</span>}
      </div>

      {filtered.length === 0
        ? <div className="card"><div className="empty-state"><div className="empty-icon"><CreditCard size={32} /></div><h3>{search ? t('noResults') : t('noTenants')}</h3></div></div>
        : filtered.map(tenant => {
            const paid  = (tenant.payments||[]).filter(p => p.status==='paid').length;
            const pend  = (tenant.payments||[]).filter(p => p.status==='pending').length;
            const late  = (tenant.payments||[]).filter(p => p.status==='late').length;
            const total = (tenant.payments||[]).length;
            const hasPending = pend > 0 || late > 0;
            const allPaid    = total > 0 && paid === total;
            const isOpen     = open[tenant.id];

            return (
              <div key={tenant.id} className={`pay-accordion ${hasPending?'border-amber':allPaid?'border-green':''}`}>
                <div className="pay-accordion-header" onClick={() => toggle(tenant.id)}>
                  <div className="pay-accordion-info">
                    <div className="pay-accordion-name">
                      {tenant.name}
                      <ChevronDown className="pay-chevron" size={16} style={{transform:isOpen?'rotate(180deg)':'none'}} />
                    </div>
                    <div className="pay-accordion-sub">
                      {tenant.apt} · {sym}{Number(tenant.rent).toLocaleString()}/mo · {t('payDay')}: {tenant.pay_day}
                      {tenant.contract_start && <span style={{marginLeft:8,color:'var(--text-muted)'}}>·  {tenant.contract_start}</span>}
                    </div>
                  </div>
                  <div className="pay-accordion-badges" onClick={e => e.stopPropagation()}>
                    <span className="badge badge-green"><Check size={12} /> {paid}</span>
                    <span className="badge badge-amber">{pend}</span>
                    {late > 0 && <span className="badge badge-red"><X size={12} /> {late}</span>}
                    <button className="btn btn-secondary btn-sm" onClick={() => addMonth(tenant)}>+ {t('month')}</button>
                  </div>
                </div>

                {isOpen && (
                  <div className="pay-accordion-body">
                    {!total
                      ? <div style={{padding:'32px',textAlign:'center',color:'var(--text-muted)'}}>
                          <CalendarDays size={32} style={{marginBottom:12}} />
                          <p style={{marginBottom:16}}>{t('noPaymentRecords')}</p>
                          <p style={{fontSize:'var(--text-sm)',color:'var(--text-muted)'}}>
                            {tenant.contract_start ? `Contract starts: ${tenant.contract_start} — months will auto-generate` : 'Set contract start date to auto-generate months'}
                          </p>
                        </div>
                      : <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>{t('month')}</th>
                                <th>{t('status')}</th>
                                <th>{t('amount')}</th>
                                <th>{t('paidDate')}</th>
                                <th>{t('actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...(tenant.payments||[])].sort((a,b) => {
                                const [am,ay] = a.month.split(' ');
                                const [bm,by] = b.month.split(' ');
                                if (ay !== by) return parseInt(ay) - parseInt(by);
                                return MONTHS.indexOf(am) - MONTHS.indexOf(bm);
                              }).map((p, idx) => {
                                const isPaid = p.status === 'paid';
                                const isLate = p.status === 'late';
                                return (
                                  <tr key={p.id}>
                                    <td style={{color:'var(--text-muted)',fontSize:'var(--text-xs)',fontWeight:700}}>{idx+1}</td>
                                    <td style={{fontWeight:600,fontSize:'var(--text-base)'}}>{p.month}</td>
                                    <td>
                                      <span className={`badge ${isPaid?'badge-green':isLate?'badge-red':'badge-amber'}`}>
                                        {isPaid ? t('paidStatus') : isLate ? t('lateStatus') : t('pendingStatus')}
                                      </span>
                                    </td>
                                    <td style={{fontWeight:700,color:'var(--warning)',fontSize:'var(--text-md)'}}>
                                      {sym}{Number(p.amount).toLocaleString()}
                                    </td>
                                    <td style={{color:'var(--text-muted)'}}>{p.paid_date || '—'}</td>
                                    <td>
                                      <div className="flex gap-2">
                                        <button
                                          className={`btn btn-sm ${isPaid||isLate ? 'btn-secondary' : 'btn-success'}`}
                                          onClick={() => cycleStatus(p)}>
                                          {isPaid||isLate ? t('markPending') : t('markPaid')}
                                        </button>
                                        {/* Delete month button */}
                                        {!isPaid && (
                                          <button className="btn btn-ghost btn-sm"
                                            onClick={() => deleteMonth(p, tenant.id)}
                                            title="Delete this month"
                                            style={{color:'var(--danger)'}}><Trash2 size={15} /></button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                    }
                  </div>
                )}
              </div>
            );
          })
      }
    </div>
  );
}
