import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WallpaperManager from './components/WallpaperManager';
import { WallpaperSettings } from './types/wallpaper';
import './index.css';

function App() {
  const [settings, setSettings] = useState<WallpaperSettings>({
    autoChange: false,
    interval: 30,
    randomOrder: false,
    pauseOnFullscreen: true,
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
        <h1>🎨 Wallpaper Manager</h1>
        <button onClick={hideWindow} className="btn btn-secondary">
          ➖ Minimize to Tray
        </button>
      </header>

      <div className="settings-panel">
        <h3>Settings</h3>
        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={settings.autoChange}
              onChange={(e) =>
                setSettings({ ...settings, autoChange: e.target.checked })
              }
            />
            Auto-change wallpaper
          </label>
          {settings.autoChange && (
            <div className="setting-subgroup">
              <label>
                Interval (minutes):
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={settings.interval}
                  onChange={(e) =>
                    setSettings({ ...settings, interval: parseInt(e.target.value) })
                  }
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.randomOrder}
                  onChange={(e) =>
                    setSettings({ ...settings, randomOrder: e.target.checked })
                  }
                />
                Random order
              </label>
            </div>
          )}
        </div>
      </div>

      <main className="main-content">
        <WallpaperManager />
      </main>
    </div>
  );
}

export default App;
