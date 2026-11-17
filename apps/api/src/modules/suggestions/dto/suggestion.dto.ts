import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUGGESTION_STATUSES, SUGGESTION_TOPICS } from '../suggestions.constants';

export class CreateSuggestionDto {
  @ApiProperty({ enum: SUGGESTION_TOPICS, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @IsIn(SUGGESTION_TOPICS as unknown as string[], { message: 'Pick a topic from the list.' })
  topic?: string;

  @ApiProperty({ description: 'What you would like us to improve or add', maxLength: 2000 })
  @IsString({ message: 'Write your suggestion.' })
  @MaxLength(4000, { message: 'That is a little long. Keep it under 2000 characters.' })
  message!: string;

  @ApiProperty({ required: false, description: 'The page the person was on' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  page?: string;
}

export class ReviewSuggestionDto {
  @ApiProperty({ enum: SUGGESTION_STATUSES, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  @IsIn(SUGGESTION_STATUSES as unknown as string[], { message: 'Unknown status.' })
  status?: string;

  @ApiProperty({ required: false, description: 'A note for the team. Not shown to the sender.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Keep the note under 1000 characters.' })
  adminNote?: string;
}
