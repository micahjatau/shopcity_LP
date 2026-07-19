import { IsString } from 'class-validator';

export class CreateCardDto {
  @IsString()
  customerId!: string;

  @IsString()
  barcodeValue!: string;
}

export class ReplaceCardDto {
  @IsString()
  barcodeValue!: string;
}

export class UpdateCardStatusDto {
  @IsString()
  status!: string;
}
