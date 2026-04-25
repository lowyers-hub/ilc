import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LawyerEntity } from './entities/lawyer.entity';
import { LawyersController } from './lawyers.controller';
import { LawyersService } from './lawyers.service';

@Module({
  imports: [TypeOrmModule.forFeature([LawyerEntity])],
  controllers: [LawyersController],
  providers: [LawyersService],
  exports: [LawyersService],
})
export class LawyersModule {}

