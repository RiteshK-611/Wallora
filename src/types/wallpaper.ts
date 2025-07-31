export interface WallpaperInfo {
  path: string;
  name: string;
  file_type: string;
  size: number;
}

export interface WallpaperSettings {
  autoChange: boolean;
  interval: number;
  randomOrder: boolean;
  pauseOnFullscreen: boolean;
}

export interface DateWidgetSettings {
  enabled: boolean;
  locked: boolean;
  show_time: boolean;
  bold_text: boolean;
  scale: number;
  color: string;
  font: string;
  alignment: 'left' | 'center' | 'right';
}

export interface FontOption {
  name: string;
  value: string;
  type: 'google' | 'local';
  url?: string;
}