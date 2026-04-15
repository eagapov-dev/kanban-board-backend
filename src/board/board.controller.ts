import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtGuard } from '../auth/jwt.guard';

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

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.boardService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.boardService.remove(id, req.user.id);
  }

  @Post(':id/invite')
  invite(@Request() req, @Param('id') id: string, @Body('userId') userId: string) {
    return this.boardService.invite(id, req.user.id, userId);
  }

  @Delete(':id/kick/:userId')
  kick(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.boardService.kick(id, req.user.id, userId);
  }
}
