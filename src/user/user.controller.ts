import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from '../auth/jwt.guard';

@UseGuards(JwtGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search')
  search(@Request() req, @Query('q') query: string) {
    return this.userService.search(query || '', req.user.id);
  }
}
