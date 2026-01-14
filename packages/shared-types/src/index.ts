// 这里是你之前请求的完整类型定义
export interface MediaFile {
  id: number;
  path: string;
  filename: string;
  size: number; // BigInt 会被转为 number
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  thumbnailPath?: string | null;
  folder: string;
}

export type MediaFileListResponse = MediaFile[];