import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { WallpaperInfo, WallpaperSettings } from '../types/wallpaper';

interface WallpaperManagerProps {
  settings: WallpaperSettings;
  onSettingsChange: (settings: WallpaperSettings) => void;
}

const WallpaperManager: React.FC<WallpaperManagerProps> = ({ settings, onSettingsChange }) => {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Load wallpapers from persistent state on component mount
  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        const state = await invoke<any>('load_app_state');
        if (state.wallpaper_list && state.wallpaper_list.length > 0) {
          setWallpapers(state.wallpaper_list);
        }
      } catch (error) {
        console.error('Error loading wallpapers:', error);
      }
    };
    loadWallpapers();
  }, []);

  // Save wallpapers to persistent state whenever wallpapers change
  useEffect(() => {
    if (wallpapers.length > 0) {
      invoke('save_wallpaper_list', { wallpapers })
        .catch(error => console.error('Error saving wallpapers:', error));
    }
  }, [wallpapers]);

  // Handle slideshow functionality
  useEffect(() => {
    if (settings.autoChange && wallpapers.length > 1 && settings.interval > 0) {
      const interval = setInterval(() => {
        const availableWallpapers = wallpapers.filter(w => w.path !== currentWallpaper);
        if (availableWallpapers.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableWallpapers.length);
          const nextWallpaper = availableWallpapers[randomIndex];
          handleSetWallpaper(nextWallpaper);
        }
      }, settings.interval * 1000);
      
      setSlideshowInterval(interval);
      
      return () => {
        clearInterval(interval);
        setSlideshowInterval(null);
      };
    } else if (slideshowInterval) {
      clearInterval(slideshowInterval);
      setSlideshowInterval(null);
    }
  }, [settings.autoChange, settings.interval, wallpapers, currentWallpaper]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (slideshowInterval) {
        clearInterval(slideshowInterval);
      }
    };
  }, []);

  const handleAddFiles = async () => {
    try {
      const files = await open({
        multiple: true,
        title: 'Select Wallpaper Files',
        filters: [
          {
            name: 'All Wallpapers',
            extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'tiff', 'tga', 'mp4', 'webm', 'avi', 'mov', 'mkv', 'gif']
          },
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'tiff', 'tga']
          },
          {
            name: 'Videos',
            extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv']
          },
          {
            name: 'GIFs',
            extensions: ['gif']
          }
        ]
      });
      
      if (files) {
        setLoading(true);
        
        const filePaths = Array.isArray(files) ? files : [files];
        
        const wallpaperInfos = await invoke<WallpaperInfo[]>('get_files_info', {
          filePaths: filePaths,
        });
        
        handleAddWallpapers(wallpaperInfos);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

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
      </div>
    );
  };

  return (
    <div className="wallpaper-container">
      <div className="wallpaper-section">
        <div className="slideshow-controls">
          <div className="control-row">
            <span className="control-label">Randomize slideshow</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoChange}
                onChange={(e) => onSettingsChange({ ...settings, autoChange: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="time-control-row">
            <span className="control-label">Change wallpaper every</span>
            <div className="time-inputs">
              <div className="time-input-group">
                <span className="time-label">hours:</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={Math.floor(settings.interval / 3600)}
                  onChange={(e) => {
                    const hours = parseInt(e.target.value) || 0;
                    const minutes = Math.floor((settings.interval % 3600) / 60);
                    const seconds = settings.interval % 60;
                    onSettingsChange({ ...settings, interval: hours * 3600 + minutes * 60 + seconds });
                  }}
                  className="time-input"
                />
              </div>
              <div className="time-input-group">
                <span className="time-label">minutes:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={Math.floor((settings.interval % 3600) / 60)}
                  onChange={(e) => {
                    const minutes = parseInt(e.target.value) || 0;
                    const hours = Math.floor(settings.interval / 3600);
                    const seconds = settings.interval % 60;
                    onSettingsChange({ ...settings, interval: hours * 3600 + minutes * 60 + seconds });
                  }}
                  className="time-input"
                />
              </div>
              <div className="time-input-group">
                <span className="time-label">seconds:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={settings.interval % 60}
                  onChange={(e) => {
                    const seconds = parseInt(e.target.value) || 0;
                    const hours = Math.floor(settings.interval / 3600);
                    const minutes = Math.floor((settings.interval % 3600) / 60);
                    onSettingsChange({ ...settings, interval: hours * 3600 + minutes * 60 + seconds });
                  }}
                  className="time-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="wallpapers-section">
          <div className="wallpapers-header">
            <span className="wallpapers-label">Wallpapers</span>
            <button className="add-wallpapers-btn" onClick={handleAddFiles} disabled={loading}>
              📁
            </button>
          </div>

          {wallpapers.length === 0 ? (
            <div className="empty-wallpapers">
              <p>Empty slideshow, using theme's background instead.</p>
            </div>
          ) : (
            <div className="wallpapers-list">
              {wallpapers.map((wallpaper) => (
                <div key={wallpaper.path} className="wallpaper-item">
                  <div className="wallpaper-preview-small" onClick={() => handleSetWallpaper(wallpaper)}>
                    {renderPreview(wallpaper)}
                  </div>
                  <span className="wallpaper-name">{wallpaper.name}</span>
                  <button 
                    className="delete-wallpaper-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWallpaper(wallpaper.path);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Processing selected files...</span>
        </div>
      )}
    </div>
  );
};

export default WallpaperManager;