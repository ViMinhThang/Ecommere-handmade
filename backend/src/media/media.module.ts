import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [MediaService, PrismaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
