import './FlagIcon.css';

export default function FlagIcon({ code }) {
  const className = code === 'en' ? 'flag-us'
    : code === 'ar' ? 'flag-iq'
    : 'flag-ku';

  return <span className={`flag-icon ${className}`} aria-hidden="true" />;
}
