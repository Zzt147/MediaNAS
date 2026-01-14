import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  // 获取文件列表（包含相册逻辑）
  async getFiles(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    // 1. 视频
    const videos = await this.prisma.mediaFile.findMany({
      where: { mimeType: 'video' },
      orderBy: { id: 'desc' },
      take: pageSize,
      skip,
    });

    // 2. 相册 (按 folder 去重)
    const albums = await this.prisma.mediaFile.findMany({
      where: { mimeType: 'image' },
      distinct: ['folder'],
      orderBy: { id: 'desc' },
      take: pageSize,
      skip,
    });

    // 3. 混合排序
    return [...videos, ...albums].sort((a, b) => b.id - a.id);
  }

  // 获取单个文件信息
  async getFileMeta(id: number) {
    return this.prisma.mediaFile.findUnique({ where: { id } });
  }

  // 获取特定相册内容
  async getAlbumPhotos(folderPath: string) {
    return this.prisma.mediaFile.findMany({
      where: { folder: folderPath, mimeType: 'image' },
      orderBy: { id: 'desc' },
    });
  }

  // 生成缩略图流
  getThumbnailStream(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }
    return sharp(filePath)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 60 });
  }
}