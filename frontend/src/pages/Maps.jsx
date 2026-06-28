import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, Image as ImageIcon, Loader2, MapPinned, RefreshCcw, Search, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import './Maps.css';

function fileSize(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function isPdf(map) {
  return map?.mime_type === 'application/pdf' || /\.pdf$/i.test(map?.url || map?.original_name || '');
}

export default function Maps() {
  const { t } = useLanguage();
  const toast = useToast();
  const [maps, setMaps] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  async function loadMaps() {
    setLoading(true);
    try {
      const rows = await api.getMaps();
      const nextRows = Array.isArray(rows) ? rows : [];
      setMaps(nextRows);
      setSelectedId(current => nextRows.some(row => row.id === current) ? current : nextRows[0]?.id || null);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaps();
  }, []);

  const filteredMaps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return maps;
    return maps.filter(map => (
      `${map.name || ''} ${map.original_name || ''}`.toLowerCase().includes(needle)
    ));
  }, [maps, query]);

  const selected = maps.find(map => map.id === selectedId) || filteredMaps[0] || null;

  useEffect(() => {
    setImageError(false);
  }, [selected?.id]);

  async function deleteMap(map) {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await api.deleteMap(map.id);
      setMaps(rows => rows.filter(row => row.id !== map.id));
      if (selectedId === map.id) setSelectedId(null);
      toast(t('delete') + ' ', 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  return (
    <div className="maps-page">
      <div className="page-header maps-header">
        <div>
          <h1>{t('mapsTitle')}</h1>
          <p>{t('mapsSub')}</p>
        </div>
        <button className="btn btn-secondary" onClick={loadMaps} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          {t('refresh')}
        </button>
      </div>

      <div className="maps-shell">
        <aside className="maps-library card">
          <div className="maps-search">
            <Search size={17} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t('searchMaps')}
            />
          </div>

          <div className="maps-list">
            {loading ? (
              <div className="maps-empty"><Loader2 className="animate-spin" size={28} /></div>
            ) : filteredMaps.length ? filteredMaps.map(map => {
              const Icon = isPdf(map) ? FileText : ImageIcon;
              return (
                <button
                  type="button"
                  key={map.id}
                  className={`map-row ${selected?.id === map.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(map.id)}
                >
                  <span className="map-row-icon"><Icon size={18} /></span>
                  <span className="map-row-copy">
                    <strong>{map.name}</strong>
                    <small>{map.original_name || map.file_name} - {fileSize(map.file_size)}</small>
                  </span>
                </button>
              );
            }) : (
              <div className="maps-empty">
                <MapPinned size={34} />
                <strong>{t('noMaps')}</strong>
              </div>
            )}
          </div>
        </aside>

        <section className="maps-viewer card">
          {selected ? (
            <>
              <div className="maps-viewer-toolbar">
                <div>
                  <h3>{selected.name}</h3>
                  <p>{selected.original_name || selected.file_name}</p>
                </div>
                <div className="maps-viewer-actions">
                  <a className="btn btn-secondary" href={selected.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    {t('openMap')}
                  </a>
                  <a className="btn btn-secondary" href={selected.url} download>
                    <Download size={16} />
                    {t('downloadMap')}
                  </a>
                  <button className="btn btn-danger" onClick={() => deleteMap(selected)}>
                    <Trash2 size={16} />
                    {t('deleteMap')}
                  </button>
                </div>
              </div>

              <div className="maps-preview">
                {isPdf(selected) ? (
                  <iframe src={selected.url} title={selected.name} />
                ) : imageError ? (
                  <div className="maps-unsupported">
                    <ImageIcon size={42} />
                    <strong>{t('previewUnavailable')}</strong>
                    <p>{t('previewUnavailableSub')}</p>
                    <a className="btn btn-primary" href={selected.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} />
                      {t('openMap')}
                    </a>
                  </div>
                ) : (
                  <img src={selected.url} alt={selected.name} onError={() => setImageError(true)} />
                )}
              </div>
            </>
          ) : (
            <div className="maps-viewer-empty">
              <MapPinned size={46} />
              <h3>{t('noMaps')}</h3>
              <p>{t('uploadMapsInSettings')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
