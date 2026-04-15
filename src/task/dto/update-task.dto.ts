import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Status } from '@prisma/client';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @IsString()
  @IsOptional()
  updatedAt?: string;
}
