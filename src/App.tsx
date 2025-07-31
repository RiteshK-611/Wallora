import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WallpaperManager from './components/WallpaperManager';
import DateWidget from './components/DateWidget';
import { WallpaperSettings, DateWidgetSettings } from './types/wallpaper';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<'wallpaper' | 'datewidget'>('wallpaper');
  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>({
    autoChange: false,
    interval: 30,
    randomOrder: false,
    pauseOnFullscreen: true,
  });

  const [dateWidgetSettings, setDateWidgetSettings] = useState<DateWidgetSettings>({
    enabled: false,
    locked: false,
    showTime: true,
    boldText: false,
    scale: 1,
    color: '#FFD700',
    font: 'Megrim',
    alignment: 'center',
  });

  const hideWindow = async () => {
    try {
      await invoke('hide_main_window');
    } catch (error) {
      console.error('Error hiding window:', error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>✨ LiveLayer</h1>
          <p className="app-subtitle">Premium Wallpaper Experience</p>
        </div>
        <div className="header-actions">
          <button onClick={hideWindow} className="btn btn-ghost">
            <span className="btn-icon">−</span>
            Minimize to Tray
          </button>
        </div>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'wallpaper' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallpaper')}
        >
          <span className="tab-icon">📷</span>
          Wallpaper Manager
        </button>
        <button
          className={`tab-button ${activeTab === 'datewidget' ? 'active' : ''}`}
          onClick={() => setActiveTab('datewidget')}
        >
          <span className="tab-icon">📆</span>
          Date Widget
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'wallpaper' && (
          <WallpaperManager 
            settings={wallpaperSettings}
            onSettingsChange={setWallpaperSettings}
          />
        )}
        {activeTab === 'datewidget' && (
          <DateWidget 
            settings={dateWidgetSettings}
            onSettingsChange={setDateWidgetSettings}
          />
        )}
      </main>
    </div>
  );
}

export default App;