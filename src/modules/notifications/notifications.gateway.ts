// ─────────────────────────────────────────────────────────────────────────────
// notifications.gateway.ts
//
// Socket.IO gateway.  Admin clients connect and join "admin_room".
// The server emits two event types:
//   "notification:dangerous"  — high-priority alert
//   "notification:order"      — new order placed
//
// Client connection:
//   const socket = io('http://localhost:5000', { withCredentials: true });
//   socket.on('notification:dangerous', (payload) => { ... });
//   socket.on('notification:order',     (payload) => { ... });
// ─────────────────────────────────────────────────────────────────────────────

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export const ADMIN_ROOM = 'admin_room';

export interface NotificationPayload {
  id: string;
  type: 'dangerous' | 'order' | 'system' | 'info';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'https://ophelia.vercel.app',
      'https://opheliago.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  afterInit() {
    this.logger.log('WebSocket gateway initialized — /notifications');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Admin room join/leave ─────────────────────────────────────────────────

  @SubscribeMessage('join:admin')
  handleJoinAdmin(@ConnectedSocket() client: Socket, @MessageBody() _data: any) {
    void client.join(ADMIN_ROOM);
    client.emit('joined:admin', { room: ADMIN_ROOM, socketId: client.id });
    this.logger.log(`Admin joined room: ${client.id}`);
  }

  @SubscribeMessage('leave:admin')
  handleLeaveAdmin(@ConnectedSocket() client: Socket) {
    void client.leave(ADMIN_ROOM);
    this.logger.log(`Admin left room: ${client.id}`);
  }

  // ── Emit helpers (called by NotificationsService) ─────────────────────────

  emitDangerous(payload: NotificationPayload) {
    this.server.to(ADMIN_ROOM).emit('notification:dangerous', payload);
    this.logger.warn(`[DANGEROUS] emitted → ${payload.title}`);
  }

  emitOrder(payload: NotificationPayload) {
    this.server.to(ADMIN_ROOM).emit('notification:order', payload);
    this.logger.log(`[ORDER] emitted → ${payload.title}`);
  }

  emitToRoom(room: string, event: string, payload: NotificationPayload) {
    this.server.to(room).emit(event, payload);
  }
}
