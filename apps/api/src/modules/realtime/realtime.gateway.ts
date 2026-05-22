import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 1. WebSocket rate limiting by IP (max 20 connections per 10s)
      const ip =
        (client.handshake.headers['x-forwarded-for'] as string) ||
        client.handshake.address ||
        'unknown';
      const rateLimitKey = `ws-rate-limit:${ip}`;
      const currentVal = await this.redisService.incr(rateLimitKey);
      if (currentVal === 1) {
        await this.redisService.expire(rateLimitKey, 10);
      }
      if (currentVal > 20) {
        this.logger.warn(`WebSocket connection rate limit exceeded for IP: ${ip}`);
        client.disconnect(true);
        return;
      }

      const token =
        client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || this.configService.get('JWT_ACCESS_SECRET'),
      });

      const userId = payload.sub || payload.id;
      const tenantId = payload.tenantId;

      if (!userId || !tenantId) {
        client.disconnect(true);
        return;
      }

      // 2. Validate token/user active presence in Redis/database
      const user = await this.authService.validateUser(payload);
      if (!user || !user.isActive) {
        this.logger.warn(`WebSocket auth failed: User ${userId} is inactive or deleted`);
        client.disconnect(true);
        return;
      }

      // Store user data on socket
      (client as any).userId = userId;
      (client as any).tenantId = tenantId;
      (client as any).role = payload.role;

      // Join user-specific room and tenant room
      client.join(`user:${userId}`);
      client.join(`tenant:${tenantId}`);

      // Admin rooms
      if (payload.role === 'MASTER_ADMIN' || payload.role === 'SUPER_ADMIN') {
        client.join(`admin:${tenantId}`);
      }

      // Track connections
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.warn(`WebSocket auth failed: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(client.id);
      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ── Broadcast Methods (called from services) ─────────────

  /**
   * Send a notification to a specific user across all their connected devices
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all users in a tenant
   */
  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Send to admin channels only
   */
  sendToAdmins(tenantId: string, event: string, data: any) {
    this.server.to(`admin:${tenantId}`).emit(event, data);
  }

  /**
   * Check if a user is currently online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }
}
