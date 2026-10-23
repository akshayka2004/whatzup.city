import { IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorCodeDto {
  /** 6-digit authenticator code, or a recovery code like ABCDE-12345. */
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 20)
  code!: string;
}

export class TwoFactorLoginDto extends TwoFactorCodeDto {
  @ApiProperty()
  @IsUUID()
  challengeToken!: string;
}

export class TwoFactorDisableDto extends TwoFactorCodeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  password!: string;
}
