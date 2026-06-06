import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import './ThemePicker.css';

const THEMES = [
  { id: 'blue', label: 'Blue', className: 'blue' },
  { id: 'red', label: 'Red', className: 'red' },
  { id: 'dark', label: 'Dark', className: 'dark' },
  { id: 'violet', label: 'Violet', className: 'violet' },
  { id: 'yellow', label: 'Yellow', className: 'yellow' },
];

const COPY = {
  en: {
    title: 'Customize your experience',
    subtitle: 'Choose the color you like',
    footer: '*You can change the system color anytime from settings',
  },
  ar: {
    title: 'خصص تجربتك',
    subtitle: 'اختر اللون الذي يعجبك',
    footer: '*يمكنك تغيير لون النظام في أي وقت من الإعدادات',
  },
  ku: {
    title: 'بەخێربێیت بۆ کوردسەبەتیتان',
    subtitle: 'ڕەنگی ڕووکاری دڵخوازت هەڵبژێرە',
    footer: '*هەرکات ویستت دەتوانیت لە بەشی خوارەوەی سیستەم ڕەنگ بگۆڕیت',
  },
};

export default function ThemePicker() {
  const { theme, setTheme, pickerOpen, closeThemePicker } = useTheme();
  const { lang } = useLanguage();
  const text = COPY[lang] || COPY.en;
  const isRtl = lang === 'ku' || lang === 'ar';

  if (!pickerOpen) return null;

  function chooseTheme(nextTheme) {
    setTheme(nextTheme);
    closeThemePicker();
  }

  return (
    <div className="theme-picker-backdrop" dir={isRtl ? 'rtl' : 'ltr'} onClick={closeThemePicker}>
      <section className="theme-picker-modal" onClick={event => event.stopPropagation()} aria-modal="true" role="dialog">
        <button type="button" className="theme-picker-close" onClick={closeThemePicker} aria-label="Close">×</button>
        <header className="theme-picker-header">
          <h2>{text.title}</h2>
          <p>{text.subtitle}</p>
        </header>

        <div className="theme-picker-grid">
          {THEMES.map(item => (
            <button
              key={item.id}
              type="button"
              className={`theme-option theme-option-${item.className} ${theme === item.id ? 'selected' : ''}`}
              onClick={() => chooseTheme(item.id)}
            >
              <span className="theme-option-lines" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>

        <p className="theme-picker-footnote">{text.footer}</p>
      </section>
    </div>
  );
}
