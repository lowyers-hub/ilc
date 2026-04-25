import { IsOptional, IsString } from 'class-validator';

export class ClassifyDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

