export interface MediaFile {
  id: number;
  fileName: string;
  path: string;
  mimeType: string;
  folder: string;
}

export const API_BASE = 'http://192.168.1.101:3000';