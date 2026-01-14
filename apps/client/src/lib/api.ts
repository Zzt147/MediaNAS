// apps/client/src/lib/api.ts
import axios from 'axios';
import type { MediaFile } from '@medianas/shared-types';

const client = axios.create({
  baseURL: 'http://localhost:3000/api', // 以后可以改成环境变量
});

export const mediaApi = {
  // 获取列表
  getFiles: async (page = 1) => {
    const { data } = await client.get<MediaFile[]>(`/files?page=${page}`);
    return data;
  },

  // 触发扫描
  scanLibrary: async () => {
    const { data } = await client.post('/scan');
    return data;
  },

  // 获取缩略图 URL (辅助函数)
  getThumbnailUrl: (id: number) => `http://localhost:3000/api/thumbnail/${id}`,
  
  // 获取原图/视频 URL
  getViewUrl: (id: number) => `http://localhost:3000/api/view/${id}`,
};