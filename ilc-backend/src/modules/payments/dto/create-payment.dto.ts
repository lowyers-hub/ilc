import { IsInt, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  consultationId!: string;

  @IsInt()
  @Min(1)
  amount!: number;
}

