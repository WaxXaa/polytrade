import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/stores';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setTraders,
    updateMarketPrice,
    addTradeSignal,
    setPositions,
    updatePosition,
  } = useAppStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      socketRef.current?.emit('subscribe', {
        channels: ['leaderboard', 'markets', 'trades', 'positions'],
      });
    });

    socketRef.current.on('leaderboard_update', (data) => {
      setTraders(data);
    });

    socketRef.current.on('market_update', (data) => {
      updateMarketPrice(data.marketId, data.last, data.bid, data.ask);
    });

    socketRef.current.on('trade_signal', (data) => {
      addTradeSignal(data);
    });

    socketRef.current.on('position_update', (data) => {
      setPositions((prev) => {
        const exists = prev.find((p) => p.id === data.id);
        if (exists) {
          return prev.map((p) => p.id === data.id ? data : p);
        }
        return [...prev, data];
      });
    });

    socketRef.current.on('stop_loss_trigger', (data) => {
      console.log('Stop loss triggered:', data);
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }, [setTraders, updateMarketPrice, addTradeSignal, setPositions]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { emit, connect, disconnect };
}