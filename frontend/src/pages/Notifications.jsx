import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, Check, CheckCircle2, Clock3, Loader2, MessageCircle, Send, Smartphone, UsersRound } from 'lucide-react';
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
      <div className="page-header notify-page-header">
        <div className="notify-page-title">
          <span className="notify-page-icon"><Bell size={24} /></span>
          <div>
            <h1>{t('notifications')}</h1>
            <p>{t('notificationsSub')}</p>
          </div>
        </div>
        <div className="notify-page-stats">
          {isManager ? (
            <>
              <div><UsersRound size={17} /><strong>{agents.length}</strong><span>{t('selectAgents')}</span></div>
              <div><Send size={17} /><strong>{data.sent.length}</strong><span>{t('sentNotifications')}</span></div>
            </>
          ) : (
            <>
              <div><Bell size={17} /><strong>{unread.length}</strong><span>{t('unread')}</span></div>
              <div><CheckCircle2 size={17} /><strong>{inbox.length}</strong><span>{t('notifications')}</span></div>
            </>
          )}
        </div>
      </div>

      <div className="notify-grid">
        {isManager && (
          <section className="card notify-compose">
            <div className="card-header notify-card-header">
              <span className="notify-section-icon"><Send size={18} /></span>
              <div>
                <h3>{t('sendNotification')}</h3>
                <p>{t('notificationsSub')}</p>
              </div>
            </div>
            <div className="notify-compose-body">
              <div className="notify-message-panel">
                <div className="form-group">
                  <label>{t('notificationTitle')}</label>
                  <input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Meeting" />
                </div>
                <div className="form-group">
                  <label>{t('notificationMessage')}</label>
                  <textarea rows={7} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} placeholder="Tomorrow we have meeting at 3 PM..." />
                  <small className="notify-character-count">{form.message.length}</small>
                </div>
              </div>
              <aside className="notify-delivery-panel">
                <div className="notify-delivery-title">
                  <CalendarClock size={18} />
                  <strong>{t('scheduledAt')}</strong>
                </div>
                <div className="form-group">
                  <input type="datetime-local" value={form.scheduledAt} onChange={event => setForm({ ...form, scheduledAt: event.target.value })} />
                </div>
                <div className="notify-options">
                  <label className={form.sendWhatsapp ? 'active' : ''}>
                    <input type="checkbox" checked={form.sendWhatsapp} onChange={event => setForm({ ...form, sendWhatsapp: event.target.checked })} />
                    <span className="notify-option-icon"><Smartphone size={17} /></span>
                    <span>{t('sendByWhatsapp')}</span>
                    <Check className="notify-option-check" size={15} />
                  </label>
                  <label className={form.targetAll ? 'active' : ''}>
                    <input type="checkbox" checked={form.targetAll} onChange={event => setForm({ ...form, targetAll: event.target.checked })} />
                    <span className="notify-option-icon"><UsersRound size={17} /></span>
                    <span>{t('sendToAllAgents')}</span>
                    <Check className="notify-option-check" size={15} />
                  </label>
                </div>
              </aside>
              {!form.targetAll && (
                <div className="notify-agent-list">
                  <div className="notify-section-title">
                    <span>{t('selectAgents')}</span>
                    <b>{form.recipientIds.length}/{agents.length}</b>
                  </div>
                  {agents.map(agent => (
                    <button key={agent.id} type="button" className={form.recipientIds.includes(agent.id) ? 'selected' : ''} onClick={() => toggleAgent(agent.id)}>
                      <span className="notify-agent-avatar">{agent.name?.charAt(0)?.toUpperCase()}</span>
                      <span className="notify-agent-copy">
                        <strong>{agent.name}</strong>
                        <small>{agent.username} {agent.phone ? `- ${agent.phone}` : ''}</small>
                      </span>
                      <span className="notify-agent-check"><Check size={14} /></span>
                    </button>
                  ))}
                </div>
              )}
              <div className="notify-compose-footer">
                <div className="notify-delivery-summary">
                  {form.targetAll ? <UsersRound size={16} /> : <MessageCircle size={16} />}
                  <span>{form.targetAll ? t('sendToAllAgents') : `${form.recipientIds.length} ${t('selectAgents')}`}</span>
                </div>
                <button className="btn btn-primary notify-send-btn" onClick={sendNotification} disabled={sending}>
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {t('sendNotification')}
                </button>
              </div>
            </div>
          </section>
        )}

        {!isManager && (
          <section className="card notify-inbox notify-inbox-wide">
            <div className="card-header notify-card-header">
              <span className="notify-section-icon"><Bell size={18} /></span>
              <div><h3>{t('notifications')}</h3><p>{t('notificationsSub')}</p></div>
              <span className="badge badge-blue badge-lg">{unread.length} {t('unread')}</span>
            </div>
            <NotificationList items={inbox} empty={t('noNotifications')} markRead={markRead} t={t} autoRead />
          </section>
        )}

        {isManager && (
          <section className="card notify-sent">
            <div className="card-header notify-card-header">
              <span className="notify-section-icon"><MessageCircle size={18} /></span>
              <div><h3>{t('sentNotifications')}</h3><p>{data.sent.length} {t('notifications')}</p></div>
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
                      <td><div className="notify-table-title"><span><Bell size={15} /></span><div><strong>{item.title}</strong><div className="td-sub">{item.message}</div></div></div></td>
                      <td><span className="notify-date-cell"><Clock3 size={14} />{(item.scheduledAt || item.createdAt || '').replace('T', ' ').slice(0, 16)}</span></td>
                      <td><span className="notify-read-count">{item.readCount}/{item.recipientCount}</span></td>
                      <td><span className={`notify-wa-status ${item.sendWhatsapp ? 'enabled' : ''}`}><Smartphone size={14} />{item.sendWhatsapp ? t('yes') : t('no')}</span></td>
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
          <span className="notify-list-icon"><Bell size={18} /></span>
          <div className="notify-card-copy">
            <div className="notify-card-title-row">
              <h4>{item.title}</h4>
              <span className={`notify-status-chip ${item.readAt ? 'read' : 'unread'}`}>{item.readAt ? t('read') : t('unread')}</span>
            </div>
            <p>{item.message}</p>
            <small className="notify-card-meta"><Clock3 size={13} />{(item.scheduledAt || item.createdAt || '').replace('T', ' ').slice(0, 16)} {item.senderName ? `- ${item.senderName}` : ''}</small>
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
