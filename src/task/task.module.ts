import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [BoardModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
