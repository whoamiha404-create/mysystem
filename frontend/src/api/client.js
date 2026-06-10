const BASE = '/api';

function getToken() {
  return localStorage.getItem('rp_token');
}

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function uploadFile(url, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
  return data;
}

const api = {
  // Auth
  login:         (u, p)        => request('POST', '/auth/login',    { username: u, password: p }),
  me:            ()            => request('GET',  '/auth/me'),
  changePass:    (body)        => request('PUT',  '/auth/password', body),

  // Tenants
  getTenants:    ()            => request('GET',  '/tenants'),
  getTenant:     (id)          => request('GET',  `/tenants/${id}`),
  createTenant:  (data)        => request('POST', '/tenants',         data),
  updateTenant:  (id, data)    => request('PUT',  `/tenants/${id}`,   data),
  deleteTenant:  (id)          => request('DELETE',`/tenants/${id}`),

  // Payments
  getPayments:   (tid)         => request('GET',  `/payments${tid ? `?tenant_id=${tid}` : ''}`),
  addPayment:    (data)        => request('POST', '/payments',        data),
  updatePayment: (id, data)    => request('PUT',  `/payments/${id}`,  data),
  deletePayment: (id)          => request('DELETE',`/payments/${id}`),

  // Expenses
  getExpenses:   ()            => request('GET',  '/expenses'),
  addExpense:    (data)        => request('POST', '/expenses',        data),
  updateExpense: (id, data)    => request('PUT',  `/expenses/${id}`,  data),
  deleteExpense: (id)          => request('DELETE',`/expenses/${id}`),

  // Users
  getUsers:      ()            => request('GET',  '/users'),
  getUserReports:()            => request('GET',  '/users/reports'),
  createUser:    (data)        => request('POST', '/users',           data),
  updateUser:    (id, data)    => request('PUT',  `/users/${id}`,     data),
  deleteUser:    (id)          => request('DELETE',`/users/${id}`),

  // Settings
  getSettings:   ()            => request('GET',  '/settings'),
  saveSettings:  (data)        => request('PUT',  '/settings',        data),

  // WhatsApp
  waStatus:      ()                       => request('GET',  '/whatsapp/status'),
  waSend:        (phone, msg, img)        => request('POST', '/whatsapp/send',   { phone, message: msg, withImage: img }),
  waRemind:      (tid, img)               => request('POST', `/whatsapp/remind/${tid}`, { withImage: img }),
  waRemindAll:   (img)                    => request('POST', '/whatsapp/remind-all', { withImage: img }),
  waRenewal:     (tid, img=false)         => request('POST', `/whatsapp/renewal/${tid}`, { withImage: img }),
  waRenewalAll:  (days=7, img=false)      => request('POST', '/whatsapp/renewal-all', { days, withImage: img }),
  waUploadImage: (formData)               => uploadFile('/whatsapp/image', formData),
  waDeleteImage: ()                       => request('DELETE', '/whatsapp/image'),

  // Receipts
  getReceipts:   ()            => request('GET',  '/receipts'),
  saveReceipt:   (data)        => request('POST', '/receipts', data),
  updateReceipt: (id, data)    => request('PUT', `/receipts/${id}`, data),
  deleteReceipt: (id)          => request('DELETE', `/receipts/${id}`),

  // Contracts
  getContracts:  (kind)        => request('GET', `/contracts${kind ? `?kind=${kind}` : ''}`),
  getContract:   (id)          => request('GET', `/contracts/${id}`),
  createContract:(data)        => request('POST', '/contracts', data),
  updateContract:(id, data)    => request('PUT', `/contracts/${id}`, data),
  deleteContract:(id)          => request('DELETE', `/contracts/${id}`),

  // Logs
  getLogs:       (limit, all=false) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    if (all) params.set('all', '1');
    const qs = params.toString();
    return request('GET', `/logs${qs ? `?${qs}` : ''}`);
  },
  clearLogs:     ()            => request('DELETE','/logs'),
};

export default api;
