import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DateWidgetSettings, FontOption } from '../types/wallpaper';

interface DateWidgetProps {
  settings: DateWidgetSettings;
  onSettingsChange: (settings: DateWidgetSettings) => void;
}

const DateWidget: React.FC<DateWidgetProps> = ({ settings, onSettingsChange }) => {
  const [loading, setLoading] = useState(false);

  const fontOptions: FontOption[] = [
    { name: 'Megrim', value: 'Megrim', type: 'google' },
    { name: 'Major Mono Display', value: 'Major Mono Display', type: 'google' },
    { name: 'Lment v02', value: 'Lment-v02', type: 'local' },
    { name: 'Kapiler Regular', value: 'Kapiler-Regular', type: 'local' },
    { name: 'Arial', value: 'Arial', type: 'local' },
    { name: 'Times New Roman', value: 'Times New Roman', type: 'local' },
  ];

  const handleToggleWidget = async () => {
    try {
      setLoading(true);
      if (settings.enabled) {
        await invoke('close_date_widget');
        onSettingsChange({ ...settings, enabled: false });
      } else {
        await invoke('create_date_widget', { settings });
        onSettingsChange({ ...settings, enabled: true });
      }
    } catch (error) {
      console.error('Error toggling date widget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof DateWidgetSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    
    // If widget is enabled, update it with new settings
    if (settings.enabled) {
      invoke('update_date_widget', { settings: newSettings }).catch(console.error);
    }
  };

  return (
    <div className="date-widget-manager">
      <div className="widget-header">
        <div className="header-info">
          <h2>Date Widget</h2>
          <p>Customize your desktop date and time display</p>
        </div>
        <div className="widget-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={handleToggleWidget}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="widget-settings">
        <div className="settings-grid">
          <div className="setting-group">
            <h3>Display Options</h3>
            
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showTime}
                  onChange={(e) => handleSettingChange('showTime', e.target.checked)}
                />
                <span className="checkmark"></span>
                Show Time
              </label>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.boldText}
                  onChange={(e) => handleSettingChange('boldText', e.target.checked)}
                />
                <span className="checkmark"></span>
                Bold Text
              </label>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.locked}
                  onChange={(e) => handleSettingChange('locked', e.target.checked)}
                />
                <span className="checkmark"></span>
                Lock Position
              </label>
            </div>
          </div>

          <div className="setting-group">
            <h3>Appearance</h3>
            
            <div className="setting-item">
              <label className="setting-label">Scale</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.scale}
                  onChange={(e) => handleSettingChange('scale', parseFloat(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{settings.scale}x</span>
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-label">Color</label>
              <div className="color-picker-container">
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) => handleSettingChange('color', e.target.value)}
                  className="color-picker"
                />
                <span className="color-value">{settings.color}</span>
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-label">Font</label>
              <select
                value={settings.font}
                onChange={(e) => handleSettingChange('font', e.target.value)}
                className="font-select"
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name} {font.type === 'google' ? '(Google)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <label className="setting-label">Alignment</label>
              <div className="alignment-buttons">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    className={`alignment-btn ${settings.alignment === align ? 'active' : ''}`}
                    onClick={() => handleSettingChange('alignment', align)}
                  >
                    {align === 'left' && '⬅️'}
                    {align === 'center' && '↔️'}
                    {align === 'right' && '➡️'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="widget-preview">
          <h3>Preview</h3>
          <div 
            className="preview-container"
            style={{
              color: settings.color,
              fontFamily: settings.font,
              fontWeight: settings.boldText ? 'bold' : 'normal',
              textAlign: settings.alignment,
              transform: `scale(${settings.scale})`,
            }}
          >
            <div className="preview-day">MONDAY</div>
            <div className="preview-date">January 27, 2025</div>
            {settings.showTime && (
              <div className="preview-time">- 2:17 PM -</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateWidget;