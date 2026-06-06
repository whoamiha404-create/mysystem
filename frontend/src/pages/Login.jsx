import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, CreditCard, Lock, MessageCircle, Palette, UsersRound, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import FlagIcon from '../components/FlagIcon';
import './Login.css';
import logo from '../hopezone.png';

const featureIcons = [CreditCard, MessageCircle, BarChart3, UsersRound];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(t('wrongCredentials'));
    } finally {
      setLoading(false);
    }
  }

  const langs = [
    { code:'en', label:'EN', title:'English' },
    { code:'ar', label:'عر', title:'العربية' },
    { code:'ku', label:'کو', title:'کوردی' },
  ];

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="sidebar-logo-icon">
            <img src={logo} alt="Hope Zone Logo" />
          </div>
          <div>
            <div className="login-brand-name">HOPE ZONE</div>
            <div className="login-brand-tagline">Real Estate Company</div>
          </div>
        </div>
        <div className="login-hero">
          <h1>{t('loginTagline')}</h1>
          <p>{t('loginDesc')}</p>
          <div className="login-features">
            {['loginFeature1','loginFeature2','loginFeature3','loginFeature4'].map((key, index) => {
              const Icon = featureIcons[index];
              return (
                <div key={key} className="login-feature">
                  <span><Icon size={18} strokeWidth={2.25} /></span>
                  <span>{t(key)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-top-controls">
          <div className="login-lang-switch">
            {langs.map(item => (
              <button
                key={item.code}
                className={`lang-pill ${lang === item.code ? 'active' : ''}`}
                onClick={() => setLang(item.code)}
                title={item.title}
              >
                <FlagIcon code={item.code} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <button className="theme-pill" onClick={toggle} title={isDark ? t('lightMode') : t('darkMode')}>
            <Palette size={17} strokeWidth={2.25} />
          </button>
        </div>

        <div className="login-form-card">
          <div className="login-form-header">
            <h2>{t('welcomeBack')}</h2>
            <p>{t('signInSub')}</p>
          </div>

          {error && (
            <div className="alert alert-red" style={{ marginBottom:16 }}>
              <AlertTriangle size={16} strokeWidth={2.4} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom:16 }}>
              <label>{t('username')}</label>
              <input id="username" type="text" value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username" autoFocus required />
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label>{t('password')}</label>
              <input id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full"
              disabled={loading} style={{ justifyContent:'center' }}>
              {loading ? <Loader2 className="animate-spin" size={17} /> : <ArrowRight size={17} />}
              {loading ? t('loading') : t('signIn')}
            </button>
          </form>

          <div className="login-form-footer">
            <span>Powered By Barz&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;<br/>Secuere &nbsp;By&nbsp; Zerak&nbsp;</span>
            <Lock size={13} strokeWidth={2.25} />
          </div>
        </div>
      </div>
    </div>
  );
}
