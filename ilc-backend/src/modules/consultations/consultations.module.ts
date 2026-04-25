import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LawyersModule } from '@/modules/lawyers/lawyers.module';

import { ConsultationEntity } from './entities/consultation.entity';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConsultationEntity]), LawyersModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}

