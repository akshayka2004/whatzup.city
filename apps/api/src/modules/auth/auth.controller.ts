// ============================================================
// Auth Controller — Registration, Login, Token Refresh, Logout
// ============================================================

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TurnstileGuard } from '../../common/guards/turnstile.guard';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorCodeDto, TwoFactorDisableDto, TwoFactorLoginDto } from './dto/two-factor.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BusinessSignupDto } from './dto/business-signup.dto';
import { CivicSignupDto } from './dto/civic-signup.dto';
import { SelectRoleDto } from './dto/select-role.dto';
import { SetActiveBusinessDto } from './dto/set-active-business.dto';
import { AvailabilityDto } from './dto/availability.dto';
import { ConfigService } from '@nestjs/config';
import { clientIp } from '../../common/utils/client-ip';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    // COOKIE_SECURE=true only when the site is served over HTTPS.
    // On raw-IP HTTP deployments set COOKIE_SECURE=false in env.
    const isSecure = this.configService.get<string>('COOKIE_SECURE') === 'true';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Readable hint (no secret in it) so the web app can skip /auth/me and
    // /auth/refresh entirely for visitors who have never signed in.
    res.cookie('has_session', '1', {
      httpOnly: false,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('has_session', { path: '/' });
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 3600000 } })
  @UseGuards(TurnstileGuard)
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.signup(dto);
    // Set auth cookies so the user is immediately authenticated
    if (result.accessToken) {
      this.setCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 3600000 } })
  @UseGuards(TurnstileGuard)
  @Post('business/signup')
  @ApiOperation({ summary: 'Register a new business tenant and owner account' })
  async businessSignup(
    @Body() dto: BusinessSignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.businessSignup(dto);
    this.setCookies(res, result.accessToken, result.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
      businessId: result.businessId,
    };
  }

  @Public()
  @Get('tenant/:slug')
  @ApiOperation({ summary: 'Resolve tenant UUID by its slug' })
  async getTenantBySlug(@Param('slug') slug: string) {
    return this.authService.getTenantBySlug(slug);
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 900000 } })
  @UseGuards(TurnstileGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = clientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);
    // Password was right but a second factor is needed: no cookies yet.
    if ('twoFactorRequired' in result) return result;
    this.setCookies(res, result.accessToken, result.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Throttle({ long: { limit: 10, ttl: 900000 } })
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish a two-factor login with an authenticator or recovery code' })
  async twoFactorLogin(
    @Body() dto: TwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithTwoFactor(
      dto.challengeToken,
      dto.code,
      clientIp(req),
      req.headers['user-agent'],
    );
    this.setCookies(res, result.accessToken, result.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('2fa')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Two-factor status for the signed-in user' })
  twoFactorStatus(@CurrentUser('id') userId: string) {
    return this.twoFactor.status(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ long: { limit: 10, ttl: 900000 } })
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start two-factor setup (returns the authenticator secret)' })
  twoFactorSetup(@CurrentUser('id') userId: string) {
    return this.twoFactor.setup(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ long: { limit: 10, ttl: 900000 } })
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm setup with a code; returns one-time recovery codes' })
  twoFactorEnable(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactor.enable(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ long: { limit: 5, ttl: 900000 } })
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Turn two-factor off (password + code)' })
  twoFactorDisable(@CurrentUser('id') userId: string, @Body() dto: TwoFactorDisableDto) {
    return this.twoFactor.disable(userId, dto.password, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ long: { limit: 5, ttl: 900000 } })
  @Post('2fa/recovery-codes')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace recovery codes (needs an authenticator code)' })
  twoFactorRecoveryCodes(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactor.regenerateRecoveryCodes(userId, dto.code);
  }

  @Public()
  @Throttle({ long: { limit: 30, ttl: 900000 } })
  @Post('availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Is this email or phone already registered? (sign-up pre-check)' })
  async availability(@Body() dto: AvailabilityDto, @Req() req: Request) {
    return this.authService.checkAvailability(dto, clientIp(req));
  }

  // Browsers call this on every expired token, so it is generous, but not unlimited.
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    // Extract refresh token from cookies first, then fallback to request body
    const refreshToken = req.cookies?.['refresh_token'] || body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const ip = clientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refreshTokens(refreshToken, ip, userAgent);
    this.setCookies(res, result.accessToken, result.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const refreshToken = req.cookies?.['refresh_token'] || body.refreshToken;
    await this.authService.logout(userId, refreshToken);
    this.clearCookies(res);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all devices and invalidate all tokens' })
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(userId);
    this.clearCookies(res);
    return { message: 'Logged out from all devices successfully' };
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 900000 } })
  @UseGuards(TurnstileGuard)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 900000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ long: { limit: 10, ttl: 900000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 3600000 } })
  @UseGuards(TurnstileGuard)
  @Post('civic/signup')
  @ApiOperation({ summary: 'Register NGO / Community / News Forum account' })
  async civicSignup(@Body() dto: CivicSignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.civicSignup(dto);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('select-role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Select entity type and dynamic role after initial registration' })
  async selectRole(
    @CurrentUser('id') userId: string,
    @Body() dto: SelectRoleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.selectRole(userId, dto);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user details' })
  async me(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('active-business')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Switch the outlet (business) the signed-in owner/staff member is operating',
  })
  async setActiveBusiness(@CurrentUser('id') userId: string, @Body() dto: SetActiveBusinessDto) {
    return this.authService.setActiveBusiness(userId, dto.businessId);
  }
}
