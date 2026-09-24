// Media Module — File upload abstraction for Cloudflare R2
import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MenuPhotosController } from './menu-photos.controller';
import { MenuPhotosService } from './menu-photos.service';
@Module({
  controllers: [MediaController, MenuPhotosController],
  providers: [MediaService, MenuPhotosService],
  exports: [MediaService],
})
export class MediaModule {}
