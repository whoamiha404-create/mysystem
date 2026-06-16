import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FilePenLine, Loader2, RotateCcw, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import './ChangeReviewCenter.css';

function recordValues(value) {
  if (!value || typeof value !== 'object') return '-';
  let parsedValues = {};
  if (value.values_json) {
    try { parsedValues = JSON.parse(value.values_json || '{}'); } catch {}
  }
  return { ...value, ...parsedValues };
}

function pretty(value, limit = 7) {
  const record = recordValues(value);
  if (!record || typeof record !== 'object') return '-';
  const entries = Object.entries(record)
    .filter(([key]) => !['password', 'values_json', 'before_json', 'after_json', 'created_at', 'updated_at'].includes(key))
    .filter(([, val]) => val !== undefined && val !== null && String(val) !== '')
    .slice(0, limit);
  return entries.length ? entries.map(([key, val]) => `${key}: ${val}`).join('\n') : '-';
}

function changedLines(before, after, side) {
  const left = recordValues(before);
  const right = recordValues(after);
  const skip = new Set(['password', 'values_json', 'before_json', 'after_json', 'created_at', 'updated_at']);
  const keys = [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])]
    .filter(key => !skip.has(key));
  const lines = keys
    .filter(key => String(left?.[key] ?? '') !== String(right?.[key] ?? ''))
    .slice(0, 14)
    .map(key => `${key}: ${side === 'before' ? left?.[key] ?? '-' : right?.[key] ?? '-'}`);
  return lines.length ? lines.join('\n') : '-';
}

function badgeClass(status) {
  if (status === 'approved') return 'badge badge-green';
  if (status === 'rejected') return 'badge badge-red';
  return 'badge badge-amber';
}

export default function ChangeReviewCenter() {
  const toast = useToast();
  const { t } = useLanguage();
  const [view, setView] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const data = await api.getChangeRequests('all');
      setRows(data || []);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const run = (options) => alive && load(options);
    run();
    const interval = setInterval(() => run({ silent: true }), 5000);
    window.addEventListener('rentpro-change-requests-updated', run);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('rentpro-change-requests-updated', run);
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (view === 'edits') return rows.filter(row => row.action === 'edit');
    if (view === 'pending') return rows.filter(row => row.action === 'delete' && row.status === 'pending');
    if (view === 'approved') return rows.filter(row => row.action === 'delete' && row.status === 'approved');
    if (view === 'rejected') return rows.filter(row => row.action === 'delete' && row.status === 'rejected');
    return rows;
  }, [rows, view]);

  const tabs = [
    { key: 'pending', label: t('approvalRequests'), icon: ShieldCheck },
    { key: 'edits', label: t('editHistory'), icon: FilePenLine },
    { key: 'approved', label: t('approved'), icon: CheckCircle2 },
    { key: 'rejected', label: t('rejected'), icon: XCircle },
    { key: 'all', label: t('all'), icon: Clock3 },
  ];

  async function review(id, action) {
    setBusyId(id);
    try {
      if (action === 'approve') await api.approveChangeRequest(id);
      else await api.rejectChangeRequest(id);
      toast(action === 'approve' ? t('approved') : t('rejected'), 'success');
      window.dispatchEvent(new Event('rentpro-change-requests-updated'));
      await load();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page review-page">
      <div className="page-header">
        <div>
          <h1>{t('changeReviewCenter')}</h1>
          <p>{t('changeReviewSub')}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => load()}>
          <RotateCcw size={16} /> {t('refresh')}
        </button>
      </div>

      <div className="review-tabs">
        {tabs.map(item => {
          const Icon = item.icon;
          return (
          <button
            key={item.key}
            className={view === item.key ? 'active' : ''}
            onClick={() => setView(item.key)}
          >
            <Icon size={15} />
            {item.label}
          </button>
          );
        })}
      </div>

      <section className="card review-card">
        <div className="card-header">
          <h2>{view === 'edits' ? <FilePenLine size={20} /> : <Trash2 size={20} />} {view === 'edits' ? t('editHistory') : t('approvalRequests')}</h2>
          <span className="badge badge-blue">{filteredRows.length}</span>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 className="animate-spin" size={28} /></div>
        ) : filteredRows.length === 0 ? (
          <div className="empty-state">
            <Clock3 size={30} />
            <strong>{t('noReviewRequests')}</strong>
            <span>{view === 'edits' ? t('editHistoryEmpty') : t('reviewEmptySub')}</span>
          </div>
        ) : (
          <div className="review-list">
            {filteredRows.map(row => (
              <article className="review-item" key={row.id}>
                <div className="review-item-top">
                  <div>
                    <strong>{row.title || `${row.targetType} #${row.targetId}`}</strong>
                    <span>
                      {row.action === 'edit'
                        ? t('agentEditedRecord').replace('{agent}', row.requesterName || t('agent')).replace('{type}', row.targetType)
                        : t('agentRequestedDelete').replace('{agent}', row.requesterName || t('agent')).replace('{type}', row.targetType)}
                    </span>
                  </div>
                  <span className={row.action === 'edit' ? 'badge badge-green' : badgeClass(row.status)}>
                    {row.action === 'edit' ? t('logged') : t(row.status)}
                  </span>
                </div>

                <div className="review-meta">
                  <span>#{row.id}</span>
                  <span>{String(row.createdAt || '').slice(0, 16)}</span>
                  <span>{row.targetType}</span>
                  <span>{t(row.action)}</span>
                </div>

                <div className={`review-diff ${row.action === 'delete' ? 'delete-summary' : ''}`}>
                  <div>
                    <h3>{row.action === 'delete' ? t('record') : t('before')}</h3>
                    <pre>{row.action === 'delete' ? pretty(row.before, 6) : changedLines(row.before, row.after, 'before')}</pre>
                  </div>
                  {row.action !== 'delete' && (
                    <div>
                      <h3>{t('after')}</h3>
                      <pre>{changedLines(row.before, row.after, 'after')}</pre>
                    </div>
                  )}
                </div>

                {row.status === 'pending' && row.action === 'delete' && (
                  <div className="review-actions">
                    <button className="btn btn-secondary" disabled={busyId === row.id} onClick={() => review(row.id, 'reject')}>
                      <XCircle size={16} /> {t('reject')}
                    </button>
                    <button className="btn btn-primary" disabled={busyId === row.id} onClick={() => review(row.id, 'approve')}>
                      <CheckCircle2 size={16} /> {t('approve')}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
