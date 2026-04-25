import { IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  source?: string; // "file"|"camera"
}

