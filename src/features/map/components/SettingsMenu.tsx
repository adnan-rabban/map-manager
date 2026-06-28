import React from 'react';
import { useMapStore } from '../../../store/useMapStore.js';

export const SettingsMenu: React.FC = () => {
  const {
    isSettingsOpen,
    theme,
    setTheme,
    currentUser,
    logout
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
    <div id="settings-menu" className="settings-menu active" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="menu-header" style={{ fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid var(--divider-color)', paddingBottom: '8px' }}>Settings</div>
      
      {currentUser && (
        <div className="menu-item-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '8px', borderBottom: '1px solid var(--divider-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Petugas aktif</span>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>{currentUser.username}</span>
          <span style={{ fontSize: '11px', color: currentUser.role === 'admin' ? '#ef4444' : '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {currentUser.role === 'admin' ? 'Administrator' : 'Operator'}
          </span>
        </div>
      )}

      <div className="menu-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--divider-color)' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#ff3b30',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Keluar (Logout)
        </button>
      </div>
    </div>
  );
};

