import { IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PreferenceItemDto {
  @ApiProperty({ description: 'Notification channel (e.g., PUSH, EMAIL, IN_APP)' })
  @IsString()
  channel!: string;

  @ApiProperty({
    description: 'Notification type (e.g., OFFER_ALERT, REVIEW_REPLY, GOVERNMENT_ALERT)',
  })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Flag to opt-in or opt-out' })
  @IsBoolean()
  isEnabled!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({ type: [PreferenceItemDto], description: 'List of preferences to update' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}
