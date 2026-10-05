import { IsUUID } from 'class-validator';

export class SetActiveBusinessDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;
}
