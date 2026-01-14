import { Controller, Get, Param, Query, Res, NotFoundException, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';
import { MediaFile } from '@medianas/shared-types'; // ✅ 导入共享类型

@Controller('api')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // 1. 列表接口
  @Get('files')
  async getFiles(@Query('page') page: string): Promise<MediaFile[]> {
    const pageNum = parseInt(page) || 1;
    // NestJS 会自动处理 BigInt 的序列化吗？不，我们稍后在 main.ts 处理
    return this.mediaService.getFiles(pageNum) as unknown as MediaFile[];
  }

  // 2. 相册接口
  @Get('album')
  async getAlbum(@Query('folder') folder: string): Promise<MediaFile[]> {
    if (!folder) return [];
    return this.mediaService.getAlbumPhotos(folder) as unknown as MediaFile[];
  }

  // 3. 缩略图接口 (Stream)
  @Get('thumbnail/:id')
  async getThumbnail(@Param('id') id: string, @Res() res: Response) {
    const file = await this.mediaService.getFileMeta(+id);
    if (!file) throw new NotFoundException();

    res.set('Content-Type', 'image/jpeg');
    try {
      const stream = this.mediaService.getThumbnailStream(file.path);
      stream.pipe(res);
    } catch (e) {
      if (!res.headersSent) res.status(404).send('Not found');
    }
  }

  // 4. 查看原图/视频接口
  @Get('view/:id')
  async viewFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.mediaService.getFileMeta(+id);
    if (!file) throw new NotFoundException();

    res.sendFile(file.path, (err: any) => {
      if (err && err.status !== 416 && !res.headersSent) {
        res.status(500).end();
      }
    });
  }
}