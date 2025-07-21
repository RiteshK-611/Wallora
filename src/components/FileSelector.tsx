import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { WallpaperInfo } from '../types/wallpaper';

interface FileSelectorProps {
  onWallpapersAdd: (wallpapers: WallpaperInfo[]) => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ onWallpapersAdd }) => {
  const [loading, setLoading] = useState(false);

  const addFiles = async () => {
    try {
      const files = await open({
        multiple: true,  // This allows both single and multiple selection
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
        
        // Handle both single and multiple file selection
        const filePaths = Array.isArray(files) ? files : [files];
        
        const wallpaperInfos = await invoke<WallpaperInfo[]>('get_files_info', {
          filePaths: filePaths,
        });
        
        onWallpapersAdd(wallpaperInfos);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-selector">
      <div className="selector-header">
        <button 
          onClick={addFiles} 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? '⏳ Adding...' : '➕ Add Wallpapers'}
        </button>
        <span className="file-hint">
          💡 You can select single or multiple files
        </span>
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

export default FileSelector;
