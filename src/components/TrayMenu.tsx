import React from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TrayMenuProps {
  onShow?: () => void;
  onHide?: () => void;
}

const TrayMenu: React.FC<TrayMenuProps> = ({ onShow, onHide }) => {
  const showWindow = async () => {
    try {
      await invoke('show_main_window');
      onShow?.();
    } catch (error) {
      console.error('Error showing window:', error);
    }
  };

  const hideWindow = async () => {
    try {
      await invoke('hide_main_window');
      onHide?.();
    } catch (error) {
      console.error('Error hiding window:', error);
    }
  };

  return (
    <div className="tray-controls">
      <button onClick={showWindow} className="btn btn-primary">
        📤 Show Window
      </button>
      <button onClick={hideWindow} className="btn btn-secondary">
        ➖ Minimize to Tray
      </button>
    </div>
  );
};

export default TrayMenu;
