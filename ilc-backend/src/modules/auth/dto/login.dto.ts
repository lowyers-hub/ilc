import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  phoneE164?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

