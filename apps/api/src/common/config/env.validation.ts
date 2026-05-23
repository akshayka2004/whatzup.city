import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, IsNotEmpty, IsOptional } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  DIRECT_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  SUPABASE_URL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsString()
  @IsOptional()
  SUPABASE_STORAGE_BUCKET?: string;
}

export function validateEnv(config: Record<string, any>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  // Enterprise security check: Enforce strong secrets in production
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (
      !validatedConfig.SUPABASE_URL ||
      !validatedConfig.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production mode.',
      );
    }
    if (
      validatedConfig.SUPABASE_URL.includes('localhost') ||
      validatedConfig.SUPABASE_URL.includes('127.0.0.1')
    ) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: SUPABASE_URL cannot point to localhost or loopback addresses in production mode.',
      );
    }
    if (
      validatedConfig.JWT_SECRET.toLowerCase().includes('change') ||
      validatedConfig.JWT_SECRET.toLowerCase().includes('secret') ||
      validatedConfig.JWT_SECRET.length < 32
    ) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_SECRET is too weak or uses default strings in production mode. ' +
          'Must be at least 32 characters long.',
      );
    }
    if (
      validatedConfig.JWT_REFRESH_SECRET.toLowerCase().includes('change') ||
      validatedConfig.JWT_REFRESH_SECRET.toLowerCase().includes('secret') ||
      validatedConfig.JWT_REFRESH_SECRET.length < 32
    ) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET is too weak or uses default strings in production mode. ' +
          'Must be at least 32 characters long.',
      );
    }
  }

  return validatedConfig;
}
