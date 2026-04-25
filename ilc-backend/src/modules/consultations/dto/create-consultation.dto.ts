import { IsISO8601, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateConsultationDto {
  @IsUUID()
  lawyerId!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsString()
  @MinLength(3)
  topic!: string;
}

