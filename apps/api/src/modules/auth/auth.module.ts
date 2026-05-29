// ============================================================
// Auth Module — JWT authentication with refresh token rotation
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { MailService } from './mail.service';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, MailService, AccessTokenStrategy, RefreshTokenStrategy],
  exports: [AuthService, PasswordService, MailService],
})
export class AuthModule {}
