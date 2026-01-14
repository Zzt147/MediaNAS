import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import sharp from 'sharp';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  // 完全还原接口 D 的混合分页逻辑
  async getFiles(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    // 1. 获取所有视频 (正常分页)
    const videos = await this.prisma.mediaFile.findMany({
      where: { mimeType: 'video' },
      orderBy: { id: 'desc' },
      take: pageSize,
      skip: skip,
    });

    // 2. 获取相册 (图片)：利用 distinct 去重，实现“相册封面”效果
    const albums = await this.prisma.mediaFile.findMany({
      where: { mimeType: 'image' },
      distinct: ['folder'], 
      orderBy: { id: 'desc' },
      take: pageSize,
      skip: skip,
    });

    // 3. 混合两者并按 ID 排序 (模拟 Timeline)
    return [...videos, ...albums].sort((a, b) => b.id - a.id);
  }

  // 获取单个文件元数据
  async getFileMeta(id: number) {
    return this.prisma.mediaFile.findUnique({ where: { id } });
  }

  // 获取指定相册内的所有图片 (接口 C)
  async getAlbumPhotos(folderPath: string) {
    return this.prisma.mediaFile.findMany({
      where: {
        folder: folderPath,
        mimeType: 'image',
      },
      orderBy: { id: 'desc' }
    });
  }

  // 缩略图生成逻辑 (完全遵循“修复版”接口 B)
  getThumbnailStream(filePath: string) {
    // 直接用 sharp 读取文件路径
    return sharp(filePath)
      .resize(300, 300, { 
        fit: 'cover',    // 保持比例填充，裁掉多余的
        position: 'center' // 从中间裁切
      }) 
      .jpeg({ quality: 60 });
  }
}