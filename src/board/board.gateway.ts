import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface PresenceUser {
  userId: string;
  userName: string;
  socketId: string;
}

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173' },
  namespace: '/board',
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private boardPresence = new Map<string, Map<string, PresenceUser>>();
  private taskPresence = new Map<string, Map<string, PresenceUser>>();
  private socketToUser = new Map<string, { userId: string; userName: string }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.socketToUser.set(client.id, {
        userId: payload.sub,
        userName: payload.email,
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.socketToUser.get(client.id);
    if (!user) return;

    for (const [boardId, users] of this.boardPresence) {
      if (users.delete(client.id)) {
        this.emitBoardPresence(boardId);
      }
    }

    for (const [taskId, users] of this.taskPresence) {
      if (users.delete(client.id)) {
        this.emitTaskPresence(taskId);
      }
    }

    this.socketToUser.delete(client.id);
  }

  @SubscribeMessage('joinBoard')
  handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() boardId: string,
  ) {
    const user = this.socketToUser.get(client.id);
    if (!user) return;

    client.join(`board:${boardId}`);

    if (!this.boardPresence.has(boardId)) {
      this.boardPresence.set(boardId, new Map());
    }

    this.boardPresence.get(boardId)!.set(client.id, {
      ...user,
      socketId: client.id,
    });

    this.emitBoardPresence(boardId);
  }

  @SubscribeMessage('leaveBoard')
  handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() boardId: string,
  ) {
    client.leave(`board:${boardId}`);

    const users = this.boardPresence.get(boardId);
    if (users) {
      users.delete(client.id);
      this.emitBoardPresence(boardId);
    }
  }

  @SubscribeMessage('joinTask')
  handleJoinTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() taskId: string,
  ) {
    const user = this.socketToUser.get(client.id);
    if (!user) return;

    client.join(`task:${taskId}`);

    if (!this.taskPresence.has(taskId)) {
      this.taskPresence.set(taskId, new Map());
    }

    this.taskPresence.get(taskId)!.set(client.id, {
      ...user,
      socketId: client.id,
    });

    this.emitTaskPresence(taskId);
  }

  @SubscribeMessage('leaveTask')
  handleLeaveTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() taskId: string,
  ) {
    client.leave(`task:${taskId}`);

    const users = this.taskPresence.get(taskId);
    if (users) {
      users.delete(client.id);
      this.emitTaskPresence(taskId);
    }
  }

  @SubscribeMessage('yjsUpdate')
  handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; update: number[] },
  ) {
    if (!data?.room) return;
    const taskId = data.room.split(':')[0];
    client.to(`task:${taskId}`).emit('yjsUpdate', data);
  }

  @SubscribeMessage('yjsAwareness')
  handleYjsAwareness(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; update: number[] },
  ) {
    if (!data?.room) return;
    const taskId = data.room.split(':')[0];
    client.to(`task:${taskId}`).emit('yjsAwareness', data);
  }

  @SubscribeMessage('yjsSyncRequest')
  handleYjsSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; socketId: string },
  ) {
    if (!data?.room) return;
    const taskId = data.room.split(':')[0];
    client.to(`task:${taskId}`).emit('yjsSyncRequest', {
      ...data,
      socketId: client.id,
    });
  }

  @SubscribeMessage('yjsSyncResponse')
  handleYjsSyncResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; update: number[]; targetSocketId: string },
  ) {
    if (!data?.targetSocketId) return;
    this.server.to(data.targetSocketId).emit('yjsSyncResponse', data);
  }

  // Public methods for services to call

  emitTaskCreated(boardId: string, task: any) {
    this.server.to(`board:${boardId}`).emit('taskCreated', task);
  }

  emitTaskUpdated(boardId: string, task: any) {
    this.server.to(`board:${boardId}`).emit('taskUpdated', task);
  }

  emitTaskDeleted(boardId: string, taskId: string) {
    this.server.to(`board:${boardId}`).emit('taskDeleted', { taskId });
  }

  emitBoardUpdated(boardId: string, board: any) {
    this.server.to(`board:${boardId}`).emit('boardUpdated', board);
  }

  emitBoardInvited(userId: string) {
    this.server.emit('boardInvited', { userId });
  }

  emitBoardKicked(userId: string, boardId: string) {
    this.server.emit('boardKicked', { userId, boardId });
  }

  private emitBoardPresence(boardId: string) {
    const users = this.boardPresence.get(boardId);
    const uniqueUsers = this.getUniqueUsers(users);

    this.server.to(`board:${boardId}`).emit('presenceUpdate', {
      boardId,
      users: uniqueUsers,
    });
  }

  private emitTaskPresence(taskId: string) {
    const users = this.taskPresence.get(taskId);
    const uniqueUsers = this.getUniqueUsers(users);

    this.server.to(`task:${taskId}`).emit('taskPresenceUpdate', {
      taskId,
      users: uniqueUsers,
    });
  }

  private getUniqueUsers(users: Map<string, PresenceUser> | undefined) {
    if (!users) return [];

    const seen = new Set<string>();
    const result: { userId: string; userName: string }[] = [];

    for (const user of users.values()) {
      if (!seen.has(user.userId)) {
        seen.add(user.userId);
        result.push({ userId: user.userId, userName: user.userName });
      }
    }

    return result;
  }
}
