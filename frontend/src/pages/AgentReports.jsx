import { useEffect, useMemo, useState } from 'react';
import { Activity, CreditCard, Download, FileText, Loader2, Printer, ReceiptText, Search, TrendingUp, UserRound, WalletCards } from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  en: {
    chooseAgent: 'Choose agent',
    noAgents: 'No agents created yet.',
    receiveReceipts: 'Receive receipts',
    giveReceipts: 'Give receipts',
    sellContracts: 'Sell contracts',
    rentContracts: 'Rent contracts',
    paidPayments: 'Paid payments',
    expenses: 'Expenses',
    activity: 'Activity',
    receiptsTable: 'Receipts',
    contractsTable: 'Contracts',
    paymentsTable: 'Payments',
    expensesTable: 'Expenses',
    activityTable: 'Activity',
    profitReport: 'Profit Report',
    profitAmount: 'Profit',
    exportExcel: 'Download Excel',
    print: 'Print',
    receiptNo: 'Receipt #',
    tenant: 'Tenant',
    amount: 'Amount',
    date: 'Date',
    wa: 'WA',
    type: 'Type',
    title: 'Title',
    price: 'Price',
    status: 'Status',
    apartment: 'Apt',
    month: 'Month',
    description: 'Description',
    category: 'Category',
    message: 'Message',
    noRecords: 'No records.',
    searchAgents: 'Search agents...',
  },
  ar: {
    chooseAgent: 'اختر الوكيل',
    noAgents: 'لا يوجد وكلاء بعد.',
    receiveReceipts: 'إيصالات القبض',
    giveReceipts: 'إيصالات الدفع',
    sellContracts: 'عقود البيع',
    rentContracts: 'عقود الإيجار',
    paidPayments: 'المدفوعات المدفوعة',
    expenses: 'المصروفات',
    activity: 'النشاط',
    receiptsTable: 'الإيصالات',
    contractsTable: 'العقود',
    paymentsTable: 'المدفوعات',
    expensesTable: 'المصروفات',
    activityTable: 'النشاط',
    receiptNo: 'رقم الإيصال',
    tenant: 'المستأجر',
    amount: 'المبلغ',
    date: 'التاريخ',
    wa: 'واتساب',
    type: 'النوع',
    title: 'العنوان',
    price: 'السعر',
    status: 'الحالة',
    apartment: 'الشقة',
    month: 'الشهر',
    description: 'الوصف',
    category: 'الفئة',
    message: 'الرسالة',
    noRecords: 'لا توجد سجلات.',
    searchAgents: 'بحث عن وكيل...',
  },
  ku: {
    chooseAgent: 'ئەندام هەڵبژێرە',
    noAgents: 'هێشتا ئەندام دروست نەکراوە.',
    receiveReceipts: 'پسوولەی پارە وەرگرتن',
    giveReceipts: 'پسوولەی پارەدان',
    sellContracts: 'گرێبەستی فرۆشتن',
    rentContracts: 'گرێبەستی کرێ',
    paidPayments: 'پارەدانی دراو',
    expenses: 'خەرجیەکان',
    activity: 'چالاکی',
    receiptsTable: 'پسوولەکان',
    contractsTable: 'گرێبەستەکان',
    paymentsTable: 'پارەدانەکان',
    expensesTable: 'خەرجیەکان',
    activityTable: 'چالاکی',
    receiptNo: 'ژمارەی پسوولە',
    tenant: 'کرێچی',
    amount: 'بڕ',
    date: 'بەروار',
    wa: 'واتساپ',
    type: 'جۆر',
    title: 'ناونیشان',
    price: 'نرخ',
    status: 'دۆخ',
    apartment: 'شوقە',
    month: 'مانگ',
    description: 'وەسف',
    category: 'پۆل',
    message: 'پەیام',
    noRecords: 'هیچ تۆمارێک نییە.',
    searchAgents: 'گەڕان بە ناوی ئەندام...',
  },
};

function fmtMoney(amount, currency = 'USD') {
  const n = Number(amount || 0);
  return `${n.toLocaleString()} ${currency || 'USD'}`;
}

function shortDate(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 16);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function totalsByCurrency(rows = []) {
  return rows.reduce((acc, row) => {
    const currency = row.currency || 'USD';
    acc[currency] = (acc[currency] || 0) + Number(row.amount || 0);
    return acc;
  }, {});
}

function mergeCurrencies(...totals) {
  const currencies = new Set(['USD', 'IQD']);
  totals.forEach(total => Object.keys(total || {}).forEach(currency => currencies.add(currency)));
  return Array.from(currencies);
}

function totalText(totals, currencies = mergeCurrencies(totals)) {
  return currencies.map(currency => fmtMoney(totals?.[currency] || 0, currency)).join(' / ');
}

function amountForCurrency(row, currency) {
  return (row.currency || 'USD') === currency ? Number(row.amount || 0) : '';
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildProfitReportCsv({ selected, text, t, profitLabel }) {
  const profitRows = selected?.profits || [];
  const expenseRows = selected?.expenses || [];
  const receiveReceiptRows = (selected?.receipts || []).filter(row => !String(row.receipt_no || '').startsWith('G-'));
  const giveReceiptRows = (selected?.receipts || []).filter(row => String(row.receipt_no || '').startsWith('G-'));
  const profitTotals = totalsByCurrency(profitRows);
  const expenseTotals = totalsByCurrency(expenseRows.map(row => ({ ...row, currency: row.currency || 'USD' })));
  const receiveTotals = totalsByCurrency(receiveReceiptRows);
  const giveTotals = totalsByCurrency(giveReceiptRows);
  const currencies = mergeCurrencies(profitTotals, expenseTotals, receiveTotals, giveTotals);
  const netTotals = currencies.reduce((acc, currency) => {
    acc[currency] = (profitTotals[currency] || 0) - (expenseTotals[currency] || 0);
    return acc;
  }, {});
  const role = selected?.role === 'developer' ? 'Developer' : selected?.role === 'admin' ? 'Owner' : 'Agent';
  const summaryRows = [
    ['Receive receipts', receiveReceiptRows.length, ...currencies.map(currency => receiveTotals[currency] || 0)],
    ['Give receipts', giveReceiptRows.length, ...currencies.map(currency => giveTotals[currency] || 0)],
    [profitLabel, profitRows.length, ...currencies.map(currency => profitTotals[currency] || 0)],
    [text.expenses || 'Expenses / Loss', expenseRows.length, ...currencies.map(currency => expenseTotals[currency] || 0)],
    ['Net profit / loss', '', ...currencies.map(currency => netTotals[currency] || 0)],
  ];

  const lines = [
    [profitLabel],
    ['Agent', selected?.name || '-', 'Username', selected?.username || '-', 'Role', role],
    ['Generated', new Date().toLocaleString()],
    [],
    ['SUMMARY'],
    ['Type', 'Count', ...currencies],
    ...summaryRows,
    [],
    [profitLabel.toUpperCase()],
    ['#', text.date, text.title, text.type, text.receiptNo, ...currencies, t('currency'), text.description],
    ...(profitRows.length ? profitRows.map((row, index) => [
      index + 1,
      shortDate(row.created_at),
      row.contract_title || '-',
      row.contract_kind || row.source || '-',
      row.contract_no || '-',
      ...currencies.map(currency => amountForCurrency(row, currency)),
      row.currency || 'USD',
      row.notes || '-',
    ]) : [[text.noRecords]]),
    [],
    [(text.expenses || 'Expenses').toUpperCase()],
    ['#', text.date, text.description, text.category, 'Property', ...currencies, t('currency')],
    ...(expenseRows.length ? expenseRows.map((row, index) => [
      index + 1,
      shortDate(row.date || row.created_at),
      row.description || '-',
      row.category || '-',
      row.property || '-',
      ...currencies.map(currency => amountForCurrency({ ...row, currency: row.currency || 'USD' }, currency)),
      row.currency || 'USD',
    ]) : [[text.noRecords]]),
  ];

  return `\ufeff${lines.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
}

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
        {text}
      </td>
    </tr>
  );
}

function buildProfitReportHtml({ selected, text, t, profitLabel, forExcel = false }) {
  const profitRows = selected?.profits || [];
  const expenseRows = selected?.expenses || [];
  const receiveReceiptRows = (selected?.receipts || []).filter(row => !String(row.receipt_no || '').startsWith('G-'));
  const giveReceiptRows = (selected?.receipts || []).filter(row => String(row.receipt_no || '').startsWith('G-'));
  const profitTotals = totalsByCurrency(profitRows);
  const expenseTotals = totalsByCurrency(expenseRows.map(row => ({ ...row, currency: row.currency || 'USD' })));
  const receiveTotals = totalsByCurrency(receiveReceiptRows);
  const giveTotals = totalsByCurrency(giveReceiptRows);
  const currencies = mergeCurrencies(profitTotals, expenseTotals, receiveTotals, giveTotals);
  const netTotals = currencies.reduce((acc, currency) => {
    acc[currency] = (profitTotals[currency] || 0) - (expenseTotals[currency] || 0);
    return acc;
  }, {});
  const generatedAt = new Date().toLocaleString();
  const role = selected?.role === 'developer' ? 'Developer' : selected?.role === 'admin' ? 'Owner' : 'Agent';
  const title = `${profitLabel} - ${selected?.username || selected?.id || ''}`;
  const dir = selected?.name && /[\u0600-\u06ff]/.test(selected.name) ? 'rtl' : 'ltr';
  const summaryRows = [
    ['Received receipts', receiveReceiptRows.length, totalText(receiveTotals, currencies)],
    ['Give receipts', giveReceiptRows.length, totalText(giveTotals, currencies)],
    [profitLabel, profitRows.length, totalText(profitTotals, currencies)],
    [text.expenses || 'Expenses', expenseRows.length, totalText(expenseTotals, currencies)],
    ['Net profit / loss', '', totalText(netTotals, currencies)],
  ];
  const profitTableRows = profitRows.length
    ? profitRows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(shortDate(row.created_at))}</td>
          <td>${escapeHtml(row.contract_title || '-')}</td>
          <td>${escapeHtml(row.contract_kind || row.source || '-')}</td>
          <td>${escapeHtml(row.contract_no || '-')}</td>
          <td class="money">${escapeHtml(fmtMoney(row.amount, row.currency))}</td>
          <td>${escapeHtml(row.currency || 'USD')}</td>
          <td>${escapeHtml(row.notes || '-')}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="8" class="empty">${escapeHtml(text.noRecords)}</td></tr>`;
  const expenseTableRows = expenseRows.length
    ? expenseRows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(shortDate(row.date || row.created_at))}</td>
          <td>${escapeHtml(row.description || '-')}</td>
          <td>${escapeHtml(row.category || '-')}</td>
          <td class="loss">${escapeHtml(fmtMoney(row.amount, row.currency || 'USD'))}</td>
          <td>${escapeHtml(row.currency || 'USD')}</td>
          <td>${escapeHtml(row.property || '-')}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="7" class="empty">${escapeHtml(text.noRecords)}</td></tr>`;

  if (forExcel) {
    const excelCols = 8 + currencies.length;
    const summary = [
      ['Receive receipts', receiveReceiptRows.length, ...currencies.map(currency => receiveTotals[currency] || 0)],
      ['Give receipts', giveReceiptRows.length, ...currencies.map(currency => giveTotals[currency] || 0)],
      [profitLabel, profitRows.length, ...currencies.map(currency => profitTotals[currency] || 0)],
      [text.expenses || 'Expenses / Loss', expenseRows.length, ...currencies.map(currency => expenseTotals[currency] || 0)],
      ['Net profit / loss', '', ...currencies.map(currency => netTotals[currency] || 0)],
    ].map(row => `
      <tr>
        <td>${escapeHtml(row[0])}</td>
        <td>${escapeHtml(row[1])}</td>
        ${currencies.map((currency, index) => `<td class="${row[0] === 'Net profit / loss' ? 'net' : ''}">${escapeHtml(row[index + 2] || 0)}</td>`).join('')}
      </tr>
    `).join('');
    const excelProfitRows = profitRows.length
      ? profitRows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="date">${escapeHtml(shortDate(row.created_at))}</td>
            <td>${escapeHtml(row.contract_title || '-')}</td>
            <td>${escapeHtml(row.contract_kind || row.source || '-')}</td>
            <td>${escapeHtml(row.contract_no || '-')}</td>
            ${currencies.map(currency => `<td class="money">${escapeHtml(amountForCurrency(row, currency))}</td>`).join('')}
            <td>${escapeHtml(row.currency || 'USD')}</td>
            <td>${escapeHtml(row.notes || '-')}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="${excelCols}" class="empty">${escapeHtml(text.noRecords)}</td></tr>`;
    const excelExpenseRows = expenseRows.length
      ? expenseRows.map((row, index) => {
          const normalized = { ...row, currency: row.currency || 'USD' };
          return `
            <tr>
              <td>${index + 1}</td>
              <td class="date">${escapeHtml(shortDate(row.date || row.created_at))}</td>
              <td>${escapeHtml(row.description || '-')}</td>
              <td>${escapeHtml(row.category || '-')}</td>
              <td>${escapeHtml(row.property || '-')}</td>
              ${currencies.map(currency => `<td class="loss">${escapeHtml(amountForCurrency(normalized, currency))}</td>`).join('')}
              <td>${escapeHtml(normalized.currency || 'USD')}</td>
              <td>${escapeHtml(row.notes || '-')}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="${excelCols}" class="empty">${escapeHtml(text.noRecords)}</td></tr>`;

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Profit Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    table { border-collapse: collapse; font-family: Arial, Tahoma, sans-serif; font-size: 12pt; direction: ltr; }
    col.no { width: 42px; }
    col.date { width: 150px; }
    col.title { width: 230px; }
    col.type { width: 110px; }
    col.no2 { width: 125px; }
    col.money { width: 95px; }
    col.currency { width: 85px; }
    col.notes { width: 260px; }
    td, th { border: 1px solid #cbd5e1; padding: 7px 9px; vertical-align: top; white-space: nowrap; }
    .title { font-size: 20pt; font-weight: 800; color: #0f172a; background: #dbeafe; text-align: center; }
    .meta { background: #f8fafc; color: #334155; font-weight: 700; }
    .section { font-size: 14pt; font-weight: 800; color: #0f172a; background: #bfdbfe; }
    .head { font-weight: 800; color: #334155; background: #eef2ff; }
    .date { mso-number-format: "\\@"; }
    .money, .net { color: #059669; font-weight: 800; mso-number-format: "0"; }
    .loss { color: #dc2626; font-weight: 800; mso-number-format: "0"; }
    .empty { color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <table>
    <colgroup>
      <col class="no"><col class="date"><col class="title"><col class="type"><col class="no2">
      ${currencies.map(() => '<col class="money">').join('')}
      <col class="currency"><col class="notes">
    </colgroup>
    <tr><td class="title" colspan="${excelCols}">${escapeHtml(profitLabel)}</td></tr>
    <tr class="meta"><td>Agent</td><td colspan="2">${escapeHtml(selected?.name || '-')}</td><td>Username</td><td>${escapeHtml(selected?.username || '-')}</td><td colspan="${Math.max(1, currencies.length)}">Role: ${escapeHtml(role)}</td><td colspan="2">Generated: ${escapeHtml(generatedAt)}</td></tr>
    <tr><td colspan="${excelCols}"></td></tr>
    <tr><td class="section" colspan="${excelCols}">Summary</td></tr>
    <tr class="head"><td>Type</td><td>Count</td>${currencies.map(currency => `<td>${escapeHtml(currency)}</td>`).join('')}<td colspan="${Math.max(1, excelCols - currencies.length - 2)}"></td></tr>
    ${summary}
    <tr><td colspan="${excelCols}"></td></tr>
    <tr><td class="section" colspan="${excelCols}">${escapeHtml(profitLabel)}</td></tr>
    <tr class="head"><td>#</td><td>${escapeHtml(text.date)}</td><td>${escapeHtml(text.title)}</td><td>${escapeHtml(text.type)}</td><td>${escapeHtml(text.receiptNo)}</td>${currencies.map(currency => `<td>${escapeHtml(currency)}</td>`).join('')}<td>${escapeHtml(t('currency'))}</td><td>${escapeHtml(text.description)}</td></tr>
    ${excelProfitRows}
    <tr><td colspan="${excelCols}"></td></tr>
    <tr><td class="section" colspan="${excelCols}">${escapeHtml(text.expenses || 'Expenses / Loss')}</td></tr>
    <tr class="head"><td>#</td><td>${escapeHtml(text.date)}</td><td>${escapeHtml(text.description)}</td><td>${escapeHtml(text.category)}</td><td>Property</td>${currencies.map(currency => `<td>${escapeHtml(currency)}</td>`).join('')}<td>${escapeHtml(t('currency'))}</td><td>${escapeHtml(text.notes || 'Notes')}</td></tr>
    ${excelExpenseRows}
  </table>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Tahoma, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .report {
      width: 100%;
      padding: ${forExcel ? '18px' : '0'};
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      padding-bottom: 14px;
      border-bottom: 2px solid #4f7df3;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 24px;
      color: #0f172a;
      letter-spacing: 0;
    }
    .muted { color: #64748b; }
    .meta {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .meta-card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .label {
      display: block;
      color: #64748b;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .value {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
    }
    th {
      background: #eef4ff;
      color: #334155;
      font-size: 10px;
      text-transform: uppercase;
      text-align: left;
      padding: 9px 10px;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .money { color: #059669; font-weight: 900; white-space: nowrap; }
    .loss { color: #dc2626; font-weight: 900; white-space: nowrap; }
    .empty { text-align: center; color: #64748b; padding: 24px; }
    .section-title {
      margin: 18px 0 8px;
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
    }
    .footer {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 11px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="report-header">
      <div>
        <h1>${escapeHtml(profitLabel)}</h1>
        <div class="muted">${escapeHtml(t('agentReports'))} / ${escapeHtml(selected?.name || selected?.username || '-')}</div>
      </div>
      <div class="muted">${escapeHtml(generatedAt)}</div>
    </header>
    <section class="meta">
      <div class="meta-card"><span class="label">${escapeHtml(text.chooseAgent)}</span><span class="value">${escapeHtml(selected?.name || '-')}</span></div>
      <div class="meta-card"><span class="label">Username</span><span class="value">${escapeHtml(selected?.username || '-')}</span></div>
      <div class="meta-card"><span class="label">Role</span><span class="value">${escapeHtml(role)}</span></div>
      <div class="meta-card"><span class="label">${escapeHtml(text.profitAmount || t('profitAmount'))}</span><span class="value">${escapeHtml(totalText(profitTotals, currencies))}</span></div>
      <div class="meta-card"><span class="label">Net profit / loss</span><span class="value">${escapeHtml(totalText(netTotals, currencies))}</span></div>
    </section>
    <table>
      <thead><tr><th>Type</th><th>Count</th><th>Totals by currency</th></tr></thead>
      <tbody>
        ${summaryRows.map(row => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td class="${row[0] === 'Net profit / loss' ? 'money' : ''}">${escapeHtml(row[2])}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="section-title">${escapeHtml(profitLabel)}</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>${escapeHtml(text.date)}</th>
          <th>${escapeHtml(text.title)}</th>
          <th>${escapeHtml(text.type)}</th>
          <th>${escapeHtml(text.receiptNo)}</th>
          <th>${escapeHtml(text.profitAmount || t('profitAmount'))}</th>
          <th>${escapeHtml(t('currency'))}</th>
          <th>${escapeHtml(text.description)}</th>
        </tr>
      </thead>
      <tbody>${profitTableRows}</tbody>
    </table>
    <div class="section-title">${escapeHtml(text.expenses || 'Expenses')}</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>${escapeHtml(text.date)}</th>
          <th>${escapeHtml(text.description)}</th>
          <th>${escapeHtml(text.category)}</th>
          <th>${escapeHtml(text.amount)}</th>
          <th>${escapeHtml(t('currency'))}</th>
          <th>Property</th>
        </tr>
      </thead>
      <tbody>${expenseTableRows}</tbody>
    </table>
    <div class="footer">
      <span>${escapeHtml(profitRows.length)} ${escapeHtml(profitLabel)} / ${escapeHtml(expenseRows.length)} ${escapeHtml(text.expenses || 'Expenses')}</span>
      <span>${escapeHtml(totalText(netTotals, currencies))}</span>
    </div>
  </main>
</body>
</html>`;
}

export default function AgentReports() {
  const { t, lang } = useLanguage();
  const text = COPY[lang] || COPY.en;
  const [report, setReport] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getUserReports()
      .then(data => {
        if (!alive) return;
        setReport(data);
        setSelectedId(data.agents?.[0]?.id || null);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const agents = report?.agents || [];
  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(agent =>
      [agent.name, agent.username, agent.phone, agent.email].some(value => String(value || '').toLowerCase().includes(q))
    );
  }, [agents, search]);

  const selected = agents.find(agent => Number(agent.id) === Number(selectedId)) || filteredAgents[0] || agents[0];
  const totals = selected?.totals || {};
  const profitLabel = text.profitReport || t('profit');
  const exportLabel = text.exportExcel || t('exportExcel');
  const printLabel = text.print || t('print');
  const getReportRole = role => {
    if (role === 'developer') return 'Developer';
    if (role === 'admin') return 'Owner';
    return 'Agent';
  };

  const statCards = [
    { label: text.receiveReceipts, value: totals.receipts || 0, meta: fmtMoney(totals.receiptAmount), icon: ReceiptText, accent: '#2563eb', dim: 'var(--primary-dim)' },
    { label: text.giveReceipts, value: totals.giveReceipts || 0, meta: fmtMoney(totals.giveAmount), icon: WalletCards, accent: '#7c3aed', dim: 'var(--purple-dim)' },
    { label: text.sellContracts, value: totals.sellContracts || 0, meta: text.contractsTable, icon: FileText, accent: '#d97706', dim: 'var(--warning-dim)' },
    { label: text.rentContracts, value: totals.rentContracts || 0, meta: text.contractsTable, icon: FileText, accent: '#059669', dim: 'var(--success-dim)' },
    { label: text.paidPayments, value: totals.paidPayments || 0, meta: fmtMoney(totals.paidAmount), icon: CreditCard, accent: '#0891b2', dim: 'var(--cyan-dim, #cffafe)' },
    { label: profitLabel, value: totals.profits || 0, meta: fmtMoney(totals.profitAmount), icon: TrendingUp, accent: '#059669', dim: 'var(--success-dim)' },
    { label: text.expenses, value: totals.expenses || 0, meta: fmtMoney(totals.expenseAmount), icon: WalletCards, accent: '#dc2626', dim: 'var(--danger-dim)' },
    { label: text.activity, value: totals.activity || 0, meta: text.lastActivity, icon: Activity, accent: '#475569', dim: 'var(--bg-hover)' },
  ];

  function exportProfitExcel() {
    if (!selected) return;
    const html = buildProfitReportHtml({ selected, text, t, profitLabel, forExcel: true });
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-report-${selected.username || selected.id}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printProfitReport() {
    if (!selected) return;
    const win = window.open('', '_blank', 'width=980,height=720');
    if (!win) return;
    win.document.write(buildProfitReportHtml({ selected, text, t, profitLabel, forExcel: false }));
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => win.close(), 800);
    }, 250);
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24 }}>
          <Loader2 className="animate-spin" size={22} /> {t('loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('agentReports')}</h1>
          <p>{t('agentReportsSub')}</p>
        </div>
      </div>

      <div className="grid two" style={{ alignItems: 'start' }}>
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h2>{text.chooseAgent}</h2>
          </div>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 12px', background: 'var(--surface)' }}>
              <Search size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={text.searchAgents} style={{ border: 0, background: 'transparent', boxShadow: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, padding: 16, maxHeight: 560, overflow: 'auto' }}>
            {filteredAgents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: 12 }}>No users available.</div>
            ) : filteredAgents.map(agent => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedId(agent.id)}
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  background: Number(selected?.id) === Number(agent.id) ? 'var(--primary)' : 'var(--bg-soft)',
                  color: Number(selected?.id) === Number(agent.id) ? '#fff' : 'var(--text)',
                  boxShadow: 'none',
                }}
              >
                <UserRound size={18} />
                <span style={{ display: 'grid', textAlign: 'start' }}>
                  <strong>{agent.name || agent.username}</strong>
                  <small style={{ opacity: 0.75 }}>{agent.username} · {getReportRole(agent.role)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 18 }}>
          {selected ? (
            <>
              <div className="stat-grid">
                {statCards.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="stat-card" style={{ '--stat-accent': item.accent, '--stat-dim': item.dim }}>
                      <div className="stat-icon"><Icon size={20} /></div>
                      <div className="stat-label">{item.label}</div>
                      <div className="stat-value">{item.value}</div>
                      <div className="stat-sub">{item.meta}</div>
                    </div>
                  );
                })}
              </div>

              <section className="card">
                <div className="card-header"><h2>{text.receiptsTable}</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{text.receiptNo}</th><th>{text.tenant}</th><th>{text.type}</th><th>{text.amount}</th><th>{text.date}</th><th>{text.wa}</th></tr></thead>
                    <tbody>
                      {(selected.receipts || []).length === 0 ? <EmptyRow colSpan={6} text={text.noRecords} /> : selected.receipts.map(row => (
                        <tr key={row.id}>
                          <td>{row.receipt_no}</td>
                          <td>{row.tenant_name || row.owner_name || '-'}</td>
                          <td><span className={`badge ${String(row.receipt_no || '').startsWith('G-') ? 'badge-purple' : 'badge-blue'}`}>{String(row.receipt_no || '').startsWith('G-') ? text.giveReceipts : text.receiveReceipts}</span></td>
                          <td>{fmtMoney(row.amount, row.currency)}</td>
                          <td>{shortDate(row.paid_date || row.printed_at)}</td>
                          <td><span className={`badge ${row.wa_sent ? 'badge-green' : 'badge-gray'}`}>{row.wa_sent ? 'Sent' : '-'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <div className="card-header"><h2>{text.contractsTable}</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{text.type}</th><th>{text.title}</th><th>{text.receiptNo}</th><th>{text.price}</th><th>{text.date}</th></tr></thead>
                    <tbody>
                      {(selected.contracts || []).length === 0 ? <EmptyRow colSpan={5} text={text.noRecords} /> : selected.contracts.map(row => (
                        <tr key={row.id}>
                          <td><span className={`badge ${row.kind === 'sell' ? 'badge-amber' : 'badge-green'}`}>{row.kind === 'sell' ? t('sellContract') : t('rentContract')}</span></td>
                          <td>{row.title || row.values?.firstParty || row.values?.secondParty || '-'}</td>
                          <td>{row.contract_no || '-'}</td>
                          <td>{row.price || row.values?.price || '-'}</td>
                          <td>{shortDate(row.contract_date || row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <div className="card-header"><h2>{text.paymentsTable}</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{text.tenant}</th><th>{text.apartment}</th><th>{text.month}</th><th>{text.amount}</th><th>{text.status}</th><th>{text.date}</th></tr></thead>
                    <tbody>
                      {(selected.payments || []).length === 0 ? <EmptyRow colSpan={6} text={text.noRecords} /> : selected.payments.map(row => (
                        <tr key={row.id}>
                          <td>{row.tenant_name || '-'}</td>
                          <td>{row.apt || '-'}</td>
                          <td>{row.month || '-'}</td>
                          <td>{fmtMoney(row.amount)}</td>
                          <td><span className={`badge ${row.status === 'paid' ? 'badge-green' : row.status === 'late' ? 'badge-red' : 'badge-amber'}`}>{row.status || '-'}</span></td>
                          <td>{shortDate(row.paid_date || row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card agent-profit-report">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <h2>{profitLabel}</h2>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={printProfitReport}><Printer size={14} /> {printLabel}</button>
                    <button className="btn btn-primary btn-sm" onClick={exportProfitExcel}><Download size={14} /> {exportLabel}</button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{text.date}</th><th>{text.title}</th><th>{text.type}</th><th>{text.receiptNo}</th><th>{text.profitAmount || t('profitAmount')}</th><th>{t('currency')}</th><th>{text.description}</th></tr></thead>
                    <tbody>
                      {(selected.profits || []).length === 0 ? <EmptyRow colSpan={7} text={text.noRecords} /> : selected.profits.map(row => (
                        <tr key={row.id}>
                          <td>{shortDate(row.created_at)}</td>
                          <td>{row.contract_title || '-'}</td>
                          <td><span className="badge badge-green">{row.contract_kind || row.source || '-'}</span></td>
                          <td>{row.contract_no || '-'}</td>
                          <td style={{ fontWeight: 900, color: 'var(--success)' }}>{fmtMoney(row.amount, row.currency)}</td>
                          <td>{row.currency || 'USD'}</td>
                          <td>{row.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <div className="card-header"><h2>{text.expensesTable}</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{text.date}</th><th>{text.description}</th><th>{text.category}</th><th>{text.amount}</th></tr></thead>
                    <tbody>
                      {(selected.expenses || []).length === 0 ? <EmptyRow colSpan={4} text={text.noRecords} /> : selected.expenses.map(row => (
                        <tr key={row.id}>
                          <td>{shortDate(row.date)}</td>
                          <td>{row.description || '-'}</td>
                          <td><span className="badge badge-purple">{row.category || '-'}</span></td>
                          <td>{fmtMoney(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <div className="card-header"><h2>{text.activityTable}</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{text.type}</th><th>{text.message}</th><th>{text.date}</th></tr></thead>
                    <tbody>
                      {(selected.logs || []).length === 0 ? <EmptyRow colSpan={3} text={text.noRecords} /> : selected.logs.map(row => (
                        <tr key={row.id}>
                          <td><span className={`badge ${row.type === 'success' ? 'badge-green' : row.type === 'error' ? 'badge-red' : 'badge-blue'}`}>{row.type}</span></td>
                          <td>{row.message || '-'}</td>
                          <td>{shortDate(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="card" style={{ padding: 24, color: 'var(--text-muted)' }}>{text.noAgents}</section>
          )}
        </section>
      </div>
    </div>
  );
}
