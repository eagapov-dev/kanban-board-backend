import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { BoardGateway } from './board.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BoardController],
  providers: [BoardService, BoardGateway],
  exports: [BoardGateway],
})
export class BoardModule {}
