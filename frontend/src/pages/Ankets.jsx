import { useEffect, useMemo, useState } from 'react';
import { Eye, FilePlus, Home, Printer, Search, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import './Ankets.css';

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

const ANKET_FONT = "'NRT', 'NRT Bold', 'Rabar', 'Cairo', Tahoma, Arial, sans-serif";

const COPY = {
  en: {
    dashboard: 'Dashboard',
    securityTitle: 'Security Anket',
    projectTitle: 'Project Anket',
    securityPaperTitle: 'Tenant Anket',
    projectPaperTitle: 'Project Anket',
    to: 'To',
    date: 'Date',
    forProject: 'For the Project',
    formerTenantName: "Former tenant's name",
    whereToGo: 'Where to go',
    nation: 'Nation',
    mobileNumber: 'Mobile Number',
    currentTenant: 'Current tenant',
    whereTheyCame: 'where they came',
    ownerName: 'Owner Name',
    typeOfProperty: 'Type of property',
    propertyAddress: 'Property Address',
    propertyElectricityNumber: 'Property number (electricity number)',
    tenantName: 'Tenant Name',
    gender: 'Gender',
    alleyName: 'Alley Name',
    numberOfProperty: 'Number of Property',
    seating: 'Seating',
    choose: 'Choose',
    save: 'SAVE',
    newPage: 'NEW PAGE',
    saved: 'Anket saved',
    savedAnkets: 'Saved Ankets',
    noSaved: 'No saved ankets yet.',
    preview: 'Preview',
    print: 'Print',
    delete: 'Delete',
    close: 'Close',
    currentTenantSection: 'Current Tenant',
    formerTenantSection: 'Former Tenant',
    ownerSection: 'Property Owner',
    securityIntro: 'According to the information above, this apartment/property is handed for residential use. The parties should keep all recorded information correct.',
    companyStamp: 'Hope Zone Company Signature',
    securityStamp: 'Security Signature',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    securityTitle: 'استبيان الأمن',
    projectTitle: 'استبيان المشروع',
    securityPaperTitle: 'استبيان المستأجر',
    projectPaperTitle: 'استبيان المشروع',
    to: 'إلى',
    date: 'التاريخ',
    forProject: 'للمشروع',
    formerTenantName: 'اسم المستأجر السابق',
    whereToGo: 'إلى أين ذهب',
    nation: 'القومية',
    mobileNumber: 'رقم الموبايل',
    currentTenant: 'المستأجر الحالي',
    whereTheyCame: 'من أين جاء',
    ownerName: 'اسم المالك',
    typeOfProperty: 'نوع العقار',
    propertyAddress: 'عنوان العقار',
    propertyElectricityNumber: 'رقم العقار (رقم الكهرباء)',
    tenantName: 'اسم المستأجر',
    gender: 'الجنس',
    alleyName: 'اسم الزقاق',
    numberOfProperty: 'رقم العقار',
    seating: 'الجلوس',
    choose: 'اختر',
    save: 'حفظ',
    newPage: 'صفحة جديدة',
    saved: 'تم حفظ الاستبيان',
    savedAnkets: 'الاستبيانات المحفوظة',
    noSaved: 'لا توجد استبيانات محفوظة.',
    preview: 'معاينة',
    print: 'طباعة',
    delete: 'حذف',
    close: 'إغلاق',
    currentTenantSection: 'المستأجر الحالي',
    formerTenantSection: 'المستأجر السابق',
    ownerSection: 'مالك العقار',
    securityIntro: 'حسب المعلومات أعلاه يتم تسليم الشقة / العقار لغرض السكن، ويجب على الأطراف المحافظة على صحة المعلومات المسجلة.',
    companyStamp: 'توقيع شركة هوب زون',
    securityStamp: 'توقيع الأمن',
  },
  ku: {
    dashboard: 'داشبۆرد',
    securityTitle: 'ئانکێتی ئاسایش',
    projectTitle: 'ئانکێتی پرۆژە',
    securityPaperTitle: 'ئانکێتی کرێچی',
    projectPaperTitle: 'ئانکێتی پرۆژە',
    to: 'بۆ',
    date: 'بەروار',
    forProject: 'بۆ پرۆژە',
    formerTenantName: 'ناوی کرێچی پێشوو',
    whereToGo: 'بۆ کوێ دەچێت',
    nation: 'نەتەوە',
    mobileNumber: 'ژمارەی مۆبایل',
    currentTenant: 'کرێچی ئێستا',
    whereTheyCame: 'لە کوێوە هاتوون',
    ownerName: 'ناوی خاوەن',
    typeOfProperty: 'جۆری موڵک',
    propertyAddress: 'ناونیشانی موڵک',
    propertyElectricityNumber: 'ژمارەی موڵک (ژمارەی کارەبا)',
    tenantName: 'ناوی کرێچی',
    gender: 'ڕەگەز',
    alleyName: 'ناوی کۆڵان',
    numberOfProperty: 'ژمارەی موڵک',
    seating: 'دانیشتن',
    choose: 'هەڵبژێرە',
    save: 'پاشەکەوت',
    newPage: 'پەڕەی نوێ',
    saved: 'ئانکێت پاشەکەوت کرا',
    savedAnkets: 'ئانکێتە پاشەکەوتکراوەکان',
    noSaved: 'هیچ ئانکێتێک پاشەکەوت نەکراوە.',
    preview: 'پێشبینین',
    print: 'چاپ',
    delete: 'سڕینەوە',
    close: 'داخستن',
    currentTenantSection: 'کرێچی ئێستا',
    formerTenantSection: 'کرێچی پێشوو',
    ownerSection: 'خاوەن موڵک',
    securityIntro: 'بە پێی زانیارییەکانی سەرەوە، ئەم موڵکە بۆ مەبەستی نیشتەجێبوون بە کرێ دەدرێت و پێویستە زانیارییە تۆمارکراوەکان ڕاست بن.',
    companyStamp: 'واژۆی مۆری کۆمپانیا',
    securityStamp: 'واژۆی مۆری ئاسایش',
  },
};

const SECURITY_ROWS = [
  [
    ['formerTenantName', 'formerTenantName'],
    ['whereToGo', 'whereToGo'],
    ['formerNation', 'nation'],
    ['formerMobile', 'mobileNumber', 'tel'],
  ],
  [
    ['currentTenant', 'currentTenant'],
    ['whereTheyCame', 'whereTheyCame'],
    ['currentNation', 'nation'],
    ['currentMobile', 'mobileNumber', 'tel'],
  ],
  [
    ['ownerName', 'ownerName'],
    ['propertyType', 'typeOfProperty', 'select'],
    ['propertyAddress', 'propertyAddress'],
    ['propertyElectricityNumber', 'propertyElectricityNumber'],
    ['ownerMobile', 'mobileNumber', 'tel'],
  ],
];

const PROJECT_ROWS = [
  [
    ['tenantName', 'tenantName'],
    ['whereTheyCame', 'whereTheyCame'],
    ['gender', 'gender'],
    ['tenantMobile', 'mobileNumber', 'tel'],
  ],
  [
    ['alleyName', 'alleyName'],
    ['propertyNumber', 'numberOfProperty'],
    ['propertyType', 'typeOfProperty', 'select'],
    ['ownerName', 'ownerName'],
    ['seating', 'seating'],
    ['ownerMobile', 'mobileNumber', 'tel'],
  ],
];

const SECURITY_FIELDS = SECURITY_ROWS.flat();
const PROJECT_FIELDS = PROJECT_ROWS.flat();

function today() {
  return new Date().toISOString().slice(0, 10);
}

function anketKey(type, userId = 'guest') {
  return `rp_user_${userId}_${type}_ankets`;
}

function loadAnkets(type, userId) {
  try {
    const key = anketKey(type, userId);
    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    if (rows.length || !userId) return rows;
    const legacyRows = JSON.parse(localStorage.getItem(`rp_${type}_ankets`) || '[]');
    if (legacyRows.length) localStorage.setItem(key, JSON.stringify(legacyRows));
    return legacyRows;
  } catch {
    return [];
  }
}

function writeAnkets(type, userId, rows) {
  localStorage.setItem(anketKey(type, userId), JSON.stringify(rows));
}

function initialValues(type) {
  const base = type === 'security'
    ? { to: '', date: today() }
    : { project: '', date: today() };
  const fields = type === 'security' ? SECURITY_FIELDS : PROJECT_FIELDS;
  fields.forEach(([key]) => {
    base[key] = '';
  });
  return base;
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function valueOf(values, key) {
  return values?.[key] || '-';
}

function paperField(label, value) {
  return `<div class="paper-field"><strong>${esc(label)}:</strong><span>${esc(value || '-')}</span></div>`;
}

function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

function printSecurityAnket(values, text, lang) {
  const dir = lang === 'ar' || lang === 'ku' ? 'rtl' : 'ltr';
  const html = `<!DOCTYPE html>
<html lang="${esc(lang)}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${esc(text.securityTitle)}</title>
  <style>
    @page { size: A4; margin: 18mm 18mm 16mm; }
    * { box-sizing: border-box; }
    @font-face{font-family:'NRT';src:url('/fonts/NRT-Bd.ttf') format('truetype');font-weight:400 900;font-style:normal;}
    body { margin: 0; background: #fff; color: #000; font-family: ${ANKET_FONT}; font-weight: 700; font-size: 12px; line-height: 1.75; }
    .paper { min-height: 250mm; padding-top: 34mm; }
    h1 { margin: 0 0 18px; text-align: center; font-size: 15px; font-weight: 900; }
    h2 { margin: 0 0 20px; text-align: center; font-size: 13px; font-weight: 900; }
    .top { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; align-items: end; }
    .paper-field { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: baseline; min-height: 26px; }
    [dir="rtl"] .paper-field { grid-template-columns: auto 1fr; }
    .paper-field strong { font-weight: 900; white-space: nowrap; }
    .paper-field span { font-weight: 700; border-bottom: 0; min-height: 18px; }
    .intro { margin: 12px 0 20px; font-weight: 700; text-align: justify; }
    .section { border-top: 3px solid #555; padding-top: 18px; margin-top: 18px; }
    .section-title { text-align: center; font-size: 14px; font-weight: 900; margin-bottom: 18px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 48px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px 28px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; margin-top: 48px; text-align: center; font-weight: 900; }
    .signature-line { border-top: 2px solid #222; padding-top: 10px; min-height: 46px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="paper">
    <h1>${esc(text.securityPaperTitle)}</h1>
    <h2>${esc(text.to)} : ${esc(values.to || '-')}</h2>
    <div class="top">
      ${paperField(text.typeOfProperty, valueOf(values, 'propertyType'))}
      ${paperField(text.propertyAddress, valueOf(values, 'propertyAddress'))}
      ${paperField(text.propertyElectricityNumber, valueOf(values, 'propertyElectricityNumber'))}
      ${paperField(text.date, valueOf(values, 'date'))}
    </div>
    <p class="intro">${esc(text.securityIntro)}</p>
    <section class="section">
      <div class="section-title">${esc(text.currentTenantSection)}</div>
      <div class="grid-2">
        ${paperField(text.tenantName, valueOf(values, 'currentTenant'))}
        ${paperField(text.whereTheyCame, valueOf(values, 'whereTheyCame'))}
        ${paperField(text.mobileNumber, valueOf(values, 'currentMobile'))}
        ${paperField(text.nation, valueOf(values, 'currentNation'))}
      </div>
    </section>
    <section class="section">
      <div class="section-title">${esc(text.formerTenantSection)}</div>
      <div class="grid-2">
        ${paperField(text.formerTenantName, valueOf(values, 'formerTenantName'))}
        ${paperField(text.whereToGo, valueOf(values, 'whereToGo'))}
        ${paperField(text.mobileNumber, valueOf(values, 'formerMobile'))}
        ${paperField(text.nation, valueOf(values, 'formerNation'))}
      </div>
    </section>
    <section class="section">
      <div class="section-title">${esc(text.ownerSection)}</div>
      <div class="grid-3">
        ${paperField(text.ownerName, valueOf(values, 'ownerName'))}
        ${paperField(text.propertyAddress, valueOf(values, 'propertyAddress'))}
        ${paperField(text.propertyElectricityNumber, valueOf(values, 'propertyElectricityNumber'))}
        ${paperField(text.mobileNumber, valueOf(values, 'ownerMobile'))}
        ${paperField(text.typeOfProperty, valueOf(values, 'propertyType'))}
      </div>
    </section>
    <div class="signatures">
      <div class="signature-line">${esc(text.securityStamp)}</div>
      <div class="signature-line">${esc(text.companyStamp)}</div>
    </div>
  </main>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1200);};</script>
</body>
</html>`;
  openPrintWindow(html);
}

function printProjectAnket(values, text, lang) {
  const dir = lang === 'ar' || lang === 'ku' ? 'rtl' : 'ltr';
  const fields = [
    [text.forProject, values.project],
    [text.date, values.date],
    [text.tenantName, values.tenantName],
    [text.whereTheyCame, values.whereTheyCame],
    [text.gender, values.gender],
    [text.mobileNumber, values.tenantMobile],
    [text.alleyName, values.alleyName],
    [text.numberOfProperty, values.propertyNumber],
    [text.typeOfProperty, values.propertyType],
    [text.ownerName, values.ownerName],
    [text.seating, values.seating],
    [text.mobileNumber, values.ownerMobile],
  ];
  const html = `<!DOCTYPE html>
<html lang="${esc(lang)}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${esc(text.projectTitle)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    @font-face{font-family:'NRT';src:url('/fonts/NRT-Bd.ttf') format('truetype');font-weight:400 900;font-style:normal;}
    body { margin: 0; color: #000; font-family: ${ANKET_FONT}; font-weight: 700; font-size: 13px; }
    .paper { padding-top: 28mm; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 40px; }
    .field { display: grid; grid-template-columns: auto 1fr; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 7px; min-height: 32px; }
    .field strong { white-space: nowrap; }
  </style>
</head>
<body>
  <main class="paper">
    <h1>${esc(text.projectPaperTitle)}</h1>
    <div class="grid">
      ${fields.map(([label, value]) => `<div class="field"><strong>${esc(label)}:</strong><span>${esc(value || '-')}</span></div>`).join('')}
    </div>
  </main>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1200);};</script>
</body>
</html>`;
  openPrintWindow(html);
}

function Field({ id, label, type, value, onChange, text }) {
  return (
    <label className="anket-field">
      <span>{label}</span>
      {type === 'select' ? (
        <select value={value} onChange={event => onChange(id, event.target.value)}>
          <option value="">{text.choose}</option>
          {PROPERTY_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={event => onChange(id, event.target.value)}
        />
      )}
    </label>
  );
}

function PreviewModal({ record, fields, text, title, onClose, onPrint }) {
  if (!record) return null;
  const values = record.values || {};
  return (
    <div className="anket-modal-backdrop" onClick={onClose}>
      <div className="anket-preview-modal" onClick={event => event.stopPropagation()}>
        <div className="anket-preview-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            <X size={16} />
            {text.close}
          </button>
        </div>
        <div className="anket-preview-grid">
          {fields.map(([key, labelKey]) => (
            <div key={key} className="anket-preview-field">
              <strong>{text[labelKey]}</strong>
              <span>{values[key] || '-'}</span>
            </div>
          ))}
        </div>
        <div className="anket-preview-actions">
          <button type="button" onClick={() => onPrint(record)}>
            <Printer size={15} />
            {text.print}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Ankets({ type = 'security', mode = 'library' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const text = COPY[lang] || COPY.en;
  const isSecurity = type === 'security';
  const [values, setValues] = useState(() => initialValues(type));
  const [records, setRecords] = useState(() => loadAnkets(type, user?.id));
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');

  const fieldRows = useMemo(() => isSecurity ? SECURITY_ROWS : PROJECT_ROWS, [isSecurity]);
  const previewFields = useMemo(() => (
    isSecurity
      ? [['to', 'to'], ['date', 'date'], ...SECURITY_FIELDS]
      : [['project', 'forProject'], ['date', 'date'], ...PROJECT_FIELDS]
  ), [isSecurity]);
  const title = isSecurity ? text.securityTitle : text.projectTitle;
  const dir = lang === 'ar' || lang === 'ku' ? 'rtl' : 'ltr';
  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return records;
    return records.filter(record => {
      const row = record.values || {};
      return [
        record.id,
        record.createdAt,
        row.to,
        row.project,
        row.currentTenant,
        row.formerTenantName,
        row.tenantName,
        row.ownerName,
        row.propertyAddress,
        row.propertyType,
        row.propertyElectricityNumber,
        row.propertyNumber,
        row.alleyName,
        row.currentMobile,
        row.formerMobile,
        row.tenantMobile,
        row.ownerMobile,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [records, search]);

  useEffect(() => {
    setRecords(loadAnkets(type, user?.id));
  }, [type, user?.id]);

  useEffect(() => {
    setValues(initialValues(type));
    setRecords(loadAnkets(type, user?.id));
    setPreview(null);
    setSearch('');
  }, [type, user?.id]);

  function setField(key, value) {
    setValues(current => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const record = { id: Date.now(), type, values: { ...values }, createdAt: new Date().toISOString() };
    const next = [record, ...records];
    writeAnkets(type, user?.id, next);
    setRecords(next);
    toast(text.saved, 'success');
    navigate(`/ankets/${type}`);
  }

  function handleNewPage() {
    setValues(initialValues(type));
  }

  function removeRecord(id) {
    const next = records.filter(record => record.id !== id);
    writeAnkets(type, user?.id, next);
    setRecords(next);
    if (preview?.id === id) setPreview(null);
  }

  function printRecord(record) {
    if (isSecurity) printSecurityAnket(record.values || {}, text, lang);
    else printProjectAnket(record.values || {}, text, lang);
  }

  function renderHistory() {
    return (
      <section className="anket-history">
        <div className="anket-history-head">
          <h2>{text.savedAnkets}</h2>
          <div className="anket-history-head-actions">
            <span>{filteredRecords.length}</span>
            <button type="button" onClick={() => navigate(`/ankets/${type}/new`)}>
              <FilePlus size={15} />
              {text.newPage}
            </button>
          </div>
        </div>
        <div className="anket-history-toolbar">
          <label className="anket-history-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={text.searchAnkets || 'Search ankets...'}
            />
          </label>
        </div>
        {records.length === 0 ? (
          <p className="anket-empty">{text.noSaved}</p>
        ) : filteredRecords.length === 0 ? (
          <p className="anket-empty">{text.noResults || 'No matching ankets.'}</p>
        ) : (
          <div className="anket-table-wrap">
            <table className="anket-history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{isSecurity ? text.currentTenant : text.tenantName}</th>
                  <th>{text.typeOfProperty}</th>
                  <th>{isSecurity ? text.propertyAddress : text.forProject}</th>
                  <th>{text.date}</th>
                  <th>{text.mobileNumber}</th>
                  <th>{text.preview}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => {
                  const row = record.values || {};
                  const mainName = isSecurity
                    ? row.currentTenant || row.ownerName || row.propertyAddress || title
                    : row.tenantName || row.ownerName || row.project || title;
                  const place = isSecurity ? row.propertyAddress : row.project || row.alleyName;
                  const phone = isSecurity ? row.currentMobile || row.ownerMobile || row.formerMobile : row.tenantMobile || row.ownerMobile;
                  return (
                    <tr key={record.id}>
                      <td className="anket-history-id">{record.id}</td>
                      <td>
                        <strong>{mainName}</strong>
                        <small>{isSecurity ? row.ownerName : row.ownerName || '-'}</small>
                      </td>
                      <td>{row.propertyType || '-'}</td>
                      <td>{place || '-'}</td>
                      <td>{row.date || record.createdAt?.slice(0, 10) || '-'}</td>
                      <td>{phone || '-'}</td>
                      <td>
                        <div className="anket-history-actions">
                          <button type="button" className="anket-icon-button view" title={text.preview} aria-label={text.preview} onClick={() => setPreview(record)}>
                            <Eye size={15} />
                          </button>
                          <button type="button" className="anket-icon-button print" title={text.print} aria-label={text.print} onClick={() => printRecord(record)}>
                            <Printer size={15} />
                          </button>
                          <button type="button" className="anket-icon-button delete" title={text.delete} aria-label={text.delete} onClick={() => removeRecord(record.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="anket-page" dir={dir}>
      <div className="anket-header">
        <h1>{title}</h1>
        <div className="anket-breadcrumb">
          <button type="button" onClick={() => navigate('/')} aria-label="Home"><Home size={13} /></button>
          <span>&gt;</span>
          <button type="button" onClick={() => navigate('/dashboard')}>{text.dashboard}</button>
          <span>&gt;</span>
          <strong>{title}</strong>
        </div>
      </div>

      {mode === 'library' ? renderHistory() : (
        <section className="anket-panel">
          <div className="anket-top-row">
            <label className="anket-wide-field">
              <span>{isSecurity ? text.to : text.forProject}:</span>
              <input
                value={isSecurity ? values.to : values.project}
                onChange={event => setField(isSecurity ? 'to' : 'project', event.target.value)}
              />
            </label>
            <label className="anket-wide-field">
              <span>{text.date}:</span>
              <input type="date" value={values.date} onChange={event => setField('date', event.target.value)} />
            </label>
          </div>

          <div className="anket-strip-title">{title}</div>

          <div className="anket-rows">
            {fieldRows.map((row, rowIndex) => (
              <div key={rowIndex} className={`anket-grid cols-${row.length}`}>
                {row.map(([key, labelKey, inputType]) => (
                  <Field
                    key={key}
                    id={key}
                    label={text[labelKey]}
                    type={inputType}
                    value={values[key] || ''}
                    onChange={setField}
                    text={text}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="anket-actions">
            <button type="button" className="anket-save" onClick={handleSave}>
              {text.save} ▣
            </button>
            <button type="button" className="anket-new" onClick={handleNewPage}>
              {text.newPage} ◻
            </button>
          </div>
        </section>
      )}

      <PreviewModal
        record={preview}
        fields={previewFields}
        text={text}
        title={title}
        onClose={() => setPreview(null)}
        onPrint={printRecord}
      />
    </div>
  );
}
