import { useEffect, useMemo, useState } from 'react';
import { Edit3, Eye, FilePlus, Printer, Save, Search, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import './Contracts.css';

const today = () => new Date().toISOString().slice(0, 10);

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

const CURRENCY_OPTIONS = ['dolar', 'دیناری عێراقی'];
const PAYMENT_MODE_OPTIONS = ['کاش', 'قسط'];
const TERMS_VERSION = 8;

const TEXT = {
  en: {
    sellTitle: 'Sell Contracts',
    rentTitle: 'Rent Contract',
    sellSection: 'Sell Contracts',
    rentSection: 'Rent Contract',
    secondaryForm: 'Secondary Form',
    mainForm: 'Main Form',
    savedContracts: 'Saved Contracts',
    dashboard: 'Dashboard',
    save: 'Save',
    newPage: 'New Page',
    createNew: 'Create New',
    edit: 'Edit',
    preview: 'Preview',
    print: 'Print',
    delete: 'Delete',
    emptySaved: 'No saved contracts yet.',
    saved: 'Contract saved',
    updated: 'Contract updated',
    deleted: 'Contract deleted',
    confirmDelete: 'Delete this contract?',
    choose: 'Choose',
    dolar: 'dolar',
    active: 'Active',
    firstParty: 'First Party',
    secondBuyer: 'Second Party (Buyer)',
    ownerParty: 'First party (property owner) ::',
    tenantParty: 'Second party (tenant)',
    mobileNumber: 'Mobile Number',
    propertyType: 'Type of property',
    propertyNumber: 'Number of Property',
    currency: 'Currency',
    price: 'Price',
    moneyLeft: 'Money left',
    dissuadeAmount: 'Amount of dissuade',
    paymentDateLeft: 'payment date left',
    note: 'Note',
    area: 'Area',
    location: 'Location',
    moneyAdvance: 'Amount of Money in Advance',
    punishmentAmount: 'Amount of punishment',
    lawyerName: "Lawyer's name",
    surrenderDate: 'Date of surrender',
    contractType: 'type of contract',
    onDate: 'On the date of',
    amount: 'Amount',
    balanceMade: 'balance be made?',
    introduction: 'as introduction',
    rentalPeriod: 'Rental period',
    forDate: 'For a date',
    purposes: 'for purposes',
    monthAdvance: 'once a month in advance',
    dailyPunishment: 'Punishment after each day',
    assurances: 'such as assurances',
    bothAgreed: 'Both parties agreed on these terms',
    firstSellerSignature: 'First Party (Seller)',
    secondBuyerSignature: 'Second Party (Buyer)',
    ownerSignature: 'First party (property owner)',
    tenantSignature: 'Second party (tenant)',
    organizer: 'Contract organizer / HopeZone Real Estate Company',
    titleLabel: 'Title',
    dateLabel: 'Date',
    priceLabel: 'Price',
    updatedLabel: 'Updated',
    contractNo: 'Contract No.',
    branch: 'Real estate branch',
    neighborhood: 'Neighborhood name',
    building: 'Building',
    floor: 'Floor',
    unitLayout: 'Type',
    organizerName: 'Organizer name',
  },
  ar: {
    sellTitle: 'عقود البيع',
    rentTitle: 'عقد الإيجار',
    sellSection: 'عقود البيع',
    rentSection: 'عقد الإيجار',
    secondaryForm: 'النموذج الثانوي',
    mainForm: 'النموذج الرئيسي',
    savedContracts: 'العقود المحفوظة',
    dashboard: 'لوحة التحكم',
    save: 'حفظ',
    newPage: 'صفحة جديدة',
    createNew: 'إنشاء جديد',
    edit: 'تعديل',
    preview: 'معاينة',
    print: 'طباعة',
    delete: 'حذف',
    emptySaved: 'لا توجد عقود محفوظة بعد.',
    saved: 'تم حفظ العقد',
    updated: 'تم تحديث العقد',
    deleted: 'تم حذف العقد',
    confirmDelete: 'حذف هذا العقد؟',
    choose: 'اختر',
    dolar: 'دولار',
    active: 'نشط',
    firstParty: 'الطرف الأول',
    secondBuyer: 'الطرف الثاني (المشتري)',
    ownerParty: 'الطرف الأول (مالك العقار)',
    tenantParty: 'الطرف الثاني (المستأجر)',
    mobileNumber: 'رقم الهاتف',
    propertyType: 'نوع العقار',
    propertyNumber: 'رقم العقار',
    currency: 'العملة',
    price: 'السعر',
    moneyLeft: 'المبلغ المتبقي',
    dissuadeAmount: 'مبلغ العدول',
    paymentDateLeft: 'تاريخ دفع المتبقي',
    note: 'ملاحظة',
    area: 'المساحة',
    location: 'الموقع',
    moneyAdvance: 'المبلغ المدفوع مقدما',
    punishmentAmount: 'مبلغ الغرامة',
    lawyerName: 'اسم المحامي',
    surrenderDate: 'تاريخ التسليم',
    contractType: 'نوع العقد',
    onDate: 'بتاريخ',
    amount: 'المبلغ',
    balanceMade: 'طريقة تسديد الرصيد',
    introduction: 'كمقدمة',
    rentalPeriod: 'مدة الإيجار',
    forDate: 'إلى تاريخ',
    purposes: 'لغرض',
    monthAdvance: 'مقدما كل شهر',
    dailyPunishment: 'غرامة كل يوم',
    assurances: 'مثل التأمينات',
    bothAgreed: 'اتفق الطرفان على هذه الشروط',
    firstSellerSignature: 'الطرف الأول (البائع)',
    secondBuyerSignature: 'الطرف الثاني (المشتري)',
    ownerSignature: 'الطرف الأول (مالك العقار)',
    tenantSignature: 'الطرف الثاني (المستأجر)',
    organizer: 'منظم العقد / شركة HopeZone العقارية',
    titleLabel: 'العنوان',
    dateLabel: 'التاريخ',
    priceLabel: 'السعر',
    updatedLabel: 'آخر تحديث',
    contractNo: 'رقم العقد',
    branch: 'فرع العقارات',
    neighborhood: 'اسم الحي',
    building: 'البناية',
    floor: 'الطابق',
    unitLayout: 'النوع',
    organizerName: 'اسم المنظم',
  },
  ku: {
    sellTitle: 'گرێبەستەکانی فرۆشتن',
    rentTitle: 'گرێبەستی کرێ',
    sellSection: 'گرێبەستەکانی فرۆشتن',
    rentSection: 'گرێبەستی کرێ',
    secondaryForm: 'فۆرمی لاوەکی',
    mainForm: 'فۆرمی سەرەکی',
    savedContracts: 'گرێبەستە پاشەکەوتکراوەکان',
    dashboard: 'داشبۆرد',
    save: 'پاشەکەوت',
    newPage: 'پەڕەی نوێ',
    createNew: 'دروستکردنی نوێ',
    edit: 'دەستکاری',
    preview: 'پێشبینین',
    print: 'چاپ',
    delete: 'سڕینەوە',
    emptySaved: 'هێشتا هیچ گرێبەستێک پاشەکەوت نەکراوە.',
    saved: 'گرێبەست پاشەکەوت کرا',
    updated: 'گرێبەست نوێ کرایەوە',
    deleted: 'گرێبەست سڕایەوە',
    confirmDelete: 'ئەم گرێبەستە بسڕدرێتەوە؟',
    choose: 'هەڵبژاردن',
    dolar: 'دۆلار',
    active: 'چالاک',
    firstParty: 'لایەنی یەکەم',
    secondBuyer: 'لایەنی دووەم (کڕیار)',
    ownerParty: 'لایەنی یەکەم (خاوەنی موڵک)',
    tenantParty: 'لایەنی دووەم (کرێچی)',
    mobileNumber: 'ژمارەی مۆبایل',
    propertyType: 'جۆری موڵک',
    propertyNumber: 'ژمارەی موڵک',
    currency: 'دراو',
    price: 'نرخ',
    moneyLeft: 'پارەی ماوە',
    dissuadeAmount: 'بڕی پاشگەزبوونەوە',
    paymentDateLeft: 'بەرواری پارەی ماوە',
    note: 'تێبینی',
    area: 'ڕووبەر',
    location: 'شوێن',
    moneyAdvance: 'بڕی پارەی پێشەکی',
    punishmentAmount: 'بڕی سزا',
    lawyerName: 'ناوی پارێزەر',
    surrenderDate: 'بەرواری ڕادەستکردن',
    contractType: 'جۆری گرێبەست',
    onDate: 'لە بەرواری',
    amount: 'بڕ',
    balanceMade: 'چۆنیەتی پارەدانی ماوە',
    introduction: 'وەک پێشەکی',
    rentalPeriod: 'ماوەی کرێ',
    forDate: 'بۆ بەرواری',
    purposes: 'بۆ مەبەستی',
    monthAdvance: 'مانگانە پێشەکی',
    dailyPunishment: 'سزای هەر ڕۆژ',
    assurances: 'وەک دڵنیاییەکان',
    bothAgreed: 'هەردوو لا لەسەر ئەم مەرجانە ڕێککەوتن',
    firstSellerSignature: 'لایەنی یەکەم (فرۆشیار)',
    secondBuyerSignature: 'لایەنی دووەم (کڕیار)',
    ownerSignature: 'لایەنی یەکەم (خاوەنی موڵک)',
    tenantSignature: 'لایەنی دووەم (کرێچی)',
    organizer: 'ڕێکخەری گرێبەست / کۆمپانیای HopeZone بۆ خانوبەرە',
    titleLabel: 'ناونیشان',
    dateLabel: 'بەروار',
    priceLabel: 'نرخ',
    updatedLabel: 'نوێکراوە',
    contractNo: 'ژمارەی گرێبەست',
    branch: 'لقی عقارات',
    neighborhood: 'ناوی گەڕەک',
    building: 'بینایە',
    floor: 'قاتی',
    unitLayout: 'جۆر',
    organizerName: 'ناوی ڕێکخەر',
  },
};

function getText(lang) {
  return { ...TEXT.en, ...(TEXT[lang] || {}) };
}

function useContractSettings() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let alive = true;
    api.getSettings()
      .then(data => { if (alive) setSettings(data || {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return settings;
}

const SELL_FIELDS = {
  left: [
    ['contractDate', 'dateLabel', 'date'],
    ['firstParty', 'firstParty'],
    ['firstMobile', 'mobileNumber'],
    ['propertyType', 'propertyType', 'select'],
    ['propertyNumber', 'propertyNumber'],
    ['currency', 'currency', 'selectCurrency'],
    ['price', 'price'],
    ['balanceMade', 'balanceMade', 'paymentMode'],
    ['dissuadeAmount', 'dissuadeAmount'],
    ['paymentDateLeft', 'paymentDateLeft', 'date'],
    ['note', 'note'],
  ],
  right: [
    ['secondParty', 'secondBuyer'],
    ['secondMobile', 'mobileNumber'],
    ['area', 'area'],
    ['location', 'neighborhood'],
    ['building', 'building'],
    ['floor', 'floor'],
    ['unitLayout', 'unitLayout'],
    ['moneyAdvance', 'moneyAdvance'],
    ['punishmentAmount', 'punishmentAmount'],
    ['lawyerName', 'lawyerName'],
    ['surrenderDate', 'surrenderDate', 'date'],
    ['contractType', 'contractType', 'status'],
  ],
};

const RENT_FIELDS = {
  left: [
    ['contractNo', 'contractNo'],
    ['contractDate', 'dateLabel', 'date'],
    ['ownerParty', 'ownerParty'],
    ['ownerMobile', 'mobileNumber'],
    ['propertyType', 'propertyType', 'select'],
    ['propertyNumber', 'propertyNumber'],
    ['onDate', 'onDate', 'date'],
    ['currency', 'currency', 'selectCurrency'],
    ['amount', 'amount'],
    ['balanceMade', 'balanceMade', 'select'],
    ['moneyAdvance', 'moneyAdvance'],
    ['introduction', 'introduction'],
    ['rentalPeriod', 'rentalPeriod'],
    ['contractType', 'contractType', 'status'],
    ['note', 'note'],
  ],
  right: [
    ['tenantParty', 'tenantParty'],
    ['tenantMobile', 'mobileNumber'],
    ['area', 'area'],
    ['location', 'location'],
    ['forDate', 'forDate', 'date'],
    ['purposes', 'purposes'],
    ['punishmentAmount', 'punishmentAmount'],
    ['monthAdvance', 'monthAdvance'],
    ['surrenderDate', 'surrenderDate', 'date'],
    ['dailyPunishment', 'dailyPunishment'],
    ['assurances', 'assurances'],
  ],
};

function val(value, fallback = '__________') {
  return value ? String(value) : fallback;
}

function displayMoney(value, currency, fallback = '__________') {
  const hasValue = value !== undefined && value !== null && String(value) !== '';
  const raw = hasValue ? String(value) : fallback;
  if (!hasValue && fallback === '__________') return raw;
  if (/[$]|(?:\bID\b)|دینار|دينار|دۆلار|دولار/i.test(raw)) return raw;
  const currencyText = String(currency || '').toLowerCase();
  if (currencyText.includes('dinar') || currencyText.includes('دینار') || currencyText.includes('دينار')) {
    return `${raw} ID`;
  }
  return `$${raw}`;
}

function parseMoney(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const normalized = String(value)
    .replace(/[,$]/g, '')
    .replace(/\bID\b/gi, '')
    .replace(/[^\d.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatMoneyNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

const NUMBER_WORDS = {
  en: {
    ones: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    hundred: 'hundred',
    join: ' ',
    and: ' ',
    scales: ['', 'thousand', 'million', 'billion'],
  },
  ar: {
    ones: ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'],
    tens: ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'],
    hundred: 'مائة',
    join: ' و ',
    and: ' و ',
    scales: ['', 'ألف', 'مليون', 'مليار'],
  },
  ku: {
    ones: ['سفر', 'یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'شەش', 'حەوت', 'هەشت', 'نۆ', 'دە', 'یانزە', 'دوانزە', 'سیانزە', 'چواردە', 'پانزە', 'شانزە', 'حەڤدە', 'هەژدە', 'نۆزدە'],
    tens: ['', '', 'بیست', 'سی', 'چل', 'پەنجا', 'شەست', 'حەفتا', 'هەشتا', 'نەوەد'],
    hundred: 'سەد',
    join: ' و ',
    and: ' و ',
    scales: ['', 'هەزار', 'ملیۆن', 'ملیار'],
  },
};

function chunkToWords(number, lang) {
  const words = NUMBER_WORDS[lang] || NUMBER_WORDS.en;
  const n = Number(number);
  if (n < 20) return words.ones[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const one = n % 10;
    if (!one) return words.tens[ten];
    return lang === 'en'
      ? `${words.tens[ten]} ${words.ones[one]}`
      : `${words.tens[ten]}${words.join}${words.ones[one]}`;
  }

  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let head;
  if (lang === 'en') head = `${words.ones[hundred]} ${words.hundred}`;
  else if (lang === 'ar' && hundred === 1) head = words.hundred;
  else head = `${words.ones[hundred]} ${words.hundred}`;
  return rest ? `${head}${words.and}${chunkToWords(rest, lang)}` : head;
}

function integerToWords(value, lang = 'en') {
  const n = Math.trunc(Math.abs(Number(value)));
  const words = NUMBER_WORDS[lang] || NUMBER_WORDS.en;
  if (!Number.isFinite(n)) return '';
  if (n === 0) return words.ones[0];

  const chunks = [];
  let remaining = n;
  while (remaining > 0) {
    chunks.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  return chunks
    .map((chunk, index) => {
      if (!chunk) return '';
      const scale = words.scales[index];
      return scale ? `${chunkToWords(chunk, lang)} ${scale}` : chunkToWords(chunk, lang);
    })
    .filter(Boolean)
    .reverse()
    .join(words.and);
}

function currencyUnit(currency, lang = 'en', amount = 0) {
  const text = String(currency || '').toLowerCase();
  const isDinar = text.includes('dinar') || text.includes('دینار') || text.includes('دينار') || text.includes('عێراق') || text.includes('عراق');
  if (lang === 'ar') return isDinar ? 'دينار عراقي' : 'دولار';
  if (lang === 'ku') return isDinar ? 'دیناری عێراقی' : 'دۆلار';
  if (isDinar) return amount === 1 ? 'Iraqi dinar' : 'Iraqi dinars';
  return amount === 1 ? 'dollar' : 'dollars';
}

function moneyWithWords(value, currency, lang = 'en', fallback = '__________') {
  const hasValue = value !== undefined && value !== null && String(value) !== '';
  const raw = hasValue ? value : fallback;
  const formatted = displayMoney(raw, currency, fallback);
  const numeric = parseMoney(raw);
  if (numeric === null) return formatted;
  const whole = Math.trunc(Math.abs(numeric));
  const words = integerToWords(whole, lang);
  return `${formatted} (${words} ${currencyUnit(currency, lang, whole)})`;
}

function remainingMoneyValue(values) {
  const price = parseMoney(values.price);
  const advance = parseMoney(values.moneyAdvance);
  if (price !== null && advance !== null) return formatMoneyNumber(Math.max(price - advance, 0));
  return values.moneyLeft;
}

function areaWithUnit(value) {
  const raw = val(value);
  return raw === '__________' || /m2|م2|متر|ڕووبەر/i.test(raw) ? raw : `${raw} m2`;
}

function sellPaperTitle(lang) {
  if (lang === 'ar') return 'عقد البيع والشراء';
  if (lang === 'ku') return 'گرێبەستی کڕین و فرۆشتن';
  return 'Purchase and Sale Contract';
}

function sellAgreementHeading(lang, text) {
  if (lang === 'ar') return 'اتفق الطرفان على النقاط الآتية';
  if (lang === 'ku') return 'هەردوو لایەن رێککەوتن لەسەر ئەم خاڵانەی خوارەوە';
  return text.bothAgreed;
}

function rentPaperTitle(lang) {
  if (lang === 'ar') return 'عقد الإيجار';
  if (lang === 'ku') return 'گرێبەستی کرێ';
  return 'Rent Contract';
}

function organizerSignature(lang, text) {
  if (lang === 'ar') return '(ب- شركة عقارات هوب زون)';
  if (lang === 'ku') return '( ب- کۆمپانیای عقارات هۆپ زۆن )';
  return text.organizer;
}

function buildSellTerms(values, lang = 'en') {
  const price = moneyWithWords(values.price, values.currency, lang);
  const advance = moneyWithWords(values.moneyAdvance, values.currency, lang, '0');
  const remaining = moneyWithWords(remainingMoneyValue(values), values.currency, lang, '0');
  const punishment = moneyWithWords(values.punishmentAmount, values.currency, lang, '0');
  const dissuade = moneyWithWords(values.dissuadeAmount, values.currency, lang, '0');
  const propertyType = val(values.propertyType);
  const propertyNo = val(values.propertyNumber);
  const location = val(values.location);
  const area = areaWithUnit(values.area);
  const paymentModeKu = val(values.balanceMade, 'کاش-قسط');
  const paymentModeAr = val(values.balanceMade, 'نقدا-أقساط');
  const paymentModeEn = val(values.balanceMade, 'cash-installment');

  if (lang === 'ar') {
    return [
      `أنا (${val(values.firstParty)}) الطرف الأول مالك العقار أوافق على بيع هذا العقار المشار إليه أدناه بمبلغ ${price}، نوع العقار ${propertyType}، الرقم ${propertyNo}، الموقع ${location}، المساحة ${area}.`,
      `أنا (${val(values.secondParty)}) الطرف الثاني أوافق على شراء العقار المشار إليه أعلاه بمبلغ ${price}.`,
      `قام الطرف الثاني بتسليم مبلغ ${advance} إلى الطرف الأول كمقدم، والمبلغ المتبقي وقدره (${remaining}) يجب تسليمه بتاريخ (${val(values.paymentDateLeft)}) بطريقة (${paymentModeAr}).`,
      `على الطرف الأول تسليم هذا العقار للطرف الثاني بعد استلام كامل مستحقاته المالية بتاريخ ${val(values.surrenderDate)}.`,
      `إذا لم يقم الطرف الأول بتسليم هذا العقار للطرف الثاني في التاريخ المحدد، فيلتزم بدفع مبلغ ${punishment} كغرامة.`,
      'يتحمل الطرف الأول إلى تاريخ تسليم العقار دفع أي دين إن وجد من خدمات الماء والكهرباء المتعلقة بالعقار المشار إليه.',
      `إذا تراجع أي طرف لأي سبب عن هذا العقد، فيجب عليه تعويض الطرف الآخر بمبلغ ${dissuade}.`,
      `إذا لم يقم الطرف الثاني بتسليم المبلغ المتبقي في التاريخ المحدد، فيلتزم بدفع مبلغ ${dissuade} كغرامة.`,
      'تكون تكاليف ورسوم البيع والنقل والإفراز والدمج والتصحيح وضريبة العقار على الطرف الأول ويدفعها حسب القانون إذا كان العقار طابو. أما إذا لم يكن طابو فيلتزم الطرف الأول بدفع تكاليف نقل الملكية.',
      'تقع تكاليف رسوم الكشف والتسجيل العقاري على الطرف الثاني حسب القانون إذا كان العقار طابو. وإذا لم يكن طابو فعلى الطرف الثاني دفع مبلغ التسجيل باسمه.',
      `بعد توقيع هذا العقد، إذا كان العقار المبيع طابو، فيجب على الطرف الأول إعطاء وكالة للمحامي: (${val(values.lawyerName, 'المحامي')}) لغرض نقل الملكية وتسجيل العقار المبيع للطرف الثاني.`,
      'يلتزم الطرف الأول بدفع نسبة 1% من سعر العقار المشار إليه في هذا العقد للمنظم.',
      'يلتزم الطرف الثاني بدفع نسبة 1% من سعر العقار المشار إليه في هذا العقد للمنظم.',
      'بعد توقيع العقد لا يحق للطرف الأول أو الطرف الثاني المطالبة بإرجاع العمولة المدفوعة.',
      'شركة عقارات هوب زون وسيط بين الطرفين وليست مسؤولة عن أي خلاف خارج مضمون هذا العقد.',
      'عند وجود أي مشكلة بخصوص مضمون هذا العقد، يجب على الطرفين أولا حل المشكلة بطريقة التفاوض والحوار. أما إذا لم تحل، فتحل عن طريق محاكم أربيل.',
    ];
  }

  if (lang === 'ku') {
    return [
      `من (${val(values.firstParty)}) لایەنی یەکەم خاوەنی موڵک ڕازیم بە فرۆشتنی ئەم موڵکەی لە خوارەوە ئاماژەی پێکراوە بە بڕی ${price} جۆری موڵک ${propertyType} ژمارە ${propertyNo} شوێن ${location} ڕووبەر ${area}.`,
      `من (${val(values.secondParty)}) لایەنی دووەم ڕازیم بە کڕینی ئەو موڵکەی لە سەرەوە ئاماژەی پێکراوە بە بڕی ${price}.`,
      `لایەنی دووەم بڕی ${advance} رادەستی لایەنی یەکەم کرد وەکو پێشەکی وە بڕی پارەی ماوە کە بڕی (${remaining}) پێویستە رادەستی بکات لەبەرواری (${val(values.paymentDateLeft)}) بەشێوەی (${paymentModeKu}).`,
      `لەسەر لایەنی یەكەم پێویستە ئەم موڵكە ڕادەستی لایەنی دووەم بكات دوای وەرگرتنی تەواوی شایستە داراییەکانی لە رێكەوتی ${val(values.surrenderDate)}.`,
      `ئەگەر هاتوو لایەنی یەکەم لە ڕێکەوتی دیاریکراودا ئەم موڵکە ڕادەستی لایەنی دووەم نەکرد ئەوا دەبێت پابەندبێت بە پێدانی بڕی ${punishment} وەکو پێبژاردن (غرامە).`,
      'لایەنی یەکەم لەئەستۆیەتی تا بەرواری رادەست کردنی موڵکەکە بە پێدانی هەر قەرزێک ئەگەر هەبێت لە خزمەتگوزاری ئاو کارەبا سەبارەت بە موڵکی ئاماژە پێکراو.',
      `ئەگەر هاتوو هەر لایەنێك بە هەر هۆیەك پاشگەز بێتەوە لەم گرێبەستە دەبێت لایەنەكەی تر قەرەبوو بکاتەوە بە ${dissuade}.`,
      `ئەگەر هاتوو لایەنی دووەم لە بەرواری دیاریکراودا بڕی پارەی ماوەی ئەم موڵکە ڕادەستی لایەنی یەکەم نەکرد ئەوا دەبێت پابەند بێت بە پێدانی بڕی ${dissuade} وەکو پێبژاردن.`,
      'تێچوو و ڕسوماتی فرۆشتن و گواستنەوە و جیاكردنەوە و یەكخستن و ڕاستكردنەوە و باجی خانووبەرە لەسەر لایەنی یەكەمە بیدات بەپێی یاسا ئەگەر تاپۆ بوو. بەڵام ئەگەر تاپۆ نەبوو لایەنی یەكەم پابەندە بە پێدانی بڕی تێچوی گواستنەوەی خاوەنداریەتی.',
      'تێچووی ڕسوماتی كەشف و تۆماری عەقاری دەكەوێتە سەر لایەنی دووەم بە گوێرەی یاسا ئەگەر موڵكەكە تاپۆ بوو. وە ئەگەر تاپۆ نەبوو ئەوە لایەنی دووەم بە پێدانی بڕی پارەی بەناوكردن.',
      `پاش واژوکردن لەسەر ئەم گرێبەستە ئەگەر هاتوو مولکی فرۆشراو تاپۆی هەبوو پێویستە لەسەرلایەنی یەکەم کەوا بریکارنامە بدات بە پارێزەر ${val(values.lawyerName, '')} بەمەبەستی گواستنەوەی خاوەنداریەتی و تۆمارکردنی موڵکی فرۆشراو بۆ لایەنی دووەم.`,
      'لایەنی یەکەم پابەند دەبێ بە پێدانی رێژەی %1 لەنرخی موڵکی ئاماژەپێکراو لەم گرێبەستە بۆ ڕێکخەر.',
      'لایەنی دووەم پابەند دەبێ بە پێدانی رێژەی %1 لەنرخی موڵکی ئاماژەپێکراو لەم گرێبەستە بۆ ڕێکخەر.',
      'لایەنی یەکەم وە لایەنی دووەم دوای واژوو کردنی گرێبەست مافی داواکردنی عمولەی پێدراویان نییە.',
      'کۆمپانیای عقارات هۆپ زۆن نێوەندگیرە لەنێوان هەردوو لایەن و بەرپرس نییە لە هەر کێشەیەک لە دەرەوەی ناوەرۆکی ئەم گرێبەستە.',
      'لەکاتی هەبونی هەر کێشەیەک سەبارەت بەناوەرۆکی ئەم گرێبەستە بە پێویستە لەسەر هەردوولایەن سەرەتا بە شێوازی دانوستاندن و گفتوگۆ کێشەکە چارەسەر بکەن. بەلام ئەگەر چارەسەر نەکرا ئەوا لەرێگەی دادگاکانی هەولێر چارەسەر دەکرێ.',
    ];
  }

  return [
    `I, (${val(values.firstParty)}) the first party and property owner, agree to sell the property mentioned below for the amount of ${price}, property type ${propertyType}, number ${propertyNo}, location ${location}, area ${area}.`,
    `I, (${val(values.secondParty)}) the second party, agree to buy the property mentioned above for the amount of ${price}.`,
    `The second party handed ${advance} to the first party as an advance payment, and the remaining amount (${remaining}) must be handed over on (${val(values.paymentDateLeft)}) by (${paymentModeEn}).`,
    `The first party must deliver this property to the second party after receiving all financial entitlements on ${val(values.surrenderDate)}.`,
    `If the first party does not deliver this property to the second party on the specified date, the first party must pay ${punishment} as a fine.`,
    'The first party is responsible until the property delivery date for paying any debt, if any, for water and electricity services related to the mentioned property.',
    `If either party withdraws from this contract for any reason, that party must compensate the other party with ${dissuade}.`,
    `If the second party does not hand over the remaining money on the specified date, the second party must pay ${dissuade} as a fine.`,
    'The costs and fees of sale, transfer, separation, merging, correction, and real estate tax are on the first party and must be paid according to law if the property has a title deed. If the property has no title deed, the first party is responsible for paying the cost of ownership transfer.',
    'The costs of inspection fees and real estate registration are on the second party according to law if the property has a title deed. If the property has no title deed, the second party is responsible for paying the naming or registration amount.',
    `After signing this contract, if the sold property has a title deed, the first party must give power of attorney to the lawyer ${val(values.lawyerName, '')} for transferring ownership and registering the sold property for the second party.`,
    'The first party must pay 1% of the property price mentioned in this contract to the organizer.',
    'The second party must pay 1% of the property price mentioned in this contract to the organizer.',
    'After signing the contract, the first party and the second party have no right to request the return of the paid commission.',
    'Hope Zone Real Estate Company is an intermediary between both parties and is not responsible for any dispute outside the content of this contract.',
    'If any problem occurs regarding the content of this contract, both parties must first resolve it through negotiation and discussion. If it is not resolved, it will be resolved through the courts of Erbil.',
  ];
}

function buildRentTerms(values, lang = 'en') {
  const rentAmount = moneyWithWords(values.amount, values.currency, lang, '0');
  const advance = moneyWithWords(values.moneyAdvance, values.currency, lang, '0');
  const punishment = moneyWithWords(values.punishmentAmount, values.currency, lang, '0');
  const assurances = moneyWithWords(values.assurances, values.currency, lang, '0');
  const dailyPunishment = moneyWithWords(values.dailyPunishment, values.currency, lang, '0');
  const startDate = val(values.onDate);
  const endDate = val(values.forDate);
  const rentalPeriod = val(values.rentalPeriod, '12');
  const advanceMonths = val(values.monthAdvance, '1');
  const purpose = val(values.purposes);
  const receiptNo = val(values.receiptNo || values.contractNo);

  if (lang === 'ar') {
    return [
      `الطرف الأول موافق على تأجير هذا العقار المشار إليه أعلاه إلى الطرف الثاني.`,
      `مدة هذا العقد (${rentalPeriod}) شهرا، تبدأ من تاريخ (${startDate}) إلى (${endDate})، وعند انتهاء المدة المشار إليها يجب على الطرف الثاني إخلاء المكان المؤجر دون الحاجة إلى أي إشعار.`,
      `اتفق الطرفان على الأجرة الشهرية بمبلغ ${rentAmount}.`,
      `يدفع الطرف الثاني مبلغ ${advance} إلى الطرف الأول كمقدم لمدة (${advanceMonths}) شهر.`,
      `بعد الدفعة المقدمة يتم دفع الإيجار بهذه الطريقة: (${advanceMonths}) شهر.`,
      `يلتزم الطرف الثاني بدفع مبلغ ${assurances} كتأمينات إلى شركة هوب زون حسب وصل رقم (${receiptNo})، ويعاد هذا المبلغ إلى الطرف الثاني بنفس الوصل بعد انتهاء مدة العقد بشرط أن يسلم الطرف الثاني العقار دون أي نقص أو ضرر.`,
      `يستخدم الطرف الثاني هذا العقار لغرض (${purpose})، وعند استخدامه لأي غرض آخر يجب إبلاغ شركة هوب زون وأخذ موافقة الطرف الأول تحريريا. وبخلافه يحق للطرف الأول فسخ هذا العقد دون إشعار الطرف الثاني.`,
      `يتعهد الطرف الثاني بالمحافظة على المكان المؤجر أثناء الانتفاع به والابتعاد عن التخريب والانهيار والاستعمال غير المطلوب.`,
      `من تاريخ توقيع هذا العقد تكون خدمات المشروع والبلدية والكهرباء والماء وأي خدمة أخرى على عاتق الطرف الثاني.`,
      `إذا لم يتمكن الطرف الثاني حتى تاريخ (${startDate}) من الحصول على الموافقة من الجهة المختصة، يفسخ العقد مباشرة ويعاد مبلغ الإيجار المدفوع إلى الطرف الثاني.`,
      `يلتزم الطرف الثاني بدفع الإيجار في الوقت المحدد في هذا العقد. وفي حال التأخر أكثر من (7) أيام، يتم التعامل معه حسب الفقرة (1) من المادة 17 من قانون إيجار العقارات العراقي رقم (87) لسنة 1979، وذلك بإخلاء العقار، وتقع مصاريف إنذار المحكمة على عاتق الطرف الثاني مع الأجرة الشهرية.`,
      `إذا كان المكان المؤجر مفروشا، يجب على الطرف الثاني المحافظة على الأثاث، وعند إخلاء المكان المؤجر يجب تسليمه إلى الطرف الأول كما هو. وبخلافه يكون الطرف الثاني مسؤولا عن إصلاحه أو تغييره على نفقته.`,
      `يلتزم الطرف الأول بدفع المستحقات الحكومية والخاصة والخدمات وتنظيف الذمة قبل التأجير وتوقيع هذا العقد.`,
      `يجب على الطرف الثاني إبلاغ شركة هوب زون قبل شهر واحد من انتهاء هذا العقد إذا كان يرغب في التجديد أو إخلاء المكان المؤجر. وبخلافه تقع أجرة شهر واحد على عاتق الطرف الثاني.`,
      `بعد انتهاء مدة هذا العقد، إذا لم يلتزم الطرف الثاني بالإخلاء أو التجديد، فإن أجرة العقار تصبح يومية بمبلغ ${dailyPunishment} عن كل يوم إلى حين حل المشكلة.`,
      `إذا أراد الطرف الثاني إجراء أي تغيير داخل أو خارج هذا العقار، فيجب أن يكون ذلك بعلم شركة هوب زون وبموافقة خطية من الطرف الأول، ويجب تحديد التغييرات.`,
      `إذا انتقلت ملكية هذا العقار خلال مدة هذا العقد إلى أي طرف آخر، فيجب على المالك الجديد الالتزام بمضمون هذا العقد.`,
      `إذا أخلى الطرف الثاني المكان المؤجر قبل انتهاء مدة هذا العقد، تساعد شركة هوب زون حسب الإمكانية في إعادة جزء أو كل إيجار مدة الإخلاء بشرط أن يتم تأجير العقار مرة أخرى عن طريق شركة هوب زون.`,
      `عند إخلاء المكان المؤجر، يجب على الطرف الثاني تسليم العقار إلى الطرف الأول كما استلمه دون أي نقص أو تقصير، وبخلافه يكون مسؤولا عن إصلاح النواقص بأسرع وقت.`,
      `يلتزم الطرف الثاني بدفع ماء وكهرباء الدولة عند صدور الوصولات، وعند الإخلاء يجب عليه مراجعة الدوائر لدفع أي دين بذمته وإبراز جميع الوصولات، وبخلافه يكون مسؤولا أمام القانون.`,
      `عند تجديد العقد، يلتزم كل طرف بدفع نصف أجرة شهر لسنة واحدة إلى شركة هوب زون.`,
      `لا يجوز للطرف الثاني بأي شكل أن يكون سببا للإزعاج أو الأذى لجيرانه، وبخلافه يكون مسؤولا ويلغى العقد.`,
      `في حال عدم حل مشكلة الطرف الأول والثاني بالحوار والتفاوض، فإن شركة هوب زون غير مسؤولة، ويجب على الأطراف حل المشكلة باتخاذ الإجراءات القانونية واللجوء إلى المحكمة المختصة.`,
      `كل من الطرف الأول والطرف الثاني يجب أن يدفع نصف أجرة شهر عن كل سنة إلى شركة هوب زون مقابل تنظيم هذا العقد.`,
    ];
  }

  if (lang === 'ku') {
    return [
      `لایەنی یەکەم ڕەزامەندە لەسەر بەکرێدانی ئەم موڵکە کە لە سەرەوە ئاماژەی پێکراوە بە لایەنی دووەم.`,
      `ماوەی ئەم گرێبەستە (${rentalPeriod}) مانگە دەستپێدەکات لە بەرواری (${startDate}) تا (${endDate}) وە لە کاتی کۆتایی هاتنی ماوەی ئاماژە پێکراو لەسەر لایەنی دووەمە کە شوێنی بەکرێگیراو چۆڵ بکات بێ ئەوەی پێویستی بە ئاگادارکردنەوەی هەبێت.`,
      `هەردوو لایەن ڕەزامەندن لەسەر کرێی مانگانەی بە بڕی ${rentAmount}.`,
      `لایەنی دووەم بڕی ${advance} دەدات بە لایەنی یەکەم وەک پێشەکی (${advanceMonths}) مانگ.`,
      `دوای پێشەکی کرێیەکە بەم شێوەیە دەدرێت (${advanceMonths}) مانگ.`,
      `لایەنی دووەم پابەند دەبێت بە پێدانی بڕی ${assurances} وەک دڵنیایی(تأمینات) بە کۆمپانیای هۆپ زۆن بە پێی پسوولەی ژمارە (${receiptNo}) وە ئەم بڕە پارەیە دەگەڕێندرێتەوە بۆ لایەنی دووەم بە هەمان پسوولە دوای کۆتایی هاتنی ماوەی گرێبەست، بە مەرجێک لایەنی دووەم موڵکەکە بەبێ بوونی هیچ کەم و کوڕیەک ڕادەست بکاتەوە.`,
      `لایەنی دووەم ئەم موڵکە بەکاردێنێت بۆ مەبەستی (${purpose}) لە کاتی بەکارهێنانی بۆ هەر مەبەستێکی تر پێویستە ئاگاداری کۆمپانیای هۆپ زۆن بکات و ڕەزامەندی لایەنی یەکەم بە نووسراو وەربگرێت. بە پێچەوانەوە مافی لایەنی یەکەمە ئەم گرێبەستە هەڵبوەشێنێتەوە بەبێ ئاگادارکردنەوەی لایەنی دووەم.`,
      `لایەنی دووەم بەڵێن دەدات کە پارێزگاری لە شوێنی بەکرێگیراو بکات لە کاتی سوود وەرگرتن لە شوێنەکە وە دووری بگرێت لە تێکچوون و داڕمان وە بەکارنەهێنانی بە شێوەیەکی نەخوازراو.`,
      `لە بەرواری واژووکردنی ئەم گرێبەستە خزمەتگوزاریەکانی پرۆژە و شارەوانی و کارەبا و ئاو و هەر خزمەتگوزاریەکی تر هەبێت لە ئەستۆی لایەنی دووەم دەبێت.`,
      `ئەگەر لایەنی دووەم تاکو بەرواری (${startDate}) نەیتوانی ڕێپێدان لە لایەنی پەیوەندیدار وەربگرێت، ڕاستەوخۆ گرێبەستەکە هەڵدەوەشێتەوە وە ئەو بڕە کرێیەی کەوا دراوە دەگەڕێنرێتەوە بۆ لایەنی دووەم.`,
      `لایەنی دووەم پابەند دەبێ بە پێدانی کرێ لە کاتی دیاریکراو لەم گرێبەستە. لە کاتی دواکەوتن لە (7) ڕۆژ زیاتر ئەوە بە پێی برگەی (1) لە ماددەی 17 لە یاسای بەکرێدانی موڵک لە قانونی عێراقی ژمارە (87) ساڵی 1979 مامەڵەی لەگەڵ دەکرێ، ئەویش بە چۆڵکردنی موڵکەکە و تێچووی هۆشداری دادگا ئەکەوێتە ئەستۆی لایەنی دووەم لەگەڵ کرێی مانگانە.`,
      `ئەگەر شوێنی بەکرێگیراو ڕاخراو بوو (مۆثث)، لایەنی دووەم پێویستە پارێزگاری لە کەل و پەلەکان بکات و لە کاتی چۆڵکردنی شوێنی بەکرێگیراو وەک خۆی ڕادەستی لایەنی یەکەم بکاتەوە، بە پێچەوانەوە لایەنی دووەم بەرپرسە لە چاککردنەوە یان گۆڕینی لەسەر ئەرکی خۆی.`,
      `لایەنی یەکەم پابەند دەبێت بە پێدانی پارەی حکومی و تایبەت(ئەهلی) و خزمەتگوزاریەکان و ئەستۆپاکی بکات پێش بەکرێدان و واژووکردنی ئەم گرێبەستە.`,
      `لایەنی دووەم پێویستە (مانگێک) پێش کۆتایی هاتنی ئەم گرێبەستە ئاگاداری کۆمپانیای هۆپ زۆن بکات بەوەی ئەگەر نیازی هەبێت بە نوێکردنەوە یان بە چۆڵکردنی شوێنی بەکرێگیراو. بە پێچەوانەوە کرێی (مانگێک) دەکەوێتە ئەستۆی لایەنی دووەم.`,
      `دوای تەواوبوونی ماوەی ئەم گرێبەستە ئەگەر لایەنی دووەم پابەند نەبێ بە چۆڵکردن یان نوێکردنەوەی ئەم گرێبەستە، ئەوا کرێی موڵکەکە دەبێت بە ڕۆژانە بە بڕی ${dailyPunishment} بۆ هەر ڕۆژێک هەژمار دەکرێت تا ئەو کاتەی کێشەکە یەکلایی دەبێتەوە.`,
      `ئەگەر لایەنی دووەم نیازی هەبێت هەر جۆرە گۆڕانکاریەک بکات لە ناوەوە یان دەرەوەی ئەم موڵکە، ئەوا پێویستە بە ئاگاداری کۆمپانیای هۆپ زۆن و بە ڕەزامەندی نووسراوی لایەنی یەکەم بێت وە پێویستە گۆڕانکاریەکان دیاری بکرێت.`,
      `ئەگەر لە ماوەی ئەم گرێبەستە خاوەنداریەتی ئەم موڵکە گواسترایەوە بۆ هەر لایەنێکی تر ئەوا ئەبێ خاوەنە نوێیەکەی پابەندی نێوەرۆکی ئەم گرێبەستە بێ.`,
      `ئەگەر لایەنی دووەم پێش کۆتایی هاتنی ئەم گرێبەستە شوێنی بەکرێگیراوی چۆڵ کرد، ئەوا کۆمپانیای هۆپ زۆن بە پێی توانا هاوکار دەبێ بۆ گێڕانەوەی (بەشێک یان گشت) کرێی ماوەی چۆڵکردنی موڵکەکە بە مەرجێک ئەگەر موڵکەکە بەکرێدرایەوە لە لایەن کۆمپانیای هۆپ زۆن.`,
      `لە کاتی چۆڵکردن شوێنی بەکرێگیراو پێویستە لایەنی دووەم چۆن موڵکەکەی وەرگرتووە وەک خۆی بەبێ کەم و کورتی ڕادەستی لایەنی یەکەم بکاتەوە، بە پێچەوانەوە بەرپرسە لە چاککردنەوەی کەم و کوڕیەکان بە زووترین کات.`,
      `لایەنی دووەم پابەندە بە پێدانی پارەی ئاو و کارەبای نیشتمانی لەگەڵ هاتنەوەی پسوولە وە پێویستە لە کاتی چۆڵکردنی شوێنی بەکرێگیراو سەردانی فەرمانگەکان بکات بۆ پێدانی ئەو بڕە قەرزەی کە لە ئەستۆیەتی وە پابەند دەبێت بە دەرخستنی گشت پسوولەکان، بە پێچەوانەوە بەرپرسیار دەبێت بەرامبەر بە یاسا.`,
      `لە کاتی نوێکردنەوەی گرێبەست هەر لایەنێک پابەند دەبێت بە پێدانی کرێی نیو مانگ بۆ یەک ساڵ بە کۆمپانیای هۆپ زۆن.`,
      `لایەنی دووەم بە هیچ شێوەیەک نابێت ببێتە مایەی ئەزیەت و ئازار بۆ دراوسێیەکانی و بە پێچەوانەوە بەرپرسیار دەبێت و گرێبەستەکە هەڵدەوەشێتەوە.`,
      `لە کاتی چارەسەر نەبوونی کێشەی لایەنی یەکەم و دووەم بە شێوازی گفتوگۆ و دانوستاندن، ئەوا کۆمپانیای هۆپ زۆن بەرپرس نیە و نابێت بەڵکو پێویستە لەسەر لایەنەکان کێشەکە چارەسەر بکەن بە گرتنەبەری ڕێکاری یاسایی و پەنابردن بۆ دادگای تایبەت.`,
      `هەر یەک لە لایەنی یەکەم و لایەنی دووەم پێویستە بڕی کرێی نیو مانگ بۆ هەر ساڵێک بدەن بە کۆمپانیای هۆپ زۆن لە بڕی ڕێکخستنی ئەم گرێبەستە.`,
    ];
  }

  return [
    `The first party agrees to rent the property mentioned above to the second party.`,
    `The term of this contract is (${rentalPeriod}) month(s), starting on (${startDate}) and ending on (${endDate}). At the end of this period, the second party must vacate the rented place without needing any notice.`,
    `Both parties agree on the monthly rent amount of ${rentAmount}.`,
    `The second party pays ${advance} to the first party as an advance payment for (${advanceMonths}) month(s).`,
    `After the advance payment, the rent will be paid every (${advanceMonths}) month(s).`,
    `The second party is committed to paying ${assurances} as insurance to Hope Zone Company according to receipt number (${receiptNo}). This amount will be returned to the second party with the same receipt after the contract period ends, provided the property is returned without any shortage or damage.`,
    `The second party will use this property for the purpose of (${purpose}). If it is used for any other purpose, the second party must notify Hope Zone Company and obtain written approval from the first party. Otherwise, the first party has the right to cancel this contract without notifying the second party.`,
    `The second party promises to preserve the rented place while using it and to avoid damage, collapse, or unwanted use.`,
    `From the date of signing this contract, project services, municipality, electricity, water, and any other service costs are the responsibility of the second party.`,
    `If the second party cannot obtain permission from the relevant authority by (${startDate}), this contract is cancelled immediately and the paid rent amount is returned to the second party.`,
    `The second party is committed to paying the rent at the specified time in this contract. If payment is delayed for more than (7) days, the second party will be treated according to clause (1) of article 17 of Iraqi property rental law number (87) of 1979, including vacating the property, and the cost of the court warning will be the responsibility of the second party together with the monthly rent.`,
    `If the rented place is furnished, the second party must protect the furniture and, when vacating the rented place, return it to the first party as it was. Otherwise, the second party is responsible for repairing or replacing it at their own expense.`,
    `The first party is committed to paying government and private service dues and clearing all liabilities before renting and signing this contract.`,
    `The second party must notify Hope Zone Company one month before the end of this contract if they intend to renew or vacate the rented place. Otherwise, one month of rent will be due from the second party.`,
    `After the term of this contract ends, if the second party is not committed to vacating or renewing this contract, the rent of the property becomes daily in the amount of ${dailyPunishment} for each day until the issue is resolved.`,
    `If the second party wants to make any change inside or outside this property, it must be with the knowledge of Hope Zone Company and written approval from the first party, and the changes must be specified.`,
    `If ownership of this property is transferred to any other party during the term of this contract, the new owner must comply with the contents of this contract.`,
    `If the second party vacates the rented place before the end of this contract, Hope Zone Company will assist as much as possible in returning part or all of the rent for the remaining vacated period, provided the property is rented again through Hope Zone Company.`,
    `When vacating the rented place, the second party must return the property to the first party as received, without any shortage or deficiency. Otherwise, the second party is responsible for repairing the deficiencies as soon as possible.`,
    `The second party is committed to paying national water and electricity bills when receipts are issued, and when vacating the place must visit the departments to pay any debt under their responsibility and provide all receipts. Otherwise, the second party will be responsible before the law.`,
    `When renewing the contract, each party is committed to paying half a month rent for one year to Hope Zone Company.`,
    `The second party must not in any way become a source of annoyance or harm to neighbors. Otherwise, the second party will be responsible and the contract will be cancelled.`,
    `If the issue between the first and second parties cannot be solved through dialogue and negotiation, Hope Zone Company is not responsible. The parties must solve the issue by taking legal procedures and resorting to the competent court.`,
    `Each of the first party and the second party must pay half a month rent for each year to Hope Zone Company for arranging this contract.`,
  ];

  if (lang === 'ar') {
    return [
      `أنا الطرف الأول مالك ${val(values.propertyType)} رقم ${val(values.propertyNumber)} في ${val(values.location)} أؤجره للطرف الثاني من تاريخ ${val(values.onDate)} إلى تاريخ ${val(values.forDate)} بأجرة شهرية قدرها ${val(values.amount)}، وقد استلمت مبلغ ${val(values.moneyAdvance, '0')} كدفعة مقدمة لمدة ${val(values.monthAdvance)} شهر.`,
      `أنا الطرف الثاني أستأجر هذا العقار من الطرف الأول لمدة ${val(values.rentalPeriod)} شهر وأستخدمه لغرض ${val(values.purposes)}.`,
      `يلتزم الطرف الثاني بدفع الإيجار ${val(values.monthAdvance)} شهرا مقدما.`,
      `يلتزم الطرف الأول بتسليم العقار إلى الطرف الثاني دون أي نقص في تاريخ ${val(values.surrenderDate)}، وبخلافه يدفع غرامة قدرها ${val(values.punishmentAmount)} عن كل يوم تأخير.`,
      'تساعد شركة HopeZone العقارية الطرفين إلى نهاية العقد لاستمرار العقد وحل مشاكلهما إن وجدت، لكنها غير مسؤولة عن أي نزاع ينشأ بينهما، وهي وسيط فقط.',
      `بعد انتهاء مدة العقد أو عند إخلاء هذا العقار (${val(values.propertyType)}) يجب على الطرف (${val(values.tenantParty)}) تسليمه دون أي نقص.`,
      `يلتزم الطرف الثاني بدفع مبلغ ${val(values.assurances, '0')} إلى شركة HopeZone العقارية كتأمين إلى نهاية هذا العقد.`,
      'من تاريخ توقيع هذا العقد تكون جميع مصاريف المشروع والبلدية والكهرباء والماء وأي خدمات أخرى على عاتق الطرف الثاني.',
      'يلتزم الطرف الثاني بدفع بدل الإيجار في الوقت المحدد في هذا العقد، وإذا تأخر أكثر من (7) أيام فيعامل حسب الفقرة (1) من المادة (17) من قانون إيجار العقارات العراقي رقم (87) لسنة (1979)، ويكون إخلاء العقار ومصاريف الإنذار القضائي مع بدل الإيجار الشهري على عاتق الطرف الثاني.',
      'إذا كان العقار المؤجر مفروشا، فيجب على الطرف الثاني المحافظة على الأثاث عند إخلاء العقار وتسليمه للطرف الأول كما استلمه، وبخلافه يكون مسؤولا عن إصلاحه أو تبديله على نفقته.',
      `عند انتهاء مدة هذا العقد، إذا لم يلتزم الطرف الثاني بإخلاء العقار أو تجديد العقد، تحتسب أجرة يومية قدرها ${val(values.dailyPunishment)} عن كل يوم إلى حين حل المشكلة.`,
      'طالما هذا العقد نافذ، وإذا انتقلت ملكية العقار إلى طرف آخر، فيلتزم المالك الجديد بمضمون هذا العقد.',
      'يلتزم كل من الطرف الأول والطرف الثاني بدفع نصف أجرة شهر إلى شركة HopeZone العقارية مقابل تنظيم هذا العقد.',
      'عند إخلاء العقار المؤجر يجب على الطرف الثاني تسليم العقار إلى الطرف الأول كما استلمه دون أي ضرر أو نقص، وبخلافه يكون مسؤولا عن إصلاح النقص بأسرع وقت.',
      'عند تجديد العقد يلتزم كل طرف بدفع نصف أجرة شهر إلى شركة HopeZone العقارية عن كل سنة.',
      'يجب ألا يكون الطرف الثاني بأي شكل مصدرا لإزعاج الجيران، وبخلافه يكون مسؤولا وقد يؤدي ذلك إلى إنهاء العقد.',
      'في حال عدم القدرة على حل مشكلة الطرفين بالتفاوض، فإن شركة HopeZone العقارية غير مسؤولة، وعلى الطرفين حل المشكلة بالإجراءات القانونية والتوجه إلى المحكمة المختصة.',
      'شركة HopeZone العقارية غير مسؤولة عن أي مشاكل تحدث بين الطرفين.',
    ];
  }

  if (lang === 'ku') {
    return [
      `من لایەنی یەکەمم، خاوەنی ${val(values.propertyType)} ژمارە ${val(values.propertyNumber)} لە ${val(values.location)}، دەیدەمە لایەنی دووەم بە کرێ لە بەرواری ${val(values.onDate)} هەتا بەرواری ${val(values.forDate)} بە کرێی مانگانەی ${val(values.amount)}، و بڕی ${val(values.moneyAdvance, '0')}م وەرگرت وەک پارەی پێشەکی بۆ ${val(values.monthAdvance)} مانگ.`,
      `من لایەنی دووەمم، ئەم موڵکەم لە لایەنی یەکەم بە کرێ گرتووە بۆ ماوەی ${val(values.rentalPeriod)} مانگ و بەکاری دەهێنم بۆ ${val(values.purposes)}.`,
      `لایەنی دووەم پێویستە کرێی ${val(values.monthAdvance)} مانگ پێشەکی بدات.`,
      `لایەنی یەکەم پێویستە ئەم موڵکە بەبێ هیچ کەم و کوڕییەک ڕادەستی لایەنی دووەم بکات لە بەرواری ${val(values.surrenderDate)}، بە پێچەوانەوە پێویستە بڕی ${val(values.punishmentAmount)} وەک سزا بۆ هەر ڕۆژ دواکەوتن بدات.`,
      'کۆمپانیای HopeZone بۆ خانوبەرە یارمەتی هەردوو لایەن دەدات هەتا کۆتایی گرێبەست بۆ بەردەوامی گرێبەست و چارەسەری کێشەکان ئەگەر هەبن، بەڵام کۆمپانیا بەرپرسیار نییە لە هیچ ناکۆکییەک کە لە نێوانیاندا ڕوو بدات، تەنها ناوبژیوانە.',
      `دوای کۆتایی هاتنی گرێبەست یان لە کاتی چۆڵکردنی ئەم موڵکە (${val(values.propertyType)})، لایەنی (${val(values.tenantParty)}) پێویستە بەبێ هیچ کەم و کوڕییەک ڕادەستی بکات.`,
      `لایەنی دووەم پێویستە بڕی ${val(values.assurances, '0')} بدات بە کۆمپانیای HopeZone بۆ خانوبەرە وەک دڵنیایی هەتا کۆتایی ئەم گرێبەستە.`,
      'لە بەرواری واژۆکردنی ئەم گرێبەستەوە، هەموو خەرجییەکانی پڕۆژە، شارەوانی، کارەبا، ئاو و هەر خزمەتگوزارییەکی تر دەکەوێتە ئەستۆی لایەنی دووەم.',
      'لایەنی دووەم پابەندە بە دانی کرێ لە کاتی دیاریکراو لەم گرێبەستەدا. ئەگەر زیاتر لە (7) ڕۆژ دوا بکەوێت، بە پێی خاڵی (1) لە ماددەی (17) لە یاسای کرێی موڵکەکانی عێراق ژمارە (87) ساڵی (1979) مامەڵەی لەگەڵ دەکرێت، چۆڵکردنی موڵک و خەرجی ئاگادارکردنەوەی دادگا لەگەڵ کرێی مانگانە دەکەوێتە ئەستۆی لایەنی دووەم.',
      'ئەگەر موڵکە بەکرێدراوەکە پڕکەرەوە بوو، لایەنی دووەم پێویستە کەرەستەکان بپارێزێت و لە کاتی چۆڵکردن وەک وەرگرتنی ڕادەستی لایەنی یەکەم بکات؛ بە پێچەوانەوە بەرپرسیارە لە چاککردنەوە یان گۆڕینیان بە خەرجی خۆی.',
      `کاتێک ماوەی ئەم گرێبەستە کۆتایی دێت، ئەگەر لایەنی دووەم پابەند نەبێت بە چۆڵکردنی موڵک یان نوێکردنەوەی گرێبەست، کرێی ڕۆژانە بە بڕی ${val(values.dailyPunishment)} بۆ هەر ڕۆژ هەژمار دەکرێت هەتا کێشەکە چارەسەر دەبێت.`,
      'هەتا ئەم گرێبەستە کارا بێت، ئەگەر خاوەندارێتی موڵک بگوازرێتەوە بۆ لایەنێکی تر، خاوەنی نوێ پێویستە پابەندی ناوەڕۆکی ئەم گرێبەستە بێت.',
      'هەر یەک لە لایەنی یەکەم و لایەنی دووەم پێویستە نیو کرێی مانگ بدەن بە کۆمپانیای HopeZone بۆ خانوبەرە بۆ ڕێکخستنی ئەم گرێبەستە.',
      'لە کاتی چۆڵکردنی موڵکە بەکرێدراوەکە، لایەنی دووەم پێویستە موڵکەکە وەک وەرگرتنی بەبێ هیچ زیان یان کەم و کوڕییەک ڕادەستی لایەنی یەکەم بکات، بە پێچەوانەوە بەرپرسیارە لە چاککردنەوەی کەم و کوڕییەکان بە زووترین کات.',
      'لە کاتی نوێکردنەوەی گرێبەست، هەر لایەنێک پابەند دەبێت بڕی نیو کرێی مانگ بدات بە کۆمپانیای HopeZone بۆ خانوبەرە بۆ هەر ساڵێک.',
      'لایەنی دووەم نابێت بە هیچ شێوەیەک ببێتە هۆی بێزارکردنی دراوسێکان؛ بە پێچەوانەوە بەرپرسیار دەبێت و دەبێتە هۆی کۆتاییهێنانی گرێبەست.',
      'ئەگەر نەتوانرێت کێشەی لایەنی یەکەم و دووەم بە گفتوگۆ چارەسەر بکرێت، کۆمپانیای HopeZone بۆ خانوبەرە بەرپرسیار نییە، و لایەنەکان پێویستە کێشەکە بە ڕێکاری یاسایی و لە دادگای تایبەتمەند چارەسەر بکەن.',
      'کۆمپانیای HopeZone بۆ خانوبەرە بەرپرسیار نییە لە هیچ کێشەیەک کە لە نێوان هەردوو لایەن ڕوو دەدات.',
    ];
  }

  return [
    `I Am the first party the owner of ${val(values.propertyType)} Number ${val(values.propertyNumber)} In ${val(values.location)} give it to the second party for rent in this date ${val(values.onDate)} To ${val(values.forDate)} date with monthly rent ${rentAmount} and by the amount. ${advance} I take as an down payment ${val(values.monthAdvance)} Month.`,
    `Iam second party I rent this I've hired him on the first side for a while ${val(values.rentalPeriod)} Month and I use it for ${val(values.purposes)}.`,
    `Iam second party I obliged to pay the rent ${val(values.monthAdvance)} once advance guard.`,
    `The first party binding to surrender this to the second party without any shortage in agreement ${val(values.surrenderDate)} in reverse must pay fine to the second party with value of ${punishment} for everyday delaying.`,
    'HopeZone RealEstate Company shall assist both parties until the end of the contract for subsistence and continuance of the contract and solving their problems if there is any, but the company is not responsible for any disputes arise between them. It is only an intermediary.',
    `After the expiration of the contract or in the case of emptying this (${val(values.propertyType)}) the party must be (${val(values.tenantParty)}) surrender without any shortage.`,
    `Second party binding to give the value of ${assurances} to HopeZone RealEstate Company like insurance till to the end of this contract.`,
    'From the date of signing this contract all the expenses of the project, municipality, electricity, water and any other services will be the liability of the second party.',
    'The second party will be committed to paying the lease fee at the specified time stated in this contract. And in the case of getting delayed for more than (7) days, then the second party will be dealt with according to the Clause (1) from article (17) in the law for leasing the properties of the Iraqi Law number (87) in the year (1979) which is evacuating the property and the expenses for the court notice plus the monthly lease fee will be the liability of the second party.',
    'If the leased property was furnished, the second party should protect this stuff when evacuating the property, it should deliver to the first party as it was when being received. Otherwise, the second party will be responsible for repairing or changing the stuff on its own expense.',
    `When the duration of this contract ends if the second party is not committed to evacuating the property or renewing this contract in this case the lease fee of the property will be on daily basis ${dailyPunishment} for each day will be counted until the problem is being solved.`,
    'As far as this contract is active and if the property ownership transferred to another party then the new owner should commit to the content of this contract.',
    'Each one of the first and the second party should pay half a month lease fee to HopeZone RealEstate Company for arranging this contract.',
    'When evacuating the leased property the second party should deliver the property to the first party as it was when being received without any damage or shortage otherwise it will be responsible for repairing the shortages as soon as possible.',
    'When renewing the contract each party will be committed to paying the amount of the lease fee for half a month to HopeZone RealEstate Company for each year.',
    'The second party should not be in any way the source of disturbance to its neighbors; otherwise it will be responsible and will cause the contract termination.',
    'In case of inability to solve the problem of the first and second parties through negotiations then HopeZone RealEstate Company is not responsible and will not be responsible but the parties should solve the problem through legal proceedings and to go to a specialized court.',
    'HopeZone RealEstate Company is not responsible for any problems that occur between the two sides.',
  ];
}

function buildRentTermsExact(values, lang = 'en') {
  return buildRentTerms(values, lang);
  const rentAmount = moneyWithWords(values.amount, values.currency, lang, '0');
  const advance = moneyWithWords(values.moneyAdvance, values.currency, lang, '0');
  const punishment = moneyWithWords(values.punishmentAmount, values.currency, lang, '0');
  const assurances = moneyWithWords(values.assurances, values.currency, lang, '0');
  const dailyPunishment = moneyWithWords(values.dailyPunishment, values.currency, lang, '0');

  if (lang === 'ar') {
    return [
      `أنا الطرف الأول مالك هذا ${val(values.propertyType)} رقم ${val(values.propertyNumber)} في ${val(values.location)} بمساحة ${val(values.area)} م، أؤجره إلى الطرف الثاني من تاريخ ${val(values.onDate)} إلى ${val(values.forDate)} بأجرة شهرية قدرها ${rentAmount}، وأستلم مبلغ ${advance} كمقدم لمدة ${val(values.monthAdvance)} شهر.`,
      `أنا الطرف الثاني استأجرت هذا ${val(values.propertyType)} من الطرف الأول لمدة ${val(values.rentalPeriod)} شهر، وأستخدمه لغرض ${val(values.purposes)}.`,
      `أنا الطرف الثاني ألتزم بدفع الإيجار ${val(values.monthAdvance)} شهر مرة واحدة مقدما.`,
      `الطرف الأول ملتزم بتسليم هذا ${val(values.propertyType)} دون أي نقص في تاريخ ${val(values.surrenderDate)}، وبخلافه يجب عليه دفع غرامة للطرف الثاني بمبلغ ${punishment} عن كل يوم تأخير، مع خصم هذا المبلغ من الأجرة الشهرية المحددة.`,
      'شركة عقارات هوب زون تكون مساعدة للطرفين إلى نهاية تاريخ العقد من أجل بقاء واستمرار العقد وحل أي مشكلة إن وجدت، وشركة عقارات هوب زون غير مسؤولة وهي وسيط فقط.',
      `بعد انتهاء مدة العقد أو عند إخلاء هذا (${val(values.propertyType)}) يجب على الطرف الثاني تسليم هذا (${val(values.propertyType)}) إلى الطرف الأول دون أي نقص.`,
      `الطرف الثاني ملتزم بدفع مبلغ ${assurances} إلى شركة عقارات هوب زون كتأمينات إلى نهاية مدة هذا العقد.`,
      'من تاريخ توقيع هذا العقد تكون خدمات المشروع والبلدية والكهرباء والماء وأي خدمة أخرى على عاتق الطرف الثاني.',
      'يلتزم الطرف الثاني بدفع الإيجار في الوقت المحدد في هذا العقد. وفي حال التأخر أكثر من (7) أيام، يتم التعامل معه حسب الفقرة (1) من المادة (17) من قانون إيجار العقارات العراقي رقم (87) لسنة (1979)، وذلك بإخلاء العقار، وتقع مصاريف إنذار المحكمة على عاتق الطرف الثاني مع الأجرة الشهرية.',
      'إذا كان المكان المؤجر مفروشا، يجب على الطرف الثاني المحافظة على الأثاث، وعند إخلاء المكان المؤجر يجب تسليمه إلى الطرف الأول كما هو. وبخلافه يكون الطرف الثاني مسؤولا عن إصلاحه أو تغييره على نفقته.',
      `بعد انتهاء مدة هذا العقد، إذا لم يلتزم الطرف الثاني بالإخلاء أو تجديد هذا العقد، فإن أجرة العقار تصبح يومية بمبلغ ${dailyPunishment} عن كل يوم، وتحسب إلى أن يتم حل المشكلة.`,
      'إذا انتقلت ملكية هذا العقار خلال مدة هذا العقد إلى أي طرف آخر، فيجب على المالك الجديد الالتزام بمضمون هذا العقد.',
      'كل من الطرف الأول والطرف الثاني يجب أن يدفعا نصف أجرة شهر عن كل سنة إلى شركة عقارات هوب زون مقابل تنظيم هذا العقد.',
      'عند إخلاء المكان المؤجر، يجب على الطرف الثاني تسليم العقار إلى الطرف الأول كما استلمه دون أي نقص أو تقصير، وبخلافه يكون مسؤولا عن إصلاح النواقص بأسرع وقت.',
      'عند تجديد العقد، يلتزم كل طرف بدفع نصف أجرة شهر لسنة واحدة إلى شركة عقارات هوب زون.',
      'لا يجوز للطرف الثاني بأي شكل أن يكون سببا للإزعاج أو الأذى لجيرانه، وبخلافه يكون مسؤولا ويلغى العقد.',
      'في حال عدم حل مشكلة الطرف الأول والثاني عن طريق الحوار والتفاوض، فإن شركة عقارات هوب زون غير مسؤولة ولن تكون مسؤولة، بل يجب على الأطراف حل المشكلة باتخاذ الإجراءات القانونية واللجوء إلى المحكمة المختصة.',
      'شركة عقارات هوب زون غير مسؤولة عن وجود أي مشكلة تحدث بين مالك العقار والمستأجر.',
    ];
  }

  if (lang === 'ku') {
    return [
      `من لایەنی یەکەم خاوەنی ئەم ${val(values.propertyType)} ژمارە ${val(values.propertyNumber)} لە ${val(values.location)} ئەم ${val(values.area)} م بەکرێ داوە بە لایەنی دووەم لە ڕێکەوتی ${val(values.onDate)} بۆ ${val(values.forDate)} بە کرێی مانگانەی ${rentAmount} وە بڕی ${advance} وەردەگرم وەک پێشەکی ${val(values.monthAdvance)} مانگ.`,
      `من لایەنی دووەم ئەم ${val(values.propertyType)} م بەکرێ گرتووە لە لایەنی یەکەم بۆ ماوەی ${val(values.rentalPeriod)} مانگ وە بەکاری دێنم بۆ مەبەستی ${val(values.purposes)}.`,
      `من لایەنی دووەم پابەندم بە پێدانی کرێیەکە ${val(values.monthAdvance)} مانگ جارێک پێشەکی.`,
      `لایەنی یەکەم پابەندە بە رادەستکردنی ئەم ${val(values.propertyType)} ە بەبێ هیچ کەم وکوڕیەک لە ڕیکەوتی ${val(values.surrenderDate)} وەبە پێچەوانەوە دەبێت پێبژاردن(غرامە) بدات بە لایەنی دووەم بە بڕی ${punishment} بۆ هەر ڕۆژێک دواکەوتن بە کەمکردنەوەی ئەو بڕە پارەیە لە کرێی مانگانەی دیاریکراو.`,
      'کۆمپانیای عقارات هۆپ زۆن هاوکاری هەردوو لایەن دەبێ تا کۆتایی هاتنی بەرواری گرێبەستەکە بۆ مانەوە و بەردەوامی گرێبەستەکە وە چارەسەرکردنی هەر کێشەیەک ئەگەر هەبوو، کۆمپانیای عقارات هۆپ زۆن بەرپرس نیە تەنها نێوەندگیرە.',
      `پاش کۆتایی هاتنی ماوەی گرێبەستەکە یان لە کاتی چۆڵکردنی ئەم (${val(values.propertyType)}) ە لەسەر لایەنی دووەم پێویستە ئەم (${val(values.propertyType)}) ە رادەستی لایەنی یەکەم بکات بەبێ هیچ کەم و کوڕیەک.`,
      `لایەنی دووەم پابەندە بە پێدانی بڕی ${assurances} بە کۆمپانیای عقارات هۆپ زۆن وەکو دڵنیایی(تآمینات) تاکۆتای هاتنی وادەی ئەم گرێبەستە.`,
      'له بەروارى واژوو كردنى ئەم گرێبەستە خزمەتگوزاريەكانى پرۆژە و شارەوانى و كارەبا و ئاو وهەر خزمەت گوزاريەكى تر هەبيت له ئەستۆى لايەنى دووەم دەبيت.',
      'لایەنی دووەم پابەند دەبێ بە پێدانی کرێ لە کاتی دیاریکراو لەم گرێبەستە. لەکاتی دواکەوتن لە (7) رۆژ زیاتر ئەوە بە پێی برگەی (1) لە ماددەی (17) لە یاسای بەکرێدانی مۆڵک لە قانونی عێراقی ژمارە (87) ساڵی (1979) مامەڵەی لەگەل دەکرێ ئەویش بە چۆڵ کردنی موڵکەکە و تێچوی هۆشداری دادگا ئەکەوێتە ئەستۆی لایەنی دووەم لەگەل کرێی مانگانە.',
      'ئەگەر شوێنى بەكرێگيراو راخراو بوو (مؤثث) لايەنى دووەم پێويستە پاريزگارى لە كەل و پەلەكان بكات و لەكاتى چۆل كردنى شوينى بەكرێگيراو وەك خۆى رادەستى لايەنى يەكەم بكاتەوە. بە پێچەوانەوە لايەنی دووەم بەرپرسە له چاككردنەوە يان گۆڕينى لەسەر ئەركى خۆى.',
      `دوای تەواو بونی ماوەی ئەم گرێبەستە ئەگەر لایەنی دووەم پابەند نەبێ بە چۆڵکردن یان نوێکردنەوەی ئەم گرێبەستە ئەوا کرێی موڵکەکە دەبێت بە رۆژانە بە بڕی (${dailyPunishment}) بۆ هەر رۆژێک هەژمار دەکرێت تا ئەو کاتەی کێشەکە یەکلایی دەبێتەوە.`,
      'ئەگەر لەماوەی ئەم گرێبەستە خاوەنداریەتی ئەم موڵکە گواسترایەوە بۆ هەر لایەنێکی تر ئەوا ئەبێ خاوەنە نوێیەکەی پابەندی نێوەرۆکی ئەم گرێبەستە بێ.',
      'هەر یەک لە لایەنی یەکەم و لایەنی دووەم پێوستە بڕی کرێی نیو مانگ بۆ هەر ساڵێک بدەن بە کۆمپانیای عقارات هۆپ زۆن لە بڕی رێکخستنی ئەم گرێبەستە.',
      'لەکاتی چۆڵکردن شوێنی بەکرێ گیراو پێویستە لایەنی دووەم چۆن موڵکەکەی وەرگرتوە وەک خۆی بەبێ کەم و کورتی رادەستی لایەنی یەکەم بکاتەوە، بەپێچەوانەوە بەرپرسە لە چاککردنەوەی کەم وکوریەکان بەزوترین کات.',
      'لەکاتی نوێ کردنەوەی گرێبەست هەر لایەنێک پابەند دەبێت بە پێدانی کرێی نیو مانگ بۆ یەک ساڵ بە کۆمپانیای عقارات هۆپ زۆن.',
      'لایەنی دووەم بەهیچ شێوەیەک نابێت ببێتە مایەی ئەزیەت و ئازار بۆ دراوسێیەکانی و بە پێچەوانەوە بەرپرسیار دەبێت و گرێبەستەکە هەڵدەوەشێتەوە.',
      'لەکاتی چارەسەر نەبوونی کێشەی لایەنی یەکەم و دووەم بە شێوازی گفتوگۆ و دانوستاندن ئەوا کۆمپانیای عقارات هۆپ زۆن بەرپرس نیە و نابێت بەڵکو پێویستە لەسەر لایەنەکان کێشەکە چارەسەر بکەن بەگرتنەبەری رێکاری یاسایی و پەنابردن بۆ دادگای تایبەت.',
      'کۆمپانیای عقارات هۆپ زۆن بەرپرس نییە لە بوونی هەر کێشەیەک کە لەنێوان خاوەن مولک و کرێچی دا رووبدات.',
    ];
  }

  return [
    `I, the first party and owner of this ${val(values.propertyType)} number ${val(values.propertyNumber)} in ${val(values.location)}, area ${val(values.area)} m, have rented it to the second party from ${val(values.onDate)} to ${val(values.forDate)} for a monthly rent of ${rentAmount}, and I receive ${advance} as an advance payment for ${val(values.monthAdvance)} month(s).`,
    `I, the second party, have rented this ${val(values.propertyType)} from the first party for ${val(values.rentalPeriod)} month(s), and I use it for the purpose of ${val(values.purposes)}.`,
    `I, the second party, am committed to paying the rent ${val(values.monthAdvance)} month(s) in advance at a time.`,
    `The first party is committed to handing over this ${val(values.propertyType)} without any shortage on ${val(values.surrenderDate)}; otherwise, the first party must pay the second party a penalty of ${punishment} for each day of delay, deducting that amount from the agreed monthly rent.`,
    'Hope Zone Real Estate Company will assist both parties until the contract end date for the continuation of the contract and for solving any issue if one exists. Hope Zone Real Estate Company is not responsible and is only an intermediary.',
    `After the contract period ends or when this (${val(values.propertyType)}) is vacated, the second party must hand this (${val(values.propertyType)}) back to the first party without any shortage.`,
    `The second party is committed to paying ${assurances} to Hope Zone Real Estate Company as insurance until the end of this contract period.`,
    'From the date of signing this contract, project services, municipality, electricity, water, and any other service costs are the responsibility of the second party.',
    'The second party is committed to paying the rent at the specified time in this contract. If payment is delayed for more than (7) days, the second party will be treated according to clause (1) of article (17) of the Iraqi property rental law number (87) of 1979, including vacating the property, and the cost of the court warning will be the responsibility of the second party together with the monthly rent.',
    'If the rented place is furnished, the second party must protect the furniture and, when vacating the rented place, must return it to the first party as it was. Otherwise, the second party is responsible for repairing or replacing it at their own expense.',
    `After the term of this contract ends, if the second party is not committed to vacating or renewing this contract, the rent of the property becomes daily in the amount of ${dailyPunishment} for each day until the issue is resolved.`,
    'If ownership of this property is transferred to any other party during the term of this contract, the new owner must comply with the contents of this contract.',
    'Each of the first party and the second party must pay half a month rent for each year to Hope Zone Real Estate Company for arranging this contract.',
    'When vacating the rented place, the second party must return the property to the first party as received, without any shortage or deficiency. Otherwise, the second party is responsible for repairing the deficiencies as soon as possible.',
    'When renewing the contract, each party is committed to paying half a month rent for one year to Hope Zone Real Estate Company.',
    'The second party must not in any way become a source of annoyance or harm to neighbors; otherwise, the second party will be responsible and the contract will be cancelled.',
    'If the issue between the first and second parties cannot be solved through dialogue and negotiation, Hope Zone Real Estate Company is not responsible and will not be responsible. The parties must solve the issue by taking legal procedures and resorting to the competent court.',
    'Hope Zone Real Estate Company is not responsible for any issue that occurs between the property owner and the tenant.',
  ];
}

function defaultTerms(kind, values, lang = 'en') {
  return kind === 'sell' ? buildSellTerms(values, lang) : buildRentTermsExact(values, lang);
}

function storeKey(kind) {
  return `rp_${kind}_contracts`;
}

function draftKey(kind) {
  return `rp_${kind}_contract_draft`;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function loadContracts(kind) {
  const rawSaved = localStorage.getItem(storeKey(kind));
  if (rawSaved) {
    try {
      const saved = JSON.parse(rawSaved);
      if (Array.isArray(saved)) return saved.filter(contract => !contract.kind || contract.kind === kind);
    } catch {
      return [];
    }
  }

  const legacyDraft = readJson(draftKey(kind), null);
  if (!legacyDraft) return [];

  const now = new Date().toISOString();
  return [{
    id: `legacy-${kind}`,
    kind,
    values: legacyDraft,
    createdAt: now,
    updatedAt: now,
  }];
}

function writeContracts(kind, contracts) {
  localStorage.setItem(storeKey(kind), JSON.stringify(contracts));
}

function normalizeContract(contract, kind) {
  return {
    ...contract,
    id: String(contract.id),
    kind: contract.kind || kind,
    values: contract.values || {},
  };
}

function initialValues(fields, text, kind, lang = 'en') {
  const values = [...fields.left, ...fields.right].reduce((current, [key, , type]) => {
    if (type === 'date') current[key] = today();
    else if (type === 'status') current[key] = text.active;
    else if (type === 'selectCurrency') current[key] = CURRENCY_OPTIONS[0];
    else if (type === 'paymentMode') current[key] = '';
    else current[key] = '';
    return current;
  }, {});
  values.contractNo = values.contractNo || String(Date.now()).slice(-6);
  values.contractDate = values.contractDate || today();
  values.mainTerms = defaultTerms(kind, values, lang);
  values.mainTermsLang = lang;
  values.mainTermsVersion = TERMS_VERSION;
  values.mainTermsTouched = false;
  return values;
}

function titleFor(kind, values) {
  if (kind === 'sell') {
    return values.firstParty || values.secondParty || values.propertyNumber || 'Sell Contract';
  }
  return values.ownerParty || values.tenantParty || values.propertyNumber || 'Rent Contract';
}

function dateFor(kind, values) {
  return values.contractDate || (kind === 'sell' ? values.surrenderDate || values.paymentDateLeft : values.onDate || values.forDate || values.surrenderDate);
}

function priceFor(kind, values) {
  return kind === 'sell' ? values.price : values.amount;
}

function ContractInput({ id, type, value, onChange, text }) {
  const [moneyCurrency, setMoneyCurrency] = useState(CURRENCY_OPTIONS[0]);

  if (type === 'select' || type === 'selectCurrency' || type === 'paymentMode' || type === 'status') {
    if (type === 'status') {
      return (
        <select id={id} value={value} onChange={e => onChange(e.target.value)} disabled>
          <option>{text.active}</option>
        </select>
      );
    }

    const options = type === 'selectCurrency' ? CURRENCY_OPTIONS : type === 'paymentMode' ? PAYMENT_MODE_OPTIONS : PROPERTY_TYPES;
    return (
      <CustomDropdown
        id={id}
        value={value}
        placeholder={type === 'selectCurrency' ? CURRENCY_OPTIONS[0] : text.choose}
        options={options}
        onChange={onChange}
      />
    );
  }

  if (type === 'money') {
    return (
      <div className="contract-money-input">
        <CustomDropdown
          id={`${id}-currency`}
          value={moneyCurrency}
          placeholder={CURRENCY_OPTIONS[0]}
          options={CURRENCY_OPTIONS}
          onChange={setMoneyCurrency}
        />
        <input id={id} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    );
  }

  return (
    <div className="contract-input-wrap">
      <span className="contract-input-info" aria-hidden="true">i</span>
      <input id={id} type={type === 'date' ? 'date' : 'text'} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function CustomDropdown({ id, value, placeholder, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value || '';

  function selectOption(option) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div className={`contract-dropdown ${open ? 'open' : ''}`}>
      <button
        id={id}
        type="button"
        className="contract-dropdown-control"
        onClick={() => setOpen(current => !current)}
      >
        {selected || placeholder}
      </button>
      {open && (
        <div className="contract-dropdown-menu">
          {options.map(option => (
            <button
              key={option}
              type="button"
              className={option === selected ? 'selected' : ''}
              onClick={() => selectOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ field, value, onChange, text }) {
  const [key, labelKey, type] = field;
  return (
    <div className="contract-field-row">
      <label htmlFor={key}>{text[labelKey]}:</label>
      <ContractInput id={key} type={type} value={value} onChange={onChange} text={text} />
    </div>
  );
}

function PaperField({ label, value, editable, onChange, type = 'text', className = '' }) {
  return (
    <div className={`sell-paper-field ${className}`.trim()}>
      <span>{label}:</span>
      {editable ? (
        <input type={type} value={value || ''} onChange={event => onChange?.(event.target.value)} />
      ) : (
        <strong>{value || '-'}</strong>
      )}
    </div>
  );
}

function SellMainContract({ lang, text, values, settings = {}, editable = false, onFieldChange, onTermChange }) {
  const terms = values.mainTerms?.length && values.mainTermsLang === lang && values.mainTermsVersion === TERMS_VERSION
    ? values.mainTerms
    : defaultTerms('sell', values, lang);
  const branchName = settings.companyName || values.branch || '';
  const coordinatorName = settings.contractCoordinator || values.organizerName || '';
  const summaryFields = [
    ['firstParty', text.firstParty, ''],
    ['secondParty', text.secondBuyer, ''],
    ['firstMobile', text.mobileNumber, 'print-hidden'],
    ['secondMobile', text.mobileNumber, 'print-hidden'],
    ['propertyType', text.propertyType, ''],
    ['location', text.neighborhood, ''],
    ['area', text.area, ''],
    ['propertyNumber', text.propertyNumber, ''],
    ['building', text.building, 'print-hidden'],
    ['floor', text.floor, 'print-hidden'],
    ['contractType', text.contractType, 'print-hidden'],
    ['unitLayout', text.unitLayout, 'print-hidden'],
    ['currency', text.currency, 'print-hidden'],
  ];

  return (
    <div className="contract-main-form contract-print-area sell-paper">
      <div className="sell-paper-topline">
        <div className="sell-paper-top-slot">
          <label className="sell-paper-screen-branch">
            <span>{text.branch}</span>
            <strong>{branchName || '-'}</strong>
          </label>
          <label className="sell-paper-print-contract-no">
            <span>{text.contractNo}</span>
            <strong>{values.contractNo || '-'}</strong>
          </label>
        </div>
        <h3>{sellPaperTitle(lang)}</h3>
        <label>
          <span>{text.dateLabel}</span>
          {editable ? (
            <input type="date" value={values.contractDate || today()} onChange={event => onFieldChange?.('contractDate', event.target.value)} />
          ) : <strong>{values.contractDate || '-'}</strong>}
        </label>
      </div>

      <div className="sell-paper-summary">
        {summaryFields.map(([key, label, className]) => (
          <PaperField
            key={key}
            label={label}
            value={values[key]}
            editable={editable}
            onChange={value => onFieldChange?.(key, value)}
            className={className}
          />
        ))}
      </div>

      <p className="contract-main-heading sell-paper-agreement">{sellAgreementHeading(lang, text)}</p>

      <table className="contract-terms-table sell-paper-terms">
        <tbody>
          {terms.map((term, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                {editable ? (
                  <textarea
                    value={term}
                    onChange={event => onTermChange?.(index, event.target.value)}
                    aria-label={`Rule ${index + 1}`}
                  />
                ) : term}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="contract-main-note sell-paper-note">
        <strong>{text.note}:</strong>
        {editable ? <input value={values.note || ''} onChange={event => onFieldChange?.('note', event.target.value)} /> : <span>{values.note || ''}</span>}
      </div>

      <div className="contract-signatures sell-paper-signatures">
        <div>
          <strong>{text.firstSellerSignature}</strong>
          <span>{values.firstParty || '-'}</span>
        </div>
        <div>
          <strong>{text.secondBuyerSignature}</strong>
          <span>{values.secondParty || '-'}</span>
        </div>
        <div>
          <strong>{organizerSignature(lang, text)}</strong>
          <span>{coordinatorName || '-'}</span>
        </div>
      </div>
    </div>
  );
}

function RentMainContract({ lang, text, values, settings = {}, editable = false, onFieldChange, onTermChange }) {
  const terms = values.mainTerms?.length && values.mainTermsLang === lang && values.mainTermsVersion === TERMS_VERSION
    ? values.mainTerms
    : defaultTerms('rent', values, lang);
  const branchName = settings.companyName || values.branch || '';
  const coordinatorName = settings.contractCoordinator || values.organizerName || '';
  const summaryFields = [
    ['ownerParty', text.ownerParty, ''],
    ['tenantParty', text.tenantParty, ''],
    ['ownerMobile', text.mobileNumber, 'print-hidden'],
    ['tenantMobile', text.mobileNumber, 'print-hidden'],
    ['propertyType', text.propertyType, ''],
    ['location', text.location, ''],
    ['area', text.area, ''],
    ['propertyNumber', text.propertyNumber, ''],
    ['onDate', text.onDate, ''],
    ['forDate', text.forDate, ''],
    ['amount', text.amount, ''],
    ['currency', text.currency, 'print-hidden'],
    ['balanceMade', text.balanceMade, 'print-hidden'],
    ['moneyAdvance', text.moneyAdvance, ''],
    ['introduction', text.introduction, 'print-hidden'],
    ['rentalPeriod', text.rentalPeriod, ''],
    ['purposes', text.purposes, ''],
    ['punishmentAmount', text.punishmentAmount, ''],
    ['monthAdvance', text.monthAdvance, ''],
    ['surrenderDate', text.surrenderDate, ''],
    ['dailyPunishment', text.dailyPunishment, 'print-hidden'],
    ['contractType', text.contractType, 'print-hidden'],
    ['assurances', text.assurances, 'print-hidden'],
  ];

  return (
    <div className="contract-main-form contract-print-area sell-paper rent-paper">
      <div className="sell-paper-topline">
        <div className="sell-paper-top-slot">
          <label className="sell-paper-screen-branch">
            <span>{text.branch}</span>
            <strong>{branchName || '-'}</strong>
          </label>
          <label className="sell-paper-print-contract-no">
            <span>{text.contractNo}</span>
            <strong>{values.contractNo || '-'}</strong>
          </label>
        </div>
        <h3>{rentPaperTitle(lang)}</h3>
        <label>
          <span>{text.dateLabel}</span>
          {editable ? (
            <input type="date" value={values.contractDate || today()} onChange={event => onFieldChange?.('contractDate', event.target.value)} />
          ) : <strong>{values.contractDate || '-'}</strong>}
        </label>
      </div>

      <div className="sell-paper-summary">
        {summaryFields.map(([key, label, className]) => (
          <PaperField
            key={key}
            label={label}
            value={values[key]}
            editable={editable}
            onChange={value => onFieldChange?.(key, value)}
            className={className}
          />
        ))}
      </div>

      <p className="contract-main-heading sell-paper-agreement">{sellAgreementHeading(lang, text)}</p>

      <table className="contract-terms-table sell-paper-terms">
        <tbody>
          {terms.map((term, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                {editable ? (
                  <textarea
                    value={term}
                    onChange={event => onTermChange?.(index, event.target.value)}
                    aria-label={`Rule ${index + 1}`}
                  />
                ) : term}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="contract-main-note sell-paper-note">
        <strong>{text.note}:</strong>
        {editable ? <input value={values.note || ''} onChange={event => onFieldChange?.('note', event.target.value)} /> : <span>{values.note || ''}</span>}
      </div>

      <div className="contract-signatures sell-paper-signatures">
        <div>
          <strong>{text.ownerSignature}</strong>
          <span>{values.ownerParty || '-'}</span>
        </div>
        <div>
          <strong>{text.tenantSignature}</strong>
          <span>{values.tenantParty || '-'}</span>
        </div>
        <div>
          <strong>{organizerSignature(lang, text)}</strong>
          <span>{coordinatorName || '-'}</span>
        </div>
      </div>
    </div>
  );
}

function MainContract({ kind, lang, text, values, settings = {}, editable = false, onFieldChange, onTermChange }) {
  const isSell = kind === 'sell';
  if (isSell) {
    return (
      <SellMainContract
        lang={lang}
        text={text}
        values={values}
        settings={settings}
        editable={editable}
        onFieldChange={onFieldChange}
        onTermChange={onTermChange}
      />
    );
  }

  return (
    <RentMainContract
      lang={lang}
      text={text}
      values={values}
      settings={settings}
      editable={editable}
      onFieldChange={onFieldChange}
      onTermChange={onTermChange}
    />
  );
}

function ContractLibrary({ kind, lang, text, title, isRtl }) {
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useContractSettings();
  const [contracts, setContracts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const selected = contracts.find(contract => String(contract.id) === String(selectedId));
  const previewContract = contracts.find(contract => String(contract.id) === String(previewId));
  const filteredContracts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return contracts;
    return contracts.filter(contract => {
      const values = contract.values || {};
      return [
        contract.id,
        contract.createdAt,
        contract.updatedAt,
        titleFor(kind, values),
        dateFor(kind, values),
        priceFor(kind, values),
        values.contractNo,
        values.firstParty,
        values.secondParty,
        values.ownerParty,
        values.tenantParty,
        values.location,
        values.propertyType,
        values.propertyNumber,
        values.area,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [contracts, kind, search]);

  useEffect(() => {
    let alive = true;
    async function loadSaved() {
      setLoading(true);
      try {
        let rows = (await api.getContracts(kind)).map(contract => normalizeContract(contract, kind));
        const localRows = loadContracts(kind).map(contract => normalizeContract(contract, kind));
        if (rows.length === 0 && localRows.length > 0) {
          const migrated = await Promise.all(
            localRows.map(contract => api.createContract({ kind, values: contract.values }))
          );
          rows = migrated.map(contract => normalizeContract(contract, kind));
          localStorage.removeItem(storeKey(kind));
        }
        if (!alive) return;
        setContracts(rows);
        setSelectedId(rows[0]?.id || '');
      } catch (error) {
        const localRows = loadContracts(kind).map(contract => normalizeContract(contract, kind));
        if (!alive) return;
        setContracts(localRows);
        setSelectedId(localRows[0]?.id || '');
        toast(error.message || 'Could not load saved contracts', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadSaved();
    return () => { alive = false; };
  }, [kind, toast]);

  async function removeContract(id) {
    if (!window.confirm(text.confirmDelete)) return;
    try {
      await api.deleteContract(id);
      const next = contracts.filter(contract => contract.id !== id);
      setContracts(next);
      setSelectedId(next[0]?.id || '');
      if (String(previewId) === String(id)) setPreviewId('');
      toast(text.deleted, 'success');
    } catch (error) {
      toast(error.message || 'Delete failed', 'error');
    }
  }

  function printContract(contract) {
    setSelectedId(contract.id);
    setTimeout(() => window.print(), 0);
  }

  return (
    <div className="contract-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="contract-page-head">
        <h1>{title}</h1>
        <button type="button" className="btn btn-primary contract-create-button" onClick={() => navigate(`/contracts/${kind}/new`)}>
          <FilePlus size={16} />
          {text.createNew}
        </button>
      </div>

      <section className="contract-history-shell">
        <div className="contract-library-head contract-history-head">
          <h2>{text.savedContracts}</h2>
          <span>{filteredContracts.length}</span>
        </div>

        <div className="contract-history-toolbar">
          <label className="contract-history-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={text.searchContracts || 'Search contracts...'}
            />
          </label>
        </div>

        {loading ? (
          <div className="contract-empty">{text.loading || 'Loading...'}</div>
        ) : contracts.length === 0 ? (
          <div className="contract-empty">{text.emptySaved}</div>
        ) : (
          <div className="contract-table-wrap">
            {filteredContracts.length === 0 ? (
              <div className="contract-empty">{text.noResults || 'No matching contracts.'}</div>
            ) : (
              <table className="contract-history-table">
                <thead>
                  <tr>
                    <th>{text.contractNo}</th>
                    <th>{text.titleLabel}</th>
                    <th>{text.dateLabel}</th>
                    <th>{text.priceLabel}</th>
                    <th>{text.propertyType}</th>
                    <th>{text.updatedLabel}</th>
                    <th>{text.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map(contract => {
                    const values = contract.values || {};
                    return (
                      <tr key={contract.id}>
                        <td className="contract-history-id">{values.contractNo || contract.id}</td>
                        <td>
                          <strong>{titleFor(kind, values)}</strong>
                          <small>{values.location || values.propertyNumber || '-'}</small>
                        </td>
                        <td>{dateFor(kind, values) || '-'}</td>
                        <td className="contract-history-price">{priceFor(kind, values) || '-'}</td>
                        <td>{values.propertyType || '-'}</td>
                        <td>{contract.updatedAt?.slice(0, 10) || contract.createdAt?.slice(0, 10) || '-'}</td>
                        <td>
                          <div className="contract-history-actions">
                            <button type="button" className="contract-icon-button view" title={text.preview} aria-label={text.preview} onClick={() => setPreviewId(contract.id)}>
                              <Eye size={15} />
                            </button>
                            <button type="button" className="contract-icon-button print" title={text.print} aria-label={text.print} onClick={() => printContract(contract)}>
                              <Printer size={15} />
                            </button>
                            <button type="button" className="contract-icon-button edit" title={text.edit} aria-label={text.edit} onClick={() => navigate(`/contracts/${kind}/${contract.id}`)}>
                              <Edit3 size={15} />
                            </button>
                            <button type="button" className="contract-icon-button delete" title={text.delete} aria-label={text.delete} onClick={() => removeContract(contract.id)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {previewContract && (
        <div className="contract-preview-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setPreviewId('')}>
          <div className="contract-preview-modal" onClick={event => event.stopPropagation()}>
            <div className="contract-preview-modal-head">
              <div>
                <h2>{titleFor(kind, previewContract.values || {})}</h2>
                <span>{dateFor(kind, previewContract.values || {}) || '-'}</span>
              </div>
              <div className="contract-preview-modal-actions">
                <button type="button" className="btn btn-primary" onClick={() => printContract(previewContract)}>
                  <Printer size={15} />
                  {text.print}
                </button>
                <button type="button" className="contract-icon-button" aria-label={text.close || 'Close'} onClick={() => setPreviewId('')}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="contract-preview-scroll">
              <MainContract kind={kind} lang={lang} text={text} values={previewContract.values} settings={settings} />
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="contract-print-mount" aria-hidden="true">
          <MainContract kind={kind} lang={lang} text={text} values={selected.values} settings={settings} />
        </div>
      )}
    </div>
  );
}

function ContractForm({ kind, lang, text, title, isRtl }) {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useContractSettings();
  const isSell = kind === 'sell';
  const fields = isSell ? SELL_FIELDS : RENT_FIELDS;
  const sectionTitle = isSell ? text.sellSection : text.rentSection;
  const [savedContract, setSavedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('secondary');
  const [values, setValues] = useState(() => {
    const localContract = contractId ? loadContracts(kind).find(contract => String(contract.id) === String(contractId)) : null;
    const initial = localContract?.values || initialValues(fields, text, kind, lang);
    if (!initial.mainTermsTouched && (initial.mainTermsLang !== lang || initial.mainTermsVersion !== TERMS_VERSION)) {
      return { ...initial, mainTerms: defaultTerms(kind, initial, lang), mainTermsLang: lang, mainTermsVersion: TERMS_VERSION };
    }
    return initial;
  });

  useEffect(() => {
    if (!contractId) {
      setSavedContract(null);
      return;
    }

    let alive = true;
    api.getContract(contractId)
      .then(contract => {
        if (!alive || contract.kind !== kind) return;
        const normalized = normalizeContract(contract, kind);
        const nextValues = { ...normalized.values };
        if (!nextValues.mainTermsTouched && (nextValues.mainTermsLang !== lang || nextValues.mainTermsVersion !== TERMS_VERSION)) {
          nextValues.mainTerms = defaultTerms(kind, nextValues, lang);
          nextValues.mainTermsLang = lang;
          nextValues.mainTermsVersion = TERMS_VERSION;
        }
        setSavedContract(normalized);
        setValues(nextValues);
      })
      .catch(error => {
        const localContract = loadContracts(kind).find(contract => String(contract.id) === String(contractId));
        if (localContract) {
          setSavedContract(normalizeContract(localContract, kind));
          setValues(localContract.values);
        } else {
          toast(error.message || 'Could not load contract', 'error');
        }
      });

    return () => { alive = false; };
  }, [contractId, kind, lang, toast]);

  const columns = useMemo(() => [fields.left, fields.right], [fields]);
  const setField = (key, value) => setValues(current => {
    const next = { ...current, [key]: value };
    if (isSell && (key === 'price' || key === 'moneyAdvance')) {
      const remaining = remainingMoneyValue(next);
      if (remaining !== undefined && remaining !== null && String(remaining) !== '') {
        next.moneyLeft = remaining;
      }
    }
    if (!current.mainTermsTouched) {
      next.mainTerms = defaultTerms(kind, next, lang);
      next.mainTermsLang = lang;
      next.mainTermsVersion = TERMS_VERSION;
    }
    return next;
  });
  const setTerm = (index, value) => {
    setValues(current => {
      const currentTerms = current.mainTerms?.length && current.mainTermsLang === lang && current.mainTermsVersion === TERMS_VERSION
        ? current.mainTerms
        : defaultTerms(kind, current, lang);
      const mainTerms = currentTerms.map((term, termIndex) => termIndex === index ? value : term);
      return { ...current, mainTerms, mainTermsLang: lang, mainTermsVersion: TERMS_VERSION, mainTermsTouched: true };
    });
  };
  const reset = () => setValues(initialValues(fields, text, kind, lang));
  const printCurrent = () => {
    setActiveTab('main');
    setTimeout(() => window.print(), 0);
  };
  const save = async () => {
    const now = new Date().toISOString();
    const existingId = savedContract?.id;
    const nextContract = {
      id: existingId || '',
      kind,
      values: {
        ...values,
        mainTerms: values.mainTerms?.length && values.mainTermsLang === lang && values.mainTermsVersion === TERMS_VERSION ? values.mainTerms : defaultTerms(kind, values, lang),
        mainTermsLang: lang,
        mainTermsVersion: TERMS_VERSION,
        mainTermsTouched: !!values.mainTermsTouched,
      },
      createdAt: savedContract?.createdAt || now,
      updatedAt: now,
    };

    try {
      const saved = existingId
        ? await api.updateContract(existingId, { kind, values: nextContract.values })
        : await api.createContract({ kind, values: nextContract.values });
      const normalized = normalizeContract(saved, kind);
      setSavedContract(normalized);
      localStorage.setItem(draftKey(kind), JSON.stringify(normalized.values));
      toast(existingId ? text.updated : text.saved, 'success');
      navigate(`/contracts/${kind}/${normalized.id}`, { replace: true });
    } catch (error) {
      const contracts = loadContracts(kind);
      const fallbackContract = {
        ...nextContract,
        id: existingId || `${kind}-${Date.now()}`,
      };
      const nextContracts = existingId
        ? contracts.map(contract => String(contract.id) === String(existingId) ? fallbackContract : contract)
        : [fallbackContract, ...contracts.filter(contract => String(contract.id) !== String(fallbackContract.id))];
      writeContracts(kind, nextContracts);
      localStorage.setItem(draftKey(kind), JSON.stringify(fallbackContract.values));
      setSavedContract(fallbackContract);
      toast(error.message || text.saved, 'error');
      navigate(`/contracts/${kind}/${fallbackContract.id}`, { replace: true });
    }
  };

  return (
    <div className="contract-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="contract-page-head">
        <h1>{title}</h1>
        <div className="contract-breadcrumb">
          <span>⌂</span>
          <span>{text.dashboard}</span>
          <span>{'>'}</span>
          <strong>{title}</strong>
        </div>
      </div>

      <section className="contract-panel">
        <div className="contract-tabs">
          <button type="button" className={activeTab === 'secondary' ? 'active' : ''} onClick={() => setActiveTab('secondary')}>{text.secondaryForm}</button>
          <button type="button" className={activeTab === 'main' ? 'active' : ''} onClick={() => setActiveTab('main')}>{text.mainForm}</button>
        </div>

        <div className="contract-inner">
          <h2>{sectionTitle}</h2>
          {activeTab === 'secondary' ? (
            <div className="contract-form-grid">
              {columns.map((column, columnIndex) => (
                <div className="contract-column" key={columnIndex}>
                  {column.map(field => (
                    <FieldRow
                      key={field[0]}
                      field={field}
                      value={values[field[0]] || ''}
                      text={text}
                      onChange={value => setField(field[0], value)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <MainContract
              kind={kind}
              lang={lang}
              text={text}
              values={values}
              settings={settings}
              editable
              onFieldChange={setField}
              onTermChange={setTerm}
            />
          )}

          <div className="contract-actions">
            <button type="button" className="btn btn-primary" onClick={save}>
              <Save size={16} />
              {text.save}
            </button>
            <button type="button" className="btn" onClick={printCurrent}>
              <Printer size={16} />
              {text.print}
            </button>
            <button type="button" className="btn contract-new-page" onClick={reset}>
              <FilePlus size={16} />
              {text.newPage}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Contracts({ kind, mode = 'library' }) {
  const { lang } = useLanguage();
  const isRtl = lang === 'ar' || lang === 'ku';
  const text = getText(lang);
  const title = kind === 'sell' ? text.sellTitle : text.rentTitle;

  if (mode === 'library') {
    return <ContractLibrary kind={kind} lang={lang} text={text} title={title} isRtl={isRtl} />;
  }

  return <ContractForm kind={kind} lang={lang} text={text} title={title} isRtl={isRtl} />;
}
