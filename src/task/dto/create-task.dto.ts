import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  boardId: string;
}
