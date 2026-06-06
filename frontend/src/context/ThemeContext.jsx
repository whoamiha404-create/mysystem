import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const normalizeTheme = (value) => value === 'light' ? 'blue' : (value || 'blue');
  const [theme, setThemeState] = useState(() => normalizeTheme(localStorage.getItem('rp_theme')));
  const [pickerOpen, setPickerOpen] = useState(false);

  function setTheme(t) {
    const next = normalizeTheme(t);
    setThemeState(next);
    localStorage.setItem('rp_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  function toggle() { setPickerOpen(true); }
  function openThemePicker() { setPickerOpen(true); }
  function closeThemePicker() { setPickerOpen(false); }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, isDark: theme === 'dark', pickerOpen, openThemePicker, closeThemePicker }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
