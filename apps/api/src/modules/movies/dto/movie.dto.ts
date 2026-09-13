import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional, IsString, IsArray, IsIn, IsInt, IsDateString, MaxLength, ArrayMaxSize,
} from 'class-validator';
import { STATUSES, CERTIFICATIONS } from '../movies.service';

/**
 * Shared create/update shape. All fields optional here — `name` (and the
 * ADD/UPDATE-specific required checks) are enforced in MoviesService, same
 * as before this DTO existed. What this adds is length/type validation on
 * every field, so a value that doesn't fit its DB column is rejected with a
 * clear 400 instead of reaching Postgres and crashing as a raw DB error —
 * this is exactly what let one long `language` string exceed VarChar(50).
 */
export class MovieDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  posterImage?: string;

  @ApiProperty({ required: false, type: [String], description: 'e.g. ["Malayalam", "English"]' })
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @IsString({ each: true }) @MaxLength(50, { each: true })
  languages?: string[];

  @ApiProperty({ required: false })
  @IsOptional() @IsInt()
  durationMinutes?: number;

  @ApiProperty({ required: false, enum: CERTIFICATIONS })
  @IsOptional() @IsIn(CERTIFICATIONS)
  certification?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  releaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  synopsis?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  trailerUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  bookingUrl?: string;

  @ApiProperty({ required: false, enum: STATUSES })
  @IsOptional() @IsIn(STATUSES)
  status?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @IsString({ each: true }) @MaxLength(100, { each: true })
  targetCities?: string[];

  @ApiProperty({ required: false, type: [String], description: 'e.g. ["Action", "Drama"]' })
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @IsString({ each: true }) @MaxLength(50, { each: true })
  genres?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @IsString({ each: true }) @MaxLength(100, { each: true })
  cast?: string[];
}
