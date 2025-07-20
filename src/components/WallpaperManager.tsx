import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { WallpaperInfo } from '../types/wallpaper';
import FileSelector from './FileSelector';

const WallpaperManager: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSetWallpaper = async (wallpaper: WallpaperInfo) => {
    try {
      setLoading(true);
      
      if (isVideoFile(wallpaper.file_type)) {
        // Convert file path properly for webview access
        const convertedPath = convertFileSrc(wallpaper.path);
        const result = await invoke<string>('create_video_wallpaper', { 
          filePath: wallpaper.path,
          convertedPath: convertedPath
        });
        console.log(result);
      } else {
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

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isVideoFile = (fileType: string) => {
    return ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif'].includes(fileType.toLowerCase());
  };

  return (
    <div className="wallpaper-manager">
      <FileSelector onWallpapersLoad={setWallpapers} />
      
      <div className="controls-bar">
        <button 
          onClick={handleStopVideo} 
          className="btn btn-danger"
          disabled={loading || !currentWallpaper || !wallpapers.find(w => w.path === currentWallpaper && isVideoFile(w.file_type))}
        >
          🛑 Stop Video Wallpaper
        </button>
      </div>
      
      <div className="wallpaper-grid">
        {loading && <div className="loading">Processing wallpaper...</div>}
        
        {wallpapers.length === 0 && !loading && (
          <div className="empty-state">
            <p>No wallpapers found. Click "Browse Folder" to select a directory.</p>
          </div>
        )}

        {wallpapers.map((wallpaper) => (
          <div
            key={wallpaper.path}
            className={`wallpaper-card ${
              currentWallpaper === wallpaper.path ? 'active' : ''
            }`}
            onClick={() => handleSetWallpaper(wallpaper)}
          >
            <div className="wallpaper-preview">
              {isVideoFile(wallpaper.file_type) ? (
                <div className="video-preview">
                  <span className="file-type-badge video">
                    {wallpaper.file_type.toUpperCase()}
                  </span>
                  {wallpaper.file_type === 'gif' ? '🎭' : '🎬'}
                </div>
              ) : (
                <div className="image-preview">
                  <img
                    src={convertFileSrc(wallpaper.path)}
                    alt={wallpaper.name}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div className="image-fallback" style={{ display: 'none' }}>
                    🖼️
                  </div>
                  <span className="file-type-badge image">
                    {wallpaper.file_type.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="wallpaper-info">
              <h4 title={wallpaper.name}>{wallpaper.name}</h4>
              <p>{formatFileSize(wallpaper.size)}</p>
              {currentWallpaper === wallpaper.path && (
                <span className="current-badge">
                  {isVideoFile(wallpaper.file_type) ? 'Playing' : 'Current'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WallpaperManager;
