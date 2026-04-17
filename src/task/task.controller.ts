import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { BoardAccessGuard } from '../common/guards/board-access.guard';

@UseGuards(JwtGuard, BoardAccessGuard)
@Controller('board/:boardId/task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Param('boardId') boardId: string, @Body() dto: CreateTaskDto) {
    return this.taskService.create(boardId, dto);
  }

  @Get()
  findAll(@Param('boardId') boardId: string) {
    return this.taskService.findAll(boardId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
