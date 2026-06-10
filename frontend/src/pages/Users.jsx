import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, UsersRound } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const EMPTY = { name:'', username:'', password:'', role:'agent', phone:'', email:'' };

export default function Users() {
  const { t } = useLanguage();
  const [users,   setUsers]   = useState([]);
  const [adminCounts, setAdminCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const toast = useToast();
  const { user: me } = useAuth();
  const isDeveloper = me?.role === 'developer';
  const isManager = isDeveloper || me?.role === 'admin';
  const roleOptions = isDeveloper
    ? [{ value:'admin', label:t('ownerRole') || t('adminRole') }]
    : [{ value:'agent', label:t('agent') }];

  const load = () => {
    setLoading(true);
    const request = isDeveloper ? api.getUserReports() : api.getUsers();
    request.then(data => {
      if (isDeveloper) {
        setUsers(data.allUsers || []);
        setAdminCounts(Object.fromEntries((data.admins || []).map(admin => [admin.id, admin.agent_count || 0])));
      } else {
        setUsers(data || []);
        setAdminCounts({});
      }
    }).finally(()=>setLoading(false));
  };
  useEffect(()=>{load();},[isDeveloper]);

  function openAdd()   { setForm({ ...EMPTY, role:isDeveloper ? 'admin' : 'agent' }); setEditing(null); setModal('form'); }
  function openEdit(u) {
    if (u.role === 'developer' && u.id !== me?.id) return;
    setForm({name:u.name,username:u.username,password:'',role:u.role,phone:u.phone||'',email:u.email||''});
    setEditing(u);
    setModal('form');
  }
  function openDel(u)  { setEditing(u); setModal('delete'); }
  function close()     { setModal(null); setEditing(null); }
  function set(k,v)    { setForm(f=>({...f,[k]:v})); }
  function roleLabel(role) {
    if (role === 'developer') return t('developerRole');
    if (role === 'admin') return t('ownerRole') || t('adminRole');
    return t('agent');
  }
  function canEditUser(u) {
    if (!isManager) return false;
    if (isDeveloper) return u.role !== 'developer' || u.id === me?.id;
    return u.role === 'agent';
  }
  function canDeleteUser(u) {
    return canEditUser(u) && u.id !== me?.id && u.role !== 'developer';
  }

  async function save() {
    if (!isManager) { toast('Manager only','error'); return; }
    if (!form.name||!form.username) { toast(t('nameLabel')+' + '+t('username')+' required','error'); return; }
    if (!editing&&!form.password)   { toast(t('password')+' required','error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, role: isDeveloper ? form.role : 'agent' };
      if (editing) { await api.updateUser(editing.id,payload); toast(t('saveChanges')+' ','success'); }
      else         { await api.createUser(payload);            toast(t('createUser')+' ','success'); }
      close(); load();
    } catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  }

  async function del() {
    setSaving(true);
    try { await api.deleteUser(editing.id); toast(t('delete')+' ','success'); close(); load(); }
    catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1>{t('usersTitle')}</h1><p>{t('usersSub')}</p></div>
        {isManager && <button className="btn btn-primary" onClick={openAdd}>{t('addUser')}</button>}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading
            ? <div className="empty-state"><Loader2 className="animate-spin" size={24} /></div>
            : users.length===0
              ? <div className="empty-state"><div className="empty-icon"><UsersRound size={32} /></div><h3>{t('noUsers')}</h3></div>
              : <table>
                  <thead>
                    <tr>
                      <th>{t('nameLabel')}</th>
                      <th>{t('username')}</th>
                      <th>{t('role')}</th>
                      {isDeveloper && <th>{t('createdBy')}</th>}
                      {isDeveloper && <th>{t('createdAgents')}</th>}
                      <th>{t('email')}</th>
                      <th>{t('phone')}</th>
                      <th>{t('password')}</th>
                      <th>{t('date')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u=>(
                      <tr key={u.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:34,height:34,borderRadius:'var(--radius)',background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',color:'#fff',fontSize:'var(--text-sm)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name?.charAt(0)?.toUpperCase()}</div>
                            <div>
                              <div style={{fontWeight:600}}>{u.name}</div>
                              {u.id===me?.id&&<span className="badge badge-blue" style={{fontSize:10}}>{t('youLabel')}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="font-mono">{u.username}</td>
                        <td><span className={`badge ${u.role==='developer'?'badge-gray':u.role==='admin'?'badge-purple':'badge-blue'}`}>{roleLabel(u.role)}</span></td>
                        {isDeveloper && <td style={{color:'var(--text-muted)'}}>{u.creator_name || (u.role === 'developer' ? t('youLabel') : '-')}</td>}
                        {isDeveloper && <td style={{fontWeight:800}}>{u.role === 'admin' ? (adminCounts[u.id] || 0) : '-'}</td>}
                        <td style={{color:'var(--text-muted)'}}>{u.email||'—'}</td>
                        <td className="font-mono" style={{color:'var(--text-muted)'}}>{u.phone||'—'}</td>
                        <td><span className="badge badge-gray">{t('passwordHidden')}</span></td>
                        <td style={{color:'var(--text-muted)',fontSize:'var(--text-xs)'}}>{u.created_at?.slice(0,10)}</td>
                        <td>
                          <div className="flex gap-2">
                            {canEditUser(u)&&<button className="btn btn-secondary btn-sm" onClick={()=>openEdit(u)}>{t('edit')}</button>}
                            {canDeleteUser(u)&&<button className="btn btn-ghost btn-sm" onClick={()=>openDel(u)} style={{color:'var(--danger)'}}>{t('delete')}</button>}
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
        <Modal title={editing?`${t('editUser')}: ${editing.name}`:t('addUser')} onClose={close} size="sm"
          footer={<><button className="btn btn-secondary" onClick={close}>{t('cancel')}</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'...':(editing?t('save'):t('createUser'))}</button></>}>
          <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div className="form-group span-2"><label>{t('nameLabel')}</label><input value={form.name} onChange={e=>set('name',e.target.value)} /></div>
            <div className="form-group"><label>{t('username')}</label><input value={form.username} onChange={e=>set('username',e.target.value)} className="font-mono" /></div>
            <div className="form-group"><label>{t('password')}{editing?' ('+t('keepCurrent')+')':' *'}</label><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} /></div>
            <div className="form-group"><label>{t('role')}</label><select value={form.role} onChange={e=>set('role',e.target.value)} disabled={!isDeveloper || form.role === 'developer'}>
              {form.role === 'developer'
                ? <option value="developer">{t('developerRole')}</option>
                : roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></div>
            <div className="form-group"><label>{t('phone')}</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
            <div className="form-group span-2"><label>{t('email')}</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          </div>
        </Modal>
      )}

      {modal==='delete' && (
        <Modal title={t('deleteUser')+'?'} onClose={close} size="sm"
          footer={<><button className="btn btn-secondary" onClick={close}>{t('cancel')}</button><button className="btn btn-danger" onClick={del} disabled={saving}>{saving?'...':t('delete')}</button></>}>
          <div className="alert alert-red"><AlertTriangle size={16} /><span>{t('confirmDelete')} — <strong>{editing?.name}</strong></span></div>
        </Modal>
      )}
    </div>
  );
}
