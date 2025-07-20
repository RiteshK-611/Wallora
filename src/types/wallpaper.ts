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
