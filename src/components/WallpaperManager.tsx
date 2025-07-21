import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { WallpaperInfo } from '../types/wallpaper';
import FileSelector from './FileSelector';

const WallpaperManager: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAddWallpapers = (newWallpapers: WallpaperInfo[]) => {
    setWallpapers(prev => [...prev, ...newWallpapers]);
  };

  const handleDeleteWallpaper = (wallpaperPath: string) => {
    setWallpapers(prev => prev.filter(w => w.path !== wallpaperPath));
    
    // Stop current wallpaper if it's the one being deleted
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
      
      // Auto-stop current video wallpaper if switching to different type
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
        <div className="video-preview">
          <video
            src={convertFileSrc(wallpaper.path)}
            muted
            preload="metadata"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              pointerEvents: 'none'
            }}
          />
          <span className="file-type-badge video">
            {wallpaper.file_type.toUpperCase()}
          </span>
        </div>
      );
    }

    if (isGifFile(wallpaper.file_type)) {
      return (
        <div className="gif-preview">
          <img
            src={convertFileSrc(wallpaper.path)}
            alt={wallpaper.name}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }}
          />
          <span className="file-type-badge gif">
            GIF
          </span>
        </div>
      );
    }

    return (
      <div className="image-preview">
        <img
          src={convertFileSrc(wallpaper.path)}
          alt={wallpaper.name}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }}
        />
        <span className="file-type-badge image">
          {wallpaper.file_type.toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="wallpaper-manager">
      <FileSelector onWallpapersAdd={handleAddWallpapers} />
      
      <div className="controls-bar">
        <button 
          onClick={handleStopVideo} 
          className="btn btn-danger"
          disabled={loading || !currentWallpaper || !wallpapers.find(w => w.path === currentWallpaper && (isVideoFile(w.file_type) || isGifFile(w.file_type)))}
        >
          🛑 Stop Live Wallpaper
        </button>
        <div className="current-wallpaper-info">
          {currentWallpaper && (
            <span className="current-info">
              📋 Current: {getWallpaperByPath(currentWallpaper)?.name || 'Unknown'}
            </span>
          )}
        </div>
      </div>
      
      <div className="wallpaper-grid">
        {loading && <div className="loading">⚡ Processing wallpaper...</div>}
        
        {wallpapers.length === 0 && !loading && (
          <div className="empty-state">
            <p>🖼️ No wallpapers added</p>
            <p>Click "Add Wallpapers" to select your favorite wallpapers.</p>
          </div>
        )}

        {wallpapers.map((wallpaper) => (
          <div
            key={wallpaper.path}
            className={`wallpaper-card ${
              currentWallpaper === wallpaper.path ? 'active' : ''
            }`}
          >
            <div className="wallpaper-preview" onClick={() => handleSetWallpaper(wallpaper)}>
              {renderPreview(wallpaper)}
            </div>
            
            <div className="wallpaper-info">
              <h4 title={wallpaper.name}>{wallpaper.name}</h4>
              <p>{formatFileSize(wallpaper.size)}</p>
              {currentWallpaper === wallpaper.path && (
                <span className="current-badge">
                  {isVideoFile(wallpaper.file_type) || isGifFile(wallpaper.file_type) ? '🎬 Playing' : '🖼️ Active'}
                </span>
              )}
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
