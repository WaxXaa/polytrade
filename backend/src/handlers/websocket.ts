import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import type { AgentCore } from '../services/agent-core.js';
import type { WSEvent } from '../models/types.js';

export function createWsHandler(fastify: FastifyInstance, agent: AgentCore) {
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.info(`[WS] Client connected: ${socket.id}`);

    socket.on('subscribe', (data: { channels: string[] }) => {
      console.info(`[WS] Client ${socket.id} subscribed to: ${data.channels}`);
      if (data.channels.includes('leaderboard')) {
        socket.emit('leaderboard_update', agent.getTopTraders());
      }
      if (data.channels.includes('positions')) {
        socket.emit('position_update', agent.getOpenPositions());
      }
    });

    socket.on('disconnect', () => {
      console.info(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // Bridge AgentCore internal events to all connected Socket.IO clients
  agent.onBroadcast((event: WSEvent) => {
    const eventName = event.type.replace(/-/g, '_');
    io.emit(eventName, (event as { type: string; data: unknown }).data);
  });

  io.emit('agent_status', agent.getStatus());
}

export function createWebSocketServer(fastify: FastifyInstance) {
  return new SocketIOServer(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });
}
