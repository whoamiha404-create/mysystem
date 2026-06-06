import { useState, useEffect } from 'react';
import { CheckCircle2, Clock3, Loader2, TrendingUp, WalletMinimal } from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export default function Reports() {
  const { t } = useLanguage();
  const [tenants,  setTenants]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([api.getTenants(),api.getExpenses(),api.getSettings()])
      .then(([tn,ex,st])=>{setTenants(tn);setExpenses(ex);setSettings(st);})
      .finally(()=>setLoading(false));
  },[]);

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  const sym = { USD:'$',EUR:'€',GBP:'£',IQD:'IQD ',AED:'AED ',SAR:'SAR ' }[settings.currency]||'$';
  const allPay     = tenants.flatMap(tn=>(tn.payments||[]).map(p=>({...p,tenant:tn})));
  const collected  = allPay.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount||0),0);
  const outstanding= allPay.filter(p=>p.status!=='paid').reduce((s,p)=>s+Number(p.amount||0),0);
  const totalExp   = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const netIncome  = collected-totalExp;

  const byTenant = tenants.map(tn=>({
    name:tn.name, apt:tn.apt,
    paid:    (tn.payments||[]).filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount||0),0),
    pending: (tn.payments||[]).filter(p=>p.status!=='paid').length,
    total:   (tn.payments||[]).length,
  })).sort((a,b)=>b.paid-a.paid);

  const cats = [...new Set(expenses.map(e=>e.category))];
  const byCat = cats.map(c=>({ cat:c, total:expenses.filter(e=>e.category===c).reduce((s,e)=>s+Number(e.amount||0),0) }));

  function downloadCSV() {
    const rows=[[t('tenant'),t('apartment'),t('collected'),t('pendingLabel'),t('total')]];
    byTenant.forEach(tn=>rows.push([tn.name,tn.apt,sym+tn.paid,tn.pending,tn.total]));
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='rentpro-report.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1>{t('reportsTitle')}</h1><p>{t('reportsSub')}</p></div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={downloadCSV}>{t('downloadCSV')}</button>
          <button className="btn btn-secondary" onClick={()=>window.print()}>{t('print')}</button>
        </div>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[
          {icon:CheckCircle2,label:t('totalCollected'),value:sym+collected.toLocaleString(),  sub:allPay.filter(p=>p.status==='paid').length+' '+t('paidStatus'), accent:'#059669',dim:'var(--success-dim)'},
          {icon:Clock3,label:t('outstanding'),    value:sym+outstanding.toLocaleString(),sub:allPay.filter(p=>p.status!=='paid').length+' '+t('pendingStatus'),accent:'#d97706',dim:'var(--warning-dim)'},
          {icon:WalletMinimal,label:t('totalExp'),       value:sym+totalExp.toLocaleString(),   sub:expenses.length+' '+t('expenseRecords'), accent:'#dc2626',dim:'var(--danger-dim)'},
          {icon:TrendingUp,label:t('netIncome'),      value:sym+netIncome.toLocaleString(),  sub:t('afterExpenses'), accent:netIncome>=0?'#059669':'#dc2626',dim:netIncome>=0?'var(--success-dim)':'var(--danger-dim)'},
        ].map(s=>(
          <div key={s.label} className="stat-card" style={{'--stat-accent':s.accent,'--stat-dim':s.dim}}>
            <div className="stat-icon"><s.icon size={22} strokeWidth={2.25} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="card">
          <div className="card-header"><h3>{t('revenueByTenant')}</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('tenant')}</th><th>{t('collected')}</th><th>{t('progress')}</th></tr></thead>
              <tbody>
                {byTenant.map(tn=>(
                  <tr key={tn.name}>
                    <td><div style={{fontWeight:600}}>{tn.name}</div><div className="td-sub">{tn.apt}</div></td>
                    <td style={{fontWeight:700,color:'var(--success)',fontSize:'var(--text-md)'}}>{sym}{tn.paid.toLocaleString()}</td>
                    <td style={{minWidth:120}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="progress" style={{flex:1}}>
                          <div className="progress-fill" style={{width:tn.total>0?Math.round((tn.total-tn.pending)/tn.total*100)+'%':'0%',background:'var(--success)'}}></div>
                        </div>
                        <span className="td-sub">{tn.total-tn.pending}/{tn.total}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>{t('expByCategory')}</h3></div>
          <div className="table-wrap">
            {byCat.length===0
              ? <div className="empty-state" style={{padding:32}}><p>{t('noExpensesYet')}</p></div>
              : <table>
                  <thead><tr><th>{t('category')}</th><th>{t('amount')}</th><th>{t('progress')}</th></tr></thead>
                  <tbody>
                    {byCat.sort((a,b)=>b.total-a.total).map(c=>(
                      <tr key={c.cat}>
                        <td><span className="badge badge-purple">{t(c.cat)}</span></td>
                        <td style={{fontWeight:700,color:'var(--danger)'}}>{sym}{c.total.toLocaleString()}</td>
                        <td style={{minWidth:120}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div className="progress" style={{flex:1}}>
                              <div className="progress-fill" style={{width:totalExp>0?Math.round(c.total/totalExp*100)+'%':'0%',background:'var(--danger)'}}></div>
                            </div>
                            <span className="td-sub">{totalExp>0?Math.round(c.total/totalExp*100):0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
