import { useState, useEffect } from 'react';
import { AlertTriangle, Folder, Loader2, Package, WalletMinimal } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const CATS  = ['maintenance','utilities','repairs','cleaning','management','other'];
const EMPTY = { date:new Date().toISOString().slice(0,10), description:'', category:'maintenance', property:'', amount:'' };

export default function Expenses() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const toast = useToast();

  const load = () => { api.getExpenses().then(setExpenses).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);

  function openAdd()   { setForm(EMPTY); setEditing(null); setModal('form'); }
  function openEdit(e) { setForm({date:e.date,description:e.description,category:e.category,property:e.property||'',amount:e.amount}); setEditing(e); setModal('form'); }
  function openDel(e)  { setEditing(e); setModal('delete'); }
  function close()     { setModal(null); setEditing(null); }
  function set(k,v)    { setForm(f=>({...f,[k]:v})); }

  async function save() {
    if (!form.date||!form.description||!form.amount) { toast(t('date')+', '+t('description')+', '+t('amount')+' required','error'); return; }
    setSaving(true);
    try {
      if (editing) { await api.updateExpense(editing.id,form); toast(t('saveChanges')+' ','success'); }
      else         { await api.addExpense(form);               toast(t('addExpense')+' ','success'); }
      close(); load();
    } catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  }

  async function del() {
    setSaving(true);
    try { await api.deleteExpense(editing.id); toast(t('delete')+' ','success'); close(); load(); }
    catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  }

  const total  = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const byCat  = CATS.map(c=>({ cat:c, label:t(c), total:expenses.filter(e=>e.category===c).reduce((s,e)=>s+Number(e.amount||0),0) })).filter(c=>c.total>0);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1>{t('expensesTitle')}</h1><p>{t('expensesSub')}</p></div>
        <button className="btn btn-primary" onClick={openAdd}>{t('addExpense')}</button>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',marginBottom:24}}>
        <div className="stat-card" style={{'--stat-accent':'#dc2626','--stat-dim':'var(--danger-dim)'}}>
          <div className="stat-icon"><WalletMinimal size={22} strokeWidth={2.25} /></div>
          <div className="stat-label">{t('totalExpenses')}</div>
          <div className="stat-value" style={{fontSize:'var(--text-2xl)'}}>${total.toLocaleString()}</div>
          <div className="stat-sub">{expenses.length} {t('expenseRecords')}</div>
        </div>
        {byCat.slice(0,3).map(c=>(
          <div key={c.cat} className="stat-card" style={{'--stat-accent':'#7c3aed','--stat-dim':'var(--purple-dim)'}}>
            <div className="stat-icon"><Folder size={22} strokeWidth={2.25} /></div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{fontSize:'var(--text-2xl)'}}>${c.total.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('expensesTitle')}</h3>
          <span className="badge badge-red badge-lg">${total.toLocaleString()} {t('total')}</span>
        </div>
        <div className="table-wrap">
          {loading
            ? <div className="empty-state"><Loader2 className="animate-spin" size={24} /></div>
            : expenses.length===0
              ? <div className="empty-state"><div className="empty-icon"><Package size={32} /></div><h3>{t('noExpenses')}</h3></div>
              : <table>
                  <thead><tr><th>{t('date')}</th><th>{t('description')}</th><th>{t('category')}</th><th>{t('property')}</th><th>{t('amount')}</th><th>{t('actions')}</th></tr></thead>
                  <tbody>
                    {expenses.map(e=>(
                      <tr key={e.id}>
                        <td style={{whiteSpace:'nowrap'}}>{e.date}</td>
                        <td style={{fontWeight:500}}>{e.description}</td>
                        <td><span className="badge badge-purple">{t(e.category)}</span></td>
                        <td style={{color:'var(--text-muted)'}}>{e.property||'—'}</td>
                        <td style={{fontWeight:700,color:'var(--danger)',fontSize:'var(--text-md)'}}>-${Number(e.amount).toLocaleString()}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(e)}>{t('edit')}</button>
                            <button className="btn btn-ghost btn-sm" onClick={()=>openDel(e)} style={{color:'var(--danger)'}}>{t('delete')}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          }
        </div>
      </div>

      {modal==='form' && (
        <Modal title={editing?t('editExpense'):t('addExpense')} onClose={close} size="sm"
          footer={<><button className="btn btn-secondary" onClick={close}>{t('cancel')}</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'...':(editing?t('save'):t('add'))}</button></>}>
          <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div className="form-group"><label>{t('date')}</label><input type="date" value={form.date} onChange={e=>set('date',e.target.value)} /></div>
            <div className="form-group"><label>{t('amount')}</label><input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} min="0" /></div>
            <div className="form-group span-2"><label>{t('description')}</label><input value={form.description} onChange={e=>set('description',e.target.value)} /></div>
            <div className="form-group"><label>{t('category')}</label><select value={form.category} onChange={e=>set('category',e.target.value)}>{CATS.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></div>
            <div className="form-group"><label>{t('property')}</label><input value={form.property} onChange={e=>set('property',e.target.value)} /></div>
          </div>
        </Modal>
      )}

      {modal==='delete' && (
        <Modal title={t('delete')+'?'} onClose={close} size="sm"
          footer={<><button className="btn btn-secondary" onClick={close}>{t('cancel')}</button><button className="btn btn-danger" onClick={del} disabled={saving}>{saving?'...':t('delete')}</button></>}>
          <div className="alert alert-red"><AlertTriangle size={16} /><span>{t('confirmDelete')} — <strong>{editing?.description}</strong></span></div>
        </Modal>
      )}
    </div>
  );
}
