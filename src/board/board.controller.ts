import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { BoardOwnerGuard } from '../common/guards/board-owner.guard';

@UseGuards(JwtGuard)
@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateBoardDto) {
    return this.boardService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.boardService.findAll(req.user.id);
  }

  @UseGuards(BoardAccessGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardService.findOne(id);
  }

  @UseGuards(BoardOwnerGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardService.update(id, dto);
  }

  @UseGuards(BoardOwnerGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boardService.remove(id);
  }

  @UseGuards(BoardOwnerGuard)
  @Post(':id/invite')
  invite(@Param('id') id: string, @Body('userId') userId: string) {
    return this.boardService.invite(id, userId);
  }

  @UseGuards(BoardOwnerGuard)
  @Delete(':id/kick/:userId')
  kick(@Param('id') id: string, @Param('userId') userId: string) {
    return this.boardService.kick(id, userId);
  }
}
