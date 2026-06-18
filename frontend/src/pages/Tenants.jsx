import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Download, Home, Loader2, UserRound, Clock3, X, XCircle } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const PROPERTY_TYPES = [
  'شوقە',
  'خانوو',
  'باخ',
  'دوکان',
  'ڤێلا',
  'زەوی',
  'هەیکەل',
  'بەنزینخان',
  'کارگە',
  'هۆڵی لەشجوانی',
  'شوشتنگەی ئۆتۆمبێل',
  'کۆگا',
  'چێشتخانە',
  'ئۆفیس',
  'باڵەخانە',
  'ئارایشتگا',
  'کۆمەلگەی نیشتەجێبوون',
  'زەوەی کشتوکاڵی تاپۆ',
  'زەوی کشتوکاڵی بێ تاپۆ',
  'زەوی کشتوکاڵی حکومەت',
  'زەوی استسمار',
  'زەوی مساتحە',
  'قوتابخانە',
  'بالەخانە استسمار',
  'بالەخانەی مساتحە',
];

const EMPTY = { name:'', phone:'964', apt:'', location:'', owner:'', owner_phone:'', rent:'', pay_day:'1', type:PROPERTY_TYPES[0], contract_start:'', contract_end:'', notes:'' };
const TYPE_COLORS = { residential:'badge-blue', villa:'badge-purple', commercial:'badge-amber', office:'badge-gray' };

export default function Tenants() {
  const { t } = useLanguage();
  const [tenants,   setTenants]   = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editModal, setEditModal] = useState(null); // tenant being edited
  const [delModal,  setDelModal]  = useState(null); // tenant to delete
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const toast = useToast();

  const load = () => { setLoading(true); api.getTenants().then(setTenants).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = search
    ? tenants.filter(t => [t.name, t.phone, t.apt, t.location||'', t.owner||''].join(' ').toLowerCase().includes(search.toLowerCase()))
    : tenants;

  function openEdit(tenant) {
    setForm({ name:tenant.name, phone:tenant.phone, apt:tenant.apt, location:tenant.location||'', owner:tenant.owner||'', owner_phone:tenant.owner_phone||'', rent:tenant.rent, pay_day:tenant.pay_day, type:tenant.type, contract_start:tenant.contract_start||'', contract_end:tenant.contract_end||'', notes:tenant.notes||'' });
    setEditModal(tenant);
  }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function saveAdd() {
    if (!form.name || !form.phone || !form.apt) { toast(t('fullName') + ' / ' + t('phone') + ' / ' + t('aptUnit') + ' required', 'error'); return; }
    setSaving('add');
    try {
      await api.createTenant(form);
      toast(t('addNewTenant') + ' ', 'success');
      setForm(EMPTY); setShowForm(false); load();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!form.name || !form.phone || !form.apt) { toast('Required fields missing', 'error'); return; }
    setSaving('edit');
    try {
      await api.updateTenant(editModal.id, form);
      toast(t('saveChanges') + ' ', 'success');
      setEditModal(null); load();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  }

  async function doDelete() {
    setSaving('del');
    try {
      await api.deleteTenant(delModal.id);
      toast(t('delete') + ' ', 'success');
      setDelModal(null); load();
    } catch(e) { toast(e.message, 'error'); } finally { setSaving(false); }
  }

  const types = PROPERTY_TYPES.map(type => ({ value:type, label:type }));

  const stats = {
    total:   tenants.length,
    allPaid: tenants.filter(t => t.payments?.length > 0 && t.payments.every(p=>p.status==='paid')).length,
    pending: tenants.filter(t => t.payments?.some(p=>p.status==='pending')).length,
    late:    tenants.filter(t => t.payments?.some(p=>p.status==='late')).length,
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>{t('tenantsTitle')}</h1>
          <p>{t('manageTenants')} — {tenants.length} {t('activeTenants')}</p>
        </div>
        <button className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => { setShowForm(s => !s); setForm(EMPTY); }}>
          {showForm ? t('cancelAdd') : t('showForm')}
        </button>
      </div>

      {/* ── INLINE ADD FORM ──────────────────────────────────────── */}
      {showForm && (
        <div className="inline-form-panel">
          <div className="inline-form-header">
            <h3><Home size={18} /> {t('addNewTenant')}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={15} /> {t('cancel')}</button>
          </div>
          <div className="inline-form-body">
            <TenantFormFields form={form} set={set} types={types} t={t} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(EMPTY); }}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveAdd} disabled={saving === 'add'}>
                {saving === 'add' ? '...' : t('addTenant')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { icon:UserRound, label:t('totalTenants'), value:stats.total,   accent:'#1d4ed8', dim:'var(--primary-dim)'  },
          { icon:CheckCircle2, label:t('allPaidLabel'), value:stats.allPaid, accent:'#059669', dim:'var(--success-dim)'  },
          { icon:Clock3, label:t('pendingLabel'), value:stats.pending, accent:'#d97706', dim:'var(--warning-dim)'  },
          { icon:XCircle, label:t('lateLabel'),    value:stats.late,    accent:'#dc2626', dim:'var(--danger-dim)'   },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{'--stat-accent':s.accent,'--stat-dim':s.dim}}>
            <div className="stat-icon"><s.icon size={22} strokeWidth={2.25} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{fontSize:'var(--text-2xl)'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="search-input" style={{ maxWidth:320 }}>
            <input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(filtered, t)}><Download size={14} /> {t('exportCSV')}</button>
        </div>
        <div className="table-wrap">
          {loading
            ? <div className="empty-state"><Loader2 className="animate-spin" size={24} /></div>
            : filtered.length === 0
              ? <div className="empty-state"><div className="empty-icon"><UserRound size={32} /></div><h3>{search ? t('noResults') : t('noTenants')}</h3></div>
              : <table>
                  <thead>
                    <tr><th>{t('tenant')}</th><th>{t('apartment')}</th><th>{t('type')}</th><th>{t('owner')}</th><th>{t('rent')}</th><th>{t('payDay')}</th><th>{t('contract')}</th><th>{t('paid')}</th><th>{t('actions')}</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(tenant => {
                      const paid  = (tenant.payments||[]).filter(p=>p.status==='paid').length;
                      const total = (tenant.payments||[]).length;
                      const hasLate = (tenant.payments||[]).some(p=>p.status==='late');
                      const pct = total > 0 ? Math.round(paid/total*100) : 0;
                      return (
                        <tr key={tenant.id}>
                          <td>
                            <div className="td-name">{tenant.name}</div>
                            <div className="td-sub font-mono">{tenant.phone}</div>
                          </td>
                          <td>
                            <div style={{fontWeight:500}}>{tenant.apt}</div>
                            <div className="td-sub">{tenant.location}</div>
                          </td>
                          <td><span className={`badge ${TYPE_COLORS[tenant.type]||'badge-gray'}`}>{t(tenant.type)}</span></td>
                          <td>
                            <div>{tenant.owner||'—'}</div>
                            <div className="td-sub font-mono">{tenant.owner_phone}</div>
                          </td>
                          <td style={{fontWeight:700,color:'var(--warning)',fontSize:'var(--text-md)'}}>${Number(tenant.rent).toLocaleString()}</td>
                          <td>{tenant.pay_day}</td>
                          <td>
                            <div className="td-sub">{tenant.contract_start||'—'}</div>
                            <div className="td-sub">→ {tenant.contract_end||'—'}</div>
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:8,minWidth:100}}>
                              <div className="progress" style={{flex:1}}>
                                <div className="progress-fill" style={{width:pct+'%',background:hasLate?'var(--danger)':pct===100?'var(--success)':'var(--primary)'}}></div>
                              </div>
                              <span className="td-sub">{paid}/{total}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tenant)}>{t('edit')}</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDelModal(tenant)} style={{color:'var(--danger)'}}>{t('delete')}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
          }
        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <Modal title={`${t('editTenant')}: ${editModal.name}`} onClose={() => setEditModal(null)} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => setEditModal(null)}>{t('cancel')}</button><button className="btn btn-primary" onClick={saveEdit} disabled={saving==='edit'}>{saving==='edit'?'...':t('saveChanges')}</button></>}>
          <TenantFormFields form={form} set={set} types={types} t={t} />
        </Modal>
      )}

      {/* Delete modal */}
      {delModal && (
        <Modal title={t('delete') + '?'} onClose={() => setDelModal(null)} size="sm"
          footer={<><button className="btn btn-secondary" onClick={() => setDelModal(null)}>{t('cancel')}</button><button className="btn btn-danger" onClick={doDelete} disabled={saving==='del'}>{saving==='del'?'...':t('yes')}</button></>}>
          <div className="alert alert-red"><AlertTriangle size={16} /><div><strong>{t('confirmDelete')}</strong><div>{delModal.name}</div></div></div>
        </Modal>
      )}
    </div>
  );
}

function TenantFormFields({ form, set, types, t }) {
  return (
    <div className="form-grid">
      <div className="form-group"><label>{t('fullName')}</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ahmed Al-Rashid" /></div>
      <div className="form-group"><label>{t('phone')}</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="9647701234567" className="font-mono" /></div>
      <div className="form-group"><label>{t('aptUnit')}</label><input value={form.apt} onChange={e=>set('apt',e.target.value)} placeholder="Apt 4B - Babylon Tower" /></div>
      <div className="form-group"><label>{t('location')}</label><input value={form.location} onChange={e=>set('location',e.target.value)} /></div>
      <div className="form-group"><label>{t('ownerName')}</label><input value={form.owner} onChange={e=>set('owner',e.target.value)} /></div>
      <div className="form-group"><label>{t('ownerPhone')}</label><input value={form.owner_phone} onChange={e=>set('owner_phone',e.target.value)} className="font-mono" /></div>
      <div className="form-group"><label>{t('monthlyRent')}</label><input type="number" value={form.rent} onChange={e=>set('rent',e.target.value)} min="0" /></div>
      <div className="form-group"><label>{t('payDayNum')}</label><input type="number" value={form.pay_day} onChange={e=>set('pay_day',e.target.value)} min="1" max="31" /></div>
      <div className="form-group"><label>{t('propertyType')}</label><select value={form.type} onChange={e=>set('type',e.target.value)}>{types.map(tp=><option key={tp.value} value={tp.value}>{tp.label}</option>)}</select></div>
      <div className="form-group"><label>{t('contractStart')}</label><input type="date" value={form.contract_start} onChange={e=>set('contract_start',e.target.value)} /></div>
      <div className="form-group"><label>{t('contractEnd')}</label><input type="date" value={form.contract_end} onChange={e=>set('contract_end',e.target.value)} /></div>
      <div className="form-group span-2"><label>{t('notes')}</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} /></div>
    </div>
  );
}

function exportCSV(tenants, t) {
  const rows = [[t('tenant'),t('phone'),t('aptUnit'),t('location'),t('owner'),t('rent'),t('payDay'),t('type')]];
  tenants.forEach(tn => rows.push([tn.name,tn.phone,tn.apt,tn.location,tn.owner,tn.rent,tn.pay_day,tn.type]));
  const csv = rows.map(r=>r.map(c=>`"${c||''}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='tenants.csv'; a.click();
}
