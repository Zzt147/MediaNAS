import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';
import { MediaFile } from '@medianas/shared-types';
import * as fs from 'fs';

@Controller('api')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // 1. 列表接口 (对应 app.get('/api/files'))
  @Get('files')
  async getFiles(@Query('page') page: string): Promise<MediaFile[]> {
    const pageNum = parseInt(page) || 1;
    // 强制类型转换以符合前端共享类型要求
    return (await this.mediaService.getFiles(pageNum)) as unknown as MediaFile[];
  }

  // 2. 相册详情接口 (对应 app.get('/api/album'))
  @Get('album')
  async getAlbum(@Query('folder') folder: string): Promise<MediaFile[]> {
    if (!folder) return [];
    return (await this.mediaService.getAlbumPhotos(folder)) as unknown as MediaFile[];
  }

  // 3. 缩略图接口 (对应修复版接口 B)
  @Get('thumbnail/:id')
  async getThumbnail(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.mediaService.getFileMeta(+id);

      if (!file || !fs.existsSync(file.path)) {
        return res.status(404).send('Not found');
      }

      // 🔥 核心保护：如果文件是视频，跳过 sharp 处理以防止崩溃
      if (file.mimeType === 'video') {
        return res.status(415).send('Video thumbnail not supported via Sharp');
      }

      res.set('Content-Type', 'image/jpeg');

      // 使用 service 生成的 sharp 管道
      const pipeline = this.mediaService.getThumbnailStream(file.path);

      // 捕获管道错误，防止崩服
      pipeline
        .on('error', (err) => {
          console.error(`[Thumbnail Error] ID:${id} - ${err.message}`);
          if (!res.headersSent) res.status(500).send('Error generating thumbnail');
        })
        .pipe(res);
    } catch (error) {
      console.error("生成缩略图严重错误:", error);
      if (!res.headersSent) res.status(500).send("Thumbnail Error");
    }
  }

  // 4. 查看原图/播放视频接口 (对应接口 A)
  @Get('view/:id')
  async viewFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.mediaService.getFileMeta(+id);

      if (!file) {
        return res.status(404).send('File not found in DB');
      }

      // 检查文件是否存在
      if (!fs.existsSync(file.path)) {
        return res.status(404).send('File not found on disk');
      }

      // 使用 res.sendFile，并完全保留你的错误处理逻辑
      res.sendFile(file.path, (err: any) => {
        if (err) {
          // 只有当错误不是 "RangeNotSatisfiable" 时才报错
          if (err.status !== 416) {
            console.error('发送文件出错:', file.path, err.message);
          }
          
          if (!res.headersSent) {
            res.status(err.status || 500).end();
          }
        }
      });
    } catch (error) {
      console.error(error);
      if (!res.headersSent) res.status(500).send('Internal Server Error');
    }
  }
}