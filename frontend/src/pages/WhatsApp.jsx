import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Image, Loader2, MessageCircle, Paperclip, RefreshCw, Send, Smartphone, X, XCircle } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export default function WhatsApp() {
  const { t } = useLanguage();
  const [status,    setStatus]    = useState({ state:'init', qr:null, hasImage:false });
  const [tenants,   setTenants]   = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [sending,   setSending]   = useState(null);
  const [search,    setSearch]    = useState('');
  const [withImage, setWithImage] = useState(true);
  const [imgPreview,setImgPreview]= useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const toast = useToast();

  const poll = async () => {
    try { setStatus(await api.waStatus()); } catch(e) {}
    try { setLogs(await api.getLogs(30)); } catch(e) {}
  };

  useEffect(() => {
    poll();
    api.getTenants().then(setTenants);
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, []);

  // Load image preview if exists
  useEffect(() => {
    if (status.hasImage) {
      setImgPreview('/api/whatsapp/image?t=' + Date.now());
    } else {
      setImgPreview(null);
    }
  }, [status.hasImage]);

  async function remindOne(tenant) {
    setSending(tenant.id);
    try {
      await api.waRemind(tenant.id, withImage && status.hasImage);
      toast(' Sent → ' + tenant.name, 'success');
      poll();
    } catch(e) { toast(e.message, 'error'); }
    finally { setSending(null); }
  }

  async function remindAll() {
    setSending('all');
    try {
      const r = await api.waRemindAll(withImage && status.hasImage);
      const ok  = r.results.filter(x => x.ok).length;
      const err = r.results.filter(x => x.error).length;
      toast(ok + ' sent' + (err > 0 ? `, ${err} failed` : '') + ' ', ok > 0 ? 'success' : 'error');
      poll();
    } catch(e) { toast(e.message, 'error'); }
    finally { setSending(null); }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.waUploadImage(fd);
      setImgPreview(URL.createObjectURL(file));
      setStatus(s => ({ ...s, hasImage: true }));
      toast('Image uploaded ', 'success');
    } catch(e) { toast(e.message, 'error'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function removeImage() {
    try {
      await api.waDeleteImage();
      setImgPreview(null);
      setStatus(s => ({ ...s, hasImage: false }));
      toast('Image removed', 'info');
    } catch(e) { toast(e.message, 'error'); }
  }

  const isReady = status.state === 'ready';

  const stateMap = {
    ready:        { label: t('connected'),     badge:'badge-green', icon:CheckCircle2 },
    qr:           { label: t('scanQRCode'),    badge:'badge-amber', icon:Smartphone },
    init:         { label: t('starting'),      badge:'badge-blue',  icon:Loader2 },
    disconnected: { label: t('disconnected'),  badge:'badge-red',   icon:XCircle },
  };
  const si = stateMap[status.state] || stateMap.init;

  const filtered = search
    ? tenants.filter(tn => [tn.name, tn.phone, tn.apt, tn.location||''].join(' ').toLowerCase().includes(search.toLowerCase()))
    : tenants;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1>{t('waTitle')}</h1><p>{t('waSub')}</p></div>
        {isReady && (
          <button className="btn btn-success" onClick={remindAll} disabled={sending === 'all'}>
            {sending === 'all' ? '...' : <><Send size={15} /> {t('sendAll')}</>}
          </button>
        )}
      </div>

      <div className="whatsapp-layout">

        {/* ── Left column ── */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* Status card */}
          <div className="card">
            <div className="card-header">
              <h3>{t('connectionStatus')}</h3>
              <span className={`badge ${si.badge}`}>{si.label}</span>
            </div>
            <div className="card-body" style={{textAlign:'center'}}>
              {status.state === 'qr' && status.qr
                ? <>
                    <img src={status.qr} alt="QR" style={{width:'100%',maxWidth:260,borderRadius:8,margin:'0 auto',display:'block'}} />
                    <p style={{marginTop:12,fontWeight:600}}>{t('scanQRCode')}</p>
                    <p style={{color:'var(--text-muted)',fontSize:'var(--text-sm)',marginTop:4}}>{t('scanInstruction')}</p>
                  </>
                : <>
                    <si.icon className={status.state === 'init' ? 'animate-spin' : ''} size={64} style={{marginBottom:16}} />
                    <div style={{fontWeight:700,fontSize:'var(--text-xl)',marginBottom:8}}>{si.label}</div>
                    {(status.state === 'init' || status.state === 'disconnected') && (
                      <div style={{color:'var(--text-muted)',fontSize:'var(--text-sm)'}}>{t('autoReconnecting')}</div>
                    )}
                  </>
              }
            </div>
          </div>

          {/* ── Template Image card ── */}
          <div className="card">
            <div className="card-header">
              <h3><Paperclip size={18} /> Template Image</h3>
              {status.hasImage && (
                <span className="badge badge-green"><CheckCircle2 size={12} /> Image set</span>
              )}
            </div>
            <div className="card-body">

              {/* Image preview */}
              {imgPreview && (
                <div style={{marginBottom:12,position:'relative'}}>
                  <img
                    src={imgPreview}
                    alt="Template"
                    style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:8,border:'1px solid var(--border)'}}
                    onError={() => setImgPreview(null)}
                  />
                  <button
                    onClick={removeImage}
                    style={{position:'absolute',top:6,right:6,background:'rgba(220,38,38,0.85)',color:'#fff',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    
                  </button>
                </div>
              )}

              {/* Upload button */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{display:'none'}}
              />
              <button
                className="btn btn-secondary"
                style={{width:'100%'}}
                onClick={() => fileRef.current.click()}
                disabled={uploading}>
                <>{uploading ? <Loader2 className="animate-spin" size={15} /> : imgPreview ? <RefreshCw size={15} /> : <Image size={15} />} {uploading ? 'Uploading...' : imgPreview ? 'Change Image' : 'Upload Image'}</>
              </button>
              <p style={{fontSize:'var(--text-xs)',color:'var(--text-muted)',marginTop:8,textAlign:'center'}}>
                Max 5MB · JPG, PNG, WebP · Sent with every reminder
              </p>

              {/* Toggle send with image */}
              {status.hasImage && (
                <label style={{display:'flex',alignItems:'center',gap:8,marginTop:12,cursor:'pointer',fontSize:'var(--text-sm)'}}>
                  <input
                    type="checkbox"
                    checked={withImage}
                    onChange={e => setWithImage(e.target.checked)}
                    style={{width:16,height:16}}
                  />
                  Send image with messages
                </label>
              )}
            </div>
          </div>
        </div>

        {/* ── Tenants table ── */}
        <div className="card">
          <div className="card-header">
            <h3>{t('sendReminder')}</h3>
            <span className="badge badge-gray">{filtered.length}</span>
          </div>

          {/* Search box */}
          <div style={{padding:'12px 16px', borderBottom:'1px solid var(--border)'}}>
            <div className="search-input">
              <input
                placeholder="Search tenant, phone, apartment..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            {filtered.length === 0
              ? <div className="empty-state" style={{padding:32}}>
                  <div className="empty-icon"><MessageCircle size={32} /></div>
                  <h3>{search ? 'No results' : t('noTenantsWA')}</h3>
                </div>
              : <table>
                  <thead>
                    <tr>
                      <th>{t('tenant')}</th>
                      <th>{t('phone')}</th>
                      <th>{t('apartment')}</th>
                      <th>{t('status')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tn => {
                      const hasPending = (tn.payments||[]).some(p => p.status !== 'paid');
                      return (
                        <tr key={tn.id}>
                          <td><div className="td-name">{tn.name}</div></td>
                          <td style={{fontFamily:'monospace',fontSize:'var(--text-sm)'}}>{tn.phone}</td>
                          <td>{tn.apt}</td>
                          <td>
                            <span className={`badge ${hasPending ? 'badge-amber' : 'badge-green'}`}>
                              {hasPending ? t('hasPending') : t('allPaidWA')}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${isReady ? 'btn-success' : 'btn-secondary'}`}
                              onClick={() => remindOne(tn)}
                              disabled={!isReady || sending === tn.id}>
                              {sending === tn.id ? '...' : t('sendReminder')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            }
          </div>
        </div>

        {/* ── Logs ── */}
        <div className="card" style={{gridColumn:'1/-1'}}>
          <div className="card-header">
            <h3>{t('activityLogs')}</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => api.clearLogs().then(poll)}>{t('clearLogs')}</button>
          </div>
          <div style={{maxHeight:260, overflowY:'auto'}}>
            {logs.length === 0
              ? <div className="empty-state" style={{padding:24}}><p>—</p></div>
              : <table>
                  <thead>
                    <tr><th>{t('date')}</th><th>{t('type')}</th><th>{t('description')}</th></tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id}>
                        <td style={{whiteSpace:'nowrap',color:'var(--text-muted)',fontSize:'var(--text-xs)'}}>{l.time?.slice(0,19).replace('T',' ')}</td>
                        <td><span className={`badge ${l.type==='success'?'badge-green':l.type==='error'?'badge-red':'badge-blue'}`}>{l.type}</span></td>
                        <td style={{fontSize:'var(--text-sm)'}}>{l.message}</td>
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
