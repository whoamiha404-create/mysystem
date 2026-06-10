import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Check, ClipboardList, Edit3, Eye, FilePlus, Printer, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import ReceiptDropdown from '../components/ReceiptDropdown';

// ── Amount to Kurdish words ──
function amountToWords(n, currency) {
  const num = parseFloat(n) || 0;
  const ones = ['','یەک','دوو','سێ','چوار','پێنج','شەش','حەوت','هەشت','نۆ','دە','یازدە','دوازدە','سێزدە','چواردە','پازدە','شازدە','حەڤدە','هەژدە','نۆزدە'];
  const tens = ['','','بیست','سی','چل','پەنجا','شەست','حەفتا','هەشتا','نەوەد'];
  const hundreds = ['','سەد','دوو سەد','سێ سەد','چوار سەد','پێنج سەد','شەش سەد','حەوت سەد','هەشت سەد','نۆ سەد'];
  if (num === 0) return 'سفر';
  function conv(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' و ' + ones[n%10] : '');
    return hundreds[Math.floor(n/100)] + (n%100 ? ' و ' + conv(n%100) : '');
  }
  const int = Math.floor(num);
  let r = '';
  if (int >= 1000000) r += conv(Math.floor(int/1000000)) + ' ملیۆن ';
  if (int >= 1000)    r += conv(Math.floor((int%1000000)/1000)) + ' هەزار ';
  r += conv(int % 1000);
  const cur = currency === 'IQD' ? 'دینار' : currency === 'EUR' ? 'یۆرۆ' : 'دۆلاری ئەمریکی، تەنها';
  return r.trim() + ' ' + cur;
}

// ── Print: no borders, exact margins for pre-printed A4 paper ──
// ── Print: both receipts on ONE A4 page ──
function printReceipt(data) {
  const rno      = data.receipt_no || (data.payment_id ? String(data.payment_id).padStart(4,'0') : Date.now().toString().slice(-4));
  const date     = new Date().toLocaleDateString('en-GB').split('/').reverse().join('-');
  const sym      = { USD:'$', IQD:'د.ع', EUR:'€' }[data.currency] || '$';
  const amtFmt   = sym + Number(data.amount).toLocaleString();
  const amtWords = amountToWords(data.amount, data.currency);

  const block = `<div style="width:100%;padding-top:2cm;padding-bottom:0.0cm;padding-right:2.5cm;padding-left:2.5cm;font-family:'NRT','Cairo',sans-serif;direction:rtl;background:transparent;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="color:#c8a400;font-size:14px;">بەروار : ${date}</div>
      <div style="color:#c8a400;font-size:17px;">پسوولەی پارەوەرگرتن</div>
      <div style="color:#c8a400;font-size:15px;">ژمارەی پسوولە # ${rno}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:14px;">
      <tbody>
        <tr style="background:#e8e8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td style="padding:9px 10px;width:32%;color:#555;text-align:right;">وەرگر / المستلم :</td>
          <td style="padding:9px 10px;text-align:center;">${data.receiver||'جمشیر شوان'}</td>
          <td style="padding:9px 10px;width:24%;color:#555;text-align:left;direction:ltr;">Receipt from :</td>
        </tr>
        <tr style="background:transparent;">
          <td style="padding:9px 10px;color:#555;text-align:right;">بڕی پارە / مبلغ و قدره :</td>
          <td style="padding:9px 10px;text-align:center;">${amtWords} ${amtFmt}</td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;">Amount :</td>
        </tr>
        <tr style="background:#e8e8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td style="padding:9px 10px;color:#555;text-align:right;vertical-align:top;">لە بڕی / وذلك عن :</td>
          <td style="padding:9px 10px;text-align:center;line-height:1.7;"><div>${data.instead||'کرێی مانگانە'} (${data.tenantName}) ژماره (${data.apt})${data.location?' لە ('+data.location+')':''}</div><div>${data.month}</div></td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;vertical-align:top;">For :</td>
        </tr>
        <tr style="background:transparent;">
          <td style="padding:9px 10px;color:#555;text-align:right;">پارەدەر / الدافع :</td>
          <td style="padding:9px 10px;text-align:center;">${data.tenantName}</td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;">Receptor :</td>
        </tr>
        <tr style="background:#e8e8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td style="padding:9px 10px;color:#555;text-align:right;">تێبینی / الملاحظات :</td>
          <td style="padding:9px 10px;text-align:center;">${data.notes||''}</td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;">Note :</td>
        </tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;text-align:center;margin-top:20px;direction:rtl;">
      <div><div style="font-size:12px;color:#333;margin-bottom:4px;">ڕێکخەری پسوولە / کۆمپانیای هۆپ زۆن</div><div style="font-size:14px;">${data.receiver||'جمشیر شوان'}</div></div>
      <div><div style="font-size:12px;color:#333;margin-bottom:4px;">پارەدەر</div><div style="font-size:14px;">${data.tenantName}</div></div>
      <div><div style="font-size:12px;color:#333;margin-bottom:4px;">پارەوەرگر</div><div style="font-size:14px;">${data.receiver||'جمشیر شوان'}</div></div>
    </div>
  </div>`;

  const html = `<!DOCTYPE html><html dir="rtl" lang="ku"><head><meta charset="UTF-8"><title>پسوولە</title>
<style>
  @font-face{font-family:'NRT';src:url('http://51.20.78.8:3001/fonts/NRT-Bd.ttf') format('truetype');}
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  body{font-family:'NRT','NRT Bold','Rabar','Cairo',Tahoma,Arial,sans-serif;font-weight:700;background:transparent;width:210mm;display:flex;flex-direction:column;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}


  .divider{height:3cm;flex-shrink:0;}
  @media print{
    tr,td{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    body{background:transparent;}
    @page{margin:0;size:A4 portrait;} html{height:297mm;overflow:hidden;}
  }
</style></head><body>
  ${block}
  <div class="divider"><div style=""></div></div>
  ${block}
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},2000);};</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=860,height=1200');
  win.document.write(html);
  win.document.close();
}


// ── Translations ──
const TX = {
  en: { newTab:'New Receipt', histTab:'History', search:'Search by name, apartment, phone or month...', rcvFrom:'Received From', amount:'Amount', givenTo:'Given to sir', currency:'Currency', insteadOf:'Instead of', month:'Month', note:'Note', save:'SAVE & PRINT', update:'UPDATE & PRINT', newPage:'NEW PAGE', noHist:'No receipts saved yet.', histSearch:'Search receipts...', loading:'Loading...', selectFirst:'Please select a tenant first', ownerWA:'WhatsApp will be sent to owner', noOwner:'No owner phone — print only', deleted:'Deleted', waSent:'Sent', refresh:'Refresh', preview:'Preview', print:'Print', edit:'Edit', delete:'Delete', tenant:'Tenant', apt:'Apt', receiver:'Receiver', date:'Date', noResults:'No results' },
  ar: { newTab:'إيصال جديد', histTab:'السجل', search:'ابحث بالاسم أو الشقة...', rcvFrom:'المستلم', amount:'المبلغ', givenTo:'سُلِّم إلى', currency:'العملة', insteadOf:'وذلك عن', month:'الشهر', note:'الملاحظات', save:'حفظ وطباعة', update:'تحديث وطباعة', newPage:'صفحة جديدة', noHist:'لا توجد إيصالات.', histSearch:'ابحث...', loading:'جاري التحميل...', selectFirst:'اختر مستأجراً أولاً', ownerWA:'سيتم إرسال واتساب للمالك', noOwner:'لا يوجد هاتف للمالك', deleted:'تم الحذف', waSent:'أُرسل', refresh:'تحديث', preview:'معاينة', print:'طباعة', edit:'تعديل', delete:'حذف', tenant:'المستأجر', apt:'الشقة', receiver:'المستلم', date:'التاريخ', noResults:'لا توجد نتائج' },
  ku: { newTab:'پسوولەی نوێ', histTab:'مێژوو', search:'گەڕان بە ناو، خانوو، مۆبایل یان مانگ...', rcvFrom:'وەرگر', amount:'بڕی پارە', givenTo:'درا بە', currency:'دراو', insteadOf:'لە بڕی', month:'مانگ', note:'تێبینی', save:'پاشەکەوت و چاپکردن', update:'نوێکردنەوە و چاپکردن', newPage:'پەڕەی نوێ', noHist:'هیچ پسوولەیەک نییە.', histSearch:'گەڕان لە پسوولەکان...', loading:'چاوەڕوانبە...', selectFirst:'تکایە بنکەنشینێک هەڵبژێرە', ownerWA:'واتساپ دەنێردرێت بۆ خاوەنەکە', noOwner:'ژمارەی خاوەن نییە', deleted:'سڕایەوە', waSent:'نێردرا', refresh:'نوێکردنەوە', preview:'پێشبینین', print:'چاپ', edit:'دەستکاری', delete:'سڕینەوە', tenant:'بنکەنشین', apt:'خانوو', receiver:'وەرگر', date:'بەروار', noResults:'ئەنجام نییە' },
};

const cleanIconLabel = (value) => String(value || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '').trim();
const RECEIPT_REASONS = ['کرێی مانگانە', 'خزمەتگوزاری', 'دڵنیایی', 'فرۆشتن', 'کڕین', 'عربون', 'عمولە', 'وەبەرهێنەر'];
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'dolar' },
  { value: 'IQD', label: 'دیناری عێراقی' },
];
const EDIT_RECEIPT_KEY = 'rentpro_edit_receive_receipt';
const RECEIPT_FONT = "'NRT', 'NRT Bold', 'Rabar', 'Cairo', Tahoma, Arial, sans-serif";
const EMPTY = (cur) => ({ tenantName:'', tenantPhone:'', apt:'', location:'', owner:'', owner_phone:'', month:'', amount:'', currency:cur||'USD', receiver:'جمشیر شوان', instead:RECEIPT_REASONS[0], notes:'', payment_id:null, tenant_id:null, receipt_no:'' });

function receiptRowToForm(row, fallbackCurrency = 'USD') {
  return {
    tenantName: row.tenant_name || '',
    tenantPhone: row.tenant_phone || '',
    apt: row.apt || '',
    location: row.location || '',
    owner: row.owner || '',
    owner_phone: row.owner_phone || '',
    month: row.month || '',
    amount: String(row.amount ?? ''),
    currency: row.currency || fallbackCurrency,
    receiver: row.receiver_name || 'جمشیر شوان',
    instead: row.instead || RECEIPT_REASONS[0],
    notes: row.notes || '',
    payment_id: row.payment_id || null,
    tenant_id: row.tenant_id || null,
    receipt_no: row.receipt_no || '',
  };
}

export default function Receipts({ mode = 'history' }) {
  const { lang } = useLanguage();
  const tx = TX[lang] || TX.en;
  const isRtl = lang==='ar' || lang==='ku';
  const toast = useToast();
  const navigate = useNavigate();
  const dropRef = useRef();
  const isFormMode = mode === 'form';

  const [tenants,    setTenants]    = useState([]);
  const [settings,   setSettings]   = useState({});
  const [search,     setSearch]     = useState('');
  const [showDrop,   setShowDrop]   = useState(false);
  const [history,    setHistory]    = useState([]);
  const [histErr,    setHistErr]    = useState('');
  const [histSearch, setHistSearch] = useState('');
  const [histLoad,   setHistLoad]   = useState(false);
  const tab = isFormMode ? 'new' : 'history';
  const [waStatus,   setWaStatus]   = useState('init');
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState(EMPTY('USD'));
  const [editingId,  setEditingId]  = useState(null);
  const [preview,    setPreview]    = useState(null);

  const loadHistory = async () => {
    setHistLoad(true); setHistErr('');
    try {
      const d = await api.getReceipts();
      setHistory(Array.isArray(d) ? d.filter(r => !String(r.receipt_no || '').startsWith('G-')) : []);
    }
    catch(e) { setHistErr(e.message); setHistory([]); }
    finally { setHistLoad(false); }
  };

  useEffect(() => {
    Promise.all([api.getTenants(), api.getSettings(), api.waStatus()])
      .then(([ts,s,wa]) => {
        setTenants(ts||[]); setSettings(s||{});
        const editRaw = isFormMode ? sessionStorage.getItem(EDIT_RECEIPT_KEY) : null;
        if (editRaw) {
          try {
            const editRow = JSON.parse(editRaw);
            setEditingId(editRow.id || null);
            setForm(receiptRowToForm(editRow, s?.currency || 'USD'));
          } catch {
            setForm(EMPTY(s?.currency||'USD'));
          }
          sessionStorage.removeItem(EDIT_RECEIPT_KEY);
        } else {
          setForm(EMPTY(s?.currency||'USD'));
        }
        setWaStatus(wa?.state||'init');
      }).catch(console.error);
    loadHistory();
  }, []);

  useEffect(() => {
    const close = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const paidPayments = [];
  tenants.forEach(ten => (ten.payments||[]).filter(p=>p.status==='paid').forEach(p => paidPayments.push({tenant:ten,payment:p})));

  const dropList = search.trim()
    ? paidPayments.filter(({tenant,payment}) => [tenant.name,tenant.phone,tenant.apt,payment.month].join(' ').toLowerCase().includes(search.toLowerCase()))
    : paidPayments.slice(0,12);

  function selectPayment(tenant, payment) {
    setForm(f => ({...f, tenantName:tenant.name, tenantPhone:tenant.phone, apt:tenant.apt, location:tenant.location||'', owner:tenant.owner||'', owner_phone:tenant.owner_phone||'', month:payment.month, amount:String(payment.amount), payment_id:payment.id, tenant_id:tenant.id }));
    setSearch(''); setShowDrop(false);
  }

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  function editReceipt(row) {
    sessionStorage.setItem(EDIT_RECEIPT_KEY, JSON.stringify(row));
    navigate('/receipts/new');
  }

  function printHistoryReceipt(row) {
    printReceipt(receiptRowToForm(row, settings.currency || 'USD'));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY(settings.currency));
  }

  async function handleSaveAndPrint() {
    if (!form.tenantName) { toast(tx.selectFirst,'warning'); return; }
    printReceipt(form);
    let waSent = false;
    let liveWaStatus = waStatus;
    if (form.owner_phone) {
      try {
        const status = await api.waStatus();
        liveWaStatus = status?.state || 'init';
        setWaStatus(liveWaStatus);
      } catch {}
    }
    if (liveWaStatus==='ready' && form.owner_phone) {
      try {
        const sym = {USD:'$',IQD:'د.ع',EUR:'€'}[form.currency]||'$';
        await api.waSend(form.owner_phone, `عقارات هۆپ زۆن  \n\nسڵاو بەڕێز ${form.owner},\nکرێی مانگی ${form.month} بۆ مولکی ${form.apt} وەرگیراوە دەتوانی بێی سەردانامان بکەی.\nکرێچی: ${form.tenantName}\nبڕی پارە: ${sym}${form.amount}\n\nلەگەل رێزدا عقارات هۆپ زۆن  `, true);
        waSent = true; toast(''+tx.ownerWA,'success');
      } catch(e) { toast('WhatsApp: '+e.message,'warning'); }
    }
    setSaving(true);
    try {
      const payload = { receipt_no:form.receipt_no || (form.payment_id?String(form.payment_id).padStart(4,'0'):Date.now().toString().slice(-6)), payment_id:form.payment_id, tenant_id:form.tenant_id, tenant_name:form.tenantName, tenant_phone:form.tenantPhone, apt:form.apt, location:form.location, owner:form.owner, owner_phone:form.owner_phone, month:form.month, amount:parseFloat(form.amount)||0, currency:form.currency, paid_date:new Date().toISOString().slice(0,10), receiver_name:form.receiver, instead:form.instead, notes:form.notes, wa_sent:waSent };
      if (editingId) await api.updateReceipt(editingId, payload);
      else await api.saveReceipt(payload);
      toast('Saved','success'); loadHistory();
      setEditingId(null);
      navigate('/receipts');
    } catch(e) { toast('Error: '+e.message,'error'); }
    finally { setSaving(false); }
  }

  const filteredHist = histSearch.trim() ? history.filter(r=>[r.tenant_name,r.apt,r.month,r.receipt_no].join(' ').toLowerCase().includes(histSearch.toLowerCase())) : history;

  const inp = { border:'1px solid #c8d3e0', borderRadius:6, padding:'8px 12px', fontSize:14, background:'var(--surface,#fff)', color:'var(--text,#111)', outline:'none', width:'100%', fontFamily:'inherit' };
  const lbl = { fontWeight:700, fontSize:13, color:'#c8a400', whiteSpace:'nowrap' };
  const frow = { display:'flex', alignItems:'center', gap:10 };

  return (
    <div className="receipt-page" dir={isRtl?'rtl':'ltr'} style={{fontFamily:RECEIPT_FONT,fontWeight:700}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div style={{fontWeight:900,fontSize:16}}>HOPEZONE REALESTATE COMPANY</div>
        <div style={{fontWeight:900,fontSize:20,color:'#c8a400',letterSpacing:2}}>پسوولەی پارەوەرگرتن</div>
        <div style={{border:'2px solid #c8a400',borderRadius:6,padding:'5px 14px',fontWeight:700,color:'#c8a400',fontSize:13}}>
          {new Date().toLocaleDateString('en-GB').split('/').reverse().join('-')}
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:20,borderBottom:'2px solid #e2e8f0',paddingBottom:12}}>
        {isFormMode ? (
          <button type="button" onClick={()=>navigate('/receipts')} style={{background:'#64748b',color:'#fff',border:'none',borderRadius:8,padding:'10px 18px',fontWeight:800,cursor:'pointer'}}>
            <ClipboardList size={16} /> {cleanIconLabel(tx.histTab)} ({history.length})
            </button>
        ) : (
          <button type="button" onClick={()=>navigate('/receipts/new')} style={{background:'#c8a400',color:'#fff',border:'none',borderRadius:8,padding:'10px 18px',fontWeight:800,cursor:'pointer'}}>
            <Printer size={16} /> {cleanIconLabel(tx.newTab)}
            </button>
        )}
      </div>

      {/* ══ NEW RECEIPT ══ */}
      {tab==='new' && (
        <div style={{background:'var(--surface,#fff)',border:'1px solid #e2e8f0',borderRadius:12,padding:28,maxWidth:900}}>

          {/* Search */}
          <div style={{marginBottom:24,position:'relative'}} ref={dropRef}>
            <input style={{...inp,fontSize:15,padding:'10px 16px'}}
              placeholder={tx.search} value={search}
              onChange={e=>{setSearch(e.target.value);setShowDrop(true);}}
              onFocus={()=>setShowDrop(true)} />
            {showDrop && dropList.length>0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:999,background:'var(--surface,#fff)',border:'1px solid #e2e8f0',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.13)',maxHeight:260,overflowY:'auto'}}>
                {dropList.map(({tenant,payment})=>(
                  <div key={payment.id} onClick={()=>selectPayment(tenant,payment)}
                    style={{padding:'10px 16px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#fffbeb'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div>
                      <div style={{fontWeight:700}}>{tenant.name}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{tenant.apt} · {payment.month}</div>
                    </div>
                    <div style={{fontWeight:700,color:'#c8a400'}}>{payment.amount} {settings.currency||'$'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px 40px'}}>
            <div style={frow}><span style={lbl}>{tx.rcvFrom}:</span><input style={inp} value={form.tenantName} onChange={e=>setF('tenantName',e.target.value)} /></div>
            <div style={frow}><span style={lbl}>{tx.amount}:</span><input style={inp} value={form.amount} onChange={e=>setF('amount',e.target.value)} placeholder="0" type="number" /></div>
            <div style={frow}><span style={lbl}>{tx.givenTo}:</span><input style={{...inp,direction:'rtl'}} value={form.receiver} onChange={e=>setF('receiver',e.target.value)} /></div>
            <div style={frow}><span style={lbl}>{tx.currency}:</span>
              <ReceiptDropdown value={form.currency} options={CURRENCY_OPTIONS} onChange={value => setF('currency', value)} rtl={isRtl} />
            </div>
            <div style={frow}><span style={lbl}>{tx.insteadOf}:</span><ReceiptDropdown value={form.instead} options={RECEIPT_REASONS} onChange={value => setF('instead', value)} rtl /><input style={{...inp,width:130}} value={form.month} onChange={e=>setF('month',e.target.value)} placeholder={tx.month} /></div>
            <div style={frow}><span style={lbl}>Location:</span><input style={inp} value={form.location} onChange={e=>setF('location',e.target.value)} /><span style={{...lbl,marginInlineStart:8}}>Apt:</span><input style={{...inp,width:90}} value={form.apt} onChange={e=>setF('apt',e.target.value)} /></div>
            <div style={{...frow,gridColumn:'1/-1'}}><span style={lbl}>{tx.note}:</span><input style={inp} value={form.notes} onChange={e=>setF('notes',e.target.value)} /></div>
          </div>

          {/* Amount words preview */}
          {form.amount && (
            <div style={{marginTop:12,padding:'8px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:12,color:'#92400e',direction:'rtl'}}>
              {amountToWords(form.amount, form.currency)}
            </div>
          )}

          {/* Owner notice */}
          {form.tenantName && (
            <div style={{marginTop:10,padding:'8px 14px',borderRadius:8,fontSize:13,background:form.owner_phone?'#f0fdf4':'#fef9c3',border:`1px solid ${form.owner_phone?'#86efac':'#fde047'}`}}>
              {form.owner_phone?`${tx.ownerWA}: ${form.owner} (${form.owner_phone})`:`${tx.noOwner}`}
            </div>
          )}

          {/* Buttons */}
          <div style={{display:'flex',gap:12,marginTop:24}}>
            <button onClick={handleSaveAndPrint} disabled={saving}
              style={{background:'#c8a400',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:700,fontSize:15,cursor:'pointer',opacity:saving?0.7:1}}>
              <Save size={16} /> {saving?'...':(editingId ? tx.update : tx.save)}
            </button>
            <button onClick={resetForm}
              style={{background:'#64748b',color:'#fff',border:'none',borderRadius:8,padding:'12px 28px',fontWeight:700,fontSize:15,cursor:'pointer'}}>
              <FilePlus size={16} /> {tx.newPage}
            </button>
          </div>
        </div>
      )}

      {/* ══ HISTORY ══ */}
      {tab==='history' && (
        <div style={{background:'var(--surface,#fff)',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',gap:12,alignItems:'center'}}>
            <input style={{...inp,maxWidth:340}} placeholder={tx.histSearch} value={histSearch} onChange={e=>setHistSearch(e.target.value)} />
            <button onClick={loadHistory} style={{background:'#c8a400',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontWeight:600,cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}><RefreshCw size={14} /> {tx.refresh}</button>
          </div>
          {histErr && <div style={{padding:'10px 20px',background:'#fef2f2',color:'#dc2626',fontSize:13,display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={15} /> {histErr}</div>}
          {histLoad
            ? <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>{tx.loading}</div>
            : filteredHist.length===0
              ? <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}><ClipboardList size={40} style={{marginBottom:12}} /><div style={{fontWeight:600}}>{histSearch?tx.noResults:tx.noHist}</div></div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                    <thead>
                      <tr style={{background:'#f8fafc',color:'#64748b',fontSize:12,textTransform:'uppercase'}}>
                        {['#',tx.tenant,tx.apt,tx.month,tx.amount,tx.receiver,'WA',tx.date,''].map((h,i)=>(
                          <th key={i} style={{padding:'10px 14px',textAlign:isRtl?'right':'left',fontWeight:700}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHist.map(r=>(
                        <tr key={r.id} style={{borderTop:'1px solid #f1f5f9'}}>
                          <td style={{padding:'10px 14px',fontWeight:700,color:'#c8a400'}}>{r.receipt_no}</td>
                          <td style={{padding:'10px 14px',fontWeight:600}}>{r.tenant_name}</td>
                          <td style={{padding:'10px 14px'}}>{r.apt}</td>
                          <td style={{padding:'10px 14px'}}>{r.month}</td>
                          <td style={{padding:'10px 14px',fontWeight:700,color:'#d97706'}}>{r.amount} {r.currency}</td>
                          <td style={{padding:'10px 14px',direction:'rtl'}}>{r.receiver_name||'—'}</td>
                          <td style={{padding:'10px 14px'}}><span style={{background:r.wa_sent?'#dcfce7':'#f1f5f9',color:r.wa_sent?'#16a34a':'#94a3b8',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>{r.wa_sent?''+tx.waSent:'—'}</span></td>
                          <td style={{padding:'10px 14px',color:'#94a3b8',fontSize:12,whiteSpace:'nowrap'}}>{r.printed_at?.slice(0,16).replace('T',' ')}</td>
                          <td style={{padding:'10px 14px',whiteSpace:'nowrap'}}>
                            <button title={tx.preview} onClick={()=>setPreview(r)} style={{background:'none',border:'none',cursor:'pointer',color:'#0ea5e9',fontSize:15,padding:'4px 6px'}}><Eye size={15} /></button>
                            <button title={tx.print} onClick={()=>printHistoryReceipt(r)} style={{background:'none',border:'none',cursor:'pointer',color:'#16a34a',fontSize:15,padding:'4px 6px'}}><Printer size={15} /></button>
                            <button title={tx.edit} onClick={()=>editReceipt(r)} style={{background:'none',border:'none',cursor:'pointer',color:'#c8a400',fontSize:15,padding:'4px 6px'}}><Edit3 size={15} /></button>
                            <button onClick={async()=>{
                              if(!window.confirm(tx.delete+'?'))return;
                              try{await api.deleteReceipt(r.id);setHistory(h=>h.filter(x=>x.id!==r.id));toast(tx.deleted,'info');}
                              catch(e){toast('Error: '+e.message,'error');}
                            }} title={tx.delete} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:16,padding:'4px 6px'}}><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          }
        </div>
      )}
      {preview && (
        <div onClick={()=>setPreview(null)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(15,23,42,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'min(520px,100%)',background:'var(--surface,#fff)',border:'1px solid #e2e8f0',borderRadius:10,padding:20,boxShadow:'0 20px 60px rgba(0,0,0,.25)'}}>
            <h3 style={{marginBottom:14,color:'#c8a400'}}>{tx.preview} #{preview.receipt_no}</h3>
            {[['#',preview.receipt_no],[tx.tenant,preview.tenant_name],[tx.apt,preview.apt],[tx.month,preview.month],[tx.amount,`${preview.amount} ${preview.currency}`],[tx.insteadOf,preview.instead],[tx.receiver,preview.receiver_name],[tx.note,preview.notes]].map(([label,value])=>(
              <div key={label} style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:12,padding:'7px 0',borderBottom:'1px solid #f1f5f9'}}>
                <strong>{label}</strong><span>{value || '-'}</span>
              </div>
            ))}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
              <button onClick={()=>printHistoryReceipt(preview)} style={{background:'#c8a400',color:'#fff',border:0,borderRadius:6,padding:'9px 16px',fontWeight:800}}>{tx.print}</button>
              <button onClick={()=>setPreview(null)} style={{background:'#64748b',color:'#fff',border:0,borderRadius:6,padding:'9px 16px',fontWeight:800}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
