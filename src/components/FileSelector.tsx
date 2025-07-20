import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { WallpaperInfo } from '../types/wallpaper';

interface FileSelectorProps {
  onWallpapersLoad: (wallpapers: WallpaperInfo[]) => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ onWallpapersLoad }) => {
  const [loading, setLoading] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>('');

  const loadWallpapers = async () => {
    try {
      const directory = await open({
        directory: true,
        title: 'Select Wallpaper Directory',
      });
      
      if (directory) {
        setLoading(true);
        setSelectedDirectory(directory as string);
        
        const files = await invoke<WallpaperInfo[]>('get_wallpaper_files', {
          directory,
        });
        
        onWallpapersLoad(files);
      }
    } catch (error) {
      console.error('Error loading wallpapers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-selector">
      <div className="selector-header">
        <button 
          onClick={loadWallpapers} 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? '⏳ Loading...' : '📁 Browse Folder'}
        </button>
        {selectedDirectory && (
          <span className="selected-path" title={selectedDirectory}>
            📂 {selectedDirectory.split('/').pop() || selectedDirectory.split('\\').pop()}
          </span>
        )}
      </div>
      
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Scanning for wallpapers...</span>
        </div>
      )}
    </div>
  );
};

export default FileSelector;
