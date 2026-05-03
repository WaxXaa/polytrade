import type { WSEvent } from '../models/types';

export interface WebSocketServer {
  start(port: number): void;
  stop(): void;
  broadcast(event: WSEvent): void;
  onBroadcast(handler: (event: WSEvent) => void): () => void;
}

export class WebSocketServerImpl implements WebSocketServer {
  private server: ReturnType<typeof setInterval> | null = null;
  private clients: Array<(event: WSEvent) => void> = [];

  start(_port: number): void {
    console.info('[WSServer] Started.');
  }

  stop(): void {
    if (this.server) clearInterval(this.server);
    this.clients = [];
    console.info('[WSServer] Stopped.');
  }

  broadcast(event: WSEvent): void {
    for (const client of this.clients) {
      try {
        client(event);
      } catch {
        // ignore client errors
      }
    }
  }

  onBroadcast(handler: (event: WSEvent) => void): () => void {
    this.clients.push(handler);
    return () => {
      this.clients = this.clients.filter((h) => h !== handler);
    };
  }
}
