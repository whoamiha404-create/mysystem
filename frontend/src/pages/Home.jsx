import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, PartyPopper, TrendingUp, UserRound, WalletCards, Loader2, XCircle } from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

function symFor(cur) {
  return { USD:'$',EUR:'€',GBP:'£',IQD:'IQD ',AED:'AED ',SAR:'SAR ' }[cur] || (cur+' ');
}
function typeColor(type) {
  return { residential:'badge-blue',villa:'badge-purple',commercial:'badge-amber',office:'badge-gray' }[type]||'badge-gray';
}

export default function Home() {
  const { t } = useLanguage();
  const [tenants,  setTenants]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getTenants(), api.getExpenses(), api.getSettings()])
      .then(([tn,ex,st]) => { setTenants(tn); setExpenses(ex); setSettings(st); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  const allPay    = tenants.flatMap(tn => (tn.payments||[]).map(p=>({...p,tenant:tn})));
  const sym       = symFor(settings.currency);
  const totalRent = tenants.reduce((s,tn)=>s+Number(tn.rent||0),0);
  const collected = allPay.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount||0),0);
  const outstanding=allPay.filter(p=>p.status!=='paid').reduce((s,p)=>s+Number(p.amount||0),0);
  const totalExp  = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const netIncome = collected - totalExp;
  const paidCount = allPay.filter(p=>p.status==='paid').length;
  const pendCount = allPay.filter(p=>p.status==='pending').length;
  const lateCount = allPay.filter(p=>p.status==='late').length;

  const today   = new Date();
  const dueSoon = tenants.filter(tn => {
    const due  = new Date(today.getFullYear(), today.getMonth(), tn.pay_day||1);
    const diff = Math.round((due-today)/86400000);
    return diff>=0 && diff<=5;
  });

  const stats = [
    { icon:WalletCards, label:t('monthlyIncome'), value:sym+totalRent.toLocaleString(),   sub:tenants.length+' '+t('activeTenants'),      accent:'#1d4ed8', dim:'var(--primary-dim)'  },
    { icon:CheckCircle2, label:t('collected'),     value:sym+collected.toLocaleString(),    sub:paidCount+' '+t('paidPayments'),            accent:'#059669', dim:'var(--success-dim)'  },
    { icon:Clock3, label:t('outstanding'),   value:sym+outstanding.toLocaleString(),  sub:pendCount+' '+t('pendingLabel')+' + '+lateCount+' '+t('lateLabel'), accent:'#d97706', dim:'var(--warning-dim)' },
    { icon:TrendingUp, label:t('netIncome'),     value:sym+netIncome.toLocaleString(),    sub:t('afterExpenses')+': '+sym+totalExp.toLocaleString(), accent:netIncome>=0?'#059669':'#dc2626', dim:netIncome>=0?'var(--success-dim)':'var(--danger-dim)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>{t('home')}</h1>
        <p>{t('dashSub')}</p>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{'--stat-accent':s.accent,'--stat-dim':s.dim}}>
            <div className="stat-icon"><s.icon size={22} strokeWidth={2.25} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* Due soon */}
        <div className="card">
          <div className="card-header">
            <h3><Clock3 size={18} /> {t('dueSoon')}</h3>
            <button className="btn btn-secondary btn-sm" onClick={()=>navigate('/payments')}>{t('manage')}</button>
          </div>
          {dueSoon.length===0
            ? <div className="empty-state" style={{padding:32}}><div className="empty-icon"><PartyPopper size={32} /></div><p>{t('noDueSoon')}</p></div>
            : <div className="table-wrap"><table>
                <thead><tr><th>{t('tenant')}</th><th>{t('apartment')}</th><th>{t('payDay')}</th><th>{t('rent')}</th></tr></thead>
                <tbody>{dueSoon.map(tn=>(
                  <tr key={tn.id} style={{cursor:'pointer'}} onClick={()=>navigate('/payments')}>
                    <td><div className="td-name">{tn.name}</div></td>
                    <td>{tn.apt}</td>
                    <td><span className="badge badge-amber">{tn.pay_day}</span></td>
                    <td style={{fontWeight:700,color:'var(--warning)'}}>{sym}{Number(tn.rent).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table></div>
          }
        </div>

        {/* Late */}
        <div className="card">
          <div className="card-header">
            <h3><XCircle size={18} /> {t('latePayments')}</h3>
            <span className="badge badge-red badge-lg">{lateCount}</span>
          </div>
          {lateCount===0
            ? <div className="empty-state" style={{padding:32}}><div className="empty-icon"><CheckCircle2 size={32} /></div><p>{t('noLate')}</p></div>
            : <div className="table-wrap"><table>
                <thead><tr><th>{t('tenant')}</th><th>{t('month')}</th><th>{t('amount')}</th></tr></thead>
                <tbody>{allPay.filter(p=>p.status==='late').slice(0,8).map(p=>(
                  <tr key={p.id}>
                    <td><div className="td-name">{p.tenant.name}</div></td>
                    <td>{p.month}</td>
                    <td style={{fontWeight:700,color:'var(--danger)'}}>{sym}{Number(p.amount).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table></div>
          }
        </div>

        {/* All tenants */}
        <div className="card" style={{gridColumn:'1/-1'}}>
          <div className="card-header">
            <h3><UserRound size={18} /> {t('allTenants')}</h3>
            <button className="btn btn-secondary btn-sm" onClick={()=>navigate('/tenants')}>{t('manage')}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('tenant')}</th><th>{t('apartment')}</th><th>{t('type')}</th><th>{t('rent')}</th><th>{t('payDay')}</th><th>{t('progress')}</th></tr></thead>
              <tbody>
                {tenants.map(tn=>{
                  const paid  = (tn.payments||[]).filter(p=>p.status==='paid').length;
                  const total = (tn.payments||[]).length;
                  const pct   = total>0?Math.round(paid/total*100):0;
                  return (
                    <tr key={tn.id} style={{cursor:'pointer'}} onClick={()=>navigate('/tenants')}>
                      <td><div className="td-name">{tn.name}</div><div className="td-sub">{tn.phone}</div></td>
                      <td><div>{tn.apt}</div><div className="td-sub">{tn.location}</div></td>
                      <td><span className={`badge ${typeColor(tn.type)}`}>{t(tn.type)}</span></td>
                      <td style={{fontWeight:700,color:'var(--warning)'}}>{sym}{Number(tn.rent).toLocaleString()}</td>
                      <td>{tn.pay_day}</td>
                      <td style={{minWidth:120}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className="progress" style={{flex:1}}>
                            <div className="progress-fill" style={{width:pct+'%',background:pct===100?'var(--success)':'var(--primary)'}}></div>
                          </div>
                          <span className="td-sub">{paid}/{total}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
