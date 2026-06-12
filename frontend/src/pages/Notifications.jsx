import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, MessageCircle, Send } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import './Notifications.css';

const EMPTY_FORM = {
  title: '',
  message: '',
  scheduledAt: '',
  sendWhatsapp: true,
  targetAll: true,
  recipientIds: [],
};

export default function Notifications() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState([]);
  const [data, setData] = useState({ inbox: [], sent: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const isManager = ['admin', 'developer'].includes(user?.role);
  const isRtl = lang === 'ar' || lang === 'ku';

  const unread = useMemo(() => data.inbox.filter(item => !item.readAt), [data.inbox]);
  const inbox = data.inbox || [];

  async function load() {
    const requests = [api.getNotifications()];
    if (isManager) requests.push(api.getNotificationAgents());
    const [notifications, agentRows = []] = await Promise.all(requests);
    setData(notifications || { inbox: [], sent: [] });
    setAgents(agentRows || []);
  }

  useEffect(() => {
    let alive = true;
    load().catch(error => toast(error.message, 'error')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [isManager]);

  useEffect(() => {
    if (loading || isManager) return;
    const unreadIds = data.inbox.filter(item => !item.readAt).map(item => item.id);
    if (!unreadIds.length) return;
    Promise.all(unreadIds.map(id => api.markNotificationRead(id)))
      .then(load)
      .then(() => window.dispatchEvent(new Event('rentpro-notifications-updated')))
      .catch(() => {});
  }, [loading, isManager, data.inbox]);

  function toggleAgent(id) {
    setForm(current => {
      const exists = current.recipientIds.includes(id);
      return {
        ...current,
        recipientIds: exists ? current.recipientIds.filter(item => item !== id) : [...current.recipientIds, id],
      };
    });
  }

  async function sendNotification() {
    if (!form.title.trim() || !form.message.trim()) {
      toast(`${t('notificationTitle')} / ${t('notificationMessage')}`, 'error');
      return;
    }
    setSending(true);
    try {
      await api.createNotification(form);
      toast(t('sendNotification'), 'success');
      setForm(EMPTY_FORM);
      await load();
      window.dispatchEvent(new Event('rentpro-notifications-updated'));
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSending(false);
    }
  }

  async function markRead(id) {
    try {
      await api.markNotificationRead(id);
      await load();
      window.dispatchEvent(new Event('rentpro-notifications-updated'));
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  if (loading) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="notify-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="page-header">
        <h1>{t('notifications')}</h1>
        <p>{t('notificationsSub')}</p>
      </div>

      <div className="notify-grid">
        {isManager && (
          <section className="card notify-compose">
            <div className="card-header">
              <h3><Send size={18} /> {t('sendNotification')}</h3>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>{t('notificationTitle')}</label>
                <input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Meeting" />
              </div>
              <div className="form-group">
                <label>{t('scheduledAt')}</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={event => setForm({ ...form, scheduledAt: event.target.value })} />
              </div>
              <div className="form-group span-2">
                <label>{t('notificationMessage')}</label>
                <textarea rows={5} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} placeholder="Tomorrow we have meeting at 3 PM..." />
              </div>
            </div>
            <div className="notify-options">
              <label><input type="checkbox" checked={form.sendWhatsapp} onChange={event => setForm({ ...form, sendWhatsapp: event.target.checked })} /> {t('sendByWhatsapp')}</label>
              <label><input type="checkbox" checked={form.targetAll} onChange={event => setForm({ ...form, targetAll: event.target.checked })} /> {t('sendToAllAgents')}</label>
            </div>
            {!form.targetAll && (
              <div className="notify-agent-list">
                <div className="notify-section-title">{t('selectAgents')}</div>
                {agents.map(agent => (
                  <button key={agent.id} type="button" className={form.recipientIds.includes(agent.id) ? 'selected' : ''} onClick={() => toggleAgent(agent.id)}>
                    <span>{agent.name}</span>
                    <small>{agent.username} {agent.phone ? `- ${agent.phone}` : ''}</small>
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-primary notify-send-btn" onClick={sendNotification} disabled={sending}>
              {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {t('sendNotification')}
            </button>
          </section>
        )}

        {!isManager && (
          <section className="card notify-inbox notify-inbox-wide">
            <div className="card-header">
              <h3><Bell size={18} /> {t('notifications')}</h3>
              <span className="badge badge-blue badge-lg">{unread.length} {t('unread')}</span>
            </div>
            <NotificationList items={inbox} empty={t('noNotifications')} markRead={markRead} t={t} autoRead />
          </section>
        )}

        {isManager && (
          <section className="card notify-sent">
            <div className="card-header">
              <h3><MessageCircle size={18} /> {t('sentNotifications')}</h3>
              <span className="badge badge-purple badge-lg">{data.sent.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t('notificationTitle')}</th><th>{t('date')}</th><th>{t('read')}</th><th>WhatsApp</th></tr></thead>
                <tbody>
                  {data.sent.length === 0 ? (
                    <tr><td colSpan="4" className="td-sub">{t('noNotifications')}</td></tr>
                  ) : data.sent.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong><div className="td-sub">{item.message}</div></td>
                      <td>{(item.scheduledAt || item.createdAt || '').replace('T', ' ').slice(0, 16)}</td>
                      <td>{item.readCount}/{item.recipientCount}</td>
                      <td>{item.sendWhatsapp ? t('yes') : t('no')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function NotificationList({ items, empty, markRead, t, readOnly = false, autoRead = false }) {
  if (!items.length) return <div className="empty-state notify-empty">{empty}</div>;
  return (
    <div className="notify-list">
      {items.map(item => (
        <article key={item.id} className={`notify-card ${item.readAt ? 'read' : 'unread'}`}>
          <div>
            <div className="notify-card-title-row">
              <h4>{item.title}</h4>
              <span className={`notify-status-chip ${item.readAt ? 'read' : 'unread'}`}>{item.readAt ? t('read') : t('unread')}</span>
            </div>
            <p>{item.message}</p>
            <small>{(item.scheduledAt || item.createdAt || '').replace('T', ' ').slice(0, 16)} {item.senderName ? `- ${item.senderName}` : ''}</small>
            {item.whatsappError && <small className="notify-error">WhatsApp: {item.whatsappError}</small>}
          </div>
          {!readOnly && !autoRead && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => markRead(item.id)}>
              {t('markAsRead')}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
