import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [PrismaService, MediaService],
})
export class AppModule {}