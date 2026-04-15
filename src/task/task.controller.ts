import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtGuard } from '../auth/jwt.guard';

@UseGuards(JwtGuard)
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateTaskDto) {
    return this.taskService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req, @Query('boardId') boardId: string) {
    return this.taskService.findAll(boardId, req.user.id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.taskService.remove(id, req.user.id);
  }
}
