import { Module } from '@nestjs/common';
import { LaunchInterestsService } from './launch-interests.service';
import { LaunchInterestsController } from './launch-interests.controller';

@Module({
  controllers: [LaunchInterestsController],
  providers: [LaunchInterestsService],
})
export class LaunchInterestsModule {}
