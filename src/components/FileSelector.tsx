import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { WallpaperInfo } from '../types/wallpaper';

interface FileSelectorProps {
  onWallpapersLoad: (wallpapers: WallpaperInfo[]) => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ onWallpapersLoad }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectionType, setSelectionType] = useState<'folder' | 'file' | ''>('');

  const loadWallpaperFolder = async () => {
    try {
      const directory = await open({
        directory: true,
        title: 'Select Wallpaper Folder',
      });
      
      if (directory) {
        setLoading(true);
        setSelectedPath(directory as string);
        setSelectionType('folder');
        
        const files = await invoke<WallpaperInfo[]>('get_wallpaper_files', {
          directory,
        });
        
        onWallpapersLoad(files);
      }
    } catch (error) {
      console.error('Error loading wallpaper folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSingleFile = async () => {
    try {
      const file = await open({
        multiple: false,
        title: 'Select Wallpaper File',
        filters: [
          {
            name: 'Wallpaper Files',
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
      
      if (file) {
        setLoading(true);
        setSelectedPath(file as string);
        setSelectionType('file');
        
        // Create a single wallpaper info object
        const singleFile = await invoke<WallpaperInfo>('get_single_file_info', {
          filePath: file,
        });
        
        onWallpapersLoad([singleFile]);
      }
    } catch (error) {
      console.error('Error loading single file:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayPath = () => {
    if (!selectedPath) return '';
    
    if (selectionType === 'folder') {
      return selectedPath.split('/').pop() || selectedPath.split('\\').pop() || selectedPath;
    } else {
      const parts = selectedPath.split('/').length > 1 ? selectedPath.split('/') : selectedPath.split('\\');
      return parts[parts.length - 1];
    }
  };

  return (
    <div className="file-selector">
      <div className="selector-header">
        <div className="selection-buttons">
          <button 
            onClick={loadWallpaperFolder} 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading && selectionType === 'folder' ? '⏳ Loading...' : '📁 Browse Folder'}
          </button>
          
          <button 
            onClick={loadSingleFile} 
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading && selectionType === 'file' ? '⏳ Loading...' : '🖼️ Select File'}
          </button>
        </div>
        
        {selectedPath && (
          <div className="selected-path-container">
            <span className="selection-type">
              {selectionType === 'folder' ? '📂' : '📄'} {selectionType === 'folder' ? 'Folder' : 'File'}:
            </span>
            <span className="selected-path" title={selectedPath}>
              {getDisplayPath()}
            </span>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>
            {selectionType === 'folder' ? 'Scanning folder for wallpapers...' : 'Loading file...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default FileSelector;
