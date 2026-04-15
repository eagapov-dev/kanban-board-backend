import { JwtService } from '@nestjs/jwt';
import { BoardGateway } from './board.gateway';
import { Socket, Server } from 'socket.io';

describe('BoardGateway', () => {
  let gateway: BoardGateway;
  let jwtService: { verify: jest.Mock };
  let mockServer: { to: jest.Mock; emit: jest.Mock };
  let mockToEmit: jest.Mock;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    gateway = new BoardGateway(jwtService as any);

    mockToEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: mockToEmit }),
      emit: jest.fn(),
    };
    gateway.server = mockServer as any;
  });

  function createMockClient(id = 'socket-1'): Socket {
    return {
      id,
      handshake: { auth: {}, query: {} },
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as any;
  }

  describe('handleConnection', () => {
    it('should authenticate client with valid token from auth', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'valid-token' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });

      await gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate client with token from query', async () => {
      const client = createMockClient();
      client.handshake.query = { token: 'query-token' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });

      await gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('query-token');
    });

    it('should disconnect client without token', async () => {
      const client = createMockClient();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'bad' };
      jwtService.verify.mockImplementation(() => { throw new Error(); });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up presence on disconnect', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'valid' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });

      await gateway.handleConnection(client);
      gateway.handleJoinBoard(client, 'board-1');
      gateway.handleDisconnect(client);

      // Should emit presence update with empty users
      expect(mockServer.to).toHaveBeenCalledWith('board:board-1');
    });

    it('should do nothing for unknown client', () => {
      const client = createMockClient('unknown');

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('joinBoard / leaveBoard', () => {
    it('should join room and emit presence', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'valid' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });
      await gateway.handleConnection(client);

      gateway.handleJoinBoard(client, 'board-1');

      expect(client.join).toHaveBeenCalledWith('board:board-1');
      expect(mockServer.to).toHaveBeenCalledWith('board:board-1');
      expect(mockToEmit).toHaveBeenCalledWith('presenceUpdate', expect.objectContaining({
        boardId: 'board-1',
        users: [{ userId: 'user-1', userName: 'test@test.com' }],
      }));
    });

    it('should not join if user not authenticated', () => {
      const client = createMockClient();

      gateway.handleJoinBoard(client, 'board-1');

      expect(client.join).not.toHaveBeenCalled();
    });

    it('should leave room and emit presence', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'valid' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });
      await gateway.handleConnection(client);

      gateway.handleJoinBoard(client, 'board-1');
      gateway.handleLeaveBoard(client, 'board-1');

      expect(client.leave).toHaveBeenCalledWith('board:board-1');
    });
  });

  describe('joinTask / leaveTask', () => {
    it('should join task room and emit task presence', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'valid' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });
      await gateway.handleConnection(client);

      gateway.handleJoinTask(client, 'task-1');

      expect(client.join).toHaveBeenCalledWith('task:task-1');
      expect(mockServer.to).toHaveBeenCalledWith('task:task-1');
      expect(mockToEmit).toHaveBeenCalledWith('taskPresenceUpdate', expect.objectContaining({
        taskId: 'task-1',
        users: [{ userId: 'user-1', userName: 'test@test.com' }],
      }));
    });

    it('should leave task room', async () => {
      const client = createMockClient();
      client.handshake.auth = { token: 'valid' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });
      await gateway.handleConnection(client);

      gateway.handleJoinTask(client, 'task-1');
      gateway.handleLeaveTask(client, 'task-1');

      expect(client.leave).toHaveBeenCalledWith('task:task-1');
    });
  });

  describe('Yjs relay', () => {
    it('should relay yjsUpdate to task room', () => {
      const client = createMockClient();
      const toEmit = jest.fn();
      client.to = jest.fn().mockReturnValue({ emit: toEmit });
      const data = { room: 'task-1:title', update: [1, 2, 3] };

      gateway.handleYjsUpdate(client, data);

      expect(client.to).toHaveBeenCalledWith('task:task-1');
      expect(toEmit).toHaveBeenCalledWith('yjsUpdate', data);
    });

    it('should not relay yjsUpdate without room', () => {
      const client = createMockClient();
      client.to = jest.fn();

      gateway.handleYjsUpdate(client, {} as any);

      expect(client.to).not.toHaveBeenCalled();
    });

    it('should relay yjsAwareness to task room', () => {
      const client = createMockClient();
      const toEmit = jest.fn();
      client.to = jest.fn().mockReturnValue({ emit: toEmit });

      gateway.handleYjsAwareness(client, { room: 'task-1:desc', update: [4, 5] });

      expect(client.to).toHaveBeenCalledWith('task:task-1');
      expect(toEmit).toHaveBeenCalledWith('yjsAwareness', expect.any(Object));
    });

    it('should relay yjsSyncRequest with server socket id', () => {
      const client = createMockClient('sender-socket');
      const toEmit = jest.fn();
      client.to = jest.fn().mockReturnValue({ emit: toEmit });

      gateway.handleYjsSyncRequest(client, { room: 'task-1:title', socketId: 'old' });

      expect(toEmit).toHaveBeenCalledWith('yjsSyncRequest', expect.objectContaining({
        socketId: 'sender-socket',
      }));
    });

    it('should relay yjsSyncResponse to target socket', () => {
      gateway.handleYjsSyncResponse({} as any, {
        room: 'task-1:title',
        update: [1],
        targetSocketId: 'target-socket',
      });

      expect(mockServer.to).toHaveBeenCalledWith('target-socket');
      expect(mockToEmit).toHaveBeenCalledWith('yjsSyncResponse', expect.any(Object));
    });

    it('should not relay yjsSyncResponse without targetSocketId', () => {
      gateway.handleYjsSyncResponse({} as any, { room: 'x', update: [] } as any);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('public emit methods', () => {
    it('emitTaskCreated should broadcast to board room', () => {
      gateway.emitTaskCreated('board-1', { id: 'task-1' });

      expect(mockServer.to).toHaveBeenCalledWith('board:board-1');
      expect(mockToEmit).toHaveBeenCalledWith('taskCreated', { id: 'task-1' });
    });

    it('emitTaskUpdated should broadcast to board room', () => {
      gateway.emitTaskUpdated('board-1', { id: 'task-1' });

      expect(mockServer.to).toHaveBeenCalledWith('board:board-1');
      expect(mockToEmit).toHaveBeenCalledWith('taskUpdated', { id: 'task-1' });
    });

    it('emitTaskDeleted should broadcast to board room', () => {
      gateway.emitTaskDeleted('board-1', 'task-1');

      expect(mockServer.to).toHaveBeenCalledWith('board:board-1');
      expect(mockToEmit).toHaveBeenCalledWith('taskDeleted', { taskId: 'task-1' });
    });

    it('emitBoardUpdated should broadcast to board room', () => {
      gateway.emitBoardUpdated('board-1', { name: 'Updated' });

      expect(mockServer.to).toHaveBeenCalledWith('board:board-1');
      expect(mockToEmit).toHaveBeenCalledWith('boardUpdated', { name: 'Updated' });
    });

    it('emitBoardInvited should broadcast to all', () => {
      gateway.emitBoardInvited('user-2');

      expect(mockServer.emit).toHaveBeenCalledWith('boardInvited', { userId: 'user-2' });
    });

    it('emitBoardKicked should broadcast to all', () => {
      gateway.emitBoardKicked('user-2', 'board-1');

      expect(mockServer.emit).toHaveBeenCalledWith('boardKicked', { userId: 'user-2', boardId: 'board-1' });
    });
  });

  describe('getUniqueUsers', () => {
    it('should deduplicate users by userId', async () => {
      const client1 = createMockClient('socket-1');
      const client2 = createMockClient('socket-2');
      client1.handshake.auth = { token: 'valid' };
      client2.handshake.auth = { token: 'valid' };
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      gateway.handleJoinBoard(client1, 'board-1');
      gateway.handleJoinBoard(client2, 'board-1');

      // Last emit should have deduplicated users
      const lastCall = mockToEmit.mock.calls[mockToEmit.mock.calls.length - 1];
      expect(lastCall[1].users).toHaveLength(1);
      expect(lastCall[1].users[0].userId).toBe('user-1');
    });
  });
});
