import { useState, useEffect } from 'react';
import { Info, Loader2, Palette } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { t } = useLanguage();
  const { isDark, toggle } = useTheme();
  const [settings, setSettings] = useState({});
  const [pass,     setPass]     = useState({ current:'', newPass:'', newUser:'' });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const toast = useToast();
  const logoStorageKey = 'rentpro_app_logo';
  const maxLogoBytes = 850 * 1024;
  const maxLogoSourceBytes = 20 * 1024 * 1024;

  useEffect(() => { api.getSettings().then(s=>{setSettings(s);setLoading(false);}); }, []);
  function set(k,v) { setSettings(s=>({...s,[k]:v})); }
  function syncLogo(value, nextSettings = null) {
    try {
      if (value) localStorage.setItem(logoStorageKey, value);
      else localStorage.removeItem(logoStorageKey);
    } catch {}
    window.dispatchEvent(new CustomEvent('rentpro-settings-updated', {
      detail: nextSettings ? { ...nextSettings, appLogo: value || '' } : { appLogo: value || '' },
    }));
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read image file'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not process this image type'));
      img.src = url;
    });
  }

  async function compressLogo(file) {
    const originalDataUrl = await readFileAsDataUrl(file);
    const isVector = /image\/svg\+xml/i.test(file.type) || /\.svg$/i.test(file.name);
    if (isVector || originalDataUrl.length <= maxLogoBytes) return originalDataUrl;

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      const maxSize = 640;
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
      const ctx = canvas.getContext('2d', { alpha: true });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const formats = [
        ['image/webp', 0.86],
        ['image/png', 0.92],
        ['image/jpeg', 0.86],
      ];
      let best = originalDataUrl;
      for (const [type, quality] of formats) {
        const dataUrl = canvas.toDataURL(type, quality);
        if (!best || dataUrl.length < best.length) best = dataUrl;
        if (dataUrl.length <= maxLogoBytes) return dataUrl;
      }
      return best;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function chooseLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isSupportedImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif|heic|heif|ico)$/i.test(file.name);
    if (!isSupportedImage) {
      toast('Image only', 'error');
      return;
    }
    if (file.size > maxLogoSourceBytes) {
      toast('Logo image must be under 20MB', 'error');
      return;
    }
    setSaving('logo');
    try {
      const nextLogo = await compressLogo(file);
      if (nextLogo.length > maxLogoBytes * 1.6) {
        toast('Logo image is still too large. Please choose a smaller image.', 'error');
        return;
      }
      const nextSettings = { ...settings, appLogo: nextLogo };
      setSettings(nextSettings);
      syncLogo(nextLogo, nextSettings);
      toast('Logo ready. Click Save Settings to store it.', 'success');
    } catch (error) {
      toast(error.message || 'Could not process logo image', 'error');
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  }

  async function saveGeneral() {
    setSaving('general');
    try {
      const saved = await api.saveSettings(settings);
      const nextSettings = saved || settings;
      setSettings(nextSettings);
      syncLogo(nextSettings.appLogo || '', nextSettings);
      toast(t('saveSettings')+' ','success');
    }
    catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  }

  async function savePassword() {
    if (!pass.current) { toast(t('currentPassword')+' required','error'); return; }
    setSaving('pass');
    try {
      await api.changePass({ currentPass:pass.current, newPass:pass.newPass||undefined, newUser:pass.newUser||undefined });
      toast(t('updateCredentials')+' ','success');
      setPass({ current:'', newPass:'', newUser:'' });
    } catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  }

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>{t('settingsTitle')}</h1>
        <p>{t('settingsSub')}</p>
      </div>

      <div className="settings-layout-grid">
        {/* General */}
        <div className="card">
          <div className="card-header"><h3>{t('businessSettings')}</h3></div>
          <div className="card-body">
            <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
              <div className="form-group"><label>{t('appName')}</label><input value={settings.appName||''} onChange={e=>set('appName',e.target.value)} /></div>
              <div className="form-group"><label>{t('companyName')}</label><input value={settings.companyName||''} onChange={e=>set('companyName',e.target.value)} /></div>
              <div className="form-group">
                <label>{t('appLogo')}</label>
                <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <div style={{width:58,height:58,borderRadius:12,border:'1px dashed var(--border)',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                    {settings.appLogo ? <img src={settings.appLogo} alt="Logo preview" style={{width:'100%',height:'100%',objectFit:'contain'}} /> : null}
                  </div>
                  <label className="btn btn-secondary" style={{cursor:'pointer'}}>
                    {t('chooseLogo')}
                    <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif,.heic,.heif,.ico" onChange={chooseLogo} style={{display:'none'}} />
                  </label>
                  {settings.appLogo && (
                    <button type="button" className="btn btn-ghost" onClick={() => {
                      const nextSettings = { ...settings, appLogo: '' };
                      setSettings(nextSettings);
                      syncLogo('', nextSettings);
                    }}>{t('removeLogo')}</button>
                  )}
                </div>
              </div>
              <div className="form-group"><label>{t('contractCoordinator')}</label><input value={settings.contractCoordinator||''} onChange={e=>set('contractCoordinator',e.target.value)} /></div>
              <div className="form-group">
                <label>{t('currency')}</label>
                <select value={settings.currency||'USD'} onChange={e=>set('currency',e.target.value)}>
                  {['USD','EUR','GBP','IQD','AED','SAR','TRY'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('timezone')}</label>
                <select value={settings.timezone||'Asia/Baghdad'} onChange={e=>set('timezone',e.target.value)}>
                  {['Asia/Baghdad','Asia/Dubai','Asia/Riyadh','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles','UTC'].map(tz=><option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t('reminderHour')}</label><input type="number" min="0" max="23" value={settings.scheduleHour||9} onChange={e=>set('scheduleHour',e.target.value)} /></div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
              <button className="btn btn-primary" onClick={saveGeneral} disabled={saving==='general'}>{saving==='general'?'...':t('saveSettings')}</button>
            </div>
          </div>
        </div>

        {/* Theme + Security */}
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* Dark mode quick toggle */}
          <div className="card">
            <div className="card-body" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
              <div>
                <div style={{fontWeight:700,fontSize:'var(--text-md)'}}>{isDark ? t('darkMode') : t('lightMode')}</div>
                <div style={{fontSize:'var(--text-sm)',color:'var(--text-muted)',marginTop:4}}>{isDark ? 'Dark mode is ON' : 'Light mode is ON'}</div>
              </div>
              <button className="btn btn-secondary" onClick={toggle} style={{minWidth:120}}>
                <><Palette size={15} /> {isDark ? t('lightMode') : t('darkMode')}</>
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="card">
            <div className="card-header"><h3>{t('security')}</h3></div>
            <div className="card-body">
              <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
                <div className="form-group"><label>{t('currentPassword')}</label><input type="password" value={pass.current} onChange={e=>setPass(p=>({...p,current:e.target.value}))} placeholder="••••••••" /></div>
                <div className="form-group"><label>{t('newUsername')}</label><input value={pass.newUser} onChange={e=>setPass(p=>({...p,newUser:e.target.value}))} placeholder={t('keepCurrent')} /></div>
                <div className="form-group"><label>{t('newPassword')}</label><input type="password" value={pass.newPass} onChange={e=>setPass(p=>({...p,newPass:e.target.value}))} placeholder={t('keepCurrent')} /></div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
                <button className="btn btn-primary" onClick={savePassword} disabled={saving==='pass'}>{saving==='pass'?'...':t('updateCredentials')}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Message templates */}
        <div className="card" style={{gridColumn:'1/-1'}}>
          <div className="card-header"><h3>{t('messageTemplates')}</h3></div>
          <div className="card-body">
            <div className="alert alert-blue" style={{marginBottom:16}}>
              <Info size={16} />
              <span>{t('availableVars')}: <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{name}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{apt}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{rent}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{currency}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{payDay}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{days}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{contractEnd}}'}</code> <code style={{background:'var(--bg)',padding:'2px 6px',borderRadius:4,fontSize:'var(--text-xs)'}}>{'{{company}}'}</code></span>
            </div>
            <div className="form-grid settings-template-grid">
              <div className="form-group"><label>{t('reminderMsg')}</label><textarea rows={6} value={settings.msgReminder||''} onChange={e=>set('msgReminder',e.target.value)} /></div>
              <div className="form-group"><label>{t('lateMsg')}</label><textarea rows={6} value={settings.msgLate||''} onChange={e=>set('msgLate',e.target.value)} /></div>
              <div className="form-group span-2"><label>{t('renewalMsg')}</label><textarea rows={5} value={settings.msgRenewal||''} onChange={e=>set('msgRenewal',e.target.value)} /></div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
              <button className="btn btn-primary" onClick={saveGeneral} disabled={saving==='general'}>{saving==='general'?'...':t('saveTemplates')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
