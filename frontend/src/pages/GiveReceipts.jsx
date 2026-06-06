import { useState, useEffect, useRef } from 'react';
import { Check, ClipboardList, Edit3, Eye, FilePlus, Printer, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import ReceiptDropdown from '../components/ReceiptDropdown';

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

function printGiveReceipt(data) {
  const rno      = data.receipt_no || ('G-' + (Date.now().toString().slice(-4)));
  const date     = new Date().toLocaleDateString('en-GB').split('/').reverse().join('-');
  const sym      = { USD:'$', IQD:'د.ع', EUR:'€' }[data.currency] || '$';
  const amtFmt   = sym + Number(data.amount).toLocaleString();
  const amtWords = amountToWords(data.amount, data.currency);

  const block = `<div style="width:100%;padding-top:1.8cm;padding-bottom:0.8cm;padding-right:1.5cm;padding-left:3.5cm;font-family:'NRT','Cairo',sans-serif;direction:rtl;background:transparent;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="color:#c8a400;font-weight:bold;font-size:15px;">ژمارەی پسوولە # ${rno}</div>
      <div style="color:#c8a400;font-weight:bold;font-size:17px;">پسوولەی پارەدان</div>
      <div style="color:#333;font-size:14px;">بەروار : ${date}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:14px;">
      <tbody>
        <tr style="background:#e8e8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td style="padding:9px 10px;width:32%;color:#555;text-align:right;">وەرگر / المستلم :</td>
          <td style="padding:9px 10px;text-align:center;font-weight:bold;">${data.ownerName}</td>
          <td style="padding:9px 10px;width:24%;color:#555;text-align:left;direction:ltr;">Paid to :</td>
        </tr>
        <tr style="background:transparent;">
          <td style="padding:9px 10px;color:#555;text-align:right;">بڕی پارە / مبلغ و قدره :</td>
          <td style="padding:9px 10px;text-align:center;">${amtWords} ${amtFmt}</td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;">Amount :</td>
        </tr>
        <tr style="background:#e8e8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td style="padding:9px 10px;color:#555;text-align:right;vertical-align:top;">لە بڕی / وذلك عن :</td>
          <td style="padding:9px 10px;text-align:center;line-height:1.7;"><div>${data.instead||'کرێی مولک'} ژماره (${data.apt})${data.location?' لە ('+data.location+')':''}</div><div>${data.month}</div></td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;vertical-align:top;">For :</td>
        </tr>
        <tr style="background:transparent;">
          <td style="padding:9px 10px;color:#555;text-align:right;">پارەدەر / الدافع :</td>
          <td style="padding:9px 10px;text-align:center;font-weight:bold;">${data.paidBy||'کۆمپانیای هۆپ زۆن'}</td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;">Paid by :</td>
        </tr>
        <tr style="background:#e8e8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td style="padding:9px 10px;color:#555;text-align:right;">تێبینی / الملاحظات :</td>
          <td style="padding:9px 10px;text-align:center;">${data.notes||''}</td>
          <td style="padding:9px 10px;color:#555;text-align:left;direction:ltr;">Note :</td>
        </tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;text-align:center;margin-top:20px;direction:rtl;">
      <div><div style="font-size:12px;color:#333;margin-bottom:4px;">ڕێکخەری پسوولە / کۆمپانیای هۆپ زۆن</div><div style="font-weight:bold;font-size:14px;">${data.paidBy||'کۆمپانیای هۆپ زۆن'}</div></div>
      <div><div style="font-size:12px;color:#333;margin-bottom:4px;">وەرگر</div><div style="font-weight:bold;font-size:14px;">${data.ownerName}</div></div>
      <div><div style="font-size:12px;color:#333;margin-bottom:4px;">پارەدەر</div><div style="font-weight:bold;font-size:14px;">${data.paidBy||'کۆمپانیای هۆپ زۆن'}</div></div>
    </div>
  </div>`;

  const html = `<!DOCTYPE html><html dir="rtl" lang="ku"><head><meta charset="UTF-8"><title>پسوولەی پارەدان</title>
<style>
  @font-face{font-family:'NRT';src:url('http://51.20.78.8:3001/fonts/NRT-Bd.ttf') format('truetype');}
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  body{font-family:'NRT','NRT Bold','Rabar','Cairo',Tahoma,Arial,sans-serif;font-weight:700;background:transparent;width:210mm;display:flex;flex-direction:column;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .divider{height:3cm;flex-shrink:0;}
  @media print{
    tr,td{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    body{background:transparent;}
    @page{margin:0;size:A4 portrait;}
    html{height:297mm;overflow:hidden;}
  }
</style></head><body>
  ${block}
  <div class="divider"><div style="border-top:2px dashed #aaa;margin-top:1.5cm;"></div></div>
  ${block}
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},2000);};</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=860,height=1200');
  win.document.write(html);
  win.document.close();
}

const TX = {
  en: { title:'Give Receipts', newTab:'New Give Receipt', histTab:'History', search:'Search by owner, apartment or month...', ownerName:'Owner Name', amount:'Amount', paidBy:'Paid By', currency:'Currency', insteadOf:'Instead of', month:'Month', note:'Note', apt:'Apt', location:'Location', save:'SAVE & PRINT', update:'UPDATE & PRINT', newPage:'NEW PAGE', noHist:'No give receipts yet.', loading:'Loading...', selectFirst:'Please fill owner name', waSent:'Sent', refresh:'Refresh', preview:'Preview', print:'Print', edit:'Edit', delete:'Delete', date:'Date', noResults:'No results' },
  ar: { title:'إيصالات الدفع', newTab:'إيصال دفع جديد', histTab:'السجل', search:'ابحث بالمالك أو الشقة...', ownerName:'اسم المالك', amount:'المبلغ', paidBy:'الدافع', currency:'العملة', insteadOf:'وذلك عن', month:'الشهر', note:'ملاحظات', apt:'الشقة', location:'الموقع', save:'حفظ وطباعة', update:'تحديث وطباعة', newPage:'جديد', noHist:'لا توجد إيصالات.', loading:'جاري التحميل...', selectFirst:'أدخل اسم المالك أولاً', waSent:'أُرسل', refresh:'تحديث', preview:'معاينة', print:'طباعة', edit:'تعديل', delete:'حذف', date:'التاريخ', noResults:'لا توجد نتائج' },
  ku: { title:'پسوولەکانی پارەدان', newTab:'پسوولەی پارەدانی نوێ', histTab:'مێژوو', search:'گەڕان بە خاوەن، خانوو یان مانگ...', ownerName:'ناوی خاوەن', amount:'بڕی پارە', paidBy:'پارەدەر', currency:'دراو', insteadOf:'لە بڕی', month:'مانگ', note:'تێبینی', apt:'خانوو', location:'شوێن', save:'پاشەکەوت و چاپکردن', update:'نوێکردنەوە و چاپکردن', newPage:'پەڕەی نوێ', noHist:'هیچ پسوولەیەک نییە.', loading:'چاوەڕوانبە...', selectFirst:'تکایە ناوی خاوەن بنووسە', waSent:'نێردرا', refresh:'نوێکردنەوە', preview:'پێشبینین', print:'چاپ', edit:'دەستکاری', delete:'سڕینەوە', date:'بەروار', noResults:'ئەنجام نییە' },
};

const cleanIconLabel = (value) => String(value || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '').trim();
const RECEIPT_REASONS = ['کرێی مانگانە', 'خزمەتگوزاری', 'دڵنیایی', 'فرۆشتن', 'کڕین', 'عربون', 'عمولە', 'وەبەرهێنەر'];
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'dolar' },
  { value: 'IQD', label: 'دیناری عێراقی' },
];
const EDIT_GIVE_RECEIPT_KEY = 'rentpro_edit_give_receipt';
const RECEIPT_FONT = "'NRT', 'NRT Bold', 'Rabar', 'Cairo', Tahoma, Arial, sans-serif";

const EMPTY = (cur) => ({
  ownerName:'', ownerPhone:'', apt:'', location:'', month:'',
  amount:'', currency:cur||'USD', paidBy:'جمشیر شوان',
  instead:RECEIPT_REASONS[0], notes:'', tenant_id:null, receipt_no:'',
});

function receiptRowToForm(row, fallbackCurrency = 'USD') {
  return {
    ownerName: row.tenant_name || row.owner || '',
    ownerPhone: row.tenant_phone || row.owner_phone || '',
    apt: row.apt || '',
    location: row.location || '',
    month: row.month || '',
    amount: String(row.amount ?? ''),
    currency: row.currency || fallbackCurrency,
    paidBy: row.receiver_name || 'جمشیر شوان',
    instead: row.instead || RECEIPT_REASONS[0],
    notes: row.notes || '',
    tenant_id: row.tenant_id || null,
    receipt_no: row.receipt_no || '',
  };
}

export default function GiveReceipts({ mode = 'history' }) {
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
  const [histSearch, setHistSearch] = useState('');
  const [histLoad,   setHistLoad]   = useState(false);
  const tab = isFormMode ? 'new' : 'history';
  const [waStatus,   setWaStatus]   = useState('init');
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState(EMPTY('USD'));
  const [editingId,  setEditingId]  = useState(null);
  const [preview,    setPreview]    = useState(null);

  const loadHistory = async () => {
    setHistLoad(true);
    try {
      const d = await api.getReceipts();
      // Filter only give receipts (receipt_no starts with G-)
      setHistory(Array.isArray(d) ? d.filter(r => String(r.receipt_no).startsWith('G-')) : []);
    } catch(e) { setHistory([]); }
    finally { setHistLoad(false); }
  };

  useEffect(() => {
    Promise.all([api.getTenants(), api.getSettings(), api.waStatus()])
      .then(([ts, s, wa]) => {
        setTenants(ts||[]);
        setSettings(s||{});
        const editRaw = isFormMode ? sessionStorage.getItem(EDIT_GIVE_RECEIPT_KEY) : null;
        if (editRaw) {
          try {
            const editRow = JSON.parse(editRaw);
            setEditingId(editRow.id || null);
            setForm(receiptRowToForm(editRow, s?.currency || 'USD'));
          } catch {
            setForm(EMPTY(s?.currency||'USD'));
          }
          sessionStorage.removeItem(EDIT_GIVE_RECEIPT_KEY);
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

  // Build owner list from tenants (unique owners)
  const owners = [];
  const seen = new Set();
  tenants.forEach(t => {
    if (t.owner && !seen.has(t.owner)) {
      seen.add(t.owner);
      owners.push({ name: t.owner, phone: t.owner_phone||'', apt: t.apt, location: t.location||'' });
    }
  });

  // Also build paid payments grouped by owner
  const paidByOwner = [];
  tenants.forEach(ten => {
    (ten.payments||[]).filter(p => p.status==='paid').forEach(p => {
      paidByOwner.push({ tenant:ten, payment:p });
    });
  });

  const dropList = search.trim()
    ? paidByOwner.filter(({ tenant, payment }) =>
        [tenant.owner||'', tenant.apt, payment.month, tenant.name]
          .join(' ').toLowerCase().includes(search.toLowerCase()))
    : paidByOwner.slice(0,12);

  function selectRow(tenant, payment) {
    setForm(f => ({
      ...f,
      ownerName:  tenant.owner || '',
      ownerPhone: tenant.owner_phone || '',
      apt:        tenant.apt,
      location:   tenant.location || '',
      month:      payment.month,
      amount:     String(payment.amount),
      tenant_id:  tenant.id,
    }));
    setSearch(''); setShowDrop(false);
  }

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  function editReceipt(row) {
    sessionStorage.setItem(EDIT_GIVE_RECEIPT_KEY, JSON.stringify(row));
    navigate('/give-receipts/new');
  }

  function printHistoryReceipt(row) {
    printGiveReceipt(receiptRowToForm(row, settings.currency || 'USD'));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY(settings.currency));
  }

  async function handleSaveAndPrint() {
    if (!form.ownerName) { toast(tx.selectFirst, 'warning'); return; }
    printGiveReceipt(form);

    // Send WhatsApp to owner
    let waSent = false;
    let liveWaStatus = waStatus;
    if (form.ownerPhone) {
      try {
        const status = await api.waStatus();
        liveWaStatus = status?.state || 'init';
        setWaStatus(liveWaStatus);
      } catch {}
    }
    if (liveWaStatus==='ready' && form.ownerPhone) {
      try {
        const sym = {USD:'$',IQD:'د.ع',EUR:'€'}[form.currency]||'$';
        await api.waSend(form.ownerPhone, `عقارات هۆپ زۆن\n\nسڵاو بەرێز: ${form.ownerName},\n\nکرێی مانگی ${form.month} بۆ موڵکی  ${form.apt} وەرگیرا لە لایەن بەرێزتان.\nبڕی پارە: ${sym}${form.amount}\n\nلەگەڵ رێزدا عقارات هۆپ زۆن `, false);
        waSent = true;
        toast('WhatsApp sent to owner', 'success');
      } catch(e) { toast('WhatsApp: '+e.message, 'warning'); }
    }

    setSaving(true);
    try {
      const payload = {
        receipt_no:    form.receipt_no || ('G-' + Date.now().toString().slice(-4)),
        payment_id:    null,
        tenant_id:     form.tenant_id,
        tenant_name:   form.ownerName,
        tenant_phone:  form.ownerPhone,
        apt:           form.apt,
        location:      form.location,
        owner:         form.ownerName,
        owner_phone:   form.ownerPhone,
        month:         form.month,
        amount:        parseFloat(form.amount)||0,
        currency:      form.currency,
        paid_date:     new Date().toISOString().slice(0,10),
        receiver_name: form.paidBy,
        instead:       form.instead,
        notes:         form.notes,
        wa_sent:       waSent,
      };
      if (editingId) await api.updateReceipt(editingId, payload);
      else await api.saveReceipt(payload);
      toast('Saved', 'success');
      loadHistory();
      setEditingId(null);
      navigate('/give-receipts');
    } catch(e) { toast('Error: '+e.message, 'error'); }
    finally { setSaving(false); }
  }

  const filteredHist = histSearch.trim()
    ? history.filter(r => [r.tenant_name,r.apt,r.month,r.receipt_no].join(' ').toLowerCase().includes(histSearch.toLowerCase()))
    : history;

  const inp = { border:'1px solid #c8d3e0', borderRadius:6, padding:'8px 12px', fontSize:14, background:'var(--surface,#fff)', color:'var(--text,#111)', outline:'none', width:'100%', fontFamily:'inherit' };
  const lbl = { fontWeight:700, fontSize:13, color:'#c8a400', whiteSpace:'nowrap' };
  const frow = { display:'flex', alignItems:'center', gap:10 };

  return (
    <div className="receipt-page" dir={isRtl?'rtl':'ltr'} style={{fontFamily:RECEIPT_FONT,fontWeight:700}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div style={{fontWeight:900,fontSize:16}}>HOPEZONE REALESTATE COMPANY</div>
        <div style={{fontWeight:900,fontSize:20,color:'#c8a400',letterSpacing:2}}>پسوولەی پارەدان</div>
        <div style={{border:'2px solid #c8a400',borderRadius:6,padding:'5px 14px',fontWeight:700,color:'#c8a400',fontSize:13}}>
          {new Date().toLocaleDateString('en-GB').split('/').reverse().join('-')}
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:20,borderBottom:'2px solid #e2e8f0',paddingBottom:12}}>
        {isFormMode ? (
          <button type="button" onClick={()=>navigate('/give-receipts')} style={{background:'#64748b',color:'#fff',border:'none',borderRadius:8,padding:'10px 18px',fontWeight:800,cursor:'pointer'}}>
            <ClipboardList size={16} /> {cleanIconLabel(tx.histTab)} ({history.length})
            </button>
        ) : (
          <button type="button" onClick={()=>navigate('/give-receipts/new')} style={{background:'#c8a400',color:'#fff',border:'none',borderRadius:8,padding:'10px 18px',fontWeight:800,cursor:'pointer'}}>
            <Printer size={16} /> {cleanIconLabel(tx.newTab)}
            </button>
        )}
      </div>

      {/* ══ NEW ══ */}
      {tab==='new' && (
        <div style={{background:'var(--surface,#fff)',border:'1px solid #e2e8f0',borderRadius:12,padding:28,maxWidth:900}}>

          {/* Search — search paid payments by owner */}
          <div style={{marginBottom:24,position:'relative'}} ref={dropRef}>
            <input style={{...inp,fontSize:15,padding:'10px 16px'}}
              placeholder={tx.search} value={search}
              onChange={e=>{setSearch(e.target.value);setShowDrop(true);}}
              onFocus={()=>setShowDrop(true)} />
            {showDrop && dropList.length>0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:999,background:'var(--surface,#fff)',border:'1px solid #e2e8f0',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.13)',maxHeight:260,overflowY:'auto'}}>
                {dropList.map(({tenant,payment})=>(
                  <div key={payment.id} onClick={()=>selectRow(tenant,payment)}
                    style={{padding:'10px 16px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#fffbeb'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div>
                      <div style={{fontWeight:700,color:'#c8a400'}}>{tenant.owner||'No owner'}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{tenant.apt} · {tenant.name} · {payment.month}</div>
                    </div>
                    <div style={{fontWeight:700,color:'#c8a400'}}>{payment.amount} {settings.currency||'$'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px 40px'}}>
            <div style={frow}><span style={lbl}>{tx.ownerName}:</span><input style={inp} value={form.ownerName} onChange={e=>setF('ownerName',e.target.value)} /></div>
            <div style={frow}><span style={lbl}>{tx.amount}:</span><input style={inp} value={form.amount} onChange={e=>setF('amount',e.target.value)} placeholder="0" type="number" /></div>
            <div style={frow}><span style={lbl}>{tx.paidBy}:</span><input style={{...inp,direction:'rtl'}} value={form.paidBy} onChange={e=>setF('paidBy',e.target.value)} /></div>
            <div style={frow}><span style={lbl}>{tx.currency}:</span>
              <ReceiptDropdown value={form.currency} options={CURRENCY_OPTIONS} onChange={value => setF('currency', value)} rtl={isRtl} />
            </div>
            <div style={frow}><span style={lbl}>{tx.insteadOf}:</span><ReceiptDropdown value={form.instead} options={RECEIPT_REASONS} onChange={value => setF('instead', value)} rtl /><input style={{...inp,width:130}} value={form.month} onChange={e=>setF('month',e.target.value)} placeholder={tx.month} /></div>
            <div style={frow}><span style={lbl}>{tx.location}:</span><input style={inp} value={form.location} onChange={e=>setF('location',e.target.value)} /><span style={{...lbl,marginInlineStart:8}}>{tx.apt}:</span><input style={{...inp,width:90}} value={form.apt} onChange={e=>setF('apt',e.target.value)} /></div>
            <div style={{...frow,gridColumn:'1/-1'}}><span style={lbl}>{tx.note}:</span><input style={inp} value={form.notes} onChange={e=>setF('notes',e.target.value)} /></div>
          </div>

          {form.amount && (
            <div style={{marginTop:12,padding:'8px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:12,color:'#92400e',direction:'rtl'}}>
              {amountToWords(form.amount, form.currency)}
            </div>
          )}

          {form.ownerPhone && (
            <div style={{marginTop:10,padding:'8px 14px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,fontSize:13}}>
              WhatsApp → <strong>{form.ownerName}</strong> ({form.ownerPhone})
            </div>
          )}

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
            <input style={{...inp,maxWidth:340}} placeholder="Search..." value={histSearch} onChange={e=>setHistSearch(e.target.value)} />
            <button onClick={loadHistory} style={{background:'#c8a400',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontWeight:600,cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}><RefreshCw size={14} /> {tx.refresh}</button>
          </div>
          {histLoad
            ? <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>{tx.loading}</div>
            : filteredHist.length===0
              ? <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}><ClipboardList size={40} style={{marginBottom:12}} /><div style={{fontWeight:600}}>{histSearch ? tx.noResults : tx.noHist}</div></div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                    <thead>
                      <tr style={{background:'#f8fafc',color:'#64748b',fontSize:12,textTransform:'uppercase'}}>
                        {['#',tx.ownerName,tx.apt,tx.month,tx.amount,tx.paidBy,'WA',tx.date,''].map((h,i)=>(
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
                              await api.deleteReceipt(r.id);
                              setHistory(h=>h.filter(x=>x.id!==r.id));
                              toast(tx.delete,'info');
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
            {[['#',preview.receipt_no],[tx.ownerName,preview.tenant_name],[tx.apt,preview.apt],[tx.month,preview.month],[tx.amount,`${preview.amount} ${preview.currency}`],[tx.insteadOf,preview.instead],[tx.paidBy,preview.receiver_name],[tx.note,preview.notes]].map(([label,value])=>(
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
