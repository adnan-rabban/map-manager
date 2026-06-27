import React from 'react';
import { useMapStore } from '../../store/useMapStore.js';

export const SettingsMenu: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    theme,
    setTheme
  } = useMapStore();

  if (!isSettingsOpen) return null;

  const handleToggleTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTheme = e.target.checked ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <div id="settings-menu" className="settings-menu active">
      <div className="menu-header">Settings</div>
      <div className="menu-item">
        <span>Dark Mode</span>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            id="dark-mode-toggle" 
            checked={theme === 'dark'}
            onChange={handleToggleTheme}
          />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
};
