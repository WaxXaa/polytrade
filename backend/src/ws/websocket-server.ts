/**
 * WebSocket Server — broadcasts real-time events to all connected frontend clients.
 *
 * Uses the `ws` library. Clients connect and receive typed WSEvent messages as
 * JSON strings. Latency target: < 2 seconds from event to client receipt.
 */

import { WebSocketServer as WsServer, WebSocket } from 'ws';
import type { WSEvent } from '../models/types';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface WebSocketServer {
  start(port: number): void;
  stop(): void;
  broadcast(event: WSEvent): void;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class WebSocketServerImpl implements WebSocketServer {
  private wss: WsServer | null = null;

  start(port: number): void {
    if (this.wss) {
      console.warn('[WebSocketServer] Already running — ignoring start() call.');
      return;
    }

    this.wss = new WsServer({ port });

    this.wss.on('listening', () => {
      console.info(`[WebSocketServer] Listening on ws://localhost:${port}`);
    });

    this.wss.on('connection', (socket: WebSocket) => {
      console.info('[WebSocketServer] Client connected.');

      socket.on('close', () => {
        console.info('[WebSocketServer] Client disconnected.');
      });

      socket.on('error', (err: Error) => {
        console.error('[WebSocketServer] Socket error:', err.message);
      });
    });

    this.wss.on('error', (err: Error) => {
      console.error('[WebSocketServer] Server error:', err.message);
    });
  }

  stop(): void {
    if (!this.wss) return;

    this.wss.close(() => {
      console.info('[WebSocketServer] Stopped.');
    });

    // Close all open client connections immediately
    for (const client of this.wss.clients) {
      client.terminate();
    }

    this.wss = null;
  }

  /**
   * Serializes `event` to JSON and sends it to every connected client.
   * Clients that are not in OPEN state are skipped.
   */
  broadcast(event: WSEvent): void {
    if (!this.wss) return;

    const payload = JSON.stringify(event);

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload, (err?: Error) => {
          if (err) {
            console.error('[WebSocketServer] Failed to send to client:', err.message);
          }
        });
      }
    }
  }
}

