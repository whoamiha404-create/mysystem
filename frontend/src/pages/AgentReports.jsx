import { useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

function formatDate(value) {
  return value ? String(value).slice(0, 16) : '-';
}

export default function AgentReports() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getLogs(500, true)])
      .then(([userRows, logRows]) => {
        setUsers(userRows);
        setLogs(logRows);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => users
    .filter(user => user.role !== 'developer')
    .map(user => {
      const userLogs = logs.filter(log => {
        if (log.user_id && Number(log.user_id) === Number(user.id)) return true;
        const name = String(log.name || '').toLowerCase();
        return name === String(user.name || '').toLowerCase()
          || name === String(user.username || '').toLowerCase();
      });
      return {
        ...user,
        activityCount: userLogs.length,
        lastActivity: userLogs[0]?.time || '',
        lastMessage: userLogs[0]?.message || '-',
      };
    }), [logs, users]);

  if (loading) {
    return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('agentReports')}</h1>
        <p>{t('agentReportsSub')}</p>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3, minmax(180px, 1fr))' }}>
        <div className="stat-card" style={{ '--stat-accent':'var(--primary)', '--stat-dim':'var(--primary-dim)' }}>
          <div className="stat-icon"><UserRound size={22} strokeWidth={2.25} /></div>
          <div className="stat-label">{t('agent')}</div>
          <div className="stat-value">{rows.filter(user => user.role === 'agent').length}</div>
          <div className="stat-sub">{t('users')}</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent':'var(--purple)', '--stat-dim':'var(--purple-dim)' }}>
          <div className="stat-icon"><ShieldCheck size={22} strokeWidth={2.25} /></div>
          <div className="stat-label">{t('ownerRole')}</div>
          <div className="stat-value">{rows.filter(user => user.role === 'admin').length}</div>
          <div className="stat-sub">{t('adminSection')}</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent':'var(--success)', '--stat-dim':'var(--success-dim)' }}>
          <div className="stat-icon"><Activity size={22} strokeWidth={2.25} /></div>
          <div className="stat-label">{t('totalActivity')}</div>
          <div className="stat-value">{rows.reduce((sum, user) => sum + user.activityCount, 0)}</div>
          <div className="stat-sub">{t('activityLogs')}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <div className="empty-state"><h3>{t('noUsers')}</h3></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('nameLabel')}</th>
                  <th>{t('username')}</th>
                  <th>{t('role')}</th>
                  <th>{t('totalActivity')}</th>
                  <th>{t('lastActivity')}</th>
                  <th>{t('activityLogs')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(user => (
                  <tr key={user.id}>
                    <td className="td-name">{user.name}</td>
                    <td className="font-mono">{user.username}</td>
                    <td><span className={`badge ${user.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>{user.role === 'admin' ? t('ownerRole') : t('agent')}</span></td>
                    <td style={{ fontWeight:800 }}>{user.activityCount}</td>
                    <td style={{ color:'var(--text-muted)' }}>{formatDate(user.lastActivity)}</td>
                    <td style={{ color:'var(--text-secondary)' }}>{user.lastMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
