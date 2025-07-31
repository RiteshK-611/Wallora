import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { WallpaperInfo, WallpaperSettings } from '../types/wallpaper';
import FileSelector from './FileSelector';

interface WallpaperManagerProps {
  settings: WallpaperSettings;
  onSettingsChange: (settings: WallpaperSettings) => void;
}

const WallpaperManager: React.FC<WallpaperManagerProps> = ({ settings, onSettingsChange }) => {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAddWallpapers = (newWallpapers: WallpaperInfo[]) => {
    setWallpapers(prev => [...prev, ...newWallpapers]);
  };

  const handleDeleteWallpaper = (wallpaperPath: string) => {
    setWallpapers(prev => prev.filter(w => w.path !== wallpaperPath));
    
    if (currentWallpaper === wallpaperPath) {
      setCurrentWallpaper('');
      if (isVideoFile(getWallpaperByPath(wallpaperPath)?.file_type || '') || 
          isGifFile(getWallpaperByPath(wallpaperPath)?.file_type || '')) {
        handleStopVideo();
      }
    }
  };

  const handleSetWallpaper = async (wallpaper: WallpaperInfo) => {
    try {
      setLoading(true);
      
      if (currentWallpaper && (isVideoFile(getWallpaperByPath(currentWallpaper)?.file_type || '') || isGifFile(getWallpaperByPath(currentWallpaper)?.file_type || ''))) {
        if (wallpaper.path !== currentWallpaper) {
          await handleStopVideo();
        }
      }
      
      if (isVideoFile(wallpaper.file_type) || isGifFile(wallpaper.file_type)) {
        const convertedPath = convertFileSrc(wallpaper.path);
        const result = await invoke<string>('create_video_wallpaper', { 
          filePath: wallpaper.path,
          convertedPath: convertedPath
        });
        console.log(result);
      } else {
        if (currentWallpaper && (isVideoFile(getWallpaperByPath(currentWallpaper)?.file_type || '') || isGifFile(getWallpaperByPath(currentWallpaper)?.file_type || ''))) {
          await handleStopVideo();
        }
        const result = await invoke<string>('set_static_wallpaper', { 
          filePath: wallpaper.path 
        });
        console.log(result);
      }
      
      setCurrentWallpaper(wallpaper.path);
    } catch (error) {
      console.error('Error setting wallpaper:', error);
      alert(`Error setting wallpaper: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopVideo = async () => {
    try {
      setLoading(true);
      const result = await invoke<string>('stop_video_wallpaper');
      console.log(result);
      setCurrentWallpaper('');
    } catch (error) {
      console.error('Error stopping video wallpaper:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWallpaperByPath = (path: string) => {
    return wallpapers.find(w => w.path === path);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isVideoFile = (fileType: string) => {
    return ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(fileType.toLowerCase());
  };

  const isGifFile = (fileType: string) => {
    return fileType.toLowerCase() === 'gif';
  };

  const renderPreview = (wallpaper: WallpaperInfo) => {
    if (isVideoFile(wallpaper.file_type)) {
      return (
        <div className="media-preview">
          <video
            src={convertFileSrc(wallpaper.path)}
            muted
            preload="metadata"
            className="preview-media"
          />
          <span className="file-type-badge video">
            {wallpaper.file_type.toUpperCase()}
          </span>
        </div>
      );
    }

    if (isGifFile(wallpaper.file_type)) {
      return (
        <div className="media-preview">
          <img
            src={convertFileSrc(wallpaper.path)}
            alt={wallpaper.name}
            className="preview-media"
          />
          <span className="file-type-badge gif">GIF</span>
        </div>
      );
    }

    return (
      <div className="media-preview">
        <img
          src={convertFileSrc(wallpaper.path)}
          alt={wallpaper.name}
          className="preview-media"
        />
        <span className="file-type-badge image">
          {wallpaper.file_type.toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="wallpaper-manager">
      <div className="manager-header">
        <div className="header-info">
          <h2>Wallpaper Manager</h2>
          <p>Manage your dynamic wallpapers and live backgrounds</p>
        </div>
      </div>

      <div className="slideshow-settings">
        <div className="setting-group">
          <div className="setting-header">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoChange}
                onChange={(e) => onSettingsChange({ ...settings, autoChange: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
            <div className="setting-info">
              <h3>Randomize Slideshow</h3>
              <p>Automatically change wallpapers at set intervals</p>
            </div>
          </div>

          {settings.autoChange && (
            <div className="slideshow-options">
              <div className="time-inputs">
                <label>Change wallpaper every</label>
                <div className="time-controls">
                  <div className="time-input">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={Math.floor(settings.interval / 60)}
                      onChange={(e) => {
                        const hours = parseInt(e.target.value) || 0;
                        const minutes = settings.interval % 60;
                        onSettingsChange({ ...settings, interval: hours * 60 + minutes });
                      }}
                    />
                    <span>hours</span>
                  </div>
                  <div className="time-input">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.interval % 60}
                      onChange={(e) => {
                        const minutes = parseInt(e.target.value) || 0;
                        const hours = Math.floor(settings.interval / 60);
                        onSettingsChange({ ...settings, interval: hours * 60 + minutes });
                      }}
                    />
                    <span>minutes</span>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.randomOrder}
                    onChange={(e) => onSettingsChange({ ...settings, randomOrder: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Random order
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <FileSelector onWallpapersAdd={handleAddWallpapers} />
      
      <div className="controls-bar">
        <button 
          onClick={handleStopVideo} 
          className="btn btn-danger"
          disabled={loading || !currentWallpaper || !wallpapers.find(w => w.path === currentWallpaper && (isVideoFile(w.file_type) || isGifFile(w.file_type)))}
        >
          <span className="btn-icon">🛑</span>
          Stop Live Wallpaper
        </button>
        
        <div className="current-wallpaper-info">
          {currentWallpaper && (
            <div className="current-info">
              <span className="current-label">Current:</span>
              <span className="current-name">{getWallpaperByPath(currentWallpaper)?.name || 'Unknown'}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="wallpaper-grid">
        {loading && <div className="loading">⚡ Processing wallpaper...</div>}
        
        {wallpapers.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <h3>No wallpapers added</h3>
            <p>Click "Add Wallpapers" to select your favorite wallpapers and start customizing your desktop.</p>
          </div>
        )}

        {wallpapers.map((wallpaper) => (
          <div
            key={wallpaper.path}
            className={`wallpaper-card ${currentWallpaper === wallpaper.path ? 'active' : ''}`}
          >
            <div className="wallpaper-preview" onClick={() => handleSetWallpaper(wallpaper)}>
              {renderPreview(wallpaper)}
              {currentWallpaper === wallpaper.path && (
                <div className="active-indicator">
                  <span className="active-icon">✨</span>
                </div>
              )}
            </div>
            
            <div className="wallpaper-info">
              <h4 title={wallpaper.name}>{wallpaper.name}</h4>
              <p className="file-size">{formatFileSize(wallpaper.size)}</p>
            </div>
            
            <button 
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteWallpaper(wallpaper.path);
              }}
              title="Remove wallpaper"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WallpaperManager;